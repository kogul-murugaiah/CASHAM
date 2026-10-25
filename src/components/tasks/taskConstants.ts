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
