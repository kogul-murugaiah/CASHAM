-- ============================================================
-- CASHAM — Investment Tracking V2 Schema
-- Run this ENTIRE script in Supabase SQL Editor
-- WARNING: This drops the old investments table first
-- ============================================================

-- Step 1: Drop old table (cascades to any old foreign keys)
DROP TABLE IF EXISTS public.investment_real_estate CASCADE;
DROP TABLE IF EXISTS public.investment_fd CASCADE;
DROP TABLE IF EXISTS public.investment_gold CASCADE;
DROP TABLE IF EXISTS public.investment_stock CASCADE;
DROP TABLE IF EXISTS public.investment_mf CASCADE;
DROP TABLE IF EXISTS public.investments CASCADE;

-- Step 2: Core investments table
-- `amount` and `action` are kept for dashboard.ts carryover compatibility
CREATE TABLE public.investments (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('Mutual Fund', 'Stock', 'Gold', 'FD', 'Real Estate')),
    name TEXT NOT NULL,
    action TEXT NOT NULL DEFAULT 'buy' CHECK (action IN ('buy', 'sell')),
    amount NUMERIC NOT NULL CHECK (amount > 0),      -- total deployed (used by dashboard carryover)
    current_value NUMERIC DEFAULT NULL,              -- manually updated market value
    current_value_updated_at TIMESTAMPTZ DEFAULT NULL,
    account_type TEXT DEFAULT NULL,
    date DATE NOT NULL,
    notes TEXT DEFAULT NULL,
    is_automated BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);

ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own investments"
    ON public.investments FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_investments_user_date ON public.investments(user_id, date);
CREATE INDEX idx_investments_user_type ON public.investments(user_id, type);

-- ============================================================
-- Step 3: Mutual Fund details
-- ============================================================
CREATE TABLE public.investment_mf (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    investment_id UUID NOT NULL REFERENCES public.investments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    fund_house TEXT DEFAULT NULL,           -- HDFC, SBI, Axis, Mirae
    fund_category TEXT DEFAULT 'Equity',   -- Equity / Debt / Hybrid / ELSS / Index
    folio_number TEXT DEFAULT NULL,
    units NUMERIC NOT NULL,
    nav_at_purchase NUMERIC DEFAULT NULL,
    current_nav NUMERIC DEFAULT NULL,      -- manually updated
    is_sip BOOLEAN DEFAULT FALSE,
    sip_day INTEGER DEFAULT NULL,          -- day of month for SIP, e.g. 5
    amfi_code TEXT DEFAULT NULL            -- code for NAV automation
);

ALTER TABLE public.investment_mf ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own mf" ON public.investment_mf FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- Step 4: Stock details
-- ============================================================
CREATE TABLE public.investment_stock (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    investment_id UUID NOT NULL REFERENCES public.investments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    ticker TEXT NOT NULL,                  -- HDFCBANK, RELIANCE, INFY
    exchange TEXT DEFAULT 'NSE',           -- NSE / BSE
    quantity INTEGER NOT NULL,
    buy_price NUMERIC NOT NULL,            -- price per share at purchase
    current_price NUMERIC DEFAULT NULL,   -- manually updated
    sector TEXT DEFAULT NULL,              -- Banking, IT, FMCG, Pharma etc.
    market_cap TEXT DEFAULT NULL CHECK (market_cap IN ('Large', 'Mid', 'Small'))
);

ALTER TABLE public.investment_stock ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own stocks" ON public.investment_stock FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- Step 5: Gold details
-- ============================================================
CREATE TABLE public.investment_gold (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    investment_id UUID NOT NULL REFERENCES public.investments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    gold_form TEXT NOT NULL DEFAULT 'Physical',    -- Physical / Sovereign Gold Bond / Digital Gold
    grams NUMERIC NOT NULL,
    purity TEXT DEFAULT '24K',                     -- 24K / 22K / 18K
    buy_price_per_gram NUMERIC DEFAULT NULL,
    current_price_per_gram NUMERIC DEFAULT NULL    -- manually updated (check MCX/jeweller rate)
);

ALTER TABLE public.investment_gold ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own gold" ON public.investment_gold FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- Step 6: Fixed Deposit details
-- ============================================================
CREATE TABLE public.investment_fd (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    investment_id UUID NOT NULL REFERENCES public.investments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    bank_name TEXT NOT NULL,
    fd_number TEXT DEFAULT NULL,
    principal NUMERIC NOT NULL,
    interest_rate NUMERIC NOT NULL,           -- annual rate, e.g. 7.5 for 7.5%
    tenure_months INTEGER NOT NULL,
    start_date DATE NOT NULL,
    maturity_date DATE NOT NULL,
    compounding TEXT DEFAULT 'quarterly',     -- quarterly / monthly / annually / cumulative / simple
    maturity_amount NUMERIC DEFAULT NULL      -- pre-calculated or computed
);

ALTER TABLE public.investment_fd ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own fd" ON public.investment_fd FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- Step 7: Real Estate details
-- ============================================================
CREATE TABLE public.investment_real_estate (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    investment_id UUID NOT NULL REFERENCES public.investments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    property_name TEXT NOT NULL,
    property_type TEXT DEFAULT 'Residential',  -- Residential / Commercial / Plot / Land
    address TEXT DEFAULT NULL,
    area_sqft NUMERIC DEFAULT NULL,
    buy_price_per_sqft NUMERIC DEFAULT NULL,
    current_value NUMERIC DEFAULT NULL,        -- manually updated property valuation
    monthly_rental NUMERIC DEFAULT 0,
    loan_emi NUMERIC DEFAULT 0                 -- if property has an active home loan EMI
);

ALTER TABLE public.investment_real_estate ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own real estate" ON public.investment_real_estate FOR ALL USING (auth.uid() = user_id);
