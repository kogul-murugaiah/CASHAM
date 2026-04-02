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
            const { budget_id, name, allocated_amount } = req.body;
            
            if (!budget_id || !name) {
                return res.status(400).json({ error: 'budget_id and name are required' });
            }

            const { data, error } = await supabaseAdmin
                .from('budget_categories')
                .insert([{
                    user_id: user.id,
                    budget_id,
                    name,
                    allocated_amount: allocated_amount || 0
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
            const { id, name, allocated_amount } = req.body;
            
            if (!id) return res.status(400).json({ error: 'id is required' });

            const updates: any = {};
            if (name !== undefined) updates.name = name;
            if (allocated_amount !== undefined) updates.allocated_amount = allocated_amount;

            const { data, error } = await supabaseAdmin
                .from('budget_categories')
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
                .from('budget_categories')
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
