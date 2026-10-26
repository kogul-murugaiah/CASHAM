import { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from './_lib/supabase.js';
import { getUserFromRequest } from './_lib/auth.js';

function getISTDateStr(date: Date = new Date()): string {
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    });
    return formatter.format(date);
}

function advanceBillingDate(currentDateStr: string, cycle: 'monthly' | 'quarterly' | 'semi_annual' | 'yearly'): string {
    const [year, month, day] = currentDateStr.split('-').map(Number);
    const monthsMap: Record<string, number> = {
        monthly: 1,
        quarterly: 3,
        semi_annual: 6,
        yearly: 12,
    };
    const add = monthsMap[cycle] || 1;

    let targetMonth = (month - 1) + add;
    const targetYear = year + Math.floor(targetMonth / 12);
    targetMonth = targetMonth % 12;

    const maxDays = new Date(targetYear, targetMonth + 1, 0).getDate();
    const clampedDay = Math.min(day, maxDays);

    const mm = String(targetMonth + 1).padStart(2, '0');
    const dd = String(clampedDay).padStart(2, '0');
    return `${targetYear}-${mm}-${dd}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { method } = req;

    // ── GET: List all subscriptions for user ─────────────────────────
    if (method === 'GET') {
        try {
            const { active_only } = req.query;
            let query = supabaseAdmin
                .from('subscriptions')
                .select('*')
                .eq('user_id', user.id)
                .order('next_billing_date', { ascending: true });

            if (active_only === 'true') {
                query = query.eq('is_active', true);
            }

            const { data, error } = await query;
            if (error) throw error;
            return res.status(200).json(data || []);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to fetch subscriptions';
            return res.status(500).json({ error: message });
        }
    }

    // ── POST: Create subscription OR Log 1-Click Expense ────────────
    if (method === 'POST') {
        const { action } = req.query;

        // Action: 1-Click "Log to Expenses" and advance next_billing_date
        if (action === 'log-expense') {
            try {
                const { subscription_id, paid_date, actual_amount, notes } = req.body;
                if (!subscription_id) {
                    return res.status(400).json({ error: 'subscription_id is required' });
                }

                // 1. Fetch subscription
                const { data: sub, error: subErr } = await supabaseAdmin
                    .from('subscriptions')
                    .select('*')
                    .eq('id', subscription_id)
                    .eq('user_id', user.id)
                    .single();

                if (subErr || !sub) {
                    return res.status(404).json({ error: 'Subscription not found' });
                }

                const expenseAmount = Number(actual_amount || sub.amount);
                const expenseDate = paid_date || getISTDateStr();
                const isCC = sub.payment_type === 'credit_card';

                // 2. Insert expense into expenses table
                const { data: expenseData, error: expErr } = await supabaseAdmin
                    .from('expenses')
                    .insert([{
                        user_id: user.id,
                        item: sub.name,
                        amount: expenseAmount,
                        date: expenseDate,
                        category_id: sub.category_id || null,
                        account_type: isCC ? (sub.credit_card_name || 'Credit Card') : (sub.account_type || 'Cash'),
                        paid_via_credit_card: isCC,
                        credit_card_id: isCC ? sub.credit_card_id : null,
                        credit_card_name: isCC ? sub.credit_card_name : null,
                        cc_bill_settled: false,
                        cc_funds_set_aside: false,
                        description: notes || `Recurring: ${sub.name} (${sub.billing_cycle})`,
                    }])
                    .select()
                    .single();

                if (expErr) throw expErr;

                // 3. Advance next_billing_date
                const newNextDate = advanceBillingDate(sub.next_billing_date, sub.billing_cycle);
                const { data: updatedSub, error: updateErr } = await supabaseAdmin
                    .from('subscriptions')
                    .update({
                        next_billing_date: newNextDate,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', sub.id)
                    .select()
                    .single();

                if (updateErr) throw updateErr;

                return res.status(200).json({
                    success: true,
                    expense: expenseData,
                    subscription: updatedSub,
                });
            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : 'Failed to log subscription expense';
                return res.status(500).json({ error: message });
            }
        }

        // Standard: Create a new subscription
        try {
            const {
                name,
                amount,
                billing_cycle,
                start_date,
                next_billing_date,
                category_id,
                category_name,
                payment_type,
                credit_card_id,
                credit_card_name,
                account_type,
                notes,
                icon,
            } = req.body;

            if (!name || !amount || !billing_cycle || !start_date || !payment_type) {
                return res.status(400).json({
                    error: 'name, amount, billing_cycle, start_date, and payment_type are required',
                });
            }

            const { data, error } = await supabaseAdmin
                .from('subscriptions')
                .insert([{
                    user_id: user.id,
                    name: name.trim(),
                    amount: Number(amount),
                    billing_cycle,
                    start_date,
                    next_billing_date: next_billing_date || start_date,
                    category_id: category_id ? Number(category_id) : null,
                    category_name: category_name || null,
                    payment_type,
                    credit_card_id: payment_type === 'credit_card' ? (credit_card_id || null) : null,
                    credit_card_name: payment_type === 'credit_card' ? (credit_card_name || null) : null,
                    account_type: payment_type === 'account' ? (account_type || null) : null,
                    notes: notes?.trim() || null,
                    icon: icon || null,
                    is_active: true,
                }])
                .select()
                .single();

            if (error) throw error;
            return res.status(201).json(data);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to create subscription';
            return res.status(500).json({ error: message });
        }
    }

    // ── PUT: Update subscription / toggle status ─────────────────────
    if (method === 'PUT') {
        try {
            const { id, ...updates } = req.body;
            if (!id) return res.status(400).json({ error: 'Subscription id is required' });

            // If updating next_billing_date or amount, ensure numeric types
            if (updates.amount) updates.amount = Number(updates.amount);
            if (updates.category_id !== undefined) {
                updates.category_id = updates.category_id ? Number(updates.category_id) : null;
            }
            updates.updated_at = new Date().toISOString();

            const { data, error } = await supabaseAdmin
                .from('subscriptions')
                .update(updates)
                .eq('id', id)
                .eq('user_id', user.id)
                .select()
                .single();

            if (error) throw error;
            return res.status(200).json(data);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to update subscription';
            return res.status(500).json({ error: message });
        }
    }

    // ── DELETE: Delete subscription ──────────────────────────────────
    if (method === 'DELETE') {
        try {
            const { id } = req.query;
            if (!id) return res.status(400).json({ error: 'id parameter is required' });

            const { error } = await supabaseAdmin
                .from('subscriptions')
                .delete()
                .eq('id', id as string)
                .eq('user_id', user.id);

            if (error) throw error;
            return res.status(200).json({ success: true });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to delete subscription';
            return res.status(500).json({ error: message });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
