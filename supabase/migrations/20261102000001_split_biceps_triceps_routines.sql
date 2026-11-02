-- Migration: 20261102000001_split_biceps_triceps_routines.sql
-- Description: Split Arms into separate Biceps & Triceps routines, add Back & Biceps and Chest & Triceps presets, and remove weekday names.

DO $$
DECLARE
    -- Exercise IDs from base schema
    ex_bench_press UUID := '10000000-0000-0000-0000-000000000001'::uuid;
    ex_incline_db_press UUID := '10000000-0000-0000-0000-000000000002'::uuid;
    ex_cable_fly UUID := '10000000-0000-0000-0000-000000000003'::uuid;

    ex_deadlift UUID := '20000000-0000-0000-0000-000000000001'::uuid;
    ex_lat_pulldown UUID := '20000000-0000-0000-0000-000000000002'::uuid;
    ex_cable_row UUID := '20000000-0000-0000-0000-000000000004'::uuid;

    ex_barbell_curl UUID := '40000000-0000-0000-0000-000000000001'::uuid;
    ex_incline_db_curl UUID := '40000000-0000-0000-0000-000000000002'::uuid;
    ex_hammer_curl UUID := '40000000-0000-0000-0000-000000000003'::uuid;
    ex_preacher_curl UUID := '40000000-0000-0000-0000-000000000004'::uuid;

    ex_tricep_rope UUID := '50000000-0000-0000-0000-000000000001'::uuid;
    ex_skull_crushers UUID := '50000000-0000-0000-0000-000000000002'::uuid;
    ex_overhead_tricep UUID := '50000000-0000-0000-0000-000000000003'::uuid;
    ex_close_grip_bench UUID := '50000000-0000-0000-0000-000000000004'::uuid;

    -- Existing Routine IDs
    r_chest UUID := 'a0000000-0000-0000-0000-000000000001'::uuid;
    r_back UUID := 'a0000000-0000-0000-0000-000000000002'::uuid;
    r_shoulders UUID := 'a0000000-0000-0000-0000-000000000003'::uuid;
    r_biceps UUID := 'a0000000-0000-0000-0000-000000000004'::uuid;
    r_legs UUID := 'a0000000-0000-0000-0000-000000000005'::uuid;
    r_core UUID := 'a0000000-0000-0000-0000-000000000006'::uuid;

    -- New Dedicated Routine IDs
    r_triceps UUID := 'a0000000-0000-0000-0000-000000000007'::uuid;
    r_back_biceps UUID := 'a0000000-0000-0000-0000-000000000008'::uuid;
    r_chest_triceps UUID := 'a0000000-0000-0000-0000-000000000009'::uuid;
BEGIN
    -- 1. Remove day-of-week prefixes and clean existing preset names
    UPDATE public.gym_routines
    SET name = 'Chest Power & Hypertrophy',
        description = 'Classic chest power and hypertrophy routine'
    WHERE id = r_chest;

    UPDATE public.gym_routines
    SET name = 'Back & Lats Width',
        description = 'Deadlift, vertical lat pulling and horizontal rows'
    WHERE id = r_back;

    UPDATE public.gym_routines
    SET name = 'Shoulders & Traps',
        description = 'Overhead presses, lateral deltoid sculpting and rear delt flyes'
    WHERE id = r_shoulders;

    UPDATE public.gym_routines
    SET name = 'Biceps Blast',
        description = 'High-volume bicep isolation: Barbell curls, Incline curls, Hammer curls, and Preacher curls',
        target_muscle = 'biceps'
    WHERE id = r_biceps;

    UPDATE public.gym_routines
    SET name = 'Legs & Calves Power',
        description = 'Heavy squats, quad pressing, hamstring curls and calves'
    WHERE id = r_legs;

    UPDATE public.gym_routines
    SET name = 'Core & Abs Conditioning',
        description = 'Abs, oblique rotary strength and core stability'
    WHERE id = r_core;

    -- 2. Configure Biceps Blast routine exercises (pure biceps isolation)
    DELETE FROM public.gym_routine_exercises WHERE routine_id = r_biceps;
    INSERT INTO public.gym_routine_exercises (routine_id, exercise_id, order_index, target_sets, target_reps, rest_seconds, notes)
    VALUES
        (r_biceps, ex_barbell_curl, 1, 4, 10, 60, 'Keep elbows pinned, slow eccentric on the way down'),
        (r_biceps, ex_incline_db_curl, 2, 3, 12, 60, 'Deep bicep long-head stretch at the bottom'),
        (r_biceps, ex_hammer_curl, 3, 3, 12, 60, 'Heavy brachialis & forearm thickness builder'),
        (r_biceps, ex_preacher_curl, 4, 3, 15, 60, 'Strict peak contraction burn out')
    ON CONFLICT DO NOTHING;

    -- 3. Insert Dedicated Triceps Destruction routine
    INSERT INTO public.gym_routines (id, user_id, name, description, target_muscle, day_of_week, is_preset, is_active)
    VALUES
        (r_triceps, NULL, 'Triceps Destruction', 'Horseshoe tricep builder: Pushdowns, Skull Crushers, Overhead Extension and Close-Grip Bench', 'triceps', NULL, true, true)
    ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        target_muscle = EXCLUDED.target_muscle;

    DELETE FROM public.gym_routine_exercises WHERE routine_id = r_triceps;
    INSERT INTO public.gym_routine_exercises (routine_id, exercise_id, order_index, target_sets, target_reps, rest_seconds, notes)
    VALUES
        (r_triceps, ex_tricep_rope, 1, 4, 12, 60, 'Spread rope at lockout for lateral head activation'),
        (r_triceps, ex_skull_crushers, 2, 3, 10, 75, 'Lower bar to top of forehead, keep elbows tight'),
        (r_triceps, ex_overhead_tricep, 3, 3, 12, 60, 'Full long-head stretch behind neck'),
        (r_triceps, ex_close_grip_bench, 4, 3, 8, 90, 'Hands shoulder-width, explode off chest with triceps')
    ON CONFLICT DO NOTHING;

    -- 4. Insert Popular Back & Biceps Hybrid Routine
    INSERT INTO public.gym_routines (id, user_id, name, description, target_muscle, day_of_week, is_preset, is_active)
    VALUES
        (r_back_biceps, NULL, 'Back & Biceps Combo', 'Classic pulling split: Heavy deadlifts, vertical lat pulls, horizontal rows and bicep burnout', 'back_biceps', NULL, true, true)
    ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        target_muscle = EXCLUDED.target_muscle;

    DELETE FROM public.gym_routine_exercises WHERE routine_id = r_back_biceps;
    INSERT INTO public.gym_routine_exercises (routine_id, exercise_id, order_index, target_sets, target_reps, rest_seconds, notes)
    VALUES
        (r_back_biceps, ex_deadlift, 1, 4, 6, 120, 'Heavy working pull sets'),
        (r_back_biceps, ex_lat_pulldown, 2, 4, 10, 90, 'Focus on driving elbows straight down to hips'),
        (r_back_biceps, ex_cable_row, 3, 3, 12, 75, 'Pull to lower ribcage with pause'),
        (r_back_biceps, ex_barbell_curl, 4, 3, 10, 60, 'Strict standing curls'),
        (r_back_biceps, ex_hammer_curl, 5, 3, 12, 60, 'Neutral grip thickness builder')
    ON CONFLICT DO NOTHING;

    -- 5. Insert Popular Chest & Triceps Hybrid Routine
    INSERT INTO public.gym_routines (id, user_id, name, description, target_muscle, day_of_week, is_preset, is_active)
    VALUES
        (r_chest_triceps, NULL, 'Chest & Triceps Combo', 'Classic pushing split: Bench pressing, incline dumbbell work, chest flyes and tricep lockouts', 'chest_triceps', NULL, true, true)
    ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        target_muscle = EXCLUDED.target_muscle;

    DELETE FROM public.gym_routine_exercises WHERE routine_id = r_chest_triceps;
    INSERT INTO public.gym_routine_exercises (routine_id, exercise_id, order_index, target_sets, target_reps, rest_seconds, notes)
    VALUES
        (r_chest_triceps, ex_bench_press, 1, 4, 8, 120, 'Flat bench power sets'),
        (r_chest_triceps, ex_incline_db_press, 2, 3, 10, 90, 'Upper chest focus'),
        (r_chest_triceps, ex_cable_fly, 3, 3, 12, 60, 'Deep stretch & peak squeeze'),
        (r_chest_triceps, ex_tricep_rope, 4, 3, 12, 60, 'Tricep pump'),
        (r_chest_triceps, ex_skull_crushers, 5, 3, 10, 75, 'Overhead tricep lockout')
    ON CONFLICT DO NOTHING;

END $$;
