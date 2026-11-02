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
        const { exercise_id } = req.query;
        if (!exercise_id || typeof exercise_id !== 'string') {
            return res.status(400).json({ error: 'exercise_id is required' });
        }

        // Fetch exercise details
        const { data: exercise, error: exErr } = await supabaseAdmin
            .from('gym_exercises')
            .select('id, name, target_muscle, equipment')
            .eq('id', exercise_id)
            .single();

        if (exErr || !exercise) {
            return res.status(404).json({ error: 'Exercise not found' });
        }

        // Fetch all completed working sets for this exercise
        const { data: sets, error: setsErr } = await supabaseAdmin
            .from('gym_sets')
            .select(`
                id,
                set_number,
                weight_kg,
                reps,
                is_warmup,
                is_completed,
                completed_at,
                notes,
                gym_workouts (
                    id,
                    workout_date,
                    name
                )
            `)
            .eq('user_id', user.id)
            .eq('exercise_id', exercise_id)
            .eq('is_completed', true)
            .order('completed_at', { ascending: false });

        if (setsErr) throw setsErr;

        // Group by workout session
        const sessionMap = new Map<string, any>();

        for (const s of (sets || [])) {
            const workoutId = s.gym_workouts?.id || 'unknown';
            const workoutDate = s.gym_workouts?.workout_date || s.completed_at?.split('T')[0] || 'Unknown Date';

            if (!sessionMap.has(workoutId)) {
                sessionMap.set(workoutId, {
                    workout_id: workoutId,
                    workout_name: s.gym_workouts?.name || 'Workout',
                    workout_date: workoutDate,
                    max_weight_kg: Number(s.weight_kg),
                    total_working_sets: 0,
                    sets: []
                });
            }

            const sess = sessionMap.get(workoutId);
            const w = Number(s.weight_kg);
            if (w > sess.max_weight_kg) sess.max_weight_kg = w;
            if (!s.is_warmup) sess.total_working_sets++;

            sess.sets.push({
                id: s.id,
                set_number: s.set_number,
                weight_kg: w,
                reps: s.reps,
                is_warmup: s.is_warmup,
                notes: s.notes
            });
        }

        // Sort sessions chronologically descending
        const sessions = Array.from(sessionMap.values()).sort((a, b) => b.workout_date.localeCompare(a.workout_date));

        // Most recent session is the "previous performance" hint
        const lastPerformance = sessions.length > 0 ? sessions[0] : null;

        return res.status(200).json({
            exercise,
            last_performance: lastPerformance,
            total_sessions: sessions.length,
            history: sessions
        });
    } catch (error: any) {
        console.error('Error fetching exercise history:', error);
        return res.status(500).json({ error: error.message });
    }
}

