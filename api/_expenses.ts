import { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from './_lib/supabase.js';
import { getUserFromRequest } from './_lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const user = await getUserFromRequest(req);
    if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { method } = req;

    // ── Template Endpoints (recurring expense templates) ──────────────
    if (req.query.templates === 'true' || req.query.template === 'true' || req.query.quickadd === 'true') {
        // GET ?templates=true → List all templates
        if (method === 'GET' && req.query.templates === 'true') {
            try {
                const { data, error } = await supabaseAdmin
                    .from('expense_templates')
                    .select(`*, categories(id, name)`)
                    .eq('user_id', user.id)
                    .eq('is_active', true)
                    .order('created_at', { ascending: false });
                if (error) throw error;
                return res.status(200).json(data || []);
            } catch (error: any) {
                return res.status(500).json({ error: error.message });
            }
        }

        // POST ?template=true → Create a new template
        if (method === 'POST' && req.query.template === 'true') {
            try {
                const {
                    amount,
                    item,
                    description,
                    category_id,
                    account_type,
                    paid_via_credit_card,
                    credit_card_id,
                    credit_card_name
                } = req.body;
                if (!amount || !item || !account_type) {
                    return res.status(400).json({ error: 'amount, item, and account_type are required' });
                }
                const { data, error } = await supabaseAdmin
                    .from('expense_templates')
                    .insert([{
                        user_id: user.id,
                        amount: Number(amount),
                        item,
                        description: description || null,
                        category_id: category_id || null,
                        account_type,
                        paid_via_credit_card: Boolean(paid_via_credit_card),
                        credit_card_id: credit_card_id || null,
                        credit_card_name: credit_card_name || null,
                    }])
                    .select()
                    .single();
                if (error) throw error;
                return res.status(201).json(data);
            } catch (error: any) {
                return res.status(500).json({ error: error.message });
            }
        }

        // PUT ?template=true → Update a template
        if (method === 'PUT' && req.query.template === 'true') {
            try {
                const { id, ...updates } = req.body;
                if (!id) return res.status(400).json({ error: 'id is required' });
                const { data, error } = await supabaseAdmin
                    .from('expense_templates')
                    .update(updates)
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

        // DELETE ?template=true&id=xxx → Delete a template
        if (method === 'DELETE' && req.query.template === 'true') {
            try {
                const { id } = req.query;
                if (!id) return res.status(400).json({ error: 'id is required' });
                const { error } = await supabaseAdmin
                    .from('expense_templates')
                    .delete()
                    .eq('id', id as string)
                    .eq('user_id', user.id);
                if (error) throw error;
                return res.status(200).json({ success: true });
            } catch (error: any) {
                return res.status(500).json({ error: error.message });
            }
        }

        // POST ?quickadd=true&id=xxx → Instantly log a template as today's expense
        if (method === 'POST' && req.query.quickadd === 'true') {
            try {
                const templateId = req.query.id as string;
                if (!templateId) return res.status(400).json({ error: 'template id is required' });
                const { data: template, error: fetchErr } = await supabaseAdmin
                    .from('expense_templates')
                    .select('*')
                    .eq('id', templateId)
                    .eq('user_id', user.id)
                    .single();
                if (fetchErr || !template) return res.status(404).json({ error: 'Template not found' });

                const today = new Date().toISOString().slice(0, 10);
                const { data, error } = await supabaseAdmin
                    .from('expenses')
                    .insert([{
                        user_id: user.id,
                        amount: template.amount,
                        date: today,
                        item: template.item,
                        description: template.description,
                        category_id: template.category_id,
                        account_type: template.account_type,
                        paid_via_credit_card: Boolean(template.paid_via_credit_card),
                        credit_card_id: template.credit_card_id || null,
                        credit_card_name: template.credit_card_name || null,
                        cc_bill_settled: false,
                    }])
                    .select()
                    .single();
                if (error) throw error;
                return res.status(201).json(data);
            } catch (error: any) {
                return res.status(500).json({ error: error.message });
            }
        }

        return res.status(405).json({ error: 'Method not allowed for templates' });
    }

    // ── Standard Expense Endpoints ────────────────────────────────────

    if (method === 'GET') {
        try {
            const { startDate, endDate, creditCardOnly, settled } = req.query;
            let query = supabaseAdmin
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
          cc_settlement_id,
          categories (
            id,
            name
          )
        `)
                .eq('user_id', user.id)
                .order('date', { ascending: false })
                .order('created_at', { ascending: false });

            if (startDate) {
                query = query.gte('date', startDate);
            }
            if (endDate) {
                query = query.lt('date', endDate);
            }
            if (creditCardOnly === 'true') {
                query = query.eq('paid_via_credit_card', true);
            }
            if (settled === 'false') {
                query = query.eq('cc_bill_settled', false);
            } else if (settled === 'true') {
                query = query.eq('cc_bill_settled', true);
            }

            const { data, error } = await query;

            if (error) throw error;
            return res.status(200).json(data);
        } catch (error: any) {
            return res.status(500).json({ error: error.message });
        }
    }

    else if (method === 'POST') {
        try {
            const items = Array.isArray(req.body) ? req.body : [req.body];
            const dataToInsert = items.map(item => ({
                ...item,
                user_id: user.id,
                description: item.description || null,
                category_id: item.category_id || null,
                paid_via_credit_card: Boolean(item.paid_via_credit_card),
                credit_card_id: item.credit_card_id || null,
                credit_card_name: item.credit_card_name || null,
                cc_bill_settled: Boolean(item.cc_bill_settled) || false,
            }));

            const { data, error } = await supabaseAdmin
                .from('expenses')
                .insert(dataToInsert)
                .select();

            if (error) throw error;
            return res.status(201).json(Array.isArray(req.body) ? data : data[0]);
        } catch (error: any) {
            return res.status(500).json({ error: error.message });
        }
    }

    else if (method === 'PUT') {
        try {
            const {
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
                cc_funds_set_aside,
            } = req.body;

            if (!id) return res.status(400).json({ error: 'Missing expense id' });

            const updates: any = {};
            if (amount !== undefined) updates.amount = amount;
            if (date !== undefined) updates.date = date;
            if (item !== undefined) updates.item = item;
            if (description !== undefined) updates.description = description || null;
            if (category_id !== undefined) updates.category_id = category_id || null;
            if (account_type !== undefined) updates.account_type = account_type;
            if (paid_via_credit_card !== undefined) updates.paid_via_credit_card = Boolean(paid_via_credit_card);
            if (credit_card_id !== undefined) updates.credit_card_id = credit_card_id || null;
            if (credit_card_name !== undefined) updates.credit_card_name = credit_card_name || null;
            if (cc_bill_settled !== undefined) updates.cc_bill_settled = Boolean(cc_bill_settled);
            if (cc_funds_set_aside !== undefined) updates.cc_funds_set_aside = Boolean(cc_funds_set_aside);

            const { data, error } = await supabaseAdmin
                .from('expenses')
                .update(updates)
                .eq('id', id)
                .eq('user_id', user.id)
                .select();

            if (error) throw error;
            return res.status(200).json(data[0]);
        } catch (error: any) {
            return res.status(500).json({ error: error.message });
        }
    }

    else if (method === 'DELETE') {
        try {
            const { id } = req.query;

            if (!id) return res.status(400).json({ error: 'Missing expense id' });

            const { error } = await supabaseAdmin
                .from('expenses')
                .delete()
                .eq('id', id)
                .eq('user_id', user.id);

            if (error) throw error;
            return res.status(200).json({ success: true });
        } catch (error: any) {
            return res.status(500).json({ error: error.message });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}