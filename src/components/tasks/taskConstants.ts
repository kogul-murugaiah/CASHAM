import { type ElementType } from 'react';
import { FiSun, FiCoffee, FiMoon, FiZap } from 'react-icons/fi';
import { getLocalDateStr } from '../../hooks/useTasks';

// ─── Types ──────────────────────────────────────────────────────────────────────
export type Tab = 'today' | 'all' | 'goals' | 'performance';
export type TimeBlock = 'morning' | 'afternoon' | 'evening' | 'anytime';
export type FrequencyType = 'daily' | 'weekly' | 'monthly' | 'one_time' | 'custom';

// ─── Constants ──────────────────────────────────────────────────────────────────
export const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const CATEGORIES = ['Personal', 'Health', 'Work', 'Finance', 'Learning', 'Social', 'Fitness', 'Other'];
export const COLORS = [
    '#10b981', '#6366f1', '#f59e0b', '#ef4444',
    '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6',
];
export const PRIORITY_COLORS = { low: 'emerald', medium: 'amber', high: 'red' } as const;
export const PRIORITY_WEIGHT: Record<string, number> = { high: 3, medium: 2, low: 1 };
export const TIME_BLOCKS: { key: TimeBlock; label: string; icon: ElementType; range: string }[] = [
    { key: 'morning', label: 'Morning', icon: FiSun, range: '6 AM – 12 PM' },
    { key: 'afternoon', label: 'Afternoon', icon: FiCoffee, range: '12 PM – 5 PM' },
    { key: 'evening', label: 'Evening', icon: FiMoon, range: '5 PM – 10 PM' },
    { key: 'anytime', label: 'Anytime', icon: FiZap, range: 'No specific time' },
];

// ─── Date Formatting Helpers ────────────────────────────────────────────────
export function formatNiceDate(dateStr: string): string {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatDisplayDate(dateStr: string, todayStr: string, yesterdayStr: string): string {
    if (dateStr === todayStr) return `Today · ${formatNiceDate(dateStr)}`;
    if (dateStr === yesterdayStr) return `Yesterday · ${formatNiceDate(dateStr)}`;
    return formatNiceDate(dateStr);
}

export function shiftDateStr(dateStr: string, daysDelta: number): string {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + daysDelta);
    return getLocalDateStr(date);
}

// ─── Schedule Evaluation Helper ─────────────────────────────────────────────
export interface SchedulableTask {
    frequency_type?: FrequencyType | string;
    frequency_days?: number[];
    frequency_monthly_date?: number;
    frequency_x_times?: number;
    due_date?: string;
    end_date?: string;
    created_at?: string;
}

export function isTaskScheduledOnDate(task: SchedulableTask, dateStr: string): boolean {
    // If recurrence has an end date and this date is past it, not scheduled
    if (task.end_date && task.end_date < dateStr) return false;

    // Do not schedule prior to created_at (if present)
    if (task.created_at && dateStr < task.created_at.slice(0, 10)) {
        return false;
    }

    const ft = task.frequency_type;
    if (ft === 'daily') return true;

    if (ft === 'weekly') {
        const days = task.frequency_days || [];
        if (days.length === 0) return true; // defaults to all days if unconfigured
        const [y, m, d] = dateStr.split('-').map(Number);
        const dow = new Date(y, m - 1, d).getDay(); // 0 = Sun, 1 = Mon...
        return days.includes(dow);
    }

    if (ft === 'monthly') {
        const [, , d] = dateStr.split('-').map(Number);
        return (task.frequency_monthly_date || 1) === d;
    }

    if (ft === 'custom') {
        const interval = Math.max(1, task.frequency_x_times || 1);
        const anchor = task.due_date || (task.created_at ? task.created_at.slice(0, 10) : dateStr);
        const [ay, am, ad] = anchor.split('-').map(Number);
        const [ty, tm, td] = dateStr.split('-').map(Number);
        const anchorUtc = Date.UTC(ay, am - 1, ad);
        const targetUtc = Date.UTC(ty, tm - 1, td);
        const diffDays = Math.round((targetUtc - anchorUtc) / 86400000);
        return diffDays >= 0 && (diffDays % interval === 0);
    }

    if (ft === 'one_time') {
        return task.due_date === dateStr;
    }

    return false;
}

