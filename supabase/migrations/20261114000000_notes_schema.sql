-- CASHAM: Quick Notes & Brain Dump Schema
-- Supports instant capture, pinned notes, color categorisation, and cloud synchronization

CREATE TABLE IF NOT EXISTS public.notes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT DEFAULT '' NOT NULL,
    content TEXT DEFAULT '' NOT NULL,
    color TEXT DEFAULT '#10b981' NOT NULL,
    is_pinned BOOLEAN DEFAULT false NOT NULL,
    category TEXT DEFAULT 'General' NOT NULL,
    tags TEXT[] DEFAULT '{}'::TEXT[] NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own notes" ON public.notes;
CREATE POLICY "Users can manage their own notes"
    ON public.notes FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_notes_user_updated ON public.notes(user_id, is_pinned DESC, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_notes_user_created ON public.notes(user_id, created_at DESC);

