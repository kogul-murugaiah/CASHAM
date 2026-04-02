import { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from './_lib/supabase.js';
import { getUserFromRequest } from './_lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { method } = req;

    // GET — list transfers (optionally filtered by date range)
    if (method === 'GET') {
        try {
            const { startDate, endDate } = req.query;
            let query = supabaseAdmin
                .from('transfers')
                .select('*')
                .eq('user_id', user.id)
                .order('date', { ascending: false });

            if (startDate) query = query.gte('date', startDate as string);
            if (endDate) query = query.lt('date', endDate as string);

            const { data, error } = await query;
            if (error) throw error;
            return res.status(200).json(data || []);
        } catch (error: any) {
            return res.status(500).json({ error: error.message });
        }
    }

    // POST — create a transfer
    if (method === 'POST') {
        try {
            const { from_account, to_account, amount, date, note } = req.body;

            if (!from_account || !to_account || !amount || !date)
                return res.status(400).json({ error: 'from_account, to_account, amount, and date are required' });

            if (from_account === to_account)
                return res.status(400).json({ error: 'From and To accounts must be different' });

            const { data, error } = await supabaseAdmin
                .from('transfers')
                .insert([{ user_id: user.id, from_account, to_account, amount: Number(amount), date, note: note || null }])
                .select()
                .single();

            if (error) throw error;
            return res.status(201).json(data);
        } catch (error: any) {
            return res.status(500).json({ error: error.message });
        }
    }

    // DELETE — remove a transfer
    if (method === 'DELETE') {
        try {
            const { id } = req.query;
            if (!id) return res.status(400).json({ error: 'id is required' });

            const { error } = await supabaseAdmin
                .from('transfers')
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
