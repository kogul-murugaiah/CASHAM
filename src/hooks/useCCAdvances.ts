import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';

export type CCAdvance = {
    id: string;
    user_id: string;
    person_name: string;
    amount: number;
    credit_card_id: string | null;
    credit_card_name: string;
    date: string;
    description: string | null;
    cash_received: boolean;
    cash_received_date: string | null;
    created_at: string;
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
        const data = await api.put('/api/cc-advances', {
            id,
            cash_received: received,
            cash_received_date: receivedDate,
        });
        setAdvances(prev => prev.map(a => a.id === id ? data : a));
        return data as CCAdvance;
    }, []);

    const updateAdvance = useCallback(async (id: string, updates: Partial<CCAdvance>) => {
        const data = await api.put('/api/cc-advances', { id, ...updates });
        setAdvances(prev => prev.map(a => a.id === id ? data : a));
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
        updateAdvance,
        deleteAdvance,
    };
}