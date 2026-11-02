-- ==============================================================================
-- CASHAM: Gym & Fitness Tracker Schema (Phase 1)
-- 7 Tables: exercises, exercise_muscles, routines, routine_exercises, workouts, sets, user_settings
-- Features: Soft-delete archive, dynamic PR safety, Bro Split presets, and comprehensive RLS.
-- ==============================================================================

-- 1. EXERCISES LIBRARY
CREATE TABLE IF NOT EXISTS public.gym_exercises (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- NULL for system presets
    name TEXT NOT NULL,
    target_muscle TEXT NOT NULL CHECK (target_muscle IN ('chest', 'back', 'shoulders', 'biceps', 'triceps', 'legs', 'core')),
    equipment TEXT NOT NULL CHECK (equipment IN ('barbell', 'dumbbell', 'cable', 'machine', 'bodyweight', 'other')),
    is_preset BOOLEAN DEFAULT false NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. EXERCISE MUSCLE TARGETING (Primary & Secondary roles for accurate volume analytics)
CREATE TABLE IF NOT EXISTS public.gym_exercise_muscles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    exercise_id UUID NOT NULL REFERENCES public.gym_exercises(id) ON DELETE CASCADE,
    muscle TEXT NOT NULL CHECK (muscle IN ('chest', 'back', 'shoulders', 'biceps', 'triceps', 'legs', 'core')),
    role TEXT NOT NULL CHECK (role IN ('primary', 'secondary')),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (exercise_id, muscle)
);

-- 3. WORKOUT ROUTINES (Bro Split & Custom Templates)
CREATE TABLE IF NOT EXISTS public.gym_routines (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- NULL for presets
    name TEXT NOT NULL,
    description TEXT,
    target_muscle TEXT,
    day_of_week INTEGER CHECK (day_of_week BETWEEN 1 AND 7), -- 1=Monday ... 7=Sunday
    is_preset BOOLEAN DEFAULT false NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. ROUTINE EXERCISES MAPPING
CREATE TABLE IF NOT EXISTS public.gym_routine_exercises (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    routine_id UUID NOT NULL REFERENCES public.gym_routines(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL REFERENCES public.gym_exercises(id) ON DELETE RESTRICT,
    order_index INTEGER DEFAULT 0 NOT NULL,
    target_sets INTEGER DEFAULT 3 NOT NULL CHECK (target_sets > 0),
    target_reps INTEGER DEFAULT 10 NOT NULL CHECK (target_reps > 0),
    target_weight_kg NUMERIC DEFAULT NULL CHECK (target_weight_kg IS NULL OR target_weight_kg >= 0),
    rest_seconds INTEGER DEFAULT 90 NOT NULL CHECK (rest_seconds > 0),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. WORKOUT SESSIONS (Individual Gym Visits)
CREATE TABLE IF NOT EXISTS public.gym_workouts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    routine_id UUID REFERENCES public.gym_routines(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    workout_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
    logging_mode TEXT NOT NULL DEFAULT 'live' CHECK (logging_mode IN ('live', 'quick')),
    started_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    completed_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    duration_minutes INTEGER DEFAULT 0 NOT NULL CHECK (duration_minutes >= 0),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. INDIVIDUAL WORKOUT SETS (Historical Lifting Records)
CREATE TABLE IF NOT EXISTS public.gym_sets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workout_id UUID NOT NULL REFERENCES public.gym_workouts(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL REFERENCES public.gym_exercises(id) ON DELETE RESTRICT,
    set_number INTEGER NOT NULL CHECK (set_number > 0),
    weight_kg NUMERIC NOT NULL DEFAULT 0 CHECK (weight_kg >= 0),
    reps INTEGER NOT NULL DEFAULT 0 CHECK (reps >= 0),
    is_warmup BOOLEAN DEFAULT false NOT NULL,
    is_completed BOOLEAN DEFAULT true NOT NULL,
    completed_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (workout_id, exercise_id, set_number)
);

-- 7. USER FITNESS PREFERENCES & DEFAULTS
CREATE TABLE IF NOT EXISTS public.gym_user_settings (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    preferred_unit TEXT NOT NULL DEFAULT 'kg' CHECK (preferred_unit IN ('kg', 'lbs')),
    default_rest_seconds INTEGER NOT NULL DEFAULT 90 CHECK (default_rest_seconds > 0),
    weekly_workout_target INTEGER NOT NULL DEFAULT 5 CHECK (weekly_workout_target BETWEEN 1 AND 7),
    week_start_day INTEGER NOT NULL DEFAULT 1 CHECK (week_start_day BETWEEN 1 AND 7),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- INDEXES FOR PERFORMANCE & QUERY ACCELERATION
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_gym_exercises_user_active ON public.gym_exercises(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_gym_exercises_muscle ON public.gym_exercises(target_muscle);
CREATE INDEX IF NOT EXISTS idx_gym_routines_user_active ON public.gym_routines(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_gym_routine_exercises_routine ON public.gym_routine_exercises(routine_id, order_index ASC);
CREATE INDEX IF NOT EXISTS idx_gym_workouts_user_date ON public.gym_workouts(user_id, workout_date DESC);
CREATE INDEX IF NOT EXISTS idx_gym_workouts_user_status ON public.gym_workouts(user_id, status);
CREATE INDEX IF NOT EXISTS idx_gym_sets_workout ON public.gym_sets(workout_id);
CREATE INDEX IF NOT EXISTS idx_gym_sets_pr_lookup ON public.gym_sets(user_id, exercise_id, is_completed, is_warmup, weight_kg DESC);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.gym_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gym_exercise_muscles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gym_routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gym_routine_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gym_workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gym_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gym_user_settings ENABLE ROW LEVEL SECURITY;

-- 1. gym_exercises Policies
DROP POLICY IF EXISTS "Users can read presets and own exercises" ON public.gym_exercises;
CREATE POLICY "Users can read presets and own exercises"
    ON public.gym_exercises FOR SELECT
    USING (user_id IS NULL OR user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create own exercises" ON public.gym_exercises;
CREATE POLICY "Users can create own exercises"
    ON public.gym_exercises FOR INSERT
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own exercises" ON public.gym_exercises;
CREATE POLICY "Users can update own exercises"
    ON public.gym_exercises FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own exercises" ON public.gym_exercises;
CREATE POLICY "Users can delete own exercises"
    ON public.gym_exercises FOR DELETE
    USING (user_id = auth.uid());

-- 2. gym_exercise_muscles Policies
DROP POLICY IF EXISTS "Users can read exercise muscles" ON public.gym_exercise_muscles;
CREATE POLICY "Users can read exercise muscles"
    ON public.gym_exercise_muscles FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.gym_exercises e
        WHERE e.id = exercise_id AND (e.user_id IS NULL OR e.user_id = auth.uid())
    ));

DROP POLICY IF EXISTS "Users can manage exercise muscles for own exercises" ON public.gym_exercise_muscles;
CREATE POLICY "Users can manage exercise muscles for own exercises"
    ON public.gym_exercise_muscles FOR ALL
    USING (EXISTS (
        SELECT 1 FROM public.gym_exercises e
        WHERE e.id = exercise_id AND e.user_id = auth.uid()
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.gym_exercises e
        WHERE e.id = exercise_id AND e.user_id = auth.uid()
    ));

-- 3. gym_routines Policies
DROP POLICY IF EXISTS "Users can read presets and own routines" ON public.gym_routines;
CREATE POLICY "Users can read presets and own routines"
    ON public.gym_routines FOR SELECT
    USING (user_id IS NULL OR user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create own routines" ON public.gym_routines;
CREATE POLICY "Users can create own routines"
    ON public.gym_routines FOR INSERT
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own routines" ON public.gym_routines;
CREATE POLICY "Users can update own routines"
    ON public.gym_routines FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own routines" ON public.gym_routines;
CREATE POLICY "Users can delete own routines"
    ON public.gym_routines FOR DELETE
    USING (user_id = auth.uid());

-- 4. gym_routine_exercises Policies (Protected through parent routine ownership)
DROP POLICY IF EXISTS "Users can read routine exercises" ON public.gym_routine_exercises;
CREATE POLICY "Users can read routine exercises"
    ON public.gym_routine_exercises FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.gym_routines r
        WHERE r.id = routine_id AND (r.user_id IS NULL OR r.user_id = auth.uid())
    ));

DROP POLICY IF EXISTS "Users can manage routine exercises for own routines" ON public.gym_routine_exercises;
CREATE POLICY "Users can manage routine exercises for own routines"
    ON public.gym_routine_exercises FOR ALL
    USING (EXISTS (
        SELECT 1 FROM public.gym_routines r
        WHERE r.id = routine_id AND r.user_id = auth.uid()
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.gym_routines r
        WHERE r.id = routine_id AND r.user_id = auth.uid()
    ));

-- 5. gym_workouts Policies
DROP POLICY IF EXISTS "Users can manage own workouts" ON public.gym_workouts;
CREATE POLICY "Users can manage own workouts"
    ON public.gym_workouts FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- 6. gym_sets Policies
DROP POLICY IF EXISTS "Users can manage own sets" ON public.gym_sets;
CREATE POLICY "Users can manage own sets"
    ON public.gym_sets FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- 7. gym_user_settings Policies
DROP POLICY IF EXISTS "Users can manage own settings" ON public.gym_user_settings;
CREATE POLICY "Users can manage own settings"
    ON public.gym_user_settings FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- ==============================================================================
-- PRESET SEED DATA: 36 POPULAR EXERCISES & MUSCLE MAPPINGS
-- ==============================================================================

DO $$
DECLARE
    -- Chest
    ex_bench_press UUID := '10000000-0000-0000-0000-000000000001'::uuid;
    ex_incline_db_press UUID := '10000000-0000-0000-0000-000000000002'::uuid;
    ex_cable_fly UUID := '10000000-0000-0000-0000-000000000003'::uuid;
    ex_dips UUID := '10000000-0000-0000-0000-000000000004'::uuid;
    ex_decline_bench UUID := '10000000-0000-0000-0000-000000000005'::uuid;
    ex_push_ups UUID := '10000000-0000-0000-0000-000000000006'::uuid;

    -- Back
    ex_deadlift UUID := '20000000-0000-0000-0000-000000000001'::uuid;
    ex_lat_pulldown UUID := '20000000-0000-0000-0000-000000000002'::uuid;
    ex_barbell_row UUID := '20000000-0000-0000-0000-000000000003'::uuid;
    ex_cable_row UUID := '20000000-0000-0000-0000-000000000004'::uuid;
    ex_pullups UUID := '20000000-0000-0000-0000-000000000005'::uuid;
    ex_tbar_row UUID := '20000000-0000-0000-0000-000000000006'::uuid;

    -- Shoulders
    ex_overhead_press UUID := '30000000-0000-0000-0000-000000000001'::uuid;
    ex_lateral_raise UUID := '30000000-0000-0000-0000-000000000002'::uuid;
    ex_face_pull UUID := '30000000-0000-0000-0000-000000000003'::uuid;
    ex_reverse_pec_deck UUID := '30000000-0000-0000-0000-000000000004'::uuid;
    ex_db_shoulder_press UUID := '30000000-0000-0000-0000-000000000005'::uuid;
    ex_front_raise UUID := '30000000-0000-0000-0000-000000000006'::uuid;

    -- Biceps
    ex_barbell_curl UUID := '40000000-0000-0000-0000-000000000001'::uuid;
    ex_incline_db_curl UUID := '40000000-0000-0000-0000-000000000002'::uuid;
    ex_hammer_curl UUID := '40000000-0000-0000-0000-000000000003'::uuid;
    ex_preacher_curl UUID := '40000000-0000-0000-0000-000000000004'::uuid;

    -- Triceps
    ex_tricep_rope UUID := '50000000-0000-0000-0000-000000000001'::uuid;
    ex_skull_crushers UUID := '50000000-0000-0000-0000-000000000002'::uuid;
    ex_overhead_tricep UUID := '50000000-0000-0000-0000-000000000003'::uuid;
    ex_close_grip_bench UUID := '50000000-0000-0000-0000-000000000004'::uuid;

    -- Legs
    ex_squat UUID := '60000000-0000-0000-0000-000000000001'::uuid;
    ex_leg_press UUID := '60000000-0000-0000-0000-000000000002'::uuid;
    ex_rdl UUID := '60000000-0000-0000-0000-000000000003'::uuid;
    ex_leg_extension UUID := '60000000-0000-0000-0000-000000000004'::uuid;
    ex_leg_curl UUID := '60000000-0000-0000-0000-000000000005'::uuid;
    ex_calf_raise UUID := '60000000-0000-0000-0000-000000000006'::uuid;

    -- Core / Abs
    ex_hanging_leg_raise UUID := '70000000-0000-0000-0000-000000000001'::uuid;
    ex_woodchoppers UUID := '70000000-0000-0000-0000-000000000002'::uuid;
    ex_plank UUID := '70000000-0000-0000-0000-000000000003'::uuid;
    ex_cable_crunch UUID := '70000000-0000-0000-0000-000000000004'::uuid;

    -- Routines
    r_chest UUID := 'a0000000-0000-0000-0000-000000000001'::uuid;
    r_back UUID := 'a0000000-0000-0000-0000-000000000002'::uuid;
    r_shoulders UUID := 'a0000000-0000-0000-0000-000000000003'::uuid;
    r_arms UUID := 'a0000000-0000-0000-0000-000000000004'::uuid;
    r_legs UUID := 'a0000000-0000-0000-0000-000000000005'::uuid;
    r_core UUID := 'a0000000-0000-0000-0000-000000000006'::uuid;
BEGIN
    -- 1. Insert 36 Preset Exercises
    INSERT INTO public.gym_exercises (id, user_id, name, target_muscle, equipment, is_preset, is_active)
    VALUES
        (ex_bench_press, NULL, 'Barbell Bench Press', 'chest', 'barbell', true, true),
        (ex_incline_db_press, NULL, 'Incline Dumbbell Press', 'chest', 'dumbbell', true, true),
        (ex_cable_fly, NULL, 'Cable Chest Fly', 'chest', 'cable', true, true),
        (ex_dips, NULL, 'Chest Dips', 'chest', 'bodyweight', true, true),
        (ex_decline_bench, NULL, 'Decline Barbell Bench Press', 'chest', 'barbell', true, true),
        (ex_push_ups, NULL, 'Push-Ups', 'chest', 'bodyweight', true, true),

        (ex_deadlift, NULL, 'Barbell Conventional Deadlift', 'back', 'barbell', true, true),
        (ex_lat_pulldown, NULL, 'Lat Pulldown', 'back', 'cable', true, true),
        (ex_barbell_row, NULL, 'Barbell Bent-Over Row', 'back', 'barbell', true, true),
        (ex_cable_row, NULL, 'Seated Cable Row', 'back', 'cable', true, true),
        (ex_pullups, NULL, 'Pull-ups', 'back', 'bodyweight', true, true),
        (ex_tbar_row, NULL, 'T-Bar Row', 'back', 'machine', true, true),

        (ex_overhead_press, NULL, 'Overhead Barbell Press', 'shoulders', 'barbell', true, true),
        (ex_lateral_raise, NULL, 'Dumbbell Lateral Raise', 'shoulders', 'dumbbell', true, true),
        (ex_face_pull, NULL, 'Cable Face Pull', 'shoulders', 'cable', true, true),
        (ex_reverse_pec_deck, NULL, 'Reverse Pec Deck Fly', 'shoulders', 'machine', true, true),
        (ex_db_shoulder_press, NULL, 'Dumbbell Seated Shoulder Press', 'shoulders', 'dumbbell', true, true),
        (ex_front_raise, NULL, 'Dumbbell Front Raise', 'shoulders', 'dumbbell', true, true),

        (ex_barbell_curl, NULL, 'Barbell Bicep Curl', 'biceps', 'barbell', true, true),
        (ex_incline_db_curl, NULL, 'Incline Dumbbell Curl', 'biceps', 'dumbbell', true, true),
        (ex_hammer_curl, NULL, 'Dumbbell Hammer Curl', 'biceps', 'dumbbell', true, true),
        (ex_preacher_curl, NULL, 'Preacher EZ-Bar Curl', 'biceps', 'barbell', true, true),

        (ex_tricep_rope, NULL, 'Tricep Rope Pushdown', 'triceps', 'cable', true, true),
        (ex_skull_crushers, NULL, 'EZ-Bar Skull Crushers', 'triceps', 'barbell', true, true),
        (ex_overhead_tricep, NULL, 'Overhead Dumbbell Tricep Extension', 'triceps', 'dumbbell', true, true),
        (ex_close_grip_bench, NULL, 'Close-Grip Barbell Bench Press', 'triceps', 'barbell', true, true),

        (ex_squat, NULL, 'Barbell Back Squat', 'legs', 'barbell', true, true),
        (ex_leg_press, NULL, '45° Leg Press', 'legs', 'machine', true, true),
        (ex_rdl, NULL, 'Romanian Deadlift (RDL)', 'legs', 'barbell', true, true),
        (ex_leg_extension, NULL, 'Leg Extension', 'legs', 'machine', true, true),
        (ex_leg_curl, NULL, 'Lying Leg Curl', 'legs', 'machine', true, true),
        (ex_calf_raise, NULL, 'Standing Calf Raise', 'legs', 'machine', true, true),

        (ex_hanging_leg_raise, NULL, 'Hanging Leg Raise', 'core', 'bodyweight', true, true),
        (ex_woodchoppers, NULL, 'Cable Woodchoppers', 'core', 'cable', true, true),
        (ex_plank, NULL, 'Weighted Plank', 'core', 'bodyweight', true, true),
        (ex_cable_crunch, NULL, 'Kneeling Cable Crunch', 'core', 'cable', true, true)
    ON CONFLICT (id) DO NOTHING;

    -- 2. Insert Muscle Mappings (Primary & Secondary Roles)
    INSERT INTO public.gym_exercise_muscles (exercise_id, muscle, role)
    VALUES
        (ex_bench_press, 'chest', 'primary'),
        (ex_bench_press, 'triceps', 'secondary'),
        (ex_bench_press, 'shoulders', 'secondary'),

        (ex_incline_db_press, 'chest', 'primary'),
        (ex_incline_db_press, 'shoulders', 'secondary'),
        (ex_incline_db_press, 'triceps', 'secondary'),

        (ex_cable_fly, 'chest', 'primary'),
        (ex_dips, 'chest', 'primary'),
        (ex_dips, 'triceps', 'secondary'),

        (ex_deadlift, 'back', 'primary'),
        (ex_deadlift, 'legs', 'secondary'),
        (ex_deadlift, 'core', 'secondary'),

        (ex_lat_pulldown, 'back', 'primary'),
        (ex_lat_pulldown, 'biceps', 'secondary'),

        (ex_barbell_row, 'back', 'primary'),
        (ex_barbell_row, 'biceps', 'secondary'),

        (ex_cable_row, 'back', 'primary'),
        (ex_cable_row, 'biceps', 'secondary'),

        (ex_overhead_press, 'shoulders', 'primary'),
        (ex_overhead_press, 'triceps', 'secondary'),

        (ex_lateral_raise, 'shoulders', 'primary'),
        (ex_face_pull, 'shoulders', 'primary'),
        (ex_face_pull, 'back', 'secondary'),

        (ex_barbell_curl, 'biceps', 'primary'),
        (ex_hammer_curl, 'biceps', 'primary'),

        (ex_tricep_rope, 'triceps', 'primary'),
        (ex_skull_crushers, 'triceps', 'primary'),

        (ex_squat, 'legs', 'primary'),
        (ex_squat, 'core', 'secondary'),

        (ex_leg_press, 'legs', 'primary'),
        (ex_rdl, 'legs', 'primary'),
        (ex_rdl, 'back', 'secondary'),

        (ex_hanging_leg_raise, 'core', 'primary'),
        (ex_plank, 'core', 'primary')
    ON CONFLICT (exercise_id, muscle) DO NOTHING;

    -- 3. Insert 6 Bro Split Routines (5 Core + 1 Optional)
    INSERT INTO public.gym_routines (id, user_id, name, description, target_muscle, day_of_week, is_preset, is_active)
    VALUES
        (r_chest, NULL, 'Monday — Chest Day', 'Classic chest power and hypertrophy routine', 'chest', 1, true, true),
        (r_back, NULL, 'Tuesday — Back & Lats Day', 'Deadlift, vertical lat pulling and horizontal rows', 'back', 2, true, true),
        (r_shoulders, NULL, 'Wednesday — Shoulders & Traps', 'Overhead presses, lateral deltoid sculpting and rear delt flyes', 'shoulders', 3, true, true),
        (r_arms, NULL, 'Thursday — Arms (Biceps & Triceps)', 'Dedicated arm superset session for peak bicep and tricep volume', 'biceps', 4, true, true),
        (r_legs, NULL, 'Friday — Legs & Calves', 'Heavy squats, quad pressing, hamstring curls and calves', 'legs', 5, true, true),
        (r_core, NULL, 'Saturday — Core & Cardio (Optional)', 'Abs, oblique rotary strength and cardiovascular conditioning', 'core', 6, true, true)
    ON CONFLICT (id) DO NOTHING;

    -- 4. Routine to Exercise Mapping with default sets, reps, and rest timers
    -- Chest Day
    INSERT INTO public.gym_routine_exercises (routine_id, exercise_id, order_index, target_sets, target_reps, rest_seconds, notes)
    VALUES
        (r_chest, ex_bench_press, 1, 4, 8, 120, 'Heavy compound strength builder. Warm up properly.'),
        (r_chest, ex_incline_db_press, 2, 3, 10, 90, 'Focus on upper chest contraction at top.'),
        (r_chest, ex_cable_fly, 3, 3, 15, 60, 'Squeeze and stretch with controlled tempo.'),
        (r_chest, ex_dips, 4, 3, 12, 90, 'Lean torso slightly forward to recruit lower chest.');

    -- Back Day
    INSERT INTO public.gym_routine_exercises (routine_id, exercise_id, order_index, target_sets, target_reps, rest_seconds, notes)
    VALUES
        (r_back, ex_deadlift, 1, 4, 6, 150, 'Full body posterior chain drive. Reset after each rep.'),
        (r_back, ex_lat_pulldown, 2, 4, 10, 90, 'Pull through elbows down to upper chest.'),
        (r_back, ex_barbell_row, 3, 3, 10, 90, 'Keep torso at ~45 degrees, pull towards belly button.'),
        (r_back, ex_cable_row, 4, 3, 12, 60, 'Pause for 1 second at full squeeze.');

    -- Shoulders Day
    INSERT INTO public.gym_routine_exercises (routine_id, exercise_id, order_index, target_sets, target_reps, rest_seconds, notes)
    VALUES
        (r_shoulders, ex_overhead_press, 1, 4, 8, 120, 'Strict military press, core locked.'),
        (r_shoulders, ex_lateral_raise, 2, 4, 15, 60, 'Lead with elbows for maximum lateral delt activation.'),
        (r_shoulders, ex_face_pull, 3, 4, 15, 60, 'External rotation at end for shoulder health.'),
        (r_shoulders, ex_reverse_pec_deck, 4, 3, 15, 60, 'Keep arms straight with soft bend in elbows.');

    -- Arms Day
    INSERT INTO public.gym_routine_exercises (routine_id, exercise_id, order_index, target_sets, target_reps, rest_seconds, notes)
    VALUES
        (r_arms, ex_barbell_curl, 1, 4, 10, 90, 'Strict form, no swinging.'),
        (r_arms, ex_skull_crushers, 2, 4, 10, 90, 'Lower bar to crown of head, flare elbows slightly.'),
        (r_arms, ex_hammer_curl, 3, 3, 12, 60, 'Brachialis focus for arm thickness.'),
        (r_arms, ex_tricep_rope, 4, 3, 15, 60, 'Spread rope at the bottom for peak tricep contraction.');

    -- Legs Day
    INSERT INTO public.gym_routine_exercises (routine_id, exercise_id, order_index, target_sets, target_reps, rest_seconds, notes)
    VALUES
        (r_legs, ex_squat, 1, 4, 8, 150, 'Deep squats below parallel. Drive through mid-foot.'),
        (r_legs, ex_leg_press, 2, 3, 12, 90, 'Controlled eccentric, do not lock knees.'),
        (r_legs, ex_rdl, 3, 3, 10, 90, 'Hinge at hips until hamstrings stretch.'),
        (r_legs, ex_leg_curl, 4, 3, 12, 60, 'Keep hips down against the bench pad.'),
        (r_legs, ex_calf_raise, 5, 4, 15, 45, 'Full stretch at bottom, pause at the top.');

    -- Core Day
    INSERT INTO public.gym_routine_exercises (routine_id, exercise_id, order_index, target_sets, target_reps, rest_seconds, notes)
    VALUES
        (r_core, ex_hanging_leg_raise, 1, 3, 12, 60, 'Control swing, curl pelvis upward.'),
        (r_core, ex_woodchoppers, 2, 3, 15, 45, 'High to low rotational power for obliques.'),
        (r_core, ex_plank, 3, 3, 60, 60, 'Hold tight for 60 seconds per set.');
END $$;
