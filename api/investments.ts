import { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from './_lib/supabase.js';
import { getUserFromRequest } from './_lib/auth.js';

// Single source of truth: maps asset type → detail table name (used for joins + inserts)
const DETAIL_TABLE: Record<string, string> = {
    'Mutual Fund': 'investment_mf',
    'Stock': 'investment_stock',
    'Gold': 'investment_gold',
    'FD': 'investment_fd',
    'Real Estate': 'investment_real_estate',
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { method } = req;

    // ──────────────────────────────────────────────
    // GET — list investments (filtered by type or date range)
    // query: ?type=MutualFund | ?summary=true | ?startDate&endDate
    // ──────────────────────────────────────────────
    if (method === 'GET') {
        try {
            const { type, summary, startDate, endDate } = req.query;

            // Portfolio summary across all types
            if (summary === 'true') {
                const { data: all, error } = await supabaseAdmin
                    .from('investments')
                    .select('type, action, amount, current_value')
                    .eq('user_id', user.id);

                if (error) throw error;

                const byType: Record<string, { invested: number; current: number; count: number }> = {};
                for (const inv of all || []) {
                    if (!byType[inv.type]) byType[inv.type] = { invested: 0, current: 0, count: 0 };
                    if (inv.action === 'buy') {
                        // Buy: add to cost basis and mark current market value
                        byType[inv.type].invested += inv.amount;
                        byType[inv.type].current  += (inv.current_value ?? inv.amount);
                        byType[inv.type].count    += 1;
                    } else {
                        // Sell/redeem: reduce cost basis by the realised exit amount.
                        // Do NOT touch .current — current_value is only set on buy rows
                        // and reflects their live market value independently.
                        byType[inv.type].invested -= inv.amount;
                    }
                }

                const types = Object.entries(byType).map(([t, v]) => ({
                    type: t,
                    invested: v.invested,
                    current_value: v.current,
                    pnl: v.current - v.invested,
                    return_pct: v.invested > 0 ? ((v.current - v.invested) / v.invested) * 100 : 0,
                    count: v.count,
                }));

                const totals = types.reduce(
                    (acc, t) => ({ invested: acc.invested + t.invested, current: acc.current + t.current_value }),
                    { invested: 0, current: 0 }
                );

                return res.status(200).json({
                    by_type: types,
                    total_invested: totals.invested,
                    total_current_value: totals.current,
                    total_pnl: totals.current - totals.invested,
                    total_return_pct: totals.invested > 0 ? ((totals.current - totals.invested) / totals.invested) * 100 : 0,
                });
            }

            // List investments (with detail join if type specified)
            let selectFields = '*';
            if (type && DETAIL_TABLE[type as string]) {
                selectFields = `*, ${DETAIL_TABLE[type as string]}(*)`;
            }

            let query = supabaseAdmin
                .from('investments')
                .select(selectFields)
                .eq('user_id', user.id)
                .order('date', { ascending: false });

            if (type) query = query.eq('type', type as string);
            if (startDate) query = query.gte('date', startDate as string);
            if (endDate) query = query.lt('date', endDate as string);

            const { limit } = req.query;
            if (limit) query = query.limit(parseInt(limit as string));

            const { data, error } = await query;
            if (error) throw error;
            return res.status(200).json(data || []);

        } catch (error: any) {
            return res.status(500).json({ error: error.message });
        }
    }

    // ──────────────────────────────────────────────
    // POST — create a new investment + type-specific detail
    // body: { type, name, action, amount, date, account_type, notes, detail: {...} }
    // ──────────────────────────────────────────────
    if (method === 'POST') {
        try {
            const { type, name, action, amount, date, account_type, notes, detail } = req.body;

            if (!type || !name || !amount || !date) {
                return res.status(400).json({ error: 'type, name, amount, and date are required' });
            }

            // 1. Insert core investment row
            const { data: inv, error: invErr } = await supabaseAdmin
                .from('investments')
                .insert([{
                    user_id: user.id, type, name,
                    action: action || 'buy',
                    amount: Number(amount),
                    account_type: account_type || null,
                    date, notes: notes || null,
                }])
                .select()
                .single();

            if (invErr) throw invErr;

            // 2. Insert type-specific detail
            const detailTable = DETAIL_TABLE[type];
            if (detailTable && detail) {
                const { error: detailErr } = await supabaseAdmin
                    .from(detailTable)
                    .insert([{ ...detail, investment_id: inv.id, user_id: user.id }]);
                if (detailErr) throw detailErr;
            }

            return res.status(201).json(inv);
        } catch (error: any) {
            return res.status(500).json({ error: error.message });
        }
    }

    // ──────────────────────────────────────────────
    // PUT — update investment
    // Supports: full update + detail, OR quick current_value update
    // body: { id, current_value } OR { id, name, amount, ..., detail: {...} }
    // ──────────────────────────────────────────────
    if (method === 'PUT') {
        try {
            const { id, current_value, type, name, amount, date, account_type, notes, action, detail } = req.body;
            if (!id) return res.status(400).json({ error: 'id is required' });

            const coreUpdates: any = {};
            if (current_value !== undefined) {
                coreUpdates.current_value = Number(current_value);
                coreUpdates.current_value_updated_at = new Date().toISOString();
            }
            if (name !== undefined) coreUpdates.name = name;
            if (amount !== undefined) coreUpdates.amount = Number(amount);
            if (date !== undefined) coreUpdates.date = date;
            if (account_type !== undefined) coreUpdates.account_type = account_type || null;
            if (notes !== undefined) coreUpdates.notes = notes || null;
            if (action !== undefined) coreUpdates.action = action;

            const { data, error } = await supabaseAdmin
                .from('investments')
                .update(coreUpdates)
                .eq('id', id)
                .eq('user_id', user.id)
                .select()
                .single();

            if (error) throw error;

            // Update detail record if provided
            if (detail && type && DETAIL_TABLE[type]) {
                await supabaseAdmin
                    .from(DETAIL_TABLE[type])
                    .update(detail)
                    .eq('investment_id', id)
                    .eq('user_id', user.id);
            }

            return res.status(200).json(data);
        } catch (error: any) {
            return res.status(500).json({ error: error.message });
        }
    }

    // ──────────────────────────────────────────────
    // DELETE — remove investment (cascades to detail)
    // ──────────────────────────────────────────────
    if (method === 'DELETE') {
        try {
            const { id } = req.query;
            if (!id) return res.status(400).json({ error: 'id is required' });

            const { error } = await supabaseAdmin
                .from('investments')
                .delete()
                .eq('id', id as string)
                .eq('user_id', user.id);

            if (error) throw error;
            return res.status(200).json({ success: true });
        } catch (error: any) {
            return res.status(500).json({ error: error.message });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
