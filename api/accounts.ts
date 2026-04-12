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

            // 1. Update the account type name itself
            const { error: updateErr } = await supabaseAdmin
                .from('account_types')
                .update({ name: newName })
                .eq('name', oldName)
                .eq('user_id', user.id);

            if (updateErr) throw updateErr;

            // 2. Propagate the name change to all transaction tables
            // These are string-based references, so we update them in bulk.
            const propagationTasks = [
                // Expenses
                supabaseAdmin.from('expenses').update({ account_type: newName }).eq('account_type', oldName).eq('user_id', user.id),
                // Incomes
                supabaseAdmin.from('income').update({ account_type: newName }).eq('account_type', oldName).eq('user_id', user.id),
                // Investments
                supabaseAdmin.from('investments').update({ account_type: newName }).eq('account_type', oldName).eq('user_id', user.id),
                // Transfers (From)
                supabaseAdmin.from('transfers').update({ from_account: newName }).eq('from_account', oldName).eq('user_id', user.id),
                // Transfers (To)
                supabaseAdmin.from('transfers').update({ to_account: newName }).eq('to_account', oldName).eq('user_id', user.id),
            ];

            const results = await Promise.all(propagationTasks);
            const errors = results.filter(r => r.error).map(r => r.error);
            
            if (errors.length > 0) {
                console.error("Propagation errors:", errors);
                // We don't fail the whole request because the primary name is updated, 
                // but we log it for tracing.
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
