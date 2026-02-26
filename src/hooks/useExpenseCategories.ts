import { useState, useEffect } from 'react';
import { api } from '../lib/api';

export interface Category {
  id: number;
  name: string;
  keyword: string | null;
  user_id: string;
  created_at: string;
}

export const useExpenseCategories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch user-specific categories with retry logic
  const fetchCategories = async (retryCount = 0) => {
    try {
      setLoading(true);
      setError(null);

      const data = await api.get('/api/categories');

      const types = data || [];

      if (types.length === 0 && retryCount < 6) {
        // If no categories exist yet, retry after 500ms
        setTimeout(() => fetchCategories(retryCount + 1), 500);
        return;
      }

      setCategories(types);
    } catch (err: any) {
      if (err.status === 401) {
        resetToDefaults();
      } else {
        setError(err.message || 'Failed to fetch categories');
      }
    } finally {
      setLoading(false);
    }
  };

  const addCategory = async (name: string) => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      throw new Error('Category name cannot be empty');
    }
    if (trimmedName.length > 50) {
      throw new Error('Category name must be 50 characters or less');
    }

    // Check for duplicates (case-insensitive)
    const existingCategory = categories.find(
      cat => cat.name && cat.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (existingCategory) {
      throw new Error('Category already exists');
    }

    try {
      const data = await api.post('/api/categories', { name: trimmedName });
      setCategories(prev => [...prev, data]);
      return data;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to add category');
    }
  };

  // Reset to defaults (for logout)
  const resetToDefaults = () => {
    setCategories([]);
    setError(null);
  };

  // Fetch on mount
  useEffect(() => {
    fetchCategories();
  }, []);

  return {
    categories,
    loading,
    error,
    refetch: fetchCategories,
    addCategory,
  };
};
