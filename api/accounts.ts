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
            const { data, error } = await supabaseAdmin
                .from('account_types')
                .select('name')
                .eq('user_id', user.id)
                .order('created_at');

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
                .from('account_types')
                .insert([{
                    user_id: user.id,
                    name
                }])
                .select('name')
                .single();

            if (error) throw error;
            return res.status(201).json(data);
        } catch (error: any) {
            return res.status(500).json({ error: error.message });
        }
    }

    else if (method === 'DELETE') {
        try {
            const { name } = req.query;

            if (!name) return res.status(400).json({ error: 'Missing account type name' });

            const { error } = await supabaseAdmin
                .from('account_types')
                .delete()
                .eq('name', name)
                .eq('user_id', user.id);

            if (error) throw error;
            return res.status(200).json({ success: true });
        } catch (error: any) {
            console.error("Accounts API Error:", error);
            return res.status(500).json({
                error: error.message || "Internal Server Error",
                code: error.code
            });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
