-- ==============================================================================
-- CASHAM: Gym Tracker Verification Script
-- Run in Supabase SQL editor after running 20261102000000_gym_tracker_schema.sql
-- ==============================================================================

-- 1. Check all 7 tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'gym_exercises', 
    'gym_exercise_muscles', 
    'gym_routines', 
    'gym_routine_exercises', 
    'gym_workouts', 
    'gym_sets', 
    'gym_user_settings'
  )
ORDER BY table_name;

-- 2. Verify pre-seeded exercises count (~36 exercises)
SELECT count(*) AS total_preset_exercises FROM public.gym_exercises WHERE is_preset = true;

-- 3. Verify exercises per muscle group
SELECT target_muscle, count(*) AS exercise_count 
FROM public.gym_exercises 
WHERE is_preset = true 
GROUP BY target_muscle 
ORDER BY exercise_count DESC;

-- 4. Verify pre-seeded Bro Split routines (6 routines)
SELECT day_of_week, name, target_muscle 
FROM public.gym_routines 
WHERE is_preset = true 
ORDER BY day_of_week ASC;

-- 5. Verify routine exercises mapping count
SELECT r.name AS routine_name, count(re.id) AS exercise_count
FROM public.gym_routines r
JOIN public.gym_routine_exercises re ON r.id = re.routine_id
GROUP BY r.name, r.day_of_week
ORDER BY r.day_of_week ASC;

-- 6. Verify RLS is enabled on all 7 tables
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename LIKE 'gym_%';

