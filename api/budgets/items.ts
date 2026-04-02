import { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../_lib/supabase.js';
import { getUserFromRequest } from '../_lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const user = await getUserFromRequest(req);
    if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { method } = req;

    if (method === 'POST') {
        try {
            const { category_id, name, amount, status } = req.body;
            
            if (!category_id || !name) {
                return res.status(400).json({ error: 'category_id and name are required' });
            }

            const { data, error } = await supabaseAdmin
                .from('budget_items')
                .insert([{
                    user_id: user.id,
                    category_id,
                    name,
                    amount: amount || 0,
                    status: status || 'planned'
                }])
                .select()
                .single();

            if (error) throw error;
            return res.status(201).json(data);
            
        } catch (error: any) {
            return res.status(500).json({ error: error.message });
        }
    }

    else if (method === 'PUT') {
        try {
            const { id, name, amount, status } = req.body;
            
            if (!id) return res.status(400).json({ error: 'id is required' });

            const updates: any = {};
            if (name !== undefined) updates.name = name;
            if (amount !== undefined) updates.amount = amount;
            if (status !== undefined) updates.status = status;

            const { data, error } = await supabaseAdmin
                .from('budget_items')
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

    else if (method === 'DELETE') {
        try {
            const { id } = req.query;
            
            if (!id) return res.status(400).json({ error: 'id is required' });

            const { error } = await supabaseAdmin
                .from('budget_items')
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
