/*
 * useAccountTypes Hook
 * Copyright (c) 2026 kogulmurugaiah
 * All rights reserved.
 * 
 * Developer: kogulmurugaiah
 * Description: Hook for managing user-specific account types
 */

import { useState, useEffect } from "react";
import { api } from "../lib/api";

export const useAccountTypes = () => {
  const [accountTypes, setAccountTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch user-specific account types with retry logic
  const fetchAccountTypes = async (retryCount = 0) => {
    setLoading(true);
    setError(null);

    try {
      const data = await api.get('/api/accounts');

      const types = data?.map((row: any) => row.name) || [];

      if (types.length === 0 && retryCount < 6) {
        // If no accounts exist yet (trigger hasn't run), retry after 500ms
        setTimeout(() => fetchAccountTypes(retryCount + 1), 500);
        return;
      }

      setAccountTypes(types);
    } catch (err: any) {
      if (err.status !== 401) {
        setError(err.message || "Failed to fetch account types");
      }
    } finally {
      setLoading(false);
    }
  };

  // Add new account type
  const addAccountType = async (name: string): Promise<string | null> => {
    if (!name.trim()) {
      setError("Account type name cannot be empty");
      return null;
    }

    if (accountTypes.some(type => type.toLowerCase() === name.toLowerCase())) {
      setError("Account type already exists");
      return null;
    }

    try {
      const data = await api.post('/api/accounts', { name: name.trim() });

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

  // Rename an account type (Propagates globally)
  const renameAccountType = async (oldName: string, newName: string) => {
    if (!newName.trim()) throw new Error("New name cannot be empty");
    if (oldName === newName) return;

    try {
      await api.patch('/api/accounts', { oldName, newName: newName.trim() });
      setAccountTypes(prev => prev.map(name => name === oldName ? newName.trim() : name));
    } catch (err: any) {
      throw new Error(err.message || "Failed to rename account");
    }
  };

  // Delete an account type
  const deleteAccountType = async (name: string) => {
    try {
      await api.delete(`/api/accounts?name=${encodeURIComponent(name)}`);
      setAccountTypes(prev => prev.filter(t => t !== name));
    } catch (err: any) {
      throw new Error(err.message || "Failed to delete account");
    }
  };

  // Refresh account types
  const refresh = async () => {
    await fetchAccountTypes();
  };

  // Reset to defaults (for logout)
  const resetToDefaults = () => {
    setAccountTypes([]);
    setError(null);
  };

  // Fetch on mount
  useEffect(() => {
    fetchAccountTypes();
  }, []);

  return {
    accountTypes,
    loading,
    error,
    refresh,
    addAccountType,
    renameAccountType,
    deleteAccountType,
    resetToDefaults,
  };
};
