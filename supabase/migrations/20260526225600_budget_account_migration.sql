-- Migration: Add account_name to budget_categories
-- Run this in your Supabase SQL Editor

ALTER TABLE budget_categories
ADD COLUMN IF NOT EXISTS account_name TEXT DEFAULT NULL;
