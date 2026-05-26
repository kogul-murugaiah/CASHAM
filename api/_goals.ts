import { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from './_lib/supabase.js';
import { getUserFromRequest } from './_lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { method } = req;

    // GET — List all goals
    if (method === 'GET') {
        try {
            const { data, error } = await supabaseAdmin
                .from('savings_goals')
                .select('*')
                .eq('user_id', user.id)
                .order('is_completed', { ascending: true })
                .order('created_at', { ascending: false });
            if (error) throw error;
            return res.status(200).json(data || []);
        } catch (error: any) {
            return res.status(500).json({ error: error.message });
        }
    }

    // POST — Create a new goal
    if (method === 'POST') {
        try {
            const { name, target_amount, icon, color, deadline } = req.body;
            if (!name || !target_amount) {
                return res.status(400).json({ error: 'name and target_amount are required' });
            }
            const { data, error } = await supabaseAdmin
                .from('savings_goals')
                .insert([{
                    user_id: user.id,
                    name,
                    target_amount: Number(target_amount),
                    icon: icon || '🎯',
                    color: color || '#10b981',
                    deadline: deadline || null,
                }])
                .select()
                .single();
            if (error) throw error;
            return res.status(201).json(data);
        } catch (error: any) {
            return res.status(500).json({ error: error.message });
        }
    }

    // PUT — Update a goal (add contribution, edit fields, mark complete)
    if (method === 'PUT') {
        try {
            const { id, add_amount, ...updates } = req.body;
            if (!id) return res.status(400).json({ error: 'id is required' });

            // If adding a contribution, fetch current and increment
            if (add_amount && Number(add_amount) > 0) {
                const { data: current, error: fetchErr } = await supabaseAdmin
                    .from('savings_goals')
                    .select('current_amount, target_amount')
                    .eq('id', id)
                    .eq('user_id', user.id)
                    .single();
                if (fetchErr) throw fetchErr;

                const newAmount = (current?.current_amount || 0) + Number(add_amount);
                const isCompleted = newAmount >= (current?.target_amount || 0);

                const { data, error } = await supabaseAdmin
                    .from('savings_goals')
                    .update({
                        current_amount: newAmount,
                        is_completed: isCompleted,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', id)
                    .eq('user_id', user.id)
                    .select()
                    .single();
                if (error) throw error;
                return res.status(200).json(data);
            }

            // Otherwise, update the provided fields
            const updatePayload: any = { updated_at: new Date().toISOString() };
            if (updates.name !== undefined) updatePayload.name = updates.name;
            if (updates.target_amount !== undefined) updatePayload.target_amount = Number(updates.target_amount);
            if (updates.current_amount !== undefined) updatePayload.current_amount = Number(updates.current_amount);
            if (updates.icon !== undefined) updatePayload.icon = updates.icon;
            if (updates.color !== undefined) updatePayload.color = updates.color;
            if (updates.deadline !== undefined) updatePayload.deadline = updates.deadline || null;
            if (updates.is_completed !== undefined) updatePayload.is_completed = updates.is_completed;

            const { data, error } = await supabaseAdmin
                .from('savings_goals')
                .update(updatePayload)
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

    // DELETE — Remove a goal
    if (method === 'DELETE') {
        try {
            const { id } = req.query;
            if (!id) return res.status(400).json({ error: 'id is required' });
            const { error } = await supabaseAdmin
                .from('savings_goals')
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
