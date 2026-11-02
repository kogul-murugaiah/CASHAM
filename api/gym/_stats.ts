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
        const { year, month } = req.query;
        const now = new Date();
        const currentYear = year ? parseInt(year as string) : now.getFullYear();
        const currentMonth = month ? parseInt(month as string) : now.getMonth() + 1;
        const monthPrefix = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;

        // 1. Fetch completed workouts
        const { data: workouts, error: wErr } = await supabaseAdmin
            .from('gym_workouts')
            .select(`
                id,
                name,
                workout_date,
                duration_minutes,
                created_at,
                routine_id,
                gym_routines (
                    name,
                    target_muscle
                ),
                gym_sets (
                    id,
                    exercise_id,
                    weight_kg,
                    reps,
                    is_completed,
                    is_warmup,
                    gym_exercises (
                        name,
                        target_muscle
                    )
                )
            `)
            .eq('user_id', user.id)
            .eq('status', 'completed')
            .order('workout_date', { ascending: false });

        if (wErr) throw wErr;

        const allWorkouts = workouts || [];

        // 2. Attendance Days (Distinct dates)
        const dateSet = new Set<string>();
        allWorkouts.forEach(w => {
            if (w.workout_date) dateSet.add(w.workout_date);
        });
        const attendanceDates = Array.from(dateSet).sort();

        // 3. Workouts this month
        const thisMonthWorkouts = allWorkouts.filter(w => w.workout_date?.startsWith(monthPrefix));

        // 4. Muscle distribution (Working sets per target muscle)
        const muscleCounts: Record<string, number> = {
            chest: 0,
            back: 0,
            shoulders: 0,
            biceps: 0,
            triceps: 0,
            legs: 0,
            core: 0
        };

        let totalWorkingSets = 0;

        allWorkouts.forEach(w => {
            if (w.gym_sets) {
                w.gym_sets.forEach((s: any) => {
                    if (s.is_completed && !s.is_warmup) {
                        totalWorkingSets++;
                        const muscle = s.gym_exercises?.target_muscle?.toLowerCase();
                        if (muscle && muscleCounts[muscle] !== undefined) {
                            muscleCounts[muscle]++;
                        }
                    }
                });
            }
        });

        const muscleDistribution = Object.entries(muscleCounts).map(([muscle, count]) => ({
            muscle,
            working_sets: count,
            percentage: totalWorkingSets > 0 ? Math.round((count / totalWorkingSets) * 100) : 0
        })).sort((a, b) => b.working_sets - a.working_sets);

        // 5. Recent 5 workouts
        const recentWorkouts = allWorkouts.slice(0, 5).map(w => {
            const rawRoutine: any = w.gym_routines;
            const routine = Array.isArray(rawRoutine) ? rawRoutine[0] : rawRoutine;

            const exerciseNames = Array.from(new Set(
                (w.gym_sets || [])
                    .map((s: any) => {
                        const rawEx: any = s.gym_exercises;
                        const ex = Array.isArray(rawEx) ? rawEx[0] : rawEx;
                        return ex?.name;
                    })
                    .filter(Boolean)
            ));

            return {
                id: w.id,
                name: w.name,
                workout_date: w.workout_date,
                duration_minutes: w.duration_minutes,
                routine_name: routine?.name || null,
                total_sets: (w.gym_sets || []).filter((s: any) => s.is_completed).length,
                exercises_summary: exerciseNames.slice(0, 3).join(', ') + (exerciseNames.length > 3 ? ` +${exerciseNames.length - 3} more` : '')
            };
        });

        return res.status(200).json({
            attendance_dates: attendanceDates,
            total_attendance_days: attendanceDates.length,
            total_workouts: allWorkouts.length,
            workouts_this_month: thisMonthWorkouts.length,
            total_working_sets: totalWorkingSets,
            muscle_distribution: muscleDistribution,
            recent_workouts: recentWorkouts
        });
    } catch (error: any) {
        console.error('Error fetching gym stats:', error);
        return res.status(500).json({ error: error.message });
    }
}

