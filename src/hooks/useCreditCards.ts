import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';

export interface CreditCard {
  id: string;
  name: string;
  bank_name?: string | null;
  card_last4?: string | null;
  credit_limit: number;
  billing_cycle_day: number;
  payment_due_day: number;
  color?: string;
  total_dues?: number;
  utilization_percent?: number;
  created_at?: string;
}

export interface CreditCardSettlement {
  id: string;
  credit_card_id?: string | null;
  credit_card_name: string;
  total_amount: number;
  settlement_date: string;
  breakdown: Record<string, number>;
  expense_ids: string[];
  notes?: string | null;
  created_at: string;
}

export const useCreditCards = () => {
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCards = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get('/api/credit-cards');
      setCards(data || []);
      return data || [];
    } catch (err: any) {
      if (err.status !== 401) {
        setError(err.message || 'Failed to fetch credit cards');
      }
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  const addCard = async (cardData: {
    name: string;
    bank_name?: string;
    card_last4?: string;
    credit_limit?: number;
    billing_cycle_day?: number;
    payment_due_day?: number;
    color?: string;
  }): Promise<CreditCard | null> => {
    try {
      const created = await api.post('/api/credit-cards', cardData);
      if (created) {
        setCards((prev) => [...prev, created]);
        return created;
      }
      return null;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to add credit card');
    }
  };

  const updateCard = async (cardData: {
    id: string;
    name: string;
    bank_name?: string;
    card_last4?: string;
    credit_limit?: number;
    billing_cycle_day?: number;
    payment_due_day?: number;
    color?: string;
  }) => {
    try {
      const updated = await api.put('/api/credit-cards', cardData);
      setCards((prev) => prev.map((c) => (c.id === cardData.id ? { ...c, ...updated } : c)));
      return updated;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to update credit card');
    }
  };

  const deleteCard = async (id: string) => {
    try {
      await api.delete(`/api/credit-cards?id=${id}`);
      setCards((prev) => prev.filter((c) => c.id !== id));
    } catch (err: any) {
      throw new Error(err.message || 'Failed to delete credit card');
    }
  };

  const fetchDues = async () => {
    try {
      return await api.get('/api/credit-cards?view=dues');
    } catch (err: any) {
      throw new Error(err.message || 'Failed to fetch credit card dues');
    }
  };

  const fetchSettlements = async (): Promise<CreditCardSettlement[]> => {
    try {
      const data = await api.get('/api/credit-cards?view=settlements');
      return data || [];
    } catch (err: any) {
      throw new Error(err.message || 'Failed to fetch settlement history');
    }
  };

  const settleBill = async (payload: {
    credit_card_id?: string | null;
    credit_card_name: string;
    expense_ids: string[];
    settlement_date: string;
    notes?: string;
  }) => {
    try {
      const res = await api.post('/api/credit-cards?action=settle', payload);
      await fetchCards();
      return res;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to settle credit card bill');
    }
  };

  const unsettleBill = async (settlement_id: string) => {
    try {
      const res = await api.post('/api/credit-cards?action=unsettle', { settlement_id });
      await fetchCards();
      return res;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to reopen statement');
    }
  };

  const toggleFundsSetAside = async (expense_id: string, isSetAside: boolean) => {
    try {
      await api.put('/api/expenses', {
        id: expense_id,
        cc_funds_set_aside: isSetAside
      });
    } catch (err: any) {
      throw new Error(err.message || 'Failed to update funds status');
    }
  };

  const settleAdvances = async (payload: {
    credit_card_id?: string | null;
    credit_card_name: string;
    advance_ids: string[];
    settlement_date: string;
    notes?: string;
  }) => {
    try {
      const res = await api.post('/api/credit-cards?action=settle-advances', payload);
      await fetchCards();
      return res;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to settle advances');
    }
  };

  const unsettleAdvances = async (settlement_id: string) => {
    try {
      const res = await api.post('/api/credit-cards?action=unsettle-advances', { settlement_id });
      await fetchCards();
      return res;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to reopen advance settlement');
    }
  };

  return {
    cards,
    loading,
    error,
    fetchCards,
    addCard,
    updateCard,
    deleteCard,
    fetchDues,
    fetchSettlements,
    settleBill,
    unsettleBill,
    toggleFundsSetAside,
    settleAdvances,
    unsettleAdvances,
  };
};