-- Migration: Create Assets and Liabilities Tables for Net Worth Feature

-- ==========================================
-- 1. ASSETS TABLE
-- ==========================================
CREATE TABLE public.assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL,
    name TEXT NOT NULL,
    symbol TEXT, -- Optional: For stocks/mutual funds to fetch live prices
    units NUMERIC, -- Optional: Quantity for live pricing calculation
    purchase_price NUMERIC, -- Optional: Initial price per unit
    purchase_date DATE, -- Optional: Date of purchase
    value NUMERIC, -- Required if no symbol (manual value input)
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own assets" 
ON public.assets FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own assets" 
ON public.assets FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own assets" 
ON public.assets FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own assets" 
ON public.assets FOR DELETE 
USING (auth.uid() = user_id);


-- ==========================================
-- 2. LIABILITIES TABLE
-- ==========================================
CREATE TABLE public.liabilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL,
    name TEXT NOT NULL,
    balance NUMERIC NOT NULL,
    interest_rate NUMERIC,
    minimum_payment NUMERIC,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

ALTER TABLE public.liabilities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own liabilities" 
ON public.liabilities FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own liabilities" 
ON public.liabilities FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own liabilities" 
ON public.liabilities FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own liabilities" 
ON public.liabilities FOR DELETE 
USING (auth.uid() = user_id);
