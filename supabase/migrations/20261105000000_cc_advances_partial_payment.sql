-- =============================================================
-- CASHAM: CC Advances Partial Payments & Installments Migration
-- Run this in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- =============================================================

-- Add paid_amount to track installments / partial cash repayments by friends
ALTER TABLE public.cc_advances
    ADD COLUMN IF NOT EXISTS paid_amount NUMERIC DEFAULT 0 CHECK (paid_amount >= 0);

-- Update existing records: if cash_received is true and paid_amount is 0, set paid_amount = amount
UPDATE public.cc_advances
    SET paid_amount = amount
    WHERE cash_received = true AND (paid_amount IS NULL OR paid_amount = 0);

COMMENT ON COLUMN public.cc_advances.paid_amount IS 'Total amount repaid by the friend in cash/UPI so far';
