import { useState, useEffect } from 'react';
import { api } from '../lib/api';

export interface IncomeSource {
  id: string;
  name: string;
  user_id: string;
  created_at: string;
}

export const useIncomeSources = () => {
  const [sources, setSources] = useState<IncomeSource[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch user-specific income sources with retry logic
  const fetchSources = async (retryCount = 0) => {
    try {
      setLoading(true);
      setError(null);

      const data = await api.get('/api/config?type=income_sources');

      const types = data || [];

      if (types.length === 0 && retryCount < 6) {
        // If no sources exist yet, retry after 500ms
        setTimeout(() => fetchSources(retryCount + 1), 500);
        return;
      }

      setSources(types);
    } catch (err: any) {
      if (err.status === 401) {
        resetToDefaults();
      } else {
        setError(err.message || 'Failed to fetch income sources');
      }
    } finally {
      setLoading(false);
    }
  };

  const addSource = async (name: string) => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      throw new Error('Source name cannot be empty');
    }
    if (trimmedName.length > 50) {
      throw new Error('Source name must be 50 characters or less');
    }

    // Check for duplicates (case-insensitive)
    const existingSource = sources.find(
      source => source.name && source.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (existingSource) {
      throw new Error('Source already exists');
    }

    try {
      const data = await api.post('/api/config?type=income_sources', { name: trimmedName });
      setSources(prev => [...prev, data]);
      return data;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to add income source');
    }
  };

  // Reset to defaults (for logout)
  const resetToDefaults = () => {
    setSources([]);
    setError(null);
  };

  // Fetch on mount
  useEffect(() => {
    fetchSources();
  }, []);

  return {
    sources,
    loading,
    error,
    refetch: fetchSources,
    addSource,
  };
};
