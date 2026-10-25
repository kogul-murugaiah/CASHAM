-- Migration: Atomic Account Type Renaming Stored Procedure
-- Wraps renaming and propagation across all 5 financial tables in a single transaction block.

CREATE OR REPLACE FUNCTION rename_account_type(
    p_user_id UUID,
    p_old_name TEXT,
    p_new_name TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- 1. Update the account type name
    UPDATE account_types
    SET name = p_new_name
    WHERE name = p_old_name AND user_id = p_user_id;

    -- 2. Propagate to expenses
    UPDATE expenses
    SET account_type = p_new_name
    WHERE account_type = p_old_name AND user_id = p_user_id;

    -- 3. Propagate to income
    UPDATE income
    SET account_type = p_new_name
    WHERE account_type = p_old_name AND user_id = p_user_id;

    -- 4. Propagate to investments
    UPDATE investments
    SET account_type = p_new_name
    WHERE account_type = p_old_name AND user_id = p_user_id;

    -- 5. Propagate to transfers (from_account)
    UPDATE transfers
    SET from_account = p_new_name
    WHERE from_account = p_old_name AND user_id = p_user_id;

    -- 6. Propagate to transfers (to_account)
    UPDATE transfers
    SET to_account = p_new_name
    WHERE to_account = p_old_name AND user_id = p_user_id;
END;
$$;
