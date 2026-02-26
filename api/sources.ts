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
            const { data, error } = await supabaseAdmin
                .from('income_sources')
                .select('*')
                .eq('user_id', user.id)
                .order('name');

            if (error) throw error;
            return res.status(200).json(data);
        } catch (error: any) {
            return res.status(500).json({ error: error.message });
        }
    }

    else if (method === 'POST') {
        try {
            const { name } = req.body;
            if (!name) return res.status(400).json({ error: 'Name is required' });

            const { data, error } = await supabaseAdmin
                .from('income_sources')
                .insert([{
                    user_id: user.id,
                    name
                }])
                .select();

            if (error) throw error;
            return res.status(201).json(data[0]);
        } catch (error: any) {
            return res.status(500).json({ error: error.message });
        }
    }

    else if (method === 'DELETE') {
        try {
            const { id } = req.query;

            if (!id) return res.status(400).json({ error: 'Missing source id' });

            const { error } = await supabaseAdmin
                .from('income_sources')
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
