-- Run in Supabase SQL Editor

CREATE TABLE public.transfers (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    from_account TEXT NOT NULL,
    to_account TEXT NOT NULL,
    amount NUMERIC NOT NULL CHECK (amount > 0),
    date DATE NOT NULL,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.transfers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own transfers"
    ON public.transfers FOR ALL USING (auth.uid() = user_id);

-- Index for faster per-user queries
CREATE INDEX idx_transfers_user_date ON public.transfers(user_id, date);
