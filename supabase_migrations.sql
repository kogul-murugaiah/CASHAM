-- =============================================================
-- CASHAM Feature Migrations
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- =============================================================

-- ─── 1. Expense Templates ───────────────────────────────────
CREATE TABLE expense_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC NOT NULL,
  item TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES categories(id),
  account_type TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE expense_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own templates" ON expense_templates
  FOR ALL USING (auth.uid() = user_id);

-- ─── 2. Savings Goals ──────────────────────────────────────
CREATE TABLE savings_goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  target_amount NUMERIC NOT NULL,
  current_amount NUMERIC DEFAULT 0,
  icon TEXT DEFAULT '🎯',
  color TEXT DEFAULT '#10b981',
  deadline DATE,
  is_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE savings_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own goals" ON savings_goals
  FOR ALL USING (auth.uid() = user_id);

-- ─── 3. Investment Snapshots ────────────────────────────────
CREATE TABLE investment_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  snapshot_date DATE NOT NULL,
  total_invested NUMERIC DEFAULT 0,
  total_current_value NUMERIC DEFAULT 0,
  total_pnl NUMERIC DEFAULT 0,
  breakdown JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, snapshot_date)
);

ALTER TABLE investment_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own snapshots" ON investment_snapshots
  FOR ALL USING (auth.uid() = user_id);
