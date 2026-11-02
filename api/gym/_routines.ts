import { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../_lib/supabase.js';
import { getUserFromRequest } from '../_lib/auth.js';

const cleanRoutineName = (name: string) =>
    (name || '')
        .replace(/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s*[\u2013\u2014\-]\s*/i, '')
        .trim();

// Built-in presets for biceps, triceps, back & biceps, chest & triceps
const SYNTHETIC_PRESETS: Record<string, any> = {
    'a0000000-0000-0000-0000-000000000004': {
        id: 'a0000000-0000-0000-0000-000000000004',
        user_id: null,
        name: 'Biceps Blast',
        description: 'High-volume bicep isolation: Barbell curls, Incline curls, Hammer curls, and Preacher curls',
        target_muscle: 'biceps',
        is_preset: true,
        is_active: true,
        gym_routine_exercises: [
            {
                id: 're-bi-1',
                order_index: 1,
                target_sets: 4,
                target_reps: 10,
                rest_seconds: 60,
                notes: 'Strict form, pin elbows at sides',
                gym_exercises: { id: '40000000-0000-0000-0000-000000000001', name: 'Barbell Bicep Curl', target_muscle: 'biceps', equipment: 'barbell', is_preset: true }
            },
            {
                id: 're-bi-2',
                order_index: 2,
                target_sets: 3,
                target_reps: 12,
                rest_seconds: 60,
                notes: 'Incline bench for deep stretch on long head',
                gym_exercises: { id: '40000000-0000-0000-0000-000000000002', name: 'Incline Dumbbell Curl', target_muscle: 'biceps', equipment: 'dumbbell', is_preset: true }
            },
            {
                id: 're-bi-3',
                order_index: 3,
                target_sets: 3,
                target_reps: 12,
                rest_seconds: 60,
                notes: 'Neutral grip for brachialis & forearms',
                gym_exercises: { id: '40000000-0000-0000-0000-000000000003', name: 'Dumbbell Hammer Curl', target_muscle: 'biceps', equipment: 'dumbbell', is_preset: true }
            },
            {
                id: 're-bi-4',
                order_index: 4,
                target_sets: 3,
                target_reps: 15,
                rest_seconds: 60,
                notes: 'Peak squeeze at the top',
                gym_exercises: { id: '40000000-0000-0000-0000-000000000004', name: 'Preacher Curl', target_muscle: 'biceps', equipment: 'barbell', is_preset: true }
            }
        ]
    },
    'a0000000-0000-0000-0000-000000000007': {
        id: 'a0000000-0000-0000-0000-000000000007',
        user_id: null,
        name: 'Triceps Destruction',
        description: 'Horseshoe tricep builder: Pushdowns, Skull Crushers, Overhead Extensions, and Close-Grip Bench',
        target_muscle: 'triceps',
        is_preset: true,
        is_active: true,
        gym_routine_exercises: [
            {
                id: 're-tri-1',
                order_index: 1,
                target_sets: 4,
                target_reps: 12,
                rest_seconds: 60,
                notes: 'Spread rope outwards at full lockout',
                gym_exercises: { id: '50000000-0000-0000-0000-000000000001', name: 'Tricep Rope Pushdown', target_muscle: 'triceps', equipment: 'cable', is_preset: true }
            },
            {
                id: 're-tri-2',
                order_index: 2,
                target_sets: 3,
                target_reps: 10,
                rest_seconds: 75,
                notes: 'Lower bar smoothly to top of forehead',
                gym_exercises: { id: '50000000-0000-0000-0000-000000000002', name: 'EZ-Bar Skull Crushers', target_muscle: 'triceps', equipment: 'barbell', is_preset: true }
            },
            {
                id: 're-tri-3',
                order_index: 3,
                target_sets: 3,
                target_reps: 12,
                rest_seconds: 60,
                notes: 'Full long-head stretch behind neck',
                gym_exercises: { id: '50000000-0000-0000-0000-000000000003', name: 'Overhead Dumbbell Tricep Extension', target_muscle: 'triceps', equipment: 'dumbbell', is_preset: true }
            },
            {
                id: 're-tri-4',
                order_index: 4,
                target_sets: 3,
                target_reps: 8,
                rest_seconds: 90,
                notes: 'Shoulder-width grip, lock out strong with triceps',
                gym_exercises: { id: '50000000-0000-0000-0000-000000000004', name: 'Close-Grip Barbell Bench Press', target_muscle: 'triceps', equipment: 'barbell', is_preset: true }
            }
        ]
    },
    'a0000000-0000-0000-0000-000000000008': {
        id: 'a0000000-0000-0000-0000-000000000008',
        user_id: null,
        name: 'Back & Biceps Combo',
        description: 'Classic pulling split: Heavy deadlifts, vertical lat pulls, horizontal rows and bicep burnout',
        target_muscle: 'back_biceps',
        is_preset: true,
        is_active: true,
        gym_routine_exercises: [
            {
                id: 're-bb-1',
                order_index: 1,
                target_sets: 4,
                target_reps: 6,
                rest_seconds: 120,
                notes: 'Heavy compound pull sets',
                gym_exercises: { id: '20000000-0000-0000-0000-000000000001', name: 'Barbell Conventional Deadlift', target_muscle: 'back', equipment: 'barbell', is_preset: true }
            },
            {
                id: 're-bb-2',
                order_index: 2,
                target_sets: 4,
                target_reps: 10,
                rest_seconds: 90,
                notes: 'Drive elbows down to hips',
                gym_exercises: { id: '20000000-0000-0000-0000-000000000002', name: 'Lat Pulldown', target_muscle: 'back', equipment: 'cable', is_preset: true }
            },
            {
                id: 're-bb-3',
                order_index: 3,
                target_sets: 3,
                target_reps: 12,
                rest_seconds: 75,
                notes: 'Squeeze shoulder blades together',
                gym_exercises: { id: '20000000-0000-0000-0000-000000000004', name: 'Seated Cable Row', target_muscle: 'back', equipment: 'cable', is_preset: true }
            },
            {
                id: 're-bb-4',
                order_index: 4,
                target_sets: 3,
                target_reps: 10,
                rest_seconds: 60,
                notes: 'Strict curls without swinging',
                gym_exercises: { id: '40000000-0000-0000-0000-000000000001', name: 'Barbell Bicep Curl', target_muscle: 'biceps', equipment: 'barbell', is_preset: true }
            },
            {
                id: 're-bb-5',
                order_index: 5,
                target_sets: 3,
                target_reps: 12,
                rest_seconds: 60,
                notes: 'Hammer pump burnout',
                gym_exercises: { id: '40000000-0000-0000-0000-000000000003', name: 'Dumbbell Hammer Curl', target_muscle: 'biceps', equipment: 'dumbbell', is_preset: true }
            }
        ]
    },
    'a0000000-0000-0000-0000-000000000009': {
        id: 'a0000000-0000-0000-0000-000000000009',
        user_id: null,
        name: 'Chest & Triceps Combo',
        description: 'Classic pushing split: Bench pressing, incline dumbbell work, chest flyes and tricep lockouts',
        target_muscle: 'chest_triceps',
        is_preset: true,
        is_active: true,
        gym_routine_exercises: [
            {
                id: 're-ct-1',
                order_index: 1,
                target_sets: 4,
                target_reps: 8,
                rest_seconds: 120,
                notes: 'Flat bench power sets',
                gym_exercises: { id: '10000000-0000-0000-0000-000000000001', name: 'Barbell Bench Press', target_muscle: 'chest', equipment: 'barbell', is_preset: true }
            },
            {
                id: 're-ct-2',
                order_index: 2,
                target_sets: 3,
                target_reps: 10,
                rest_seconds: 90,
                notes: 'Upper chest angle',
                gym_exercises: { id: '10000000-0000-0000-0000-000000000002', name: 'Incline Dumbbell Press', target_muscle: 'chest', equipment: 'dumbbell', is_preset: true }
            },
            {
                id: 're-ct-3',
                order_index: 3,
                target_sets: 3,
                target_reps: 12,
                rest_seconds: 60,
                notes: 'Deep chest stretch and contraction',
                gym_exercises: { id: '10000000-0000-0000-0000-000000000003', name: 'Cable Chest Fly', target_muscle: 'chest', equipment: 'cable', is_preset: true }
            },
            {
                id: 're-ct-4',
                order_index: 4,
                target_sets: 3,
                target_reps: 12,
                rest_seconds: 60,
                notes: 'Tricep pump finisher',
                gym_exercises: { id: '50000000-0000-0000-0000-000000000001', name: 'Tricep Rope Pushdown', target_muscle: 'triceps', equipment: 'cable', is_preset: true }
            },
            {
                id: 're-ct-5',
                order_index: 5,
                target_sets: 3,
                target_reps: 10,
                rest_seconds: 75,
                notes: 'EZ-Bar tricep burnout',
                gym_exercises: { id: '50000000-0000-0000-0000-000000000002', name: 'EZ-Bar Skull Crushers', target_muscle: 'triceps', equipment: 'barbell', is_preset: true }
            }
        ]
    }
};

const MUSCLE_SORT_ORDER: Record<string, number> = {
    chest: 1,
    back: 2,
    shoulders: 3,
    biceps: 4,
    triceps: 5,
    back_biceps: 6,
    chest_triceps: 7,
    legs: 8,
    core: 9
};

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

            // Direct ID lookup
            if (id && typeof id === 'string') {
                const { data, error } = await supabaseAdmin
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
                    .eq('id', id)
                    .maybeSingle();

                if (data) {
                    if (data.gym_routine_exercises) {
                        data.gym_routine_exercises.sort((a: any, b: any) => a.order_index - b.order_index);
                    }
                    data.name = cleanRoutineName(data.name);
                    return res.status(200).json(data);
                }

                // If not found in DB, check synthetic presets
                if (SYNTHETIC_PRESETS[id]) {
                    return res.status(200).json(SYNTHETIC_PRESETS[id]);
                }

                if (error) throw error;
                return res.status(404).json({ error: 'Routine not found' });
            }

            // Fetch all active routines for user & presets
            const { data, error } = await supabaseAdmin
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
                .or(`user_id.is.null,user_id.eq.${user.id}`);

            if (error) throw error;

            const existingRoutines = (data || []).map((r: any) => {
                if (r.gym_routine_exercises) {
                    r.gym_routine_exercises.sort((a: any, b: any) => a.order_index - b.order_index);
                }
                const cleaned = cleanRoutineName(r.name);
                // If this was the legacy combined arms routine, treat as Biceps Blast
                if (r.id === 'a0000000-0000-0000-0000-000000000004' && cleaned.toLowerCase().includes('arms')) {
                    return {
                        ...r,
                        name: 'Biceps Blast',
                        target_muscle: 'biceps',
                        description: 'High-volume bicep isolation: Barbell curls, Incline curls, Hammer curls, and Preacher curls'
                    };
                }
                return {
                    ...r,
                    name: cleaned
                };
            });

            // Check which presets are represented
            const hasTriceps = existingRoutines.some((r: any) => r.target_muscle === 'triceps' || r.id === 'a0000000-0000-0000-0000-000000000007');
            const hasBackBiceps = existingRoutines.some((r: any) => r.target_muscle === 'back_biceps' || r.id === 'a0000000-0000-0000-0000-000000000008');
            const hasChestTriceps = existingRoutines.some((r: any) => r.target_muscle === 'chest_triceps' || r.id === 'a0000000-0000-0000-0000-000000000009');
            const hasBiceps = existingRoutines.some((r: any) => r.target_muscle === 'biceps' || r.id === 'a0000000-0000-0000-0000-000000000004');

            const allRoutines = [...existingRoutines];

            if (!hasBiceps) {
                allRoutines.push(SYNTHETIC_PRESETS['a0000000-0000-0000-0000-000000000004']);
            }
            if (!hasTriceps) {
                allRoutines.push(SYNTHETIC_PRESETS['a0000000-0000-0000-0000-000000000007']);
            }
            if (!hasBackBiceps) {
                allRoutines.push(SYNTHETIC_PRESETS['a0000000-0000-0000-0000-000000000008']);
            }
            if (!hasChestTriceps) {
                allRoutines.push(SYNTHETIC_PRESETS['a0000000-0000-0000-0000-000000000009']);
            }

            // Sort routines logically by muscle group, custom routines follow
            allRoutines.sort((a, b) => {
                const orderA = MUSCLE_SORT_ORDER[a.target_muscle] ?? 50;
                const orderB = MUSCLE_SORT_ORDER[b.target_muscle] ?? 50;
                if (orderA !== orderB) return orderA - orderB;
                return (a.name || '').localeCompare(b.name || '');
            });

            return res.status(200).json(allRoutines);
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

            // Create routine
            const { data: newRoutine, error: routineErr } = await supabaseAdmin
                .from('gym_routines')
                .insert([{
                    user_id: user.id,
                    name: name.trim(),
                    description: description?.trim() || null,
                    target_muscle: target_muscle?.toLowerCase() || null,
                    day_of_week: day_of_week !== null && day_of_week !== undefined && day_of_week !== '' ? parseInt(day_of_week) : null,
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
            if (day_of_week !== undefined) updates.day_of_week = day_of_week !== null && day_of_week !== '' ? parseInt(day_of_week) : null;
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
