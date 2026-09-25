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

                const { data: properties, error: propsErr } = await supabaseAdmin
                    .from('rent_properties')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: true });

                if (propsErr) throw propsErr;

                const { data: collections, error: collsErr } = await supabaseAdmin
                    .from('rent_collections')
                    .select('*')
                    .eq('user_id', user.id)
                    .eq('month_year', month_year);

                if (collsErr) throw collsErr;

                const combined = (properties || []).map(prop => {
                    const collection = (collections || []).find(c => c.property_id === prop.id);
                    return {
                        ...prop,
                        collection: collection || { status: 'pending', month_year, property_id: prop.id }
                    };
                });

                return res.status(200).json(combined);
            }

            // Get single property detail
            if (action === 'get_property') {
                const { id } = req.query;
                if (!id) return res.status(400).json({ error: 'id is required' });

                const { data, error } = await supabaseAdmin
                    .from('rent_properties')
                    .select('*')
                    .eq('id', id)
                    .eq('user_id', user.id)
                    .single();

                if (error) throw error;
                return res.status(200).json(data);
            }

            // Get collection history for a property (all months)
            if (action === 'collection_history') {
                const { property_id } = req.query;
                if (!property_id) return res.status(400).json({ error: 'property_id is required' });

                const { data, error } = await supabaseAdmin
                    .from('rent_collections')
                    .select('*')
                    .eq('user_id', user.id)
                    .eq('property_id', property_id)
                    .order('month_year', { ascending: false });

                if (error) throw error;
                return res.status(200).json(data || []);
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
                const { name, type, tenant_name, rent_amount, due_day, tenant_phone, tenant_id_proof, tenant_move_in, tenant_move_out, security_deposit, advance_rent, notes } = req.body;
                
                const { data, error } = await supabaseAdmin
                    .from('rent_properties')
                    .insert([{
                        user_id: user.id,
                        name,
                        type,
                        tenant_name,
                        rent_amount: Number(rent_amount),
                        due_day: Number(due_day),
                        tenant_phone: tenant_phone || null,
                        tenant_id_proof: tenant_id_proof || null,
                        tenant_move_in: tenant_move_in || null,
                        tenant_move_out: tenant_move_out || null,
                        security_deposit: security_deposit ? Number(security_deposit) : 0,
                        advance_rent: advance_rent ? Number(advance_rent) : 0,
                        notes: notes || null
                    }])
                    .select()
                    .single();

                if (error) throw error;
                return res.status(201).json(data);
            }

            // Update an existing property
            if (action === 'update_property') {
                const { id, name, type, tenant_name, rent_amount, due_day, tenant_phone, tenant_id_proof, tenant_move_in, tenant_move_out, security_deposit, advance_rent, notes } = req.body;
                
                const updateData: any = {};
                if (name !== undefined) updateData.name = name;
                if (type !== undefined) updateData.type = type;
                if (tenant_name !== undefined) updateData.tenant_name = tenant_name;
                if (rent_amount !== undefined) updateData.rent_amount = Number(rent_amount);
                if (due_day !== undefined) updateData.due_day = Number(due_day);
                if (tenant_phone !== undefined) updateData.tenant_phone = tenant_phone || null;
                if (tenant_id_proof !== undefined) updateData.tenant_id_proof = tenant_id_proof || null;
                if (tenant_move_in !== undefined) updateData.tenant_move_in = tenant_move_in || null;
                if (tenant_move_out !== undefined) updateData.tenant_move_out = tenant_move_out || null;
                if (security_deposit !== undefined) updateData.security_deposit = Number(security_deposit) || 0;
                if (advance_rent !== undefined) updateData.advance_rent = Number(advance_rent) || 0;
                if (notes !== undefined) updateData.notes = notes || null;

                const { data, error } = await supabaseAdmin
                    .from('rent_properties')
                    .update(updateData)
                    .eq('id', id)
                    .eq('user_id', user.id)
                    .select()
                    .single();

                if (error) throw error;
                return res.status(200).json(data);
            }

            // Mark rent as collected with payment details
            if (action === 'mark_collected') {
                const { property_id, month_year, amount_paid, paid_on, payment_mode, payment_notes } = req.body;

                const { data, error } = await supabaseAdmin
                    .from('rent_collections')
                    .upsert({
                        user_id: user.id,
                        property_id,
                        month_year,
                        amount_paid: Number(amount_paid),
                        paid_on,
                        payment_mode: payment_mode || 'cash',
                        payment_notes: payment_notes || null,
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
                        payment_mode: null,
                        payment_notes: null,
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
