import { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../_lib/supabase.js';
import { getUserFromRequest } from '../_lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const user = await getUserFromRequest(req);
    if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { method } = req;

    // GET /api/gym/workouts
    if (method === 'GET') {
        try {
            const { id, in_progress, limit, offset } = req.query;

            // Fetch specific workout by ID with all sets
            if (id && typeof id === 'string') {
                const { data: workout, error: workoutErr } = await supabaseAdmin
                    .from('gym_workouts')
                    .select(`
                        *,
                        gym_routines (
                            id,
                            name,
                            target_muscle
                        ),
                        gym_sets (
                            id,
                            exercise_id,
                            set_number,
                            weight_kg,
                            reps,
                            is_warmup,
                            is_completed,
                            completed_at,
                            notes,
                            gym_exercises (
                                id,
                                name,
                                target_muscle,
                                equipment
                            )
                        )
                    `)
                    .eq('id', id)
                    .eq('user_id', user.id)
                    .single();

                if (workoutErr) throw workoutErr;
                if (!workout) return res.status(404).json({ error: 'Workout not found' });

                // Sort sets by exercise_id and set_number
                if (workout.gym_sets) {
                    workout.gym_sets.sort((a: any, b: any) => {
                        if (a.exercise_id === b.exercise_id) {
                            return a.set_number - b.set_number;
                        }
                        return a.id.localeCompare(b.id);
                    });
                }

                return res.status(200).json(workout);
            }

            // Fetch active in-progress workout session (for reload recovery)
            if (in_progress === 'true') {
                const { data: activeSession, error: activeErr } = await supabaseAdmin
                    .from('gym_workouts')
                    .select(`
                        *,
                        gym_routines (
                            id,
                            name,
                            target_muscle
                        ),
                        gym_sets (
                            id,
                            exercise_id,
                            set_number,
                            weight_kg,
                            reps,
                            is_warmup,
                            is_completed,
                            completed_at,
                            notes,
                            gym_exercises (
                                id,
                                name,
                                target_muscle,
                                equipment
                            )
                        )
                    `)
                    .eq('user_id', user.id)
                    .eq('status', 'in_progress')
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (activeErr) throw activeErr;
                return res.status(200).json(activeSession || null);
            }

            // Paginated workout history
            const pageLimit = Math.min(parseInt(limit as string) || 20, 100);
            const pageOffset = parseInt(offset as string) || 0;

            const { data: workouts, error: listErr, count } = await supabaseAdmin
                .from('gym_workouts')
                .select(`
                    *,
                    gym_routines (
                        id,
                        name,
                        target_muscle
                    ),
                    gym_sets (
                        id,
                        exercise_id,
                        set_number,
                        weight_kg,
                        reps,
                        is_warmup,
                        is_completed,
                        gym_exercises (
                            id,
                            name,
                            target_muscle
                        )
                    )
                `, { count: 'exact' })
                .eq('user_id', user.id)
                .order('workout_date', { ascending: false })
                .order('created_at', { ascending: false })
                .range(pageOffset, pageOffset + pageLimit - 1);

            if (listErr) throw listErr;

            return res.status(200).json({
                workouts: workouts || [],
                total: count || 0,
                limit: pageLimit,
                offset: pageOffset
            });
        } catch (error: any) {
            console.error('Error fetching gym workouts:', error);
            return res.status(500).json({ error: error.message });
        }
    }

    // POST /api/gym/workouts
    if (method === 'POST') {
        try {
            const { routine_id, name, workout_date, logging_mode, duration_minutes, notes, sets } = req.body;

            const workoutName = name?.trim() || 'Gym Workout';
            const mode = logging_mode === 'quick' ? 'quick' : 'live';
            const status = mode === 'quick' ? 'completed' : 'in_progress';
            const now = new Date().toISOString();

            // 1. Create workout record
            const { data: workout, error: createErr } = await supabaseAdmin
                .from('gym_workouts')
                .insert([{
                    user_id: user.id,
                    routine_id: routine_id || null,
                    name: workoutName,
                    workout_date: workout_date || now.split('T')[0],
                    status,
                    logging_mode: mode,
                    started_at: now,
                    completed_at: mode === 'quick' ? now : null,
                    duration_minutes: duration_minutes || 0,
                    notes: notes?.trim() || null
                }])
                .select()
                .single();

            if (createErr) throw createErr;

            // 2. If sets were provided (e.g. from Quick Past Log or pre-populating routine)
            if (Array.isArray(sets) && sets.length > 0) {
                const setsToInsert = sets.map((s: any, idx: number) => ({
                    user_id: user.id,
                    workout_id: workout.id,
                    exercise_id: s.exercise_id,
                    set_number: s.set_number || idx + 1,
                    weight_kg: Number(s.weight_kg) || 0,
                    reps: Number(s.reps) || 0,
                    is_warmup: Boolean(s.is_warmup),
                    is_completed: mode === 'quick' ? true : Boolean(s.is_completed),
                    completed_at: mode === 'quick' ? now : (s.is_completed ? now : null),
                    notes: s.notes || null
                }));

                await supabaseAdmin.from('gym_sets').insert(setsToInsert);
            }

            return res.status(201).json(workout);
        } catch (error: any) {
            console.error('Error creating gym workout:', error);
            return res.status(500).json({ error: error.message });
        }
    }

    // PATCH /api/gym/workouts
    if (method === 'PATCH') {
        try {
            const { id, name, workout_date, status, duration_minutes, notes, completed_at } = req.body;
            if (!id) return res.status(400).json({ error: 'Workout ID is required' });

            const updates: any = {};
            if (name !== undefined) updates.name = name.trim();
            if (workout_date !== undefined) updates.workout_date = workout_date;
            if (status !== undefined) {
                updates.status = status;
                if (status === 'completed' && !completed_at) {
                    updates.completed_at = new Date().toISOString();
                }
            }
            if (duration_minutes !== undefined) updates.duration_minutes = Math.max(0, parseInt(duration_minutes));
            if (notes !== undefined) updates.notes = notes?.trim() || null;
            if (completed_at !== undefined) updates.completed_at = completed_at;

            const { data: updated, error: updateErr } = await supabaseAdmin
                .from('gym_workouts')
                .update(updates)
                .eq('id', id)
                .eq('user_id', user.id)
                .select()
                .single();

            if (updateErr) throw updateErr;
            return res.status(200).json(updated);
        } catch (error: any) {
            console.error('Error updating gym workout:', error);
            return res.status(500).json({ error: error.message });
        }
    }

    // DELETE /api/gym/workouts
    if (method === 'DELETE') {
        try {
            const { id } = req.query;
            if (!id || typeof id !== 'string') return res.status(400).json({ error: 'Workout ID is required' });

            const { error: deleteErr } = await supabaseAdmin
                .from('gym_workouts')
                .delete()
                .eq('id', id)
                .eq('user_id', user.id);

            if (deleteErr) throw deleteErr;
            return res.status(200).json({ success: true });
        } catch (error: any) {
            console.error('Error deleting gym workout:', error);
            return res.status(500).json({ error: error.message });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
