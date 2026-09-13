import { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from './_lib/supabase.js';
import { getUserFromRequest } from './_lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { method } = req;
    const { action } = req.query;

    try {
        // --- GET Endpoints ---
        if (method === 'GET') {
            // Get properties and their collection status for a specific month
            if (action === 'collections') {
                const month_year = req.query.month_year as string;
                if (!month_year) return res.status(400).json({ error: 'month_year is required' });

                // 1. Fetch all properties
                const { data: properties, error: propsErr } = await supabaseAdmin
                    .from('rent_properties')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: true });

                if (propsErr) throw propsErr;

                // 2. Fetch collections for the specific month
                const { data: collections, error: collsErr } = await supabaseAdmin
                    .from('rent_collections')
                    .select('*')
                    .eq('user_id', user.id)
                    .eq('month_year', month_year);

                if (collsErr) throw collsErr;

                // 3. Combine them
                const combined = (properties || []).map(prop => {
                    const collection = (collections || []).find(c => c.property_id === prop.id);
                    return {
                        ...prop,
                        collection: collection || { status: 'pending', month_year, property_id: prop.id }
                    };
                });

                return res.status(200).json(combined);
            }
            
            // Get just properties
            const { data, error } = await supabaseAdmin
                .from('rent_properties')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: true });

            if (error) throw error;
            return res.status(200).json(data || []);
        }

        // --- POST Endpoints ---
        if (method === 'POST') {
            // Add a new property
            if (action === 'add_property') {
                const { name, type, tenant_name, rent_amount, due_day } = req.body;
                
                const { data, error } = await supabaseAdmin
                    .from('rent_properties')
                    .insert([{
                        user_id: user.id,
                        name,
                        type,
                        tenant_name,
                        rent_amount: Number(rent_amount),
                        due_day: Number(due_day)
                    }])
                    .select()
                    .single();

                if (error) throw error;
                return res.status(201).json(data);
            }

            // Mark rent as collected (upsert collection record)
            if (action === 'mark_collected') {
                const { property_id, month_year, amount_paid, paid_on } = req.body;

                // Upsert to handle both insert and update
                const { data, error } = await supabaseAdmin
                    .from('rent_collections')
                    .upsert({
                        user_id: user.id,
                        property_id,
                        month_year,
                        amount_paid: Number(amount_paid),
                        paid_on,
                        status: 'paid'
                    }, {
                        onConflict: 'property_id, month_year'
                    })
                    .select()
                    .single();

                if (error) throw error;
                return res.status(200).json(data);
            }
            
            // Mark rent as pending
            if (action === 'mark_pending') {
                const { property_id, month_year } = req.body;

                const { data, error } = await supabaseAdmin
                    .from('rent_collections')
                    .upsert({
                        user_id: user.id,
                        property_id,
                        month_year,
                        amount_paid: 0,
                        paid_on: null,
                        status: 'pending'
                    }, {
                        onConflict: 'property_id, month_year'
                    })
                    .select()
                    .single();

                if (error) throw error;
                return res.status(200).json(data);
            }
        }

        // --- DELETE Endpoints ---
        if (method === 'DELETE') {
            if (action === 'delete_property') {
                const { id } = req.query;
                const { error } = await supabaseAdmin
                    .from('rent_properties')
                    .delete()
                    .eq('id', id)
                    .eq('user_id', user.id);

                if (error) throw error;
                return res.status(200).json({ success: true });
            }
        }

        return res.status(405).json({ error: 'Method not allowed' });

    } catch (err: any) {
        console.error('Rent API Error:', err);
        return res.status(500).json({ error: err.message });
    }
}
