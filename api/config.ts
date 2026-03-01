import { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from './_lib/supabase.js';
import { getUserFromRequest } from './_lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const user = await getUserFromRequest(req);
    if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { method, query } = req;
    const type = query.type as string;

    const allowedTypes = ['account_types', 'categories', 'income_sources'];
    if (!allowedTypes.includes(type)) {
        return res.status(400).json({ error: 'Invalid config type' });
    }

    if (method === 'GET') {
        try {
            const { data, error } = await supabaseAdmin
                .from(type)
                .select('*')
                .eq('user_id', user.id)
                .order(type === 'account_types' ? 'created_at' : 'name');

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
                .from(type)
                .insert([{ user_id: user.id, name }])
                .select(type === 'account_types' ? 'name' : '*')
                .single();

            if (error) throw error;

            // Hooks expect a single object
            return res.status(201).json(data);
        } catch (error: any) {
            return res.status(500).json({ error: error.message });
        }
    }

    else if (method === 'DELETE') {
        try {
            if (type === 'account_types') {
                const { name } = req.query;
                if (!name) return res.status(400).json({ error: 'Missing name' });
                const { error } = await supabaseAdmin.from(type).delete().eq('name', name).eq('user_id', user.id);
                if (error) throw error;
            } else {
                const { id } = req.query;
                if (!id) return res.status(400).json({ error: 'Missing id' });
                const { error } = await supabaseAdmin.from(type).delete().eq('id', id).eq('user_id', user.id);
                if (error) throw error;
            }

            return res.status(200).json({ success: true });
        } catch (error: any) {
            return res.status(500).json({ error: error.message });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
