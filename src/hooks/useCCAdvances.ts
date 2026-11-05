import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';

export type CCAdvance = {
    id: string;
    user_id: string;
    person_name: string;
    amount: number;
    paid_amount?: number;
    credit_card_id: string | null;
    credit_card_name: string;
    date: string;
    description: string | null;
    cash_received: boolean;
    cash_received_date: string | null;
    created_at: string;
    cc_bill_settled?: boolean;
    cc_settled_at?: string | null;
    cc_settlement_id?: string | null;
};

export function useCCAdvances() {
    const [advances, setAdvances] = useState<CCAdvance[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchAdvances = useCallback(async (creditCardId?: string) => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (creditCardId) params.set('credit_card_id', creditCardId);
            const data = await api.get(`/api/cc-advances?${params}`);
            setAdvances(data || []);
            return data || [];
        } catch (err) {
            console.error('Failed to fetch CC advances', err);
            setAdvances([]);
            return [];
        } finally {
            setLoading(false);
        }
    }, []);

    const addAdvance = useCallback(async (payload: {
        person_name: string;
        amount: number;
        paid_amount?: number;
        credit_card_id?: string | null;
        credit_card_name: string;
        date: string;
        description?: string;
    }) => {
        const data = await api.post('/api/cc-advances', payload);
        setAdvances(prev => [data, ...prev]);
        return data as CCAdvance;
    }, []);

    const markReceived = useCallback(async (id: string, received: boolean, receivedDate?: string) => {
        const advance = advances.find(a => a.id === id);
        const data = await api.put('/api/cc-advances', {
            id,
            cash_received: received,
            paid_amount: received ? (advance?.amount || 0) : 0,
            cash_received_date: receivedDate,
        });
        const result: CCAdvance = {
            ...data,
            paid_amount: received ? (advance?.amount || 0) : 0,
            cash_received: received,
        };
        setAdvances(prev => prev.map(a => a.id === id ? result : a));
        return result;
    }, [advances]);

    const recordPayment = useCallback(async (id: string, paymentAmount: number, paymentDate?: string, note?: string) => {
        const current = advances.find(a => a.id === id);
        const total = Number(current?.amount || 0);
        const currentPaid = Number(current?.paid_amount || (current?.cash_received ? total : 0) || 0);
        const newPaid = Math.min(total, currentPaid + Number(paymentAmount));
        const isFullyPaid = newPaid >= total;

        let newDescription = current?.description || '';
        if (note?.trim()) {
            newDescription = newDescription ? `${newDescription} | ${note.trim()}` : note.trim();
        }

        const data = await api.put('/api/cc-advances', {
            id,
            paid_amount: newPaid,
            cash_received: isFullyPaid,
            cash_received_date: isFullyPaid ? (paymentDate || new Date().toISOString().split('T')[0]) : current?.cash_received_date,
            description: newDescription || null,
        });

        const result: CCAdvance = {
            ...data,
            paid_amount: newPaid,
            cash_received: isFullyPaid,
        };

        setAdvances(prev => prev.map(a => a.id === id ? result : a));
        return result;
    }, [advances]);

    const updateAdvance = useCallback(async (id: string, updates: Partial<CCAdvance>) => {
        const data = await api.put('/api/cc-advances', { id, ...updates });
        setAdvances(prev => prev.map(a => a.id === id ? { ...a, ...data, ...updates } : a));
        return data as CCAdvance;
    }, []);

    const deleteAdvance = useCallback(async (id: string) => {
        await api.delete(`/api/cc-advances?id=${id}`);
        setAdvances(prev => prev.filter(a => a.id !== id));
    }, []);

    useEffect(() => {
        fetchAdvances();
    }, [fetchAdvances]);

    return {
        advances,
        loading,
        fetchAdvances,
        addAdvance,
        markReceived,
        recordPayment,
        updateAdvance,
        deleteAdvance,
    };
}
