-- =============================================================
-- CASHAM: Credit Card Management & Bill Settlement Migration
-- Run this in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- =============================================================

-- 1. Create credit_cards table
CREATE TABLE IF NOT EXISTS public.credit_cards (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    bank_name TEXT,
    card_last4 TEXT,
    credit_limit NUMERIC DEFAULT 0,
    billing_cycle_day INTEGER DEFAULT 1 CHECK (billing_cycle_day >= 1 AND billing_cycle_day <= 31),
    payment_due_day INTEGER DEFAULT 20 CHECK (payment_due_day >= 1 AND payment_due_day <= 31),
    color TEXT DEFAULT '#8b5cf6',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.credit_cards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own credit cards" ON public.credit_cards;
CREATE POLICY "Users can manage their own credit cards"
    ON public.credit_cards FOR ALL USING (auth.uid() = user_id);

-- 2. Create credit_card_settlements table (archives paid statements)
CREATE TABLE IF NOT EXISTS public.credit_card_settlements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    credit_card_id UUID REFERENCES public.credit_cards(id) ON DELETE SET NULL,
    credit_card_name TEXT NOT NULL,
    total_amount NUMERIC NOT NULL,
    settlement_date DATE NOT NULL,
    breakdown JSONB NOT NULL DEFAULT '{}', -- e.g. {"Slice": 3500, "HDFC": 2000}
    expense_ids JSONB DEFAULT '[]',        -- list of expense IDs settled in this bill
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.credit_card_settlements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own settlements" ON public.credit_card_settlements;
CREATE POLICY "Users can manage their own settlements"
    ON public.credit_card_settlements FOR ALL USING (auth.uid() = user_id);

-- 3. Add Credit Card columns to expenses table
ALTER TABLE public.expenses
    ADD COLUMN IF NOT EXISTS paid_via_credit_card BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS credit_card_id UUID REFERENCES public.credit_cards(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS credit_card_name TEXT DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS cc_bill_settled BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS cc_settled_at TIMESTAMPTZ DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS cc_settlement_id UUID REFERENCES public.credit_card_settlements(id) ON DELETE SET NULL;

-- 4. Add Credit Card columns to expense_templates table
ALTER TABLE public.expense_templates
    ADD COLUMN IF NOT EXISTS paid_via_credit_card BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS credit_card_id UUID REFERENCES public.credit_cards(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS credit_card_name TEXT DEFAULT NULL;

-- 5. Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_expenses_cc_status ON public.expenses(user_id, paid_via_credit_card, cc_bill_settled);
CREATE INDEX IF NOT EXISTS idx_credit_cards_user ON public.credit_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_cc_settlements_user ON public.credit_card_settlements(user_id, settlement_date);
