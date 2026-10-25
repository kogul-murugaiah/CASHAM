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

    else if (method === 'PATCH') {
        try {
            const { oldName, newName } = req.body;
            if (!oldName || !newName) return res.status(400).json({ error: 'oldName and newName are required' });

            // 1. Attempt atomic rename via Postgres stored procedure
            const { error: rpcErr } = await supabaseAdmin.rpc('rename_account_type', {
                p_user_id: user.id,
                p_old_name: oldName,
                p_new_name: newName,
            });

            if (!rpcErr) {
                return res.status(200).json({ message: 'Account renamed and propagated atomically' });
            }

            // 2. Fallback to client-side multi-table propagation if stored procedure is pending migration
            const { error: updateErr } = await supabaseAdmin
                .from('account_types')
                .update({ name: newName })
                .eq('name', oldName)
                .eq('user_id', user.id);

            if (updateErr) throw updateErr;

            const propagationTasks = [
                supabaseAdmin.from('expenses').update({ account_type: newName }).eq('account_type', oldName).eq('user_id', user.id),
                supabaseAdmin.from('income').update({ account_type: newName }).eq('account_type', oldName).eq('user_id', user.id),
                supabaseAdmin.from('investments').update({ account_type: newName }).eq('account_type', oldName).eq('user_id', user.id),
                supabaseAdmin.from('transfers').update({ from_account: newName }).eq('from_account', oldName).eq('user_id', user.id),
                supabaseAdmin.from('transfers').update({ to_account: newName }).eq('to_account', oldName).eq('user_id', user.id),
            ];

            const results = await Promise.all(propagationTasks);
            const errors = results.filter(r => r.error).map(r => r.error);
            
            if (errors.length > 0) {
                console.error("Propagation errors:", errors);
            }

            return res.status(200).json({ message: 'Account renamed and propagated successfully' });

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
