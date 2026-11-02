-- ==============================================================================
-- CASHAM: Gym Tracker Rollback Script
-- Drops all 7 gym tables in reverse foreign-key dependency order
-- ==============================================================================

DROP TABLE IF EXISTS public.gym_sets CASCADE;
DROP TABLE IF EXISTS public.gym_workouts CASCADE;
DROP TABLE IF EXISTS public.gym_routine_exercises CASCADE;
DROP TABLE IF EXISTS public.gym_routines CASCADE;
DROP TABLE IF EXISTS public.gym_exercise_muscles CASCADE;
DROP TABLE IF EXISTS public.gym_exercises CASCADE;
DROP TABLE IF EXISTS public.gym_user_settings CASCADE;
