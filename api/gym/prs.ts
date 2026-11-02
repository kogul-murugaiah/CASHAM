import { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../_lib/supabase.js';
import { getUserFromRequest } from '../_lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const user = await getUserFromRequest(req);
    if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Fetch all completed working sets for this user
        const { data: sets, error: setsErr } = await supabaseAdmin
            .from('gym_sets')
            .select(`
                id,
                exercise_id,
                weight_kg,
                reps,
                completed_at,
                created_at,
                gym_workouts (
                    workout_date,
                    name
                ),
                gym_exercises (
                    id,
                    name,
                    target_muscle,
                    equipment
                )
            `)
            .eq('user_id', user.id)
            .eq('is_completed', true)
            .eq('is_warmup', false)
            .gt('weight_kg', 0)
            .order('weight_kg', { ascending: false });

        if (setsErr) throw setsErr;

        // Group by exercise_id to get all-time max PR per exercise
        const prMap = new Map<string, any>();

        for (const s of (sets || [])) {
            const exId = s.exercise_id;
            const weight = Number(s.weight_kg);

            if (!prMap.has(exId)) {
                const dateAchieved = s.gym_workouts?.workout_date || s.completed_at?.split('T')[0] || s.created_at?.split('T')[0];
                prMap.set(exId, {
                    exercise_id: exId,
                    exercise_name: s.gym_exercises?.name || 'Exercise',
                    target_muscle: s.gym_exercises?.target_muscle || 'other',
                    equipment: s.gym_exercises?.equipment || 'other',
                    max_weight_kg: weight,
                    reps: s.reps,
                    date_achieved: dateAchieved,
                    workout_name: s.gym_workouts?.name || 'Workout'
                });
            }
        }

        const prList = Array.from(prMap.values()).sort((a, b) => b.max_weight_kg - a.max_weight_kg);

        return res.status(200).json({
            total_prs: prList.length,
            prs: prList
        });
    } catch (error: any) {
        console.error('Error fetching PRs:', error);
        return res.status(500).json({ error: error.message });
    }
}

