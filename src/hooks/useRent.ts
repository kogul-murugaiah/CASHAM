import { useState, useCallback } from 'react';
import { api } from '../lib/api';

export interface RentCollection {
  id?: string;
  property_id: string;
  month_year: string;
  amount_paid?: number;
  paid_on?: string;
  payment_mode?: string;
  payment_notes?: string;
  status: 'pending' | 'paid';
}

export interface RentProperty {
  id: string;
  name: string;
  type: string;
  tenant_name?: string;
  tenant_phone?: string;
  tenant_id_proof?: string;
  tenant_move_in?: string;
  tenant_move_out?: string;
  rent_amount: number;
  due_day: number;
  security_deposit?: number;
  advance_rent?: number;
  notes?: string;
  created_at?: string;
  collection: RentCollection;
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
    tenant_phone?: string;
    tenant_id_proof?: string;
    tenant_move_in?: string;
    tenant_move_out?: string;
    rent_amount: number;
    due_day: number;
    security_deposit?: number;
    advance_rent?: number;
    notes?: string;
  }) => {
    try {
      await api.post('/api/rent?action=add_property', data);
    } catch (err: any) {
      throw new Error(err.message || 'Failed to add property');
    }
  };

  const updateProperty = async (id: string, data: {
    name?: string;
    type?: string;
    tenant_name?: string;
    tenant_phone?: string;
    tenant_id_proof?: string;
    tenant_move_in?: string;
    tenant_move_out?: string;
    rent_amount?: number;
    due_day?: number;
    security_deposit?: number;
    advance_rent?: number;
    notes?: string;
  }) => {
    try {
      const updated = await api.post('/api/rent?action=update_property', { id, ...data });
      setProperties(prev => prev.map(p => p.id === id ? { ...p, ...updated } : p));
    } catch (err: any) {
      throw new Error(err.message || 'Failed to update property');
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

  const markCollected = async (
    property_id: string,
    month_year: string,
    amount_paid: number,
    paid_on: string,
    payment_mode?: string,
    payment_notes?: string
  ) => {
    try {
      const updatedCollection = await api.post('/api/rent?action=mark_collected', {
        property_id,
        month_year,
        amount_paid,
        paid_on,
        payment_mode,
        payment_notes
      });
      
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

  const fetchCollectionHistory = async (propertyId: string): Promise<RentCollection[]> => {
    try {
      const data = await api.get(`/api/rent?action=collection_history&property_id=${propertyId}`);
      return data || [];
    } catch (err: any) {
      throw new Error(err.message || 'Failed to fetch collection history');
    }
  };

  return {
    properties,
    loading,
    error,
    fetchCollections,
    addProperty,
    updateProperty,
    deleteProperty,
    markCollected,
    markPending,
    fetchCollectionHistory
  };
};
