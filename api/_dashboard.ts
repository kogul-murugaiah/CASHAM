import { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from './_lib/supabase.js';
import { getUserFromRequest } from './_lib/auth.js';

const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];

async function computeAndInsertCarryover(
    userId: string,
    year: number,
    month: number,
    sourceId: string,
    force: boolean = false
): Promise<void> {
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    const monthEndExclusive = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;

    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const prevStart = `${prevYear}-${String(prevMonth).padStart(2, "0")}-01`;

    // Make carryover idempotent:
    // - For force=true (manual sync), always replace this month's carryover rows.
    // - For force=false (auto on first access), delete-then-insert is still safe and prevents duplicates.
    const { error: deleteErr } = await supabaseAdmin
        .from("income")
        .delete()
        .eq("user_id", userId)
        .eq("source_id", sourceId)
        .gte("date", startDate)
        .lt("date", monthEndExclusive);

    if (deleteErr) throw deleteErr;

    // Historical rows strictly before current month start
    const [{ data: prevInc, error: incErr }, { data: prevExp, error: expErr }, { data: prevTransfers, error: trErr }] =
        await Promise.all([
            supabaseAdmin
                .from("income")
                .select("amount, account_type, source_id, date")
                .eq("user_id", userId)
                .lt("date", startDate),
            supabaseAdmin
                .from("expenses")
                .select("amount, account_type")
                .eq("user_id", userId)
                .lt("date", startDate),
            supabaseAdmin
                .from("transfers")
                .select("amount, from_account, to_account")
                .eq("user_id", userId)
                .lt("date", startDate),
        ]);

    if (incErr) throw incErr;
    if (expErr) throw expErr;
    if (trErr) throw trErr;

    // Exclude ALL previous carryover income rows to avoid compounded carryovers.
    const filteredPrevInc = (prevInc || []).filter(i => i.source_id !== sourceId);

    // Fetch sources to map source_id to source name (for description only)
    const { data: sources, error: srcErr } = await supabaseAdmin
        .from("income_sources")
        .select("id, name")
        .eq("user_id", userId);
    if (srcErr) throw srcErr;

    const sourceMap = new Map((sources || []).map(s => [s.id, s.name]));

    // Gather all distinct account types from historical data (null/empty-safe)
    const allAccounts = new Set<string>();
    filteredPrevInc.forEach(i => {
        if (i.account_type && i.account_type.trim()) allAccounts.add(i.account_type);
    });
    (prevExp || []).forEach(e => {
        if (e.account_type && e.account_type.trim()) allAccounts.add(e.account_type);
    });
    (prevTransfers || []).forEach(t => {
        if (t.from_account && t.from_account.trim()) allAccounts.add(t.from_account);
        if (t.to_account && t.to_account.trim()) allAccounts.add(t.to_account);
    });

    const carries: any[] = [];
    allAccounts.forEach(acc => {
        const incSum = filteredPrevInc
            .filter(i => i.account_type === acc)
            .reduce((s, i) => s + Number(i.amount || 0), 0);

        const expSum = (prevExp || [])
            .filter(e => e.account_type === acc)
            .reduce((s, e) => s + Number(e.amount || 0), 0);

        const transferIn = (prevTransfers || [])
            .filter(t => t.to_account === acc)
            .reduce((s, t) => s + Number(t.amount || 0), 0);

        const transferOut = (prevTransfers || [])
            .filter(t => t.from_account === acc)
            .reduce((s, t) => s + Number(t.amount || 0), 0);

        // Correct net balance:
        // inbound income - expenses + incoming transfers - outgoing transfers
        const bal = incSum - expSum + transferIn - transferOut;

        // Keep exact previous behavior of including non-zero balances.
        // If you only want positive carryovers, change to: if (bal > 0)
        if (bal !== 0) {
            // Previous-month income source names for this account (for richer description)
            const prevMonthIncForAcc = filteredPrevInc.filter(i =>
                i.account_type === acc &&
                i.date >= prevStart &&
                i.date < startDate
            );

            const prevMonthSourceIds = new Set(prevMonthIncForAcc.map(i => i.source_id));
            const prevMonthSourceNames = Array.from(prevMonthSourceIds)
                .map(id => sourceMap.get(id))
                .filter(Boolean)
                .join(", ");

            let description = `Auto-carryover up to ${MONTH_NAMES[prevMonth - 1]} ${prevYear}`;
            if (prevMonthSourceNames) {
                description += ` (Previous month sources: ${prevMonthSourceNames})`;
            }

            carries.push({
                user_id: userId,
                amount: Number(bal.toFixed(2)),
                date: startDate,
                account_type: acc,
                source_id: sourceId,
                description
            });
        }
    });

    if (carries.length > 0) {
        const { error: insErr } = await supabaseAdmin.from("income").insert(carries);
        if (insErr) throw insErr;
    }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const getYearMonth = (q: any) => ({
        year: parseInt(q.year as string) || new Date().getFullYear(),
        month: parseInt(q.month as string) || new Date().getMonth() + 1,
    });

    // Helper: get or create Balance Carryover source
    const getCarryoverSource = async () => {
        let { data } = await supabaseAdmin.from("income_sources").select("id").eq("user_id", user.id).eq("name", "Balance Carryover").single();
        if (!data) {
            const { data: created } = await supabaseAdmin.from("income_sources").insert({ name: "Balance Carryover", user_id: user.id }).select().single();
            data = created;
        }
        return data;
    };

    // ── POST: Force recalculate carryover (Sync button) ─────────────────────
    if (req.method === 'POST') {
        try {
            const { year, month } = getYearMonth(req.body || {});
            const source = await getCarryoverSource();
            if (!source) return res.status(500).json({ error: 'Could not find/create carryover source' });
            await computeAndInsertCarryover(user.id, year, month, source.id, true);
            return res.status(200).json({ ok: true });
        } catch (error: any) {
            return res.status(500).json({ error: error.message });
        }
    }

    // ── GET ?debug=true: Show per-account breakdown for carryover diagnosis ──
    if (req.method === 'GET' && req.query.debug === 'true') {
        try {
            const { year, month } = getYearMonth(req.query);
            const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
            const source = await getCarryoverSource();

            const [{ data: inc }, { data: exp }, { data: trn }] = await Promise.all([
                supabaseAdmin.from("income").select("amount, account_type, source_id").eq("user_id", user.id).lt("date", startDate),
                supabaseAdmin.from("expenses").select("amount, account_type").eq("user_id", user.id).lt("date", startDate),
                supabaseAdmin.from("transfers").select("amount, from_account, to_account").eq("user_id", user.id).lt("date", startDate),
            ]);

            const filteredInc = (inc || []).filter(i => i.source_id !== source?.id);
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

            const breakdown = Array.from(accounts).map(acc => {
                const incSum = filteredInc.filter(i => i.account_type === acc).reduce((s, i) => s + Number(i.amount || 0), 0);
                const expSum = (exp || []).filter(e => e.account_type === acc).reduce((s, e) => s + Number(e.amount || 0), 0);
                const transferIn = (trn || []).filter(t => t.to_account === acc).reduce((s, t) => s + Number(t.amount || 0), 0);
                const transferOut = (trn || []).filter(t => t.from_account === acc).reduce((s, t) => s + Number(t.amount || 0), 0);
                return { account: acc, incSum, expSum, transferIn, transferOut, balance: incSum - expSum + transferIn - transferOut };
            });

            return res.status(200).json({ asOf: startDate, breakdown });
        } catch (error: any) {
            return res.status(500).json({ error: error.message });
        }
    }

    // ── GET: Fetch dashboard data (auto-carryover on first access) ───────────
    if (req.method === 'GET') {
        try {
            const { year, month } = getYearMonth(req.query);
            const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
            const nextMonth = month === 12 ? 1 : month + 1;
            const nextYear = month === 12 ? year + 1 : year;
            const endDate = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;

            const source = await getCarryoverSource();

            let { data: incomeData, error: incomeError } = await supabaseAdmin
                .from("income").select("id, amount, date, account_type, source_id")
                .eq("user_id", user.id).gte("date", startDate).lt("date", endDate);
            if (incomeError) throw incomeError;

            const { data: expenseData, error: expenseError } = await supabaseAdmin
                .from("expenses").select("id, amount, date, account_type")
                .eq("user_id", user.id).gte("date", startDate).lt("date", endDate);
            if (expenseError) throw expenseError;

            const { data: transferData, error: transferError } = await supabaseAdmin
                .from("transfers").select("*")
                .eq("user_id", user.id).gte("date", startDate).lt("date", endDate);
            if (transferError) throw transferError;

            // Auto-carryover on first access if none exists yet
            const hasCarryover = source && (incomeData || []).some(inc => inc.source_id === source.id);
            if (!hasCarryover && source) {
                await computeAndInsertCarryover(user.id, year, month, source.id, false);
                const { data: newIncome } = await supabaseAdmin
                    .from("income").select("id, amount, date, account_type, source_id")
                    .eq("user_id", user.id).gte("date", startDate).lt("date", endDate);
                incomeData = newIncome;
            }

            return res.status(200).json({ income: incomeData || [], expenses: expenseData || [], transfers: transferData || [] });
        } catch (error: any) {
            console.error("Dashboard API Error:", error);
            return res.status(500).json({ error: error.message || "Internal Server Error" });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}