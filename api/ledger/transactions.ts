import { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../_lib/supabase.js';
import { getUserFromRequest } from '../_lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { method } = req;

    if (method === 'GET') {
        try {
            const { contact_id } = req.query;
            if (!contact_id) return res.status(400).json({ error: 'Missing contact_id' });

            // Verify contact belongs to user
            const { data: contact, error: contactErr } = await supabaseAdmin
                .from('ledger_contacts')
                .select('id')
                .eq('id', contact_id as string)
                .eq('user_id', user.id)
                .single();
            
            if (contactErr || !contact) return res.status(404).json({ error: 'Contact not found' });

            const { data, error } = await supabaseAdmin
                .from('ledger_transactions')
                .select('*')
                .eq('contact_id', contact_id as string)
                .order('date', { ascending: false })
                .order('created_at', { ascending: false });

            if (error) throw error;
            return res.status(200).json(data);
        } catch (err: any) {
            return res.status(500).json({ error: err.message });
        }
    }

    if (method === 'POST') {
        try {
            const { contact_id, amount, type, note, date } = req.body;
            if (!contact_id || amount === undefined || !type) return res.status(400).json({ error: 'Missing required fields' });

            // Verify contact belongs to user
            const { data: contact, error: contactErr } = await supabaseAdmin
                .from('ledger_contacts')
                .select('id')
                .eq('id', contact_id)
                .eq('user_id', user.id)
                .single();
            if (contactErr || !contact) return res.status(404).json({ error: 'Contact not found' });

            const { data, error } = await supabaseAdmin
                .from('ledger_transactions')
                .insert([{
                    contact_id,
                    amount: Number(amount),
                    type,
                    note: note || null,
                    date: date || new Date().toISOString().slice(0, 10)
                }])
                .select()
                .single();

            if (error) throw error;
            return res.status(201).json(data);
        } catch (err: any) {
            return res.status(500).json({ error: err.message });
        }
    }

    if (method === 'DELETE') {
        try {
            const { id } = req.query;
            if (!id) return res.status(400).json({ error: 'Missing transaction id' });

            const { data: tx, error: txErr } = await supabaseAdmin
                .from('ledger_transactions')
                .select('contact_id, ledger_contacts!inner(user_id)')
                .eq('id', id as string)
                .single();

            if (txErr || !tx || (tx.ledger_contacts as any).user_id !== user.id) {
                return res.status(404).json({ error: 'Transaction not found' });
            }

            const { error } = await supabaseAdmin
                .from('ledger_transactions')
                .delete()
                .eq('id', id as string);

            if (error) throw error;
            return res.status(200).json({ success: true });
        } catch (err: any) {
            return res.status(500).json({ error: err.message });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
