import { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from './_lib/supabase.js';
import { getUserFromRequest } from './_lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { method } = req;

    // GET → list all advances (optionally filtered by card)
    if (method === 'GET') {
        try {
            const { credit_card_id, pending_only } = req.query;
            let query = supabaseAdmin
                .from('cc_advances')
                .select('*')
                .eq('user_id', user.id)
                .order('date', { ascending: false });

            if (credit_card_id) query = query.eq('credit_card_id', credit_card_id as string);
            if (pending_only === 'true') query = query.eq('cash_received', false);

            const { data, error } = await query;
            if (error) throw error;
            return res.status(200).json(data || []);
        } catch (err: any) {
            return res.status(500).json({ error: err.message });
        }
    }

    // POST → create a new advance
    if (method === 'POST') {
        try {
            const { person_name, amount, credit_card_id, credit_card_name, date, description } = req.body;
            if (!person_name || !amount || !credit_card_name || !date) {
                return res.status(400).json({ error: 'person_name, amount, credit_card_name and date are required' });
            }
            const { data, error } = await supabaseAdmin
                .from('cc_advances')
                .insert([{
                    user_id: user.id,
                    person_name: person_name.trim(),
                    amount: Number(amount),
                    credit_card_id: credit_card_id || null,
                    credit_card_name,
                    date,
                    description: description?.trim() || null,
                    cash_received: false,
                }])
                .select()
                .single();
            if (error) throw error;
            return res.status(201).json(data);
        } catch (err: any) {
            return res.status(500).json({ error: err.message });
        }
    }

    // PUT → mark cash received (or update details)
    if (method === 'PUT') {
        try {
            const { id, cash_received, cash_received_date, person_name, amount, description } = req.body;
            if (!id) return res.status(400).json({ error: 'id is required' });

            const updates: any = {};
            if (person_name !== undefined) updates.person_name = person_name.trim();
            if (amount !== undefined) updates.amount = Number(amount);
            if (description !== undefined) updates.description = description?.trim() || null;
            if (cash_received !== undefined) {
                updates.cash_received = Boolean(cash_received);
                updates.cash_received_date = cash_received
                    ? (cash_received_date || new Date().toISOString().slice(0, 10))
                    : null;
            }

            const { data, error } = await supabaseAdmin
                .from('cc_advances')
                .update(updates)
                .eq('id', id)
                .eq('user_id', user.id)
                .select()
                .single();
            if (error) throw error;
            return res.status(200).json(data);
        } catch (err: any) {
            return res.status(500).json({ error: err.message });
        }
    }

    // DELETE → remove an advance
    if (method === 'DELETE') {
        try {
            const { id } = req.query;
            if (!id) return res.status(400).json({ error: 'id is required' });
            const { error } = await supabaseAdmin
                .from('cc_advances')
                .delete()
                .eq('id', id as string)
                .eq('user_id', user.id);
            if (error) throw error;
            return res.status(200).json({ success: true });
        } catch (err: any) {
            return res.status(500).json({ error: err.message });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}