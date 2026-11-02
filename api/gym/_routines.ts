import { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../_lib/supabase.js';
import { getUserFromRequest } from '../_lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const user = await getUserFromRequest(req);
    if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { method } = req;

    // GET /api/gym/routines
    if (method === 'GET') {
        try {
            const { id } = req.query;

            let query = supabaseAdmin
                .from('gym_routines')
                .select(`
                    id,
                    user_id,
                    name,
                    description,
                    target_muscle,
                    day_of_week,
                    is_preset,
                    is_active,
                    created_at,
                    updated_at,
                    gym_routine_exercises (
                        id,
                        order_index,
                        target_sets,
                        target_reps,
                        target_weight_kg,
                        rest_seconds,
                        notes,
                        gym_exercises (
                            id,
                            name,
                            target_muscle,
                            equipment,
                            is_preset
                        )
                    )
                `)
                .eq('is_active', true)
                .or(`user_id.is.null,user_id.eq.${user.id}`)
                .order('day_of_week', { ascending: true, nullsFirst: false });

            if (id && typeof id === 'string') {
                query = query.eq('id', id);
                const { data, error } = await query.single();
                if (error) throw error;
                // Sort exercises by order_index
                if (data && data.gym_routine_exercises) {
                    data.gym_routine_exercises.sort((a: any, b: any) => a.order_index - b.order_index);
                }
                return res.status(200).json(data);
            }

            const { data, error } = await query;
            if (error) throw error;

            // Prioritize user's custom routine over preset for the same day_of_week
            const routineMapByDay = new Map<number, any>();
            const otherRoutines: any[] = [];

            for (const routine of (data || [])) {
                if (routine.gym_routine_exercises) {
                    routine.gym_routine_exercises.sort((a: any, b: any) => a.order_index - b.order_index);
                }

                if (routine.day_of_week !== null && routine.day_of_week !== undefined) {
                    const existing = routineMapByDay.get(routine.day_of_week);
                    if (!existing || (!routine.is_preset && existing.is_preset)) {
                        routineMapByDay.set(routine.day_of_week, routine);
                    }
                } else {
                    otherRoutines.push(routine);
                }
            }

            const routines = [...Array.from(routineMapByDay.values()), ...otherRoutines];
            routines.sort((a, b) => (a.day_of_week ?? 99) - (b.day_of_week ?? 99));

            return res.status(200).json(routines);
        } catch (error: any) {
            console.error('Error fetching gym routines:', error);
            return res.status(500).json({ error: error.message });
        }
    }

    // POST /api/gym/routines
    if (method === 'POST') {
        try {
            const { name, description, target_muscle, day_of_week, exercises } = req.body;

            if (!name) {
                return res.status(400).json({ error: 'Routine name is required' });
            }

            // Archive any older custom routine on the same day
            if (day_of_week !== null && day_of_week !== undefined) {
                await supabaseAdmin
                    .from('gym_routines')
                    .update({ is_active: false })
                    .eq('user_id', user.id)
                    .eq('day_of_week', parseInt(day_of_week))
                    .eq('is_preset', false);
            }

            // Create routine
            const { data: newRoutine, error: routineErr } = await supabaseAdmin
                .from('gym_routines')
                .insert([{
                    user_id: user.id,
                    name: name.trim(),
                    description: description?.trim() || null,
                    target_muscle: target_muscle?.toLowerCase() || null,
                    day_of_week: day_of_week ? parseInt(day_of_week) : null,
                    is_preset: false,
                    is_active: true
                }])
                .select()
                .single();

            if (routineErr) throw routineErr;

            // Insert routine exercises if provided
            if (Array.isArray(exercises) && exercises.length > 0) {
                const routineExercises = exercises.map((ex: any, idx: number) => ({
                    routine_id: newRoutine.id,
                    exercise_id: ex.exercise_id,
                    order_index: ex.order_index || idx + 1,
                    target_sets: ex.target_sets || 3,
                    target_reps: ex.target_reps || 10,
                    target_weight_kg: ex.target_weight_kg || null,
                    rest_seconds: ex.rest_seconds || 90,
                    notes: ex.notes || null
                }));

                await supabaseAdmin.from('gym_routine_exercises').insert(routineExercises);
            }

            return res.status(201).json(newRoutine);
        } catch (error: any) {
            console.error('Error creating gym routine:', error);
            return res.status(500).json({ error: error.message });
        }
    }

    // PATCH /api/gym/routines
    if (method === 'PATCH') {
        try {
            const { id, name, description, target_muscle, day_of_week, is_active, exercises } = req.body;
            if (!id) return res.status(400).json({ error: 'Routine ID is required' });

            const { data: existing } = await supabaseAdmin
                .from('gym_routines')
                .select('id, user_id, is_preset')
                .eq('id', id)
                .single();

            if (!existing) return res.status(404).json({ error: 'Routine not found' });
            if (existing.is_preset || existing.user_id !== user.id) {
                return res.status(403).json({ error: 'Cannot modify system preset routines' });
            }

            const updates: any = { updated_at: new Date().toISOString() };
            if (name !== undefined) updates.name = name.trim();
            if (description !== undefined) updates.description = description.trim();
            if (target_muscle !== undefined) updates.target_muscle = target_muscle.toLowerCase();
            if (day_of_week !== undefined) updates.day_of_week = day_of_week ? parseInt(day_of_week) : null;
            if (is_active !== undefined) updates.is_active = Boolean(is_active);

            const { data: updated, error: updateErr } = await supabaseAdmin
                .from('gym_routines')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (updateErr) throw updateErr;

            // If exercises array passed, replace routine exercises
            if (Array.isArray(exercises)) {
                await supabaseAdmin.from('gym_routine_exercises').delete().eq('routine_id', id);
                if (exercises.length > 0) {
                    const routineExercises = exercises.map((ex: any, idx: number) => ({
                        routine_id: id,
                        exercise_id: ex.exercise_id,
                        order_index: ex.order_index || idx + 1,
                        target_sets: ex.target_sets || 3,
                        target_reps: ex.target_reps || 10,
                        target_weight_kg: ex.target_weight_kg || null,
                        rest_seconds: ex.rest_seconds || 90,
                        notes: ex.notes || null
                    }));
                    await supabaseAdmin.from('gym_routine_exercises').insert(routineExercises);
                }
            }

            return res.status(200).json(updated);
        } catch (error: any) {
            console.error('Error updating gym routine:', error);
            return res.status(500).json({ error: error.message });
        }
    }

    // DELETE /api/gym/routines (Soft-delete archive)
    if (method === 'DELETE') {
        try {
            const { id } = req.query;
            if (!id || typeof id !== 'string') return res.status(400).json({ error: 'Routine ID is required' });

            const { data: existing } = await supabaseAdmin
                .from('gym_routines')
                .select('id, user_id, is_preset')
                .eq('id', id)
                .single();

            if (!existing) return res.status(404).json({ error: 'Routine not found' });
            if (existing.is_preset || existing.user_id !== user.id) {
                return res.status(403).json({ error: 'Cannot delete preset routines' });
            }

            // Soft-delete to preserve references
            await supabaseAdmin
                .from('gym_routines')
                .update({ is_active: false })
                .eq('id', id);

            return res.status(200).json({ success: true, archived: true });
        } catch (error: any) {
            console.error('Error deleting gym routine:', error);
            return res.status(500).json({ error: error.message });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}

