import { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../lib/api';

export type BillingCycle = 'monthly' | 'quarterly' | 'semi_annual' | 'yearly';
export type PaymentType = 'credit_card' | 'account';

export interface Subscription {
    id: string;
    user_id: string;
    name: string;
    amount: number;
    billing_cycle: BillingCycle;
    start_date: string;
    next_billing_date: string;
    category_id: number | null;
    category_name: string | null;
    payment_type: PaymentType;
    credit_card_id: string | null;
    credit_card_name: string | null;
    account_type: string | null;
    notes: string | null;
    icon: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface SubscriptionFormData {
    name: string;
    amount: number | string;
    billing_cycle: BillingCycle;
    start_date: string;
    next_billing_date?: string;
    category_id?: number | string | null;
    category_name?: string | null;
    payment_type: PaymentType;
    credit_card_id?: string | null;
    credit_card_name?: string | null;
    account_type?: string | null;
    notes?: string | null;
    icon?: string | null;
}

export function useSubscriptions() {
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchSubscriptions = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await api.get('/api/subscriptions');
            setSubscriptions(data || []);
            return data || [];
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to fetch subscriptions';
            setError(message);
            return [];
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSubscriptions();
    }, [fetchSubscriptions]);

    const addSubscription = useCallback(async (formData: SubscriptionFormData): Promise<Subscription | null> => {
        try {
            const data = await api.post('/api/subscriptions', formData);
            if (data) {
                setSubscriptions(prev => [data, ...prev].sort((a, b) => 
                    new Date(a.next_billing_date).getTime() - new Date(b.next_billing_date).getTime()
                ));
                return data as Subscription;
            }
            return null;
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to create subscription';
            throw new Error(message);
        }
    }, []);

    const updateSubscription = useCallback(async (id: string, updates: Partial<SubscriptionFormData | Subscription>): Promise<Subscription | null> => {
        try {
            const data = await api.put('/api/subscriptions', { id, ...updates });
            if (data) {
                setSubscriptions(prev => prev.map(s => s.id === id ? { ...s, ...data } : s).sort((a, b) => 
                    new Date(a.next_billing_date).getTime() - new Date(b.next_billing_date).getTime()
                ));
                return data as Subscription;
            }
            return null;
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to update subscription';
            throw new Error(message);
        }
    }, []);

    const deleteSubscription = useCallback(async (id: string): Promise<boolean> => {
        try {
            await api.delete(`/api/subscriptions?id=${id}`);
            setSubscriptions(prev => prev.filter(s => s.id !== id));
            return true;
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to delete subscription';
            throw new Error(message);
        }
    }, []);

    const toggleActive = useCallback(async (id: string, currentStatus: boolean) => {
        return updateSubscription(id, { is_active: !currentStatus });
    }, [updateSubscription]);

    // 1-Click "Log to Expenses"
    const logSubscriptionExpense = useCallback(async (
        subscriptionId: string,
        paidDate?: string,
        actualAmount?: number,
        notes?: string
    ) => {
        try {
            const res = await api.post('/api/subscriptions?action=log-expense', {
                subscription_id: subscriptionId,
                paid_date: paidDate,
                actual_amount: actualAmount,
                notes,
            });

            if (res?.subscription) {
                setSubscriptions(prev => prev.map(s => s.id === subscriptionId ? res.subscription : s).sort((a, b) => 
                    new Date(a.next_billing_date).getTime() - new Date(b.next_billing_date).getTime()
                ));
            }
            return res;
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to log expense';
            throw new Error(message);
        }
    }, []);

    // ── Metric Calculations ──────────────────────────────────────────
    const metrics = useMemo(() => {
        const activeSubs = subscriptions.filter(s => s.is_active);

        // Normalize all cycles to monthly spend
        const monthlyBurnRate = activeSubs.reduce((total, sub) => {
            const amt = Number(sub.amount || 0);
            switch (sub.billing_cycle) {
                case 'monthly': return total + amt;
                case 'quarterly': return total + (amt / 3);
                case 'semi_annual': return total + (amt / 6);
                case 'yearly': return total + (amt / 12);
                default: return total + amt;
            }
        }, 0);

        const annualCommitment = monthlyBurnRate * 12;

        const todayStr = new Date().toISOString().split('T')[0];
        const next7DaysDate = new Date();
        next7DaysDate.setDate(next7DaysDate.getDate() + 7);
        const next7DaysStr = next7DaysDate.toISOString().split('T')[0];

        // Items due today or in the past (overdue) or within next 7 days
        const dueSoon = activeSubs.filter(s => s.next_billing_date <= next7DaysStr);
        const overdue = activeSubs.filter(s => s.next_billing_date < todayStr);
        const dueToday = activeSubs.filter(s => s.next_billing_date === todayStr);

        const nextUpcoming = activeSubs
            .filter(s => s.next_billing_date >= todayStr)
            .sort((a, b) => new Date(a.next_billing_date).getTime() - new Date(b.next_billing_date).getTime())[0] || null;

        return {
            monthlyBurnRate: Math.round(monthlyBurnRate),
            annualCommitment: Math.round(annualCommitment),
            activeCount: activeSubs.length,
            totalCount: subscriptions.length,
            dueSoon,
            overdue,
            dueToday,
            nextUpcoming,
        };
    }, [subscriptions]);

    return {
        subscriptions,
        loading,
        error,
        fetchSubscriptions,
        addSubscription,
        updateSubscription,
        deleteSubscription,
        toggleActive,
        logSubscriptionExpense,
        metrics,
    };
}
