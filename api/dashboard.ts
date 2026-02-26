import { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../_lib/supabase.js';
import { getUserFromRequest } from '../_lib/auth.js';

const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
    console.log("Dashboard fetch request triggered");
    const user = await getUserFromRequest(req);
    console.log("User auth result:", user ? "Authenticated" : "Unauthorized");

    if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.method === 'GET') {
        try {
            const year = parseInt(req.query.year as string) || new Date().getFullYear();
            const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;

            const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
            const nextMonth = month === 12 ? 1 : month + 1;
            const nextYear = month === 12 ? year + 1 : year;
            const endDate = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;

            // 1. Get or create "Balance Carryover" source
            let { data: sources } = await supabaseAdmin
                .from("income_sources")
                .select("id, name")
                .eq("user_id", user.id)
                .eq("name", "Balance Carryover")
                .single();

            if (!sources) {
                const { data: newSource } = await supabaseAdmin
                    .from("income_sources")
                    .insert({ name: "Balance Carryover", user_id: user.id })
                    .select()
                    .single();
                if (newSource) sources = newSource;
            }

            // 2. Fetch current month data
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

            // 3. Fetch account types
            const { data: accountTypesData } = await supabaseAdmin
                .from("account_types")
                .select("name")
                .eq("user_id", user.id);

            const accountTypes = accountTypesData?.map(a => a.name) || [];

            // 4. Carryover Logic
            const hasCarryover = (incomeData || []).some(inc => inc.source_id === sources?.id);

            if (!hasCarryover && sources) {
                const prevMonth = month === 1 ? 12 : month - 1;
                const prevYear = month === 1 ? year - 1 : year;
                const prevStart = `${prevYear}-${String(prevMonth).padStart(2, "0")}-01`;

                const { data: prevInc } = await supabaseAdmin.from("income").select("amount, account_type").eq("user_id", user.id).gte("date", prevStart).lt("date", startDate);
                const { data: prevExp } = await supabaseAdmin.from("expenses").select("amount, account_type").eq("user_id", user.id).gte("date", prevStart).lt("date", startDate);

                const carries: any[] = [];
                accountTypes.forEach(acc => {
                    const bal = (prevInc || []).filter(i => i.account_type === acc).reduce((s, i) => s + i.amount, 0) -
                        (prevExp || []).filter(e => e.account_type === acc).reduce((s, e) => s + e.amount, 0);
                    if (bal > 0) {
                        carries.push({
                            user_id: user.id,
                            amount: bal,
                            date: startDate,
                            account_type: acc,
                            source_id: sources!.id,
                            description: `Auto-carryover from ${MONTH_NAMES[prevMonth - 1]} ${prevYear}`
                        });
                    }
                });

                if (carries.length > 0) {
                    await supabaseAdmin.from("income").insert(carries);
                    // Re-fetch current month income
                    const { data: newIncome } = await supabaseAdmin
                        .from("income")
                        .select("id, amount, date, account_type, source_id")
                        .eq("user_id", user.id)
                        .gte("date", startDate)
                        .lt("date", endDate);
                    incomeData = newIncome;
                }
            }

            return res.status(200).json({ income: incomeData || [], expenses: expenseData || [] });
        } catch (error: any) {
            console.error("Dashboard API Error:", error);
            return res.status(500).json({
                error: error.message || "Internal Server Error",
                code: error.code,
                details: error.details,
                hint: error.hint,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
