import { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../_lib/supabase.js';
import { getUserFromRequest } from '../_lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const user = await getUserFromRequest(req);
    if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { method } = req;

    // Helper: Calculate if a weight represents a new PR for this exercise
    async function evaluatePR(exerciseId: string, weightKg: number, excludeSetId?: string) {
        if (weightKg <= 0) {
            return { is_new_pr: false, previous_max_kg: 0, pr_improvement_kg: 0 };
        }

        let query = supabaseAdmin
            .from('gym_sets')
            .select('weight_kg')
            .eq('user_id', user!.id)
            .eq('exercise_id', exerciseId)
            .eq('is_completed', true)
            .eq('is_warmup', false)
            .order('weight_kg', { ascending: false })
            .limit(1);

        if (excludeSetId) {
            query = query.neq('id', excludeSetId);
        }

        const { data: previousTop } = await query.maybeSingle();
        const previousMax = previousTop ? Number(previousTop.weight_kg) : 0;

        if (weightKg > previousMax) {
            return {
                is_new_pr: true,
                previous_max_kg: previousMax,
                pr_improvement_kg: Number((weightKg - previousMax).toFixed(2))
            };
        }

        return {
            is_new_pr: false,
            previous_max_kg: previousMax,
            pr_improvement_kg: 0
        };
    }

    // POST /api/gym/sets (Log a single set or batch of sets)
    if (method === 'POST') {
        try {
            const { workout_id, exercise_id, set_number, weight_kg, reps, is_warmup, is_completed, notes, batch } = req.body;

            if (!workout_id) {
                return res.status(400).json({ error: 'workout_id is required' });
            }

            // Verify workout belongs to this user
            const { data: workout, error: workoutErr } = await supabaseAdmin
                .from('gym_workouts')
                .select('id, user_id, status')
                .eq('id', workout_id)
                .eq('user_id', user.id)
                .single();

            if (workoutErr || !workout) {
                return res.status(403).json({ error: 'Workout not found or access denied' });
            }

            // Batch logging (e.g. from Quick Past Log)
            if (Array.isArray(batch) && batch.length > 0) {
                const insertedSets = [];
                for (const item of batch) {
                    const isDone = item.is_completed !== undefined ? Boolean(item.is_completed) : true;
                    const isWarm = Boolean(item.is_warmup);
                    const weight = Math.max(0, Number(item.weight_kg) || 0);
                    const repetitions = Math.max(0, parseInt(item.reps) || 0);

                    const { data: setRecord, error: setErr } = await supabaseAdmin
                        .from('gym_sets')
                        .insert([{
                            user_id: user.id,
                            workout_id,
                            exercise_id: item.exercise_id,
                            set_number: item.set_number || 1,
                            weight_kg: weight,
                            reps: repetitions,
                            is_warmup: isWarm,
                            is_completed: isDone,
                            completed_at: isDone ? new Date().toISOString() : null,
                            notes: item.notes?.trim() || null
                        }])
                        .select()
                        .single();

                    if (!setErr && setRecord) {
                        insertedSets.push(setRecord);
                    }
                }
                return res.status(201).json({ sets: insertedSets });
            }

            // Single set logging (e.g. from Live Workout session)
            if (!exercise_id || set_number === undefined) {
                return res.status(400).json({ error: 'exercise_id and set_number are required' });
            }

            const isDone = is_completed !== undefined ? Boolean(is_completed) : true;
            const isWarm = Boolean(is_warmup);
            const weight = Math.max(0, Number(weight_kg) || 0);
            const repetitions = Math.max(0, parseInt(reps) || 0);

            // Upsert set by (workout_id, exercise_id, set_number)
            const { data: existingSet } = await supabaseAdmin
                .from('gym_sets')
                .select('id')
                .eq('workout_id', workout_id)
                .eq('exercise_id', exercise_id)
                .eq('set_number', set_number)
                .maybeSingle();

            let resultRecord: any;

            if (existingSet) {
                const { data: updated, error: updateErr } = await supabaseAdmin
                    .from('gym_sets')
                    .update({
                        weight_kg: weight,
                        reps: repetitions,
                        is_warmup: isWarm,
                        is_completed: isDone,
                        completed_at: isDone ? new Date().toISOString() : null,
                        notes: notes?.trim() || null
                    })
                    .eq('id', existingSet.id)
                    .select()
                    .single();

                if (updateErr) throw updateErr;
                resultRecord = updated;
            } else {
                const { data: inserted, error: insertErr } = await supabaseAdmin
                    .from('gym_sets')
                    .insert([{
                        user_id: user.id,
                        workout_id,
                        exercise_id,
                        set_number,
                        weight_kg: weight,
                        reps: repetitions,
                        is_warmup: isWarm,
                        is_completed: isDone,
                        completed_at: isDone ? new Date().toISOString() : null,
                        notes: notes?.trim() || null
                    }])
                    .select()
                    .single();

                if (insertErr) throw insertErr;
                resultRecord = inserted;
            }

            // PR Evaluation for completed working set
            let prResult = { is_new_pr: false, previous_max_kg: 0, pr_improvement_kg: 0 };
            if (isDone && !isWarm && weight > 0) {
                prResult = await evaluatePR(exercise_id, weight, resultRecord.id);
            }

            return res.status(201).json({
                ...resultRecord,
                ...prResult
            });
        } catch (error: any) {
            console.error('Error logging gym set:', error);
            return res.status(500).json({ error: error.message });
        }
    }

    // PATCH /api/gym/sets
    if (method === 'PATCH') {
        try {
            const { id, weight_kg, reps, is_warmup, is_completed, notes } = req.body;
            if (!id) return res.status(400).json({ error: 'Set ID is required' });

            const { data: existingSet, error: findErr } = await supabaseAdmin
                .from('gym_sets')
                .select('*')
                .eq('id', id)
                .eq('user_id', user.id)
                .single();

            if (findErr || !existingSet) {
                return res.status(404).json({ error: 'Set not found' });
            }

            const updates: any = {};
            if (weight_kg !== undefined) updates.weight_kg = Math.max(0, Number(weight_kg));
            if (reps !== undefined) updates.reps = Math.max(0, parseInt(reps));
            if (is_warmup !== undefined) updates.is_warmup = Boolean(is_warmup);
            if (is_completed !== undefined) {
                updates.is_completed = Boolean(is_completed);
                if (updates.is_completed && !existingSet.completed_at) {
                    updates.completed_at = new Date().toISOString();
                } else if (!updates.is_completed) {
                    updates.completed_at = null;
                }
            }
            if (notes !== undefined) updates.notes = notes?.trim() || null;

            const { data: updated, error: updateErr } = await supabaseAdmin
                .from('gym_sets')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (updateErr) throw updateErr;

            // Re-evaluate PR if completed working set
            const finalWeight = updated.weight_kg;
            const finalDone = updated.is_completed;
            const finalWarm = updated.is_warmup;

            let prResult = { is_new_pr: false, previous_max_kg: 0, pr_improvement_kg: 0 };
            if (finalDone && !finalWarm && finalWeight > 0) {
                prResult = await evaluatePR(updated.exercise_id, finalWeight, updated.id);
            }

            return res.status(200).json({
                ...updated,
                ...prResult
            });
        } catch (error: any) {
            console.error('Error updating gym set:', error);
            return res.status(500).json({ error: error.message });
        }
    }

    // DELETE /api/gym/sets
    if (method === 'DELETE') {
        try {
            const { id } = req.query;
            if (!id || typeof id !== 'string') return res.status(400).json({ error: 'Set ID is required' });

            const { error: delErr } = await supabaseAdmin
                .from('gym_sets')
                .delete()
                .eq('id', id)
                .eq('user_id', user.id);

            if (delErr) throw delErr;
            return res.status(200).json({ success: true });
        } catch (error: any) {
            console.error('Error deleting gym set:', error);
            return res.status(500).json({ error: error.message });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}

