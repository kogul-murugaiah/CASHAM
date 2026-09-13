import { useState, useCallback } from 'react';
import { api } from '../lib/api';

export interface RentCollection {
  id?: string;
  property_id: string;
  month_year: string;
  amount_paid?: number;
  paid_on?: string;
  status: 'pending' | 'paid';
}

export interface RentProperty {
  id: string;
  name: string;
  type: string;
  tenant_name?: string;
  rent_amount: number;
  due_day: number;
  collection: RentCollection; // Appended from backend for current month
}

export const useRent = () => {
  const [properties, setProperties] = useState<RentProperty[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCollections = useCallback(async (monthYear: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get(`/api/rent?action=collections&month_year=${monthYear}`);
      setProperties(data || []);
      return data;
    } catch (err: any) {
      setError(err.message || 'Failed to fetch rent collections');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const addProperty = async (data: {
    name: string;
    type: string;
    tenant_name?: string;
    rent_amount: number;
    due_day: number;
  }) => {
    try {
      await api.post('/api/rent?action=add_property', data);
      // We don't push to state directly since we need the collection wrapper, 
      // best to let the caller re-fetch collections.
    } catch (err: any) {
      throw new Error(err.message || 'Failed to add property');
    }
  };

  const deleteProperty = async (id: string) => {
    try {
      await api.delete(`/api/rent?action=delete_property&id=${id}`);
      setProperties(prev => prev.filter(p => p.id !== id));
    } catch (err: any) {
      throw new Error(err.message || 'Failed to delete property');
    }
  };

  const markCollected = async (property_id: string, month_year: string, amount_paid: number, paid_on: string) => {
    try {
      const updatedCollection = await api.post('/api/rent?action=mark_collected', {
        property_id,
        month_year,
        amount_paid,
        paid_on
      });
      
      // Update local state
      setProperties(prev => prev.map(p => {
        if (p.id === property_id) {
          return { ...p, collection: updatedCollection };
        }
        return p;
      }));
    } catch (err: any) {
      throw new Error(err.message || 'Failed to mark as collected');
    }
  };

  const markPending = async (property_id: string, month_year: string) => {
    try {
      const updatedCollection = await api.post('/api/rent?action=mark_pending', {
        property_id,
        month_year
      });
      
      // Update local state
      setProperties(prev => prev.map(p => {
        if (p.id === property_id) {
          return { ...p, collection: updatedCollection };
        }
        return p;
      }));
    } catch (err: any) {
      throw new Error(err.message || 'Failed to mark as pending');
    }
  };

  return {
    properties,
    loading,
    error,
    fetchCollections,
    addProperty,
    deleteProperty,
    markCollected,
    markPending
  };
};
