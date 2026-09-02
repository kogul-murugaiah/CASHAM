import { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from './_lib/supabase.js';
import { getUserFromRequest } from './_lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const user = await getUserFromRequest(req);
    if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { method } = req;

    // ── GET Endpoints ───────────────────────────────────────────────
    if (method === 'GET') {
        const { view, id } = req.query;

        // View: Unsettled Dues + Cards + All Unsettled Expenses
        if (view === 'dues') {
            try {
                const [cardsRes, expensesRes] = await Promise.all([
                    supabaseAdmin
                        .from('credit_cards')
                        .select('*')
                        .eq('user_id', user.id)
                        .order('name', { ascending: true }),
                    supabaseAdmin
                        .from('expenses')
                        .select(`
                            id,
                            amount,
                            date,
                            item,
                            description,
                            category_id,
                            account_type,
                            paid_via_credit_card,
                            credit_card_id,
                            credit_card_name,
                            cc_bill_settled,
                            cc_settled_at,
                            categories (
                                id,
                                name
                            )
                        `)
                        .eq('user_id', user.id)
                        .eq('paid_via_credit_card', true)
                        .eq('cc_bill_settled', false)
                        .order('date', { ascending: false })
                ]);

                if (cardsRes.error) throw cardsRes.error;
                if (expensesRes.error) throw expensesRes.error;

                return res.status(200).json({
                    cards: cardsRes.data || [],
                    expenses: expensesRes.data || [],
                });
            } catch (error: any) {
                return res.status(500).json({ error: error.message });
            }
        }

        // View: Past Settlements History
        if (view === 'settlements') {
            try {
                const { data, error } = await supabaseAdmin
                    .from('credit_card_settlements')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('settlement_date', { ascending: false })
                    .order('created_at', { ascending: false });

                if (error) throw error;
                return res.status(200).json(data || []);
            } catch (error: any) {
                return res.status(500).json({ error: error.message });
            }
        }

        // View: Single Card
        if (id) {
            try {
                const { data, error } = await supabaseAdmin
                    .from('credit_cards')
                    .select('*')
                    .eq('id', id)
                    .eq('user_id', user.id)
                    .single();

                if (error) throw error;
                return res.status(200).json(data);
            } catch (error: any) {
                return res.status(500).json({ error: error.message });
            }
        }

        // Default: List All Cards with live unsettled dues calculated
        try {
            const [cardsRes, expensesRes] = await Promise.all([
                supabaseAdmin
                    .from('credit_cards')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: true }),
                supabaseAdmin
                    .from('expenses')
                    .select('amount, credit_card_id, credit_card_name')
                    .eq('user_id', user.id)
                    .eq('paid_via_credit_card', true)
                    .eq('cc_bill_settled', false)
            ]);

            if (cardsRes.error) throw cardsRes.error;
            if (expensesRes.error) throw expensesRes.error;

            const cards = cardsRes.data || [];
            const expenses = expensesRes.data || [];

            // Compute dues per card
            const cardsWithDues = cards.map((card) => {
                const cardExpenses = expenses.filter(
                    (e) => e.credit_card_id === card.id || e.credit_card_name === card.name
                );
                const totalDues = cardExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
                const limit = Number(card.credit_limit || 0);
                const utilization = limit > 0 ? (totalDues / limit) * 100 : 0;

                return {
                    ...card,
                    total_dues: totalDues,
                    utilization_percent: Number(utilization.toFixed(1)),
                };
            });

            return res.status(200).json(cardsWithDues);
        } catch (error: any) {
            return res.status(500).json({ error: error.message });
        }
    }

    // ── POST Endpoints ──────────────────────────────────────────────
    if (method === 'POST') {
        const { action } = req.query;

        // Action: Settle Credit Card Bill
        if (action === 'settle') {
            try {
                const {
                    credit_card_id,
                    credit_card_name,
                    expense_ids,
                    settlement_date,
                    notes,
                } = req.body;

                if (!Array.isArray(expense_ids) || expense_ids.length === 0) {
                    return res.status(400).json({ error: 'expense_ids must be a non-empty array' });
                }
                if (!credit_card_name) {
                    return res.status(400).json({ error: 'credit_card_name is required' });
                }

                // Fetch the actual expenses to calculate total and account breakdown
                const { data: expensesToSettle, error: fetchErr } = await supabaseAdmin
                    .from('expenses')
                    .select('id, amount, account_type')
                    .eq('user_id', user.id)
                    .in('id', expense_ids);

                if (fetchErr) throw fetchErr;
                if (!expensesToSettle || expensesToSettle.length === 0) {
                    return res.status(404).json({ error: 'No matching expenses found to settle' });
                }

                // Compute total amount and breakdown by account_type
                const breakdown: Record<string, number> = {};
                let totalAmount = 0;

                for (const exp of expensesToSettle) {
                    const amt = Number(exp.amount || 0);
                    totalAmount += amt;
                    const acc = exp.account_type || 'Unspecified';
                    breakdown[acc] = (breakdown[acc] || 0) + amt;
                }

                const settleDate = settlement_date || new Date().toISOString().slice(0, 10);

                // 1. Insert settlement record
                const { data: settlement, error: settleErr } = await supabaseAdmin
                    .from('credit_card_settlements')
                    .insert([{
                        user_id: user.id,
                        credit_card_id: credit_card_id || null,
                        credit_card_name,
                        total_amount: Number(totalAmount.toFixed(2)),
                        settlement_date: settleDate,
                        breakdown,
                        expense_ids,
                        notes: notes || null,
                    }])
                    .select()
                    .single();

                if (settleErr) throw settleErr;

                // 2. Mark the expenses as settled
                const { error: updateErr } = await supabaseAdmin
                    .from('expenses')
                    .update({
                        cc_bill_settled: true,
                        cc_settled_at: new Date().toISOString(),
                        cc_settlement_id: settlement.id,
                    })
                    .eq('user_id', user.id)
                    .in('id', expense_ids);

                if (updateErr) throw updateErr;

                return res.status(201).json({
                    success: true,
                    settlement,
                });
            } catch (error: any) {
                return res.status(500).json({ error: error.message });
            }
        }

        // Action: Unsettle a previously settled statement
        if (action === 'unsettle') {
            try {
                const { settlement_id } = req.body;
                if (!settlement_id) {
                    return res.status(400).json({ error: 'settlement_id is required' });
                }

                // Reopen expenses linked to this settlement
                const { error: expErr } = await supabaseAdmin
                    .from('expenses')
                    .update({
                        cc_bill_settled: false,
                        cc_settled_at: null,
                        cc_settlement_id: null,
                    })
                    .eq('user_id', user.id)
                    .eq('cc_settlement_id', settlement_id);

                if (expErr) throw expErr;

                // Delete the settlement record
                const { error: delErr } = await supabaseAdmin
                    .from('credit_card_settlements')
                    .delete()
                    .eq('id', settlement_id)
                    .eq('user_id', user.id);

                if (delErr) throw delErr;

                return res.status(200).json({ success: true, message: 'Settlement reopened successfully' });
            } catch (error: any) {
                return res.status(500).json({ error: error.message });
            }
        }

        // Standard POST: Create a new Credit Card
        try {
            const {
                name,
                bank_name,
                card_last4,
                credit_limit,
                billing_cycle_day,
                payment_due_day,
                color,
            } = req.body;

            if (!name || !name.trim()) {
                return res.status(400).json({ error: 'Card name is required' });
            }

            const { data, error } = await supabaseAdmin
                .from('credit_cards')
                .insert([{
                    user_id: user.id,
                    name: name.trim(),
                    bank_name: bank_name ? bank_name.trim() : null,
                    card_last4: card_last4 ? card_last4.trim().slice(-4) : null,
                    credit_limit: Number(credit_limit || 0),
                    billing_cycle_day: Math.min(31, Math.max(1, Number(billing_cycle_day) || 1)),
                    payment_due_day: Math.min(31, Math.max(1, Number(payment_due_day) || 20)),
                    color: color || '#8b5cf6',
                }])
                .select()
                .single();

            if (error) throw error;
            return res.status(201).json(data);
        } catch (error: any) {
            return res.status(500).json({ error: error.message });
        }
    }

    // ── PUT Endpoints ───────────────────────────────────────────────
    if (method === 'PUT') {
        try {
            const {
                id,
                name,
                bank_name,
                card_last4,
                credit_limit,
                billing_cycle_day,
                payment_due_day,
                color,
            } = req.body;

            if (!id) return res.status(400).json({ error: 'Card id is required' });
            if (!name || !name.trim()) return res.status(400).json({ error: 'Card name is required' });

            const { data, error } = await supabaseAdmin
                .from('credit_cards')
                .update({
                    name: name.trim(),
                    bank_name: bank_name ? bank_name.trim() : null,
                    card_last4: card_last4 ? card_last4.trim().slice(-4) : null,
                    credit_limit: Number(credit_limit || 0),
                    billing_cycle_day: Math.min(31, Math.max(1, Number(billing_cycle_day) || 1)),
                    payment_due_day: Math.min(31, Math.max(1, Number(payment_due_day) || 20)),
                    color: color || '#8b5cf6',
                })
                .eq('id', id)
                .eq('user_id', user.id)
                .select()
                .single();

            if (error) throw error;
            return res.status(200).json(data);
        } catch (error: any) {
            return res.status(500).json({ error: error.message });
        }
    }

    // ── DELETE Endpoints ────────────────────────────────────────────
    if (method === 'DELETE') {
        try {
            const { id } = req.query;
            if (!id) return res.status(400).json({ error: 'Card id is required' });

            const { error } = await supabaseAdmin
                .from('credit_cards')
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
