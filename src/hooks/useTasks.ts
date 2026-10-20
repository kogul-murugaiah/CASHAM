export function getLocalDateStr(d: Date = new Date()): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

import { useState, useCallback } from 'react';

export interface Task {
    id: string;
    user_id: string;
    title: string;
    description?: string;
    category: string;
    color: string;
    frequency_type: 'daily' | 'weekly' | 'monthly' | 'one_time' | 'custom';
    frequency_days?: number[];
    frequency_monthly_date?: number;
    frequency_x_times?: number;
    frequency_x_period?: string;
    time_block: 'morning' | 'afternoon' | 'evening' | 'anytime';
    due_date?: string;
    end_date?: string;           // For repeating tasks: when the recurrence ends
    priority: 'low' | 'medium' | 'high';
    estimated_minutes?: number;
    carry_forward: boolean;
    is_active: boolean;          // false = permanently stopped
    is_paused: boolean;          // true = temporarily paused
    created_at: string;
    // Injected by get_today
    completed_today?: boolean;
    is_carried_forward?: boolean;
}

export interface NewTaskPayload {
    title: string;
    description?: string;
    category?: string;
    color?: string;
    frequency_type: Task['frequency_type'];
    frequency_days?: number[];
    frequency_monthly_date?: number;
    frequency_x_times?: number;
    frequency_x_period?: string;
    time_block?: Task['time_block'];
    due_date?: string;
    end_date?: string;
    priority?: Task['priority'];
    estimated_minutes?: number;
    carry_forward?: boolean;
}

export interface HeatmapData {
    counts: Record<string, number>;                          // total completions per date
    taskCounts: Record<string, Record<string, number>>;     // per-task: { taskId -> { date -> 1 } }
    tasks: any[];
}

const BASE = '/api/tasks';

async function apiFetch(input: RequestInfo, init?: RequestInit) {
    const res = await fetch(input, {
        ...init,
        headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error || 'API error');
    }
    return res.json();
}

export function useTasks() {
    const [todayTasks, setTodayTasks] = useState<Task[]>([]);
    const [allTasks, setAllTasks] = useState<Task[]>([]);
    const [heatmapData, setHeatmapData] = useState<HeatmapData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchTodayTasks = useCallback(async (date?: string) => {
        setLoading(true);
        setError(null);
        try {
            const targetDate = date || getLocalDateStr();
            const url = `${BASE}?action=get_today&date=${targetDate}`;
            const data = await apiFetch(url);
            setTodayTasks(data);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchAllTasks = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await apiFetch(`${BASE}?action=get_all`);
            setAllTasks(data);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchHeatmapData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await apiFetch(`${BASE}?action=get_heatmap_data`);
            setHeatmapData(data);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, []);

    const addTask = useCallback(async (payload: NewTaskPayload): Promise<Task> => {
        const data = await apiFetch(`${BASE}?action=add_task`, {
            method: 'POST',
            body: JSON.stringify(payload),
        });
        return data;
    }, []);

    const updateTask = useCallback(async (id: string, updates: Partial<Task>): Promise<Task> => {
        const data = await apiFetch(`${BASE}?action=update_task`, {
            method: 'PUT',
            body: JSON.stringify({ id, ...updates }),
        });
        return data;
    }, []);

    const deleteTask = useCallback(async (id: string): Promise<void> => {
        await apiFetch(`${BASE}?action=delete_task`, {
            method: 'DELETE',
            body: JSON.stringify({ id }),
        });
        setAllTasks(prev => prev.filter(t => t.id !== id));
        setTodayTasks(prev => prev.filter(t => t.id !== id));
    }, []);

    const toggleComplete = useCallback(async (taskId: string, date?: string): Promise<boolean> => {
        const targetDate = date || getLocalDateStr();
        const result = await apiFetch(`${BASE}?action=toggle_complete`, {
            method: 'POST',
            body: JSON.stringify({ task_id: taskId, date: targetDate }),
        });
        setTodayTasks(prev =>
            prev.map(t => t.id === taskId ? { ...t, completed_today: result.completed } : t)
        );
        setAllTasks(prev =>
            prev.map(t => t.id === taskId ? { ...t, completed_today: result.completed } : t)
        );
        return result.completed;
    }, []);

    const pauseTask = useCallback(async (id: string): Promise<void> => {
        await apiFetch(`${BASE}?action=pause_task`, {
            method: 'POST',
            body: JSON.stringify({ id }),
        });
        setAllTasks(prev => prev.map(t => t.id === id ? { ...t, is_paused: true } : t));
        setTodayTasks(prev => prev.filter(t => t.id !== id));
    }, []);

    const resumeTask = useCallback(async (id: string): Promise<void> => {
        await apiFetch(`${BASE}?action=resume_task`, {
            method: 'POST',
            body: JSON.stringify({ id }),
        });
        setAllTasks(prev => prev.map(t => t.id === id ? { ...t, is_paused: false } : t));
        fetchTodayTasks();
    }, [fetchTodayTasks]);

    const stopTask = useCallback(async (id: string): Promise<void> => {
        await apiFetch(`${BASE}?action=stop_task`, {
            method: 'POST',
            body: JSON.stringify({ id }),
        });
        setAllTasks(prev => prev.map(t => t.id === id ? { ...t, is_active: false, is_paused: false } : t));
        setTodayTasks(prev => prev.filter(t => t.id !== id));
    }, []);

    return {
        todayTasks,
        allTasks,
        heatmapData,
        loading,
        error,
        fetchTodayTasks,
        fetchAllTasks,
        fetchHeatmapData,
        addTask,
        updateTask,
        deleteTask,
        toggleComplete,
        pauseTask,
        resumeTask,
        stopTask,
    };
}
