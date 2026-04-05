-- ============================================================
-- CASHAM — Investment Tracking V3 Migration
-- Add Crypto and PF (Provident Fund) support
-- Run this in the Supabase SQL Editor
-- ============================================================

-- Step 1: Update the investment type check constraint
-- First, drop the old constraint
ALTER TABLE public.investments DROP CONSTRAINT IF EXISTS investments_type_check;

-- Second, add the expanded constraint
-- We use a single check constraint for now for dashboard carryover compatibility
ALTER TABLE public.investments ADD CONSTRAINT investments_type_check 
    CHECK (type IN ('Mutual Fund', 'Stock', 'Gold', 'FD', 'Real Estate', 'Crypto', 'PF'));

-- Step 2: Create Crypto details table
CREATE TABLE IF NOT EXISTS public.investment_crypto (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    investment_id UUID NOT NULL REFERENCES public.investments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token_symbol TEXT NOT NULL,                  -- BTC, ETH, SOL
    exchange TEXT DEFAULT 'Binance',             -- Binance, WazirX, CoinDCX etc.
    quantity NUMERIC NOT NULL,
    buy_price_usd NUMERIC DEFAULT NULL,           -- price in USD
    buy_price_inr NUMERIC DEFAULT NULL,           -- price in INR
    current_price_usd NUMERIC DEFAULT NULL,        -- manually updated
    current_price_inr NUMERIC DEFAULT NULL         -- manually updated
);

ALTER TABLE public.investment_crypto ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own crypto" ON public.investment_crypto FOR ALL USING (auth.uid() = user_id);

-- Step 3: Create PF (Provident Fund) details table
CREATE TABLE IF NOT EXISTS public.investment_pf (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    investment_id UUID NOT NULL REFERENCES public.investments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    pf_type TEXT NOT NULL CHECK (pf_type IN ('EPF', 'PPF', 'NPS', 'Other')),
    account_number TEXT DEFAULT NULL,
    current_balance NUMERIC NOT NULL,           -- opening balance or current month's updated balance
    interest_rate NUMERIC DEFAULT 8.1,          -- e.g. 8.1% for EPF
    monthly_contribution NUMERIC DEFAULT 0,     -- recurring monthly contribution
    employer_contribution NUMERIC DEFAULT 0      -- specifically for EPF/NPS
);

ALTER TABLE public.investment_pf ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own pf" ON public.investment_pf FOR ALL USING (auth.uid() = user_id);

-- Step 4: Indexes for performance
CREATE INDEX IF NOT EXISTS idx_investments_crypto_user ON public.investment_crypto(user_id);
CREATE INDEX IF NOT EXISTS idx_investments_pf_user ON public.investment_pf(user_id);
