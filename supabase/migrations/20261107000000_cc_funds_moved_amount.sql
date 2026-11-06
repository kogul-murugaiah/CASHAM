-- =============================================================
-- CASHAM: Credit Card Envelope Shortfall Tracking Migration
-- Run this in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- =============================================================

-- Add funds_moved_amount to track the exact cash amount set aside from the bank account
ALTER TABLE public.expenses
    ADD COLUMN IF NOT EXISTS funds_moved_amount NUMERIC DEFAULT 0;

-- Backfill existing rows: if cc_funds_set_aside is true, set funds_moved_amount = amount
UPDATE public.expenses
    SET funds_moved_amount = amount
    WHERE paid_via_credit_card = true 
      AND cc_funds_set_aside = true 
      AND (funds_moved_amount IS NULL OR funds_moved_amount = 0);

COMMENT ON COLUMN public.expenses.funds_moved_amount IS 'Amount of cash allocated/set aside from the budget account for this credit card expense';
