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
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const prevStart = `${prevYear}-${String(prevMonth).padStart(2, "0")}-01`;

    if (force) {
        // Delete any existing carryover rows for this month so we can reinsert
        await supabaseAdmin
            .from("income")
            .delete()
            .eq("user_id", userId)
            .eq("source_id", sourceId)
            .gte("date", startDate)
            .lt("date", `${year}-${String(month === 12 ? 1 : month + 1).padStart(2, "0")}-01`);
    }

    const { data: prevInc } = await supabaseAdmin.from("income").select("amount, account_type, source_id").eq("user_id", userId).gte("date", prevStart).lt("date", startDate);
    const { data: prevExp } = await supabaseAdmin.from("expenses").select("amount, account_type").eq("user_id", userId).gte("date", prevStart).lt("date", startDate);
    const { data: prevInv } = await supabaseAdmin.from("investments").select("amount, account_type, action").eq("user_id", userId).eq("action", "buy").gte("date", prevStart).lt("date", startDate);

    // Exclude the previous month's own carryover rows from the sum to avoid compounding
    const filteredPrevInc = (prevInc || []).filter(i => i.source_id !== sourceId);

    // Gather all distinct account types from previous month data
    const allAccounts = new Set<string | null>();
    filteredPrevInc.forEach(i => allAccounts.add(i.account_type ?? null));
    (prevExp || []).forEach(e => allAccounts.add(e.account_type ?? null));
    (prevInv || []).forEach(v => allAccounts.add(v.account_type ?? null));

    const carries: any[] = [];
    allAccounts.forEach(acc => {
        const incSum = filteredPrevInc.filter(i => (i.account_type ?? null) === acc).reduce((s, i) => s + i.amount, 0);
        const expSum = (prevExp || []).filter(e => (e.account_type ?? null) === acc).reduce((s, e) => s + e.amount, 0);
        const invSum = (prevInv || []).filter(v => (v.account_type ?? null) === acc).reduce((s, v) => s + v.amount, 0);
        const bal = incSum - expSum - invSum;
        if (bal > 0) {
            carries.push({
                user_id: userId,
                amount: bal,
                date: startDate,
                account_type: acc,
                source_id: sourceId,
                description: `Auto-carryover from ${MONTH_NAMES[prevMonth - 1]} ${prevYear}`
            });
        }
    });

    if (carries.length > 0) {
        await supabaseAdmin.from("income").insert(carries);
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

            // Auto-carryover on first access if none exists yet
            const hasCarryover = source && (incomeData || []).some(inc => inc.source_id === source.id);
            if (!hasCarryover && source) {
                await computeAndInsertCarryover(user.id, year, month, source.id, false);
                const { data: newIncome } = await supabaseAdmin
                    .from("income").select("id, amount, date, account_type, source_id")
                    .eq("user_id", user.id).gte("date", startDate).lt("date", endDate);
                incomeData = newIncome;
            }

            return res.status(200).json({ income: incomeData || [], expenses: expenseData || [] });
        } catch (error: any) {
            console.error("Dashboard API Error:", error);
            return res.status(500).json({ error: error.message || "Internal Server Error" });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}

