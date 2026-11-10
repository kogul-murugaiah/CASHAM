import { useState, useCallback } from 'react';
import { api } from '../lib/api';

export interface Fund {
    id: string;
    name: string;
    description?: string;
    created_at: string;
    totalIncome: number;
    completedExpenses: number;
    plannedExpenses: number;
    plannedCount: number;
    actualBalance: number;
    projectedBalance: number;
}

export interface FundTransaction {
    id: string;
    fund_id: string;
    type: 'income' | 'expense';
    amount: number;
    date: string;
    description: string;
    status: 'planned' | 'completed';
    created_at: string;
}

export interface UpdateFundTransactionPayload {
    id: string;
    type?: 'income' | 'expense';
    amount?: number;
    date?: string;
    description?: string;
    status?: 'planned' | 'completed';
}

const getErrMsg = (err: unknown, fallback: string) =>
    err instanceof Error ? err.message : fallback;

export const useFunds = () => {
    const [funds, setFunds] = useState<Fund[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchFunds = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await api.get('/api/funds?action=list_funds');
            setFunds(data || []);
        } catch (err: unknown) {
            setError(getErrMsg(err, 'Failed to fetch funds'));
        } finally {
            setLoading(false);
        }
    }, []);

    const createFund = async (name: string, description?: string) => {
        try {
            const data = await api.post('/api/funds?action=create_fund', { name, description });
            setFunds(prev => [data, ...prev]);
            return data;
        } catch (err: unknown) {
            throw new Error(getErrMsg(err, 'Failed to create fund'));
        }
    };

    const updateFund = async (id: string, name: string, description?: string) => {
        try {
            const data = await api.put('/api/funds?action=update_fund', { id, name, description });
            setFunds(prev =>
                prev.map(f => (f.id === id ? { ...f, name: data.name, description: data.description } : f))
            );
            return data;
        } catch (err: unknown) {
            throw new Error(getErrMsg(err, 'Failed to update fund'));
        }
    };

    const deleteFund = async (id: string) => {
        try {
            await api.delete(`/api/funds?action=delete_fund&id=${id}`);
            setFunds(prev => prev.filter(f => f.id !== id));
        } catch (err: unknown) {
            throw new Error(getErrMsg(err, 'Failed to delete fund'));
        }
    };

    const fetchTransactions = async (fund_id: string): Promise<FundTransaction[]> => {
        try {
            const data = await api.get(`/api/funds?action=list_transactions&fund_id=${fund_id}`);
            return data || [];
        } catch (err: unknown) {
            throw new Error(getErrMsg(err, 'Failed to fetch transactions'));
        }
    };

    const addTransaction = async (data: {
        fund_id: string;
        type: 'income' | 'expense';
        amount: number;
        date: string;
        description: string;
        status?: 'planned' | 'completed';
    }) => {
        try {
            const result = await api.post('/api/funds?action=add_transaction', data);
            fetchFunds();
            return result;
        } catch (err: unknown) {
            throw new Error(getErrMsg(err, 'Failed to add transaction'));
        }
    };

    const updateTransaction = async (payload: UpdateFundTransactionPayload): Promise<FundTransaction> => {
        try {
            const updated = await api.put('/api/funds?action=update_transaction', payload);
            fetchFunds(); // Re-fetch balances
            return updated;
        } catch (err: unknown) {
            throw new Error(getErrMsg(err, 'Failed to update transaction'));
        }
    };

    const updateTransactionStatus = async (id: string, status: 'planned' | 'completed') => {
        return updateTransaction({ id, status });
    };

    const deleteTransaction = async (id: string) => {
        try {
            await api.delete(`/api/funds?action=delete_transaction&id=${id}`);
            fetchFunds(); // Re-fetch balances
        } catch (err: unknown) {
            throw new Error(getErrMsg(err, 'Failed to delete transaction'));
        }
    };

    return {
        funds,
        loading,
        error,
        fetchFunds,
        createFund,
        updateFund,
        deleteFund,
        fetchTransactions,
        addTransaction,
        updateTransaction,
        updateTransactionStatus,
        deleteTransaction
    };
};
