-- Migration: Create Ledger (IOU) Tables
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS ledger_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL, -- Ties to the authenticated user
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE TABLE IF NOT EXISTS ledger_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id UUID NOT NULL REFERENCES ledger_contacts(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('gave', 'got', 'settled')),
    note TEXT,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- RLS Policies
ALTER TABLE ledger_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_transactions ENABLE ROW LEVEL SECURITY;

-- Note: In this app, the user_id is being passed manually via headers in the API layer,
-- or you can use standard Supabase auth. If using standard auth:
-- CREATE POLICY "Users can manage their own contacts" ON ledger_contacts FOR ALL USING (auth.uid() = user_id);
-- CREATE POLICY "Users can manage their own ledger transactions" ON ledger_transactions FOR ALL USING (
--     contact_id IN (SELECT id FROM ledger_contacts WHERE user_id = auth.uid())
-- );
