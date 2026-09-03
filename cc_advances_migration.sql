-- CASHAM: CC Advances Migration
-- Track credit card payments made for friends/family

CREATE TABLE IF NOT EXISTS public.cc_advances (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    person_name TEXT NOT NULL,
    amount NUMERIC NOT NULL CHECK (amount > 0),
    credit_card_id UUID REFERENCES public.credit_cards(id) ON DELETE SET NULL,
    credit_card_name TEXT NOT NULL,
    date DATE NOT NULL,
    description TEXT,
    cash_received BOOLEAN DEFAULT false,
    cash_received_date DATE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.cc_advances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own cc_advances" ON public.cc_advances;
CREATE POLICY "Users can manage their own cc_advances"
    ON public.cc_advances FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_cc_advances_user ON public.cc_advances(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_cc_advances_card ON public.cc_advances(credit_card_id, cash_received);