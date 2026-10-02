import { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from './_lib/supabase.js';
import { getUserFromRequest } from './_lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { method } = req;
    const { action } = req.query;

    try {
        if (method === 'GET') {
            if (action === 'list_funds') {
                const { data, error } = await supabaseAdmin
                    .from('funds')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false });

                if (error) throw error;

                // Also fetch all transactions to compute balances on the fly
                const { data: txData, error: txError } = await supabaseAdmin
                    .from('fund_transactions')
                    .select('fund_id, type, amount, status')
                    .eq('user_id', user.id);

                if (txError) throw txError;

                const enrichedData = (data || []).map(fund => {
                    const txs = (txData || []).filter(t => t.fund_id === fund.id);
                    let totalIncome = 0;
                    let completedExpenses = 0;
                    let plannedExpenses = 0;

                    txs.forEach(t => {
                        if (t.type === 'income') {
                            totalIncome += Number(t.amount);
                        } else if (t.type === 'expense') {
                            if (t.status === 'completed') completedExpenses += Number(t.amount);
                            if (t.status === 'planned') plannedExpenses += Number(t.amount);
                        }
                    });

                    return {
                        ...fund,
                        totalIncome,
                        actualBalance: totalIncome - completedExpenses,
                        projectedBalance: totalIncome - completedExpenses - plannedExpenses
                    };
                });

                return res.status(200).json(enrichedData);
            }

            if (action === 'list_transactions') {
                const { fund_id } = req.query;
                if (!fund_id) return res.status(400).json({ error: 'fund_id is required' });

                const { data, error } = await supabaseAdmin
                    .from('fund_transactions')
                    .select('*')
                    .eq('user_id', user.id)
                    .eq('fund_id', fund_id)
                    .order('date', { ascending: false })
                    .order('created_at', { ascending: false });

                if (error) throw error;
                return res.status(200).json(data || []);
            }
        }

        if (method === 'POST') {
            if (action === 'create_fund') {
                const { name, description } = req.body;
                if (!name) return res.status(400).json({ error: 'name is required' });

                const { data, error } = await supabaseAdmin
                    .from('funds')
                    .insert([{ user_id: user.id, name, description }])
                    .select()
                    .single();

                if (error) throw error;
                return res.status(201).json({
                    ...data,
                    totalIncome: 0,
                    actualBalance: 0,
                    projectedBalance: 0
                });
            }

            if (action === 'add_transaction') {
                const { fund_id, type, amount, date, description, status } = req.body;

                const { data, error } = await supabaseAdmin
                    .from('fund_transactions')
                    .insert([{
                        user_id: user.id,
                        fund_id,
                        type,
                        amount: Number(amount),
                        date,
                        description,
                        status: type === 'income' ? 'completed' : (status || 'completed')
                    }])
                    .select()
                    .single();

                if (error) throw error;
                return res.status(201).json(data);
            }
        }

        if (method === 'PUT') {
            if (action === 'update_transaction') {
                const { id, status } = req.body;
                const { data, error } = await supabaseAdmin
                    .from('fund_transactions')
                    .update({ status })
                    .eq('id', id)
                    .eq('user_id', user.id)
                    .select()
                    .single();

                if (error) throw error;
                return res.status(200).json(data);
            }
        }

        if (method === 'DELETE') {
            if (action === 'delete_fund') {
                const { id } = req.query;
                const { error } = await supabaseAdmin
                    .from('funds')
                    .delete()
                    .eq('id', id)
                    .eq('user_id', user.id);

                if (error) throw error;
                return res.status(200).json({ success: true });
            }

            if (action === 'delete_transaction') {
                const { id } = req.query;
                const { error } = await supabaseAdmin
                    .from('fund_transactions')
                    .delete()
                    .eq('id', id)
                    .eq('user_id', user.id);

                if (error) throw error;
                return res.status(200).json({ success: true });
            }
        }

        return res.status(405).json({ error: 'Method not allowed' });

    } catch (err: any) {
        console.error('Funds API Error:', err);
        return res.status(500).json({ error: err.message });
    }
}
