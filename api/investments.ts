import { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from './_lib/supabase.js';
import { getUserFromRequest } from './_lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const user = await getUserFromRequest(req);
    if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { method } = req;

    if (method === 'GET') {
        try {
            const { startDate, endDate } = req.query;
            let query = supabaseAdmin
                .from('investments')
                .select('id, name, type, action, units, price_per_unit, amount, account_type, date, description, created_at')
                .eq('user_id', user.id)
                .order('date', { ascending: false });

            if (startDate) query = query.gte('date', startDate as string);
            if (endDate) query = query.lt('date', endDate as string);

            const { data, error } = await query;
            if (error) throw error;
            return res.status(200).json(data);
        } catch (error: any) {
            return res.status(500).json({ error: error.message });
        }
    }

    else if (method === 'POST') {
        try {
            const { name, type, action, units, price_per_unit, amount, account_type, date, description } = req.body;

            if (!name || !type || !action || !amount || !date) {
                return res.status(400).json({ error: 'name, type, action, amount, and date are required' });
            }

            const { data, error } = await supabaseAdmin
                .from('investments')
                .insert([{
                    user_id: user.id,
                    name,
                    type,
                    action,
                    units: units || null,
                    price_per_unit: price_per_unit || null,
                    amount,
                    account_type: account_type || null,
                    date,
                    description: description || null,
                }])
                .select();

            if (error) throw error;
            return res.status(201).json(data[0]);
        } catch (error: any) {
            return res.status(500).json({ error: error.message });
        }
    }

    else if (method === 'PUT') {
        try {
            const { id, name, type, action, units, price_per_unit, amount, account_type, date, description } = req.body;

            if (!id) return res.status(400).json({ error: 'Missing investment id' });

            const { data, error } = await supabaseAdmin
                .from('investments')
                .update({ name, type, action, units: units || null, price_per_unit: price_per_unit || null, amount, account_type: account_type || null, date, description: description || null })
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
            if (!id) return res.status(400).json({ error: 'Missing investment id' });

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
