function getISTDateStr(date: Date = new Date()): string {
    const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });
    return formatter.format(date);
}

import { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from './_lib/supabase.js';
import { getUserFromRequest } from './_lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { method } = req;

    // GET → list all advances (optionally filtered by card)
    if (method === 'GET') {
        try {
            const { credit_card_id, pending_only } = req.query;
            let query = supabaseAdmin
                .from('cc_advances')
                .select('*')
                .eq('user_id', user.id)
                .order('date', { ascending: false });

            if (credit_card_id) query = query.eq('credit_card_id', credit_card_id as string);
            if (pending_only === 'true') query = query.eq('cash_received', false);

            const { data, error } = await query;
            if (error) throw error;
            return res.status(200).json(data || []);
        } catch (err: any) {
            return res.status(500).json({ error: err.message });
        }
    }

    // POST → create a new advance
    if (method === 'POST') {
        try {
            const { person_name, amount, paid_amount, repayments, credit_card_id, credit_card_name, date, description } = req.body;
            if (!person_name || !amount || !credit_card_name || !date) {
                return res.status(400).json({ error: 'person_name, amount, credit_card_name and date are required' });
            }
            const insertPayload: any = {
                user_id: user.id,
                person_name: person_name.trim(),
                amount: Number(amount),
                paid_amount: Number(paid_amount || 0),
                repayments: Array.isArray(repayments) ? repayments : [],
                credit_card_id: credit_card_id || null,
                credit_card_name,
                date,
                description: description?.trim() || null,
                cash_received: false,
            };

            let { data, error } = await supabaseAdmin
                .from('cc_advances')
                .insert([insertPayload])
                .select()
                .single();

            if (error && (error.message?.includes('paid_amount') || error.message?.includes('repayments'))) {
                delete insertPayload.paid_amount;
                delete insertPayload.repayments;
                const retry = await supabaseAdmin
                    .from('cc_advances')
                    .insert([insertPayload])
                    .select()
                    .single();
                if (retry.error) throw retry.error;
                data = { ...retry.data, paid_amount: 0, repayments: [] };
            } else if (error) {
                throw error;
            }

            return res.status(201).json(data);
        } catch (err: any) {
            return res.status(500).json({ error: err.message });
        }
    }

    // PUT → mark cash received (or update details)
    if (method === 'PUT') {
        try {
            const { id, cash_received, cash_received_date, person_name, amount, paid_amount, repayments, description } = req.body;
            if (!id) return res.status(400).json({ error: 'id is required' });

            const updates: any = {};
            if (person_name !== undefined) updates.person_name = person_name.trim();
            if (amount !== undefined) updates.amount = Number(amount);
            if (paid_amount !== undefined) updates.paid_amount = Number(paid_amount);
            if (repayments !== undefined) updates.repayments = repayments;
            if (description !== undefined) updates.description = description?.trim() || null;
            if (cash_received !== undefined) {
                updates.cash_received = Boolean(cash_received);
                updates.cash_received_date = cash_received
                    ? (cash_received_date || getISTDateStr())
                    : null;
            }

            let { data, error } = await supabaseAdmin
                .from('cc_advances')
                .update(updates)
                .eq('id', id)
                .eq('user_id', user.id)
                .select()
                .single();

            if (error && (error.message?.includes('paid_amount') || error.message?.includes('repayments'))) {
                delete updates.paid_amount;
                delete updates.repayments;
                const retry = await supabaseAdmin
                    .from('cc_advances')
                    .update(updates)
                    .eq('id', id)
                    .eq('user_id', user.id)
                    .select()
                    .single();
                if (retry.error) throw retry.error;
                data = {
                    ...retry.data,
                    paid_amount: paid_amount !== undefined ? Number(paid_amount) : retry.data?.paid_amount,
                    repayments: repayments !== undefined ? repayments : retry.data?.repayments || [],
                };
            } else if (error) {
                throw error;
            }

            return res.status(200).json(data);
        } catch (err: any) {
            return res.status(500).json({ error: err.message });
        }
    }

    // DELETE → remove an advance
    if (method === 'DELETE') {
        try {
            const { id } = req.query;
            if (!id) return res.status(400).json({ error: 'id is required' });
            const { error } = await supabaseAdmin
                .from('cc_advances')
                .delete()
                .eq('id', id as string)
                .eq('user_id', user.id);
            if (error) throw error;
            return res.status(200).json({ success: true });
        } catch (err: any) {
            return res.status(500).json({ error: err.message });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}