import { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../_lib/supabase.js';
import { getUserFromRequest } from '../_lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const user = await getUserFromRequest(req);
    if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { method } = req;

    // GET /api/gym/exercises
    if (method === 'GET') {
        try {
            const { muscle, equipment, search } = req.query;

            let query = supabaseAdmin
                .from('gym_exercises')
                .select(`
                    id,
                    user_id,
                    name,
                    target_muscle,
                    equipment,
                    is_preset,
                    is_active,
                    created_at,
                    gym_exercise_muscles (
                        muscle,
                        role
                    )
                `)
                .eq('is_active', true)
                .or(`user_id.is.null,user_id.eq.${user.id}`)
                .order('name', { ascending: true });

            if (muscle && typeof muscle === 'string') {
                query = query.eq('target_muscle', muscle);
            }
            if (equipment && typeof equipment === 'string') {
                query = query.eq('equipment', equipment);
            }

            const { data, error } = await query;
            if (error) throw error;

            let exercises = data || [];
            if (search && typeof search === 'string') {
                const s = search.toLowerCase().trim();
                exercises = exercises.filter(e => e.name.toLowerCase().includes(s));
            }

            return res.status(200).json(exercises);
        } catch (error: any) {
            console.error('Error fetching gym exercises:', error);
            return res.status(500).json({ error: error.message });
        }
    }

    // POST /api/gym/exercises
    if (method === 'POST') {
        try {
            const { name, target_muscle, equipment, secondary_muscles } = req.body;

            if (!name || !target_muscle || !equipment) {
                return res.status(400).json({ error: 'Name, target_muscle, and equipment are required' });
            }

            const validMuscles = ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'legs', 'core'];
            const validEquipment = ['barbell', 'dumbbell', 'cable', 'machine', 'bodyweight', 'other'];

            if (!validMuscles.includes(target_muscle.toLowerCase())) {
                return res.status(400).json({ error: 'Invalid target muscle group' });
            }
            if (!validEquipment.includes(equipment.toLowerCase())) {
                return res.status(400).json({ error: 'Invalid equipment type' });
            }

            // Insert custom exercise
            const { data: newExercise, error: insertError } = await supabaseAdmin
                .from('gym_exercises')
                .insert([{
                    user_id: user.id,
                    name: name.trim(),
                    target_muscle: target_muscle.toLowerCase(),
                    equipment: equipment.toLowerCase(),
                    is_preset: false,
                    is_active: true
                }])
                .select()
                .single();

            if (insertError) throw insertError;

            // Insert primary muscle mapping
            const muscleMappings: any[] = [
                { exercise_id: newExercise.id, muscle: target_muscle.toLowerCase(), role: 'primary' }
            ];

            // Insert secondary muscles if provided
            if (Array.isArray(secondary_muscles)) {
                for (const sm of secondary_muscles) {
                    const smClean = String(sm).toLowerCase();
                    if (validMuscles.includes(smClean) && smClean !== target_muscle.toLowerCase()) {
                        muscleMappings.push({ exercise_id: newExercise.id, muscle: smClean, role: 'secondary' });
                    }
                }
            }

            await supabaseAdmin.from('gym_exercise_muscles').insert(muscleMappings);

            return res.status(201).json(newExercise);
        } catch (error: any) {
            console.error('Error creating gym exercise:', error);
            return res.status(500).json({ error: error.message });
        }
    }

    // PATCH /api/gym/exercises
    if (method === 'PATCH') {
        try {
            const { id, name, target_muscle, equipment, is_active } = req.body;
            if (!id) return res.status(400).json({ error: 'Exercise ID is required' });

            // Verify ownership
            const { data: existing, error: findError } = await supabaseAdmin
                .from('gym_exercises')
                .select('id, user_id, is_preset')
                .eq('id', id)
                .single();

            if (findError || !existing) return res.status(404).json({ error: 'Exercise not found' });
            if (existing.is_preset || existing.user_id !== user.id) {
                return res.status(403).json({ error: 'Cannot modify system preset exercises' });
            }

            const updates: any = {};
            if (name !== undefined) updates.name = name.trim();
            if (target_muscle !== undefined) updates.target_muscle = target_muscle.toLowerCase();
            if (equipment !== undefined) updates.equipment = equipment.toLowerCase();
            if (is_active !== undefined) updates.is_active = Boolean(is_active);

            const { data: updated, error: updateError } = await supabaseAdmin
                .from('gym_exercises')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (updateError) throw updateError;
            return res.status(200).json(updated);
        } catch (error: any) {
            console.error('Error updating gym exercise:', error);
            return res.status(500).json({ error: error.message });
        }
    }

    // DELETE /api/gym/exercises (Soft-delete archive)
    if (method === 'DELETE') {
        try {
            const { id } = req.query;
            if (!id || typeof id !== 'string') return res.status(400).json({ error: 'Exercise ID is required' });

            const { data: existing } = await supabaseAdmin
                .from('gym_exercises')
                .select('id, user_id, is_preset')
                .eq('id', id)
                .single();

            if (!existing) return res.status(404).json({ error: 'Exercise not found' });
            if (existing.is_preset || existing.user_id !== user.id) {
                return res.status(403).json({ error: 'Cannot delete system preset exercises' });
            }

            // Check if referenced in historical sets
            const { count: setsCount } = await supabaseAdmin
                .from('gym_sets')
                .select('*', { count: 'exact', head: true })
                .eq('exercise_id', id);

            if (setsCount && setsCount > 0) {
                // Soft-delete to protect historical records
                await supabaseAdmin
                    .from('gym_exercises')
                    .update({ is_active: false })
                    .eq('id', id);
                return res.status(200).json({ success: true, archived: true, message: 'Exercise archived to protect workout history' });
            } else {
                // Hard delete if never logged
                await supabaseAdmin.from('gym_exercises').delete().eq('id', id);
                return res.status(200).json({ success: true, deleted: true });
            }
        } catch (error: any) {
            console.error('Error deleting gym exercise:', error);
            return res.status(500).json({ error: error.message });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
