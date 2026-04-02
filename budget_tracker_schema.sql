-- Run this in the Supabase SQL Editor

-- 1. Create budget_months table
CREATE TABLE public.budget_months (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    year INTEGER NOT NULL,
    total_income NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, month, year)
);

-- Protect budget_months with RLS
ALTER TABLE public.budget_months ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own budget months" 
    ON public.budget_months FOR ALL USING (auth.uid() = user_id);

-- 2. Create budget_categories table
CREATE TABLE public.budget_categories (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    budget_id UUID NOT NULL REFERENCES public.budget_months(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    allocated_amount NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Protect budget_categories with RLS
ALTER TABLE public.budget_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own budget categories" 
    ON public.budget_categories FOR ALL USING (auth.uid() = user_id);

-- 3. Create budget_items table
CREATE TABLE public.budget_items (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES public.budget_categories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    amount NUMERIC NOT NULL DEFAULT 0,
    status TEXT NOT NULL CHECK (status IN ('planned', 'paid')) DEFAULT 'planned',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Protect budget_items with RLS
ALTER TABLE public.budget_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own budget items" 
    ON public.budget_items FOR ALL USING (auth.uid() = user_id);
