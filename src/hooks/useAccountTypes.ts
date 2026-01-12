/*
 * useAccountTypes Hook
 * Copyright (c) 2026 kogulmurugaiah
 * All rights reserved.
 * 
 * Developer: kogulmurugaiah
 * Description: Hook for managing user-specific account types
 */

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import type { User } from "@supabase/supabase-js";

const DEFAULT_ACCOUNT_TYPES = ["INDIAN", "SBI", "UNION", "CASH"];

export const useAccountTypes = () => {
  const [accountTypes, setAccountTypes] = useState<string[]>(DEFAULT_ACCOUNT_TYPES);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  // Get current user
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    
    getCurrentUser();
  }, []);

  // Fetch user-specific account types
  const fetchAccountTypes = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from("account_types")
        .select("name")
        .eq("user_id", user.id)
        .order("created_at");

      if (error) throw error;

      const customTypes = data?.map(row => row.name) || [];
      const mergedTypes = [...DEFAULT_ACCOUNT_TYPES, ...customTypes];
      
      setAccountTypes(mergedTypes);
    } catch (err: any) {
      setError(err.message || "Failed to fetch account types");
    } finally {
      setLoading(false);
    }
  };

  // Add new account type
  const addAccountType = async (name: string): Promise<string | null> => {
    if (!user) return null;
    
    if (!name.trim()) {
      setError("Account type name cannot be empty");
      return null;
    }

    if (accountTypes.some(type => type.toLowerCase() === name.toLowerCase())) {
      setError("Account type already exists");
      return null;
    }

    try {
      const { data, error } = await supabase
        .from("account_types")
        .insert({ 
          name: name.trim(),
          user_id: user.id 
        })
        .select("name")
        .single();

      if (error) throw error;

      if (data) {
        setAccountTypes(prev => [...prev, data.name]);
        setError(null);
        return data.name;
      }

      return null;
    } catch (err: any) {
      setError(err.message || "Failed to add account type");
      return null;
    }
  };

  // Refresh account types
  const refresh = async () => {
    await fetchAccountTypes();
  };

  // Reset to defaults (for logout)
  const resetToDefaults = () => {
    setAccountTypes(DEFAULT_ACCOUNT_TYPES);
    setError(null);
    setUser(null);
  };

  // Fetch on mount and auth change
  useEffect(() => {
    if (user) {
      fetchAccountTypes();
    }
  }, [user]);

  // Listen for auth changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user);
      } else if (event === 'SIGNED_OUT') {
        resetToDefaults();
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  return {
    accountTypes,
    loading,
    error,
    refresh,
    addAccountType,
    resetToDefaults,
  };
};
