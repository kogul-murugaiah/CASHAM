import { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../_lib/supabase.js';
import { getUserFromRequest } from '../_lib/auth.js';

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
                .from('incomes')
                .select(`
          id,
          amount,
          date,
          source,
          description,
          source_id,
          account_type,
          income_sources (
            id,
            name
          )
        `)
                .eq('user_id', user.id)
                .order('date', { ascending: false });

            if (startDate) {
                query = query.gte('date', startDate);
            }
            if (endDate) {
                query = query.lt('date', endDate);
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
            const { amount, date, source, description, source_id, account_type } = req.body;
            const { data, error } = await supabaseAdmin
                .from('incomes')
                .insert([{
                    user_id: user.id,
                    amount,
                    date,
                    source,
                    description: description || null,
                    source_id: source_id || null,
                    account_type
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
            const { id, amount, date, source, description, source_id, account_type } = req.body;

            if (!id) return res.status(400).json({ error: 'Missing income id' });

            const { data, error } = await supabaseAdmin
                .from('incomes')
                .update({
                    amount,
                    date,
                    source,
                    description: description || null,
                    source_id: source_id || null,
                    account_type
                })
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

            if (!id) return res.status(400).json({ error: 'Missing income id' });

            const { error } = await supabaseAdmin
                .from('incomes')
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
