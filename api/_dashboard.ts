import { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from './_lib/supabase.js';
import { getUserFromRequest } from './_lib/auth.js';

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function monthBounds(year: number, month: number) {
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const endDate = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;
  return { startDate, endDate, nextMonth, nextYear };
}

function prevMonthYear(year: number, month: number) {
  return {
    prevMonth: month === 1 ? 12 : month - 1,
    prevYear: month === 1 ? year - 1 : year
  };
}

/**
 * Build month closing balances from transaction data for one month.
 * IMPORTANT:
 * - Excludes "Balance Carryover" income source from income sum
 * - Net balance per account = income - expenses + transferIn - transferOut
 */
async function computeMonthClosingBalances(
  userId: string,
  year: number,
  month: number,
  carryoverSourceId?: string
): Promise<Array<{ account_type: string; closing_balance: number }>> {
  const { startDate, endDate } = monthBounds(year, month);

  const [{ data: inc, error: incErr }, { data: exp, error: expErr }, { data: trn, error: trnErr }] =
    await Promise.all([
      supabaseAdmin
        .from("income")
        .select("amount, account_type, source_id")
        .eq("user_id", userId)
        .gte("date", startDate)
        .lt("date", endDate),
      supabaseAdmin
        .from("expenses")
        .select("amount, account_type")
        .eq("user_id", userId)
        .gte("date", startDate)
        .lt("date", endDate),
      supabaseAdmin
        .from("transfers")
        .select("amount, from_account, to_account")
        .eq("user_id", userId)
        .gte("date", startDate)
        .lt("date", endDate),
    ]);

  if (incErr) throw incErr;
  if (expErr) throw expErr;
  if (trnErr) throw trnErr;

  const filteredInc = (inc || []).filter(i => i.source_id !== carryoverSourceId);

  const accounts = new Set<string>();
  filteredInc.forEach(i => {
    if (i.account_type && i.account_type.trim()) accounts.add(i.account_type);
  });
  (exp || []).forEach(e => {
    if (e.account_type && e.account_type.trim()) accounts.add(e.account_type);
  });
  (trn || []).forEach(t => {
    if (t.from_account && t.from_account.trim()) accounts.add(t.from_account);
    if (t.to_account && t.to_account.trim()) accounts.add(t.to_account);
  });

  const balances = Array.from(accounts).map(acc => {
    const incSum = filteredInc
      .filter(i => i.account_type === acc)
      .reduce((s, i) => s + Number(i.amount || 0), 0);

    const expSum = (exp || [])
      .filter(e => e.account_type === acc)
      .reduce((s, e) => s + Number(e.amount || 0), 0);

    const transferIn = (trn || [])
      .filter(t => t.to_account === acc)
      .reduce((s, t) => s + Number(t.amount || 0), 0);

    const transferOut = (trn || [])
      .filter(t => t.from_account === acc)
      .reduce((s, t) => s + Number(t.amount || 0), 0);

    const closing = incSum - expSum + transferIn - transferOut;
    return { account_type: acc, closing_balance: Number(closing.toFixed(2)) };
  });

  return balances;
}

/**
 * Save one month closing balances into snapshot table.
 * upsert key: (user_id, year, month, account_type)
 */
async function saveMonthClosingSnapshot(
  userId: string,
  year: number,
  month: number,
  carryoverSourceId?: string
): Promise<void> {
  const balances = await computeMonthClosingBalances(userId, year, month, carryoverSourceId);
  if (!balances.length) return;

  const rows = balances.map(b => ({
    user_id: userId,
    year,
    month,
    account_type: b.account_type,
    closing_balance: b.closing_balance
  }));

  const { error } = await supabaseAdmin
    .from("monthly_wallet_balances")
    .upsert(rows, { onConflict: "user_id,year,month,account_type" });

  if (error) throw error;
}

/**
 * Create carryover for target month using previous month snapshot.
 * Fallback: if snapshot missing, compute previous month once, save snapshot, then use it.
 */
async function computeAndInsertCarryover(
  userId: string,
  year: number,
  month: number,
  sourceId: string,
  force: boolean = false
): Promise<void> {
  const { startDate, endDate } = monthBounds(year, month);
  const { prevMonth, prevYear } = prevMonthYear(year, month);

  // Idempotent: remove this month's existing carryover rows first
  const { error: delErr } = await supabaseAdmin
    .from("income")
    .delete()
    .eq("user_id", userId)
    .eq("source_id", sourceId)
    .gte("date", startDate)
    .lt("date", endDate);
  if (delErr) throw delErr;

  // Read previous month snapshot
  let { data: snapRows, error: snapErr } = await supabaseAdmin
    .from("monthly_wallet_balances")
    .select("account_type, closing_balance")
    .eq("user_id", userId)
    .eq("year", prevYear)
    .eq("month", prevMonth);

  if (snapErr) throw snapErr;

  // Fallback path: snapshot not found -> build it from that month's transactions once
  if (!snapRows || snapRows.length === 0) {
    await saveMonthClosingSnapshot(userId, prevYear, prevMonth, sourceId);

    const refetch = await supabaseAdmin
      .from("monthly_wallet_balances")
      .select("account_type, closing_balance")
      .eq("user_id", userId)
      .eq("year", prevYear)
      .eq("month", prevMonth);

    if (refetch.error) throw refetch.error;
    snapRows = refetch.data || [];
  }

  if (!snapRows.length) return;

  const carries = snapRows
    .filter(r => Number(r.closing_balance || 0) !== 0)
    .map(r => ({
      user_id: userId,
      amount: Number(Number(r.closing_balance).toFixed(2)),
      date: startDate,
      account_type: r.account_type,
      source_id: sourceId,
      description: `Auto-carryover from ${MONTH_NAMES[prevMonth - 1]} ${prevYear}`
    }));

  if (!carries.length) return;

  const { error: insErr } = await supabaseAdmin.from("income").insert(carries);
  if (insErr) throw insErr;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = await getUserFromRequest(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const getYearMonth = (q: any) => ({
    year: parseInt(q.year as string) || new Date().getFullYear(),
    month: parseInt(q.month as string) || new Date().getMonth() + 1,
  });

  // get or create carryover source
  const getCarryoverSource = async () => {
    let { data } = await supabaseAdmin
      .from("income_sources")
      .select("id")
      .eq("user_id", user.id)
      .eq("name", "Balance Carryover")
      .single();

    if (!data) {
      const { data: created, error: createErr } = await supabaseAdmin
        .from("income_sources")
        .insert({ name: "Balance Carryover", user_id: user.id })
        .select()
        .single();
      if (createErr) throw createErr;
      data = created;
    }
    return data;
  };

  // POST: Sync carryover for target month
  if (req.method === 'POST') {
    try {
      const { year, month } = getYearMonth(req.body || {});
      const source = await getCarryoverSource();
      if (!source) return res.status(500).json({ error: 'Could not find/create carryover source' });

      // Ensure previous month snapshot exists/updated first
      const { prevMonth, prevYear } = prevMonthYear(year, month);
      await saveMonthClosingSnapshot(user.id, prevYear, prevMonth, source.id);

      // Insert target month carryover from previous month snapshot
      await computeAndInsertCarryover(user.id, year, month, source.id, true);

      return res.status(200).json({ ok: true });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  // GET ?debug=true: breakdown from previous month snapshot and fallback live calc
  if (req.method === 'GET' && req.query.debug === 'true') {
    try {
      const { year, month } = getYearMonth(req.query);
      const { prevMonth, prevYear } = prevMonthYear(year, month);
      const source = await getCarryoverSource();

      const { data: snapshot, error: snapErr } = await supabaseAdmin
        .from("monthly_wallet_balances")
        .select("account_type, closing_balance")
        .eq("user_id", user.id)
        .eq("year", prevYear)
        .eq("month", prevMonth);

      if (snapErr) throw snapErr;

      const live = await computeMonthClosingBalances(user.id, prevYear, prevMonth, source?.id);

      return res.status(200).json({
        forCarryoverMonth: `${year}-${String(month).padStart(2, "0")}`,
        previousMonth: `${prevYear}-${String(prevMonth).padStart(2, "0")}`,
        snapshot: snapshot || [],
        liveComputed: live
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  // GET: dashboard data
  if (req.method === 'GET') {
    try {
      const { year, month } = getYearMonth(req.query);
      const { startDate, endDate } = monthBounds(year, month);

      const source = await getCarryoverSource();

      let { data: incomeData, error: incomeError } = await supabaseAdmin
        .from("income")
        .select("id, amount, date, account_type, source_id")
        .eq("user_id", user.id)
        .gte("date", startDate)
        .lt("date", endDate);
      if (incomeError) throw incomeError;

      const { data: expenseData, error: expenseError } = await supabaseAdmin
        .from("expenses")
        .select("id, amount, date, account_type")
        .eq("user_id", user.id)
        .gte("date", startDate)
        .lt("date", endDate);
      if (expenseError) throw expenseError;

      const { data: transferData, error: transferError } = await supabaseAdmin
        .from("transfers")
        .select("*")
        .eq("user_id", user.id)
        .gte("date", startDate)
        .lt("date", endDate);
      if (transferError) throw transferError;

      // Auto-carryover if missing
      const hasCarryover = source && (incomeData || []).some(inc => inc.source_id === source.id);
      if (!hasCarryover && source) {
        await computeAndInsertCarryover(user.id, year, month, source.id, false);

        const { data: newIncome, error: newIncomeErr } = await supabaseAdmin
          .from("income")
          .select("id, amount, date, account_type, source_id")
          .eq("user_id", user.id)
          .gte("date", startDate)
          .lt("date", endDate);

        if (newIncomeErr) throw newIncomeErr;
        incomeData = newIncome;
      }

      return res.status(200).json({
        income: incomeData || [],
        expenses: expenseData || [],
        transfers: transferData || []
      });
    } catch (error: any) {
      console.error("Dashboard API Error:", error);
      return res.status(500).json({ error: error.message || "Internal Server Error" });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}