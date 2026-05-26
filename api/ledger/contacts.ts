import { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../_lib/supabase.js';
import { getUserFromRequest } from '../_lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { method } = req;

    if (method === 'GET') {
        try {
            const { data, error } = await supabaseAdmin
                .from('ledger_contacts')
                .select(`
                    id, name, created_at,
                    ledger_transactions (amount, type, date, created_at)
                `)
                .eq('user_id', user.id)
                .order('name', { ascending: true });

            if (error) throw error;

            const contacts = data.map((contact: any) => {
                let netBalance = 0;
                // Sort by date then created_at to process chronologically
                const sorted = (contact.ledger_transactions || []).sort((a: any, b: any) => {
                    const diff = new Date(a.date).getTime() - new Date(b.date).getTime();
                    if (diff !== 0) return diff;
                    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
                });

                for (const t of sorted) {
                    if (t.type === 'settled') netBalance = 0;
                    else if (t.type === 'gave') netBalance += Number(t.amount);
                    else if (t.type === 'got') netBalance -= Number(t.amount);
                }

                return {
                    id: contact.id,
                    name: contact.name,
                    created_at: contact.created_at,
                    net_balance: netBalance
                };
            });

            return res.status(200).json(contacts);
        } catch (err: any) {
            return res.status(500).json({ error: err.message });
        }
    }

    if (method === 'POST') {
        try {
            const { name } = req.body;
            if (!name) return res.status(400).json({ error: 'Name is required' });

            const { data, error } = await supabaseAdmin
                .from('ledger_contacts')
                .insert([{ user_id: user.id, name }])
                .select()
                .single();

            if (error) throw error;
            return res.status(201).json({ ...data, net_balance: 0 });
        } catch (err: any) {
            return res.status(500).json({ error: err.message });
        }
    }

    if (method === 'DELETE') {
        try {
            const { id } = req.query;
            if (!id) return res.status(400).json({ error: 'Missing id' });

            const { error } = await supabaseAdmin
                .from('ledger_contacts')
                .delete()
                .eq('id', id)
                .eq('user_id', user.id);

            if (error) throw error;
            return res.status(200).json({ success: true });
        } catch (err: any) {
            return res.status(500).json({ error: err.message });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
