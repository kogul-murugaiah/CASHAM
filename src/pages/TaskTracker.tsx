import { useState, useEffect, useMemo, type ElementType } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useTasks, getLocalDateStr, type Task, type NewTaskPayload } from '../hooks/useTasks';
import {
    isNotificationSupported,
    getNotificationPermission,
    requestNotificationPermission,
    sendTestNotification,
    checkAndNotifyPendingTasks,
    type NotificationStatus,
} from '../lib/notifications';
import {
    FiCheckCircle, FiCircle, FiPlus, FiTrash2, FiEdit2,
    FiZap, FiSun, FiMoon, FiCoffee, FiClock,
    FiX, FiSave, FiAward, FiTrendingUp, FiActivity,
    FiSearch, FiFilter, FiPause, FiPlay, FiStopCircle, FiCalendar, FiBarChart2,
    FiChevronLeft, FiChevronRight, FiBell, FiBellOff, FiRepeat
} from 'react-icons/fi';

// ─── Types ──────────────────────────────────────────────────────────────────────
type Tab = 'today' | 'all' | 'goals' | 'performance';
type TimeBlock = 'morning' | 'afternoon' | 'evening' | 'anytime';
type FrequencyType = 'daily' | 'weekly' | 'monthly' | 'one_time' | 'custom';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const CATEGORIES = ['Personal', 'Health', 'Work', 'Finance', 'Learning', 'Social', 'Fitness', 'Other'];
const COLORS = [
    '#10b981', '#6366f1', '#f59e0b', '#ef4444',
    '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6',
];
const PRIORITY_COLORS = { low: 'emerald', medium: 'amber', high: 'red' } as const;
const TIME_BLOCKS: { key: TimeBlock; label: string; icon: ElementType; range: string }[] = [
    { key: 'morning', label: 'Morning', icon: FiSun, range: '6 AM – 12 PM' },
    { key: 'afternoon', label: 'Afternoon', icon: FiCoffee, range: '12 PM – 5 PM' },
    { key: 'evening', label: 'Evening', icon: FiMoon, range: '5 PM – 10 PM' },
    { key: 'anytime', label: 'Anytime', icon: FiZap, range: 'No specific time' },
];

// ─── Date Formatting Helpers ────────────────────────────────────────────────
function formatNiceDate(dateStr: string): string {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDisplayDate(dateStr: string, todayStr: string, yesterdayStr: string): string {
    if (dateStr === todayStr) return `Today · ${formatNiceDate(dateStr)}`;
    if (dateStr === yesterdayStr) return `Yesterday · ${formatNiceDate(dateStr)}`;
    return formatNiceDate(dateStr);
}

function shiftDateStr(dateStr: string, daysDelta: number): string {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + daysDelta);
    return getLocalDateStr(date);
}

// ─── Heatmap cell color ──────────────────────────────────────────────────────
function heatColor(count: number, isDark: boolean, customColor?: string): string {
    if (count === 0) return isDark ? '#1e293b' : '#f1f5f9';
    if (customColor) return customColor;
    if (count === 1) return '#bbf7d0';
    if (count === 2) return '#4ade80';
    if (count === 3) return '#22c55e';
    return '#16a34a';
}

// ─── Generate last 52 weeks × 7 days grid ───────────────────────────────────
function buildHeatmapGrid(): string[] {
    const today = new Date();
    const dates: string[] = [];
    const startDay = new Date(today);
    startDay.setDate(today.getDate() - 363 - today.getDay());
    for (let i = 0; i < 365; i++) {
        const d = new Date(startDay);
        d.setDate(startDay.getDate() + i);
        dates.push(getLocalDateStr(d));
    }
    return dates;
}

// ─── Streak calculation ──────────────────────────────────────────────────────
function calcStreaks(counts: Record<string, number | undefined>): { current: number; best: number } {
    const today = getLocalDateStr();
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = getLocalDateStr(yesterdayDate);

    const dates = buildHeatmapGrid().filter(d => d <= today);
    let best = 0;
    let temp = 0;
    for (const d of dates) {
        if ((counts[d] || 0) > 0) {
            temp++;
            if (temp > best) best = temp;
        } else {
            temp = 0;
        }
    }

    let current = 0;
    const hasToday = (counts[today] || 0) > 0;
    const hasYesterday = (counts[yesterday] || 0) > 0;

    if (hasToday) {
        const allDates = [...dates].reverse();
        for (const d of allDates) {
            if ((counts[d] || 0) > 0) current++;
            else break;
        }
    } else if (hasYesterday) {
        const allDates = [...dates].filter(d => d <= yesterday).reverse();
        for (const d of allDates) {
            if ((counts[d] || 0) > 0) current++;
            else break;
        }
    } else {
        current = 0;
    }

    return { current, best };
}

// ─── AddEditTaskModal ─────────────────────────────────────────────────────────
interface ModalProps {
    isDark: boolean;
    task?: Task;
    defaultFrequency?: FrequencyType;
    onClose: () => void;
    onSave: (payload: NewTaskPayload) => Promise<void>;
}

function AddEditTaskModal({ isDark, task, defaultFrequency, onClose, onSave }: ModalProps) {
    const [title, setTitle] = useState(task?.title || '');
    const [description, setDescription] = useState(task?.description || '');
    const [category, setCategory] = useState(task?.category || 'Personal');
    const [color, setColor] = useState(task?.color || '#10b981');
    const [frequencyType, setFrequencyType] = useState<FrequencyType>(task?.frequency_type || defaultFrequency || 'daily');
    const [freqDays, setFreqDays] = useState<number[]>(task?.frequency_days || []);
    const [freqMonthlyDate, setFreqMonthlyDate] = useState(task?.frequency_monthly_date || 1);
    const [freqXTimes, setFreqXTimes] = useState<number>(task?.frequency_x_times || 2);
    const [customStartDate, setCustomStartDate] = useState<string>(task?.due_date || getLocalDateStr());
    const [timeBlock, setTimeBlock] = useState<TimeBlock>(task?.time_block || 'anytime');
    const [priority, setPriority] = useState<'low' | 'medium' | 'high'>(task?.priority || 'medium');
    const [estimatedMins, setEstimatedMins] = useState(task?.estimated_minutes?.toString() || '');
    const [dueDate, setDueDate] = useState(task?.due_date || '');
    const [carryForward, setCarryForward] = useState(task?.carry_forward ?? true);
    const [endDate, setEndDate] = useState(task?.end_date || '');
    const [saving, setSaving] = useState(false);

    const card = isDark
        ? 'bg-slate-800 border-slate-700 text-slate-100'
        : 'bg-white border-slate-200 text-slate-800';
    const input = isDark
        ? 'bg-slate-900 border-slate-700 text-slate-100 placeholder-slate-500'
        : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400';
    const label = isDark ? 'text-slate-400' : 'text-slate-500';

    const toggleDay = (d: number) =>
        setFreqDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);

    const handleSave = async () => {
        if (!title.trim()) return;
        setSaving(true);
        try {
            await onSave({
                title: title.trim(),
                description: description.trim() || undefined,
                category,
                color,
                frequency_type: frequencyType,
                frequency_days: frequencyType === 'weekly' ? freqDays : undefined,
                frequency_monthly_date: frequencyType === 'monthly' ? freqMonthlyDate : undefined,
                frequency_x_times: frequencyType === 'custom' ? freqXTimes : undefined,
                time_block: timeBlock,
                priority,
                estimated_minutes: estimatedMins ? parseInt(estimatedMins) : undefined,
                due_date: frequencyType === 'one_time' ? (dueDate || undefined) : frequencyType === 'custom' ? (customStartDate || getLocalDateStr()) : undefined,
                end_date: frequencyType !== 'one_time' ? (endDate || undefined) : undefined,
                carry_forward: frequencyType === 'one_time' ? carryForward : false,
            });
            onClose();
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto p-3 sm:p-4 flex items-start sm:items-center justify-center">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className={`relative w-full max-w-lg my-auto rounded-2xl border shadow-2xl ${card} flex flex-col max-h-[calc(100vh-2rem)] sm:max-h-[88vh] overflow-hidden`}>
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-inherit flex-shrink-0">
                    <h2 className="font-bold text-lg">{task ? 'Edit Task' : 'New Task'}</h2>
                    <button onClick={onClose} className={`p-1.5 rounded-lg hover:bg-slate-700/30 ${label}`}>
                        <FiX size={18} />
                    </button>
                </div>

                <div className="p-5 space-y-4 overflow-y-auto flex-1">
                    {/* Title */}
                    <div>
                        <label className={`text-xs font-semibold uppercase tracking-wider ${label}`}>Task Title *</label>
                        <input
                            autoFocus
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="e.g. Morning workout"
                            className={`mt-1.5 w-full px-3 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-emerald-500/40 ${input}`}
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className={`text-xs font-semibold uppercase tracking-wider ${label}`}>Description</label>
                        <textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            rows={2}
                            placeholder="Optional notes..."
                            className={`mt-1.5 w-full px-3 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-emerald-500/40 resize-none ${input}`}
                        />
                    </div>

                    {/* Category + Color */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={`text-xs font-semibold uppercase tracking-wider ${label}`}>Category</label>
                            <select
                                value={category}
                                onChange={e => setCategory(e.target.value)}
                                className={`mt-1.5 w-full px-3 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-emerald-500/40 ${input}`}
                            >
                                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={`text-xs font-semibold uppercase tracking-wider ${label}`}>Color</label>
                            <div className="mt-1.5 flex flex-wrap gap-2">
                                {COLORS.map(c => (
                                    <button
                                        type="button"
                                        key={c}
                                        onClick={() => setColor(c)}
                                        style={{ backgroundColor: c }}
                                        className={`w-7 h-7 rounded-full transition-transform ${color === c ? 'ring-2 ring-offset-2 ring-offset-slate-800 ring-white scale-110' : 'hover:scale-105'}`}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Frequency */}
                    <div>
                        <label className={`text-xs font-semibold uppercase tracking-wider ${label}`}>Frequency</label>
                        <div className="mt-1.5 grid grid-cols-3 gap-2">
                            {(['daily', 'weekly', 'monthly', 'one_time', 'custom'] as FrequencyType[]).map(f => (
                                <button
                                    type="button"
                                    key={f}
                                    onClick={() => setFrequencyType(f)}
                                    className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${frequencyType === f
                                        ? 'bg-emerald-500 text-white border-emerald-500'
                                        : isDark ? 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500' : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                                        }`}
                                >
                                    {f === 'one_time' ? 'One Time' : f === 'custom' ? 'Custom' : f.charAt(0).toUpperCase() + f.slice(1)}
                                </button>
                            ))}
                        </div>

                        {frequencyType === 'weekly' && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                                {DAYS.map((d, i) => (
                                    <button
                                        type="button"
                                        key={d}
                                        onClick={() => toggleDay(i)}
                                        className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${freqDays.includes(i)
                                            ? 'bg-emerald-500 text-white border-emerald-500'
                                            : isDark ? 'bg-slate-900 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
                                            }`}
                                    >
                                        {d}
                                    </button>
                                ))}
                            </div>
                        )}

                        {frequencyType === 'monthly' && (
                            <input
                                type="number"
                                min={1} max={31}
                                value={freqMonthlyDate}
                                onChange={e => setFreqMonthlyDate(Number(e.target.value))}
                                placeholder="Day of month (1-31)"
                                className={`mt-2 w-full px-3 py-2 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-emerald-500/40 ${input}`}
                            />
                        )}

                        {frequencyType === 'custom' && (
                            <div className="mt-3 space-y-3 p-3.5 rounded-xl border border-dashed border-emerald-500/30 bg-emerald-500/5">
                                <div>
                                    <label className={`text-xs font-semibold uppercase tracking-wider ${label}`}>
                                        Repeat Interval (Every X Days)
                                    </label>
                                    <div className="mt-1.5 flex items-center gap-2">
                                        <span className={`text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Repeat every</span>
                                        <input
                                            type="number"
                                            min={2}
                                            max={365}
                                            value={freqXTimes}
                                            onChange={e => setFreqXTimes(Math.max(2, parseInt(e.target.value) || 2))}
                                            className={`w-20 px-3 py-1.5 rounded-lg border text-sm text-center font-bold outline-none focus:ring-2 focus:ring-emerald-500/40 ${input}`}
                                        />
                                        <span className={`text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>days</span>
                                    </div>
                                    <p className={`text-[11px] mt-1 ${label}`}>
                                        e.g. 2 for alternate days, 3 for every 3 days, 14 for bi-weekly.
                                    </p>
                                </div>

                                <div>
                                    <div className="flex items-center justify-between">
                                        <label className={`text-xs font-semibold uppercase tracking-wider ${label}`}>
                                            Starting From Date
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => setCustomStartDate(getLocalDateStr())}
                                            className="text-[10px] text-emerald-400 hover:underline"
                                        >
                                            Set to today
                                        </button>
                                    </div>
                                    <input
                                        type="date"
                                        value={customStartDate}
                                        onChange={e => setCustomStartDate(e.target.value)}
                                        className={`mt-1.5 w-full px-3 py-2 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-emerald-500/40 ${input}`}
                                    />
                                    <p className={`text-[11px] mt-1 ${label}`}>
                                        This task will appear in your focus every {freqXTimes} days starting on {customStartDate || 'today'}.
                                    </p>
                                </div>
                            </div>
                        )}

                        {frequencyType === 'one_time' && (
                            <div className="mt-3 space-y-3">
                                <div>
                                    <div className="flex items-center justify-between">
                                        <label className={`text-xs font-semibold uppercase tracking-wider ${label}`}>
                                            Due Date
                                        </label>
                                        {dueDate && (
                                            <button
                                                type="button"
                                                onClick={() => setDueDate('')}
                                                className="text-[10px] text-slate-400 hover:text-emerald-400 underline"
                                            >
                                                Clear date (Long-term goal)
                                            </button>
                                        )}
                                    </div>
                                    <div className="mt-1.5 flex gap-2">
                                        <input
                                            type="date"
                                            value={dueDate}
                                            onChange={e => setDueDate(e.target.value)}
                                            className={`flex-1 px-3 py-2 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-emerald-500/40 ${input}`}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setDueDate(getLocalDateStr())}
                                            className={`px-3 py-2 rounded-xl text-xs font-semibold border ${dueDate === getLocalDateStr() ? 'bg-emerald-500 text-white border-emerald-500' : isDark ? 'border-slate-700 text-slate-300' : 'border-slate-200 text-slate-600'}`}
                                        >
                                            Today
                                        </button>
                                    </div>
                                    <p className={`text-[11px] mt-1.5 ${label}`}>
                                        {dueDate
                                            ? "Scheduled for a specific date: Appears in your daily focus on that date."
                                            : "Long-term goal (No date): Stored safely in Long-Term Goals and will not clutter your daily focus list."
                                        }
                                    </p>
                                </div>

                                {dueDate && (
                                    <label className="flex items-start gap-2.5 cursor-pointer select-none pt-1">
                                        <input
                                            type="checkbox"
                                            checked={carryForward}
                                            onChange={e => setCarryForward(e.target.checked)}
                                            className="mt-0.5 rounded text-emerald-500 focus:ring-emerald-400"
                                        />
                                        <div>
                                            <span className={`text-xs font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                                                Carry forward if not completed
                                            </span>
                                            <p className={`text-[11px] ${label}`}>
                                                If you miss this task today, it automatically rolls over to tomorrow's daily focus until completed.
                                            </p>
                                        </div>
                                    </label>
                                )}
                            </div>
                        )}

                        {frequencyType !== 'one_time' && (
                            <div className="mt-3">
                                <div className="flex items-center justify-between">
                                    <label className={`text-xs font-semibold uppercase tracking-wider ${label}`}>
                                        Repeat Until / End Date (Optional)
                                    </label>
                                    {endDate && (
                                        <button
                                            type="button"
                                            onClick={() => setEndDate('')}
                                            className="text-[10px] text-slate-400 hover:text-emerald-400 underline"
                                        >
                                            Repeat indefinitely
                                        </button>
                                    )}
                                </div>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={e => setEndDate(e.target.value)}
                                    className={`mt-1.5 w-full px-3 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-emerald-500/40 ${input}`}
                                />
                                <p className={`text-[11px] mt-1 ${label}`}>
                                    Task recurrence stops automatically after this date. Leave blank to repeat indefinitely.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Time Block */}
                    <div>
                        <label className={`text-xs font-semibold uppercase tracking-wider ${label}`}>Time Block</label>
                        <div className="mt-1.5 grid grid-cols-2 gap-2">
                            {TIME_BLOCKS.map(({ key, label: l, icon: Icon }) => (
                                <button
                                    type="button"
                                    key={key}
                                    onClick={() => setTimeBlock(key)}
                                    className={`flex items-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${timeBlock === key
                                        ? 'bg-emerald-500 text-white border-emerald-500'
                                        : isDark ? 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500' : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                                        }`}
                                >
                                    <Icon size={13} /> {l}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Priority + Estimate */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={`text-xs font-semibold uppercase tracking-wider ${label}`}>Priority</label>
                            <select
                                value={priority}
                                onChange={e => setPriority(e.target.value as any)}
                                className={`mt-1.5 w-full px-3 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-emerald-500/40 ${input}`}
                            >
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                            </select>
                        </div>
                        <div>
                            <label className={`text-xs font-semibold uppercase tracking-wider ${label}`}>Est. Minutes</label>
                            <input
                                type="number"
                                min={1}
                                value={estimatedMins}
                                onChange={e => setEstimatedMins(e.target.value)}
                                placeholder="e.g. 30"
                                className={`mt-1.5 w-full px-3 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-emerald-500/40 ${input}`}
                            />
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex gap-3 p-5 border-t border-inherit flex-shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all ${isDark ? 'border-slate-600 text-slate-400 hover:bg-slate-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving || !title.trim()}
                        className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                    >
                        <FiSave size={14} />
                        {saving ? 'Saving…' : 'Save Task'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── TaskCard ─────────────────────────────────────────────────────────────────
interface TaskCardProps {
    task: Task;
    isDark: boolean;
    onToggle: (id: string) => void;
    onEdit: (task: Task) => void;
    onDelete: (id: string) => void;
    onPause?: (id: string) => void;
    onResume?: (id: string) => void;
    onStop?: (id: string) => void;
    onScheduleToday?: (id: string) => void;
    showControls?: boolean;
    hideTypeBadge?: boolean;
}

function TaskCard({
    task, isDark, onToggle, onEdit, onDelete,
    onPause, onResume, onStop, onScheduleToday, showControls = false, hideTypeBadge = false
}: TaskCardProps) {
    const done = task.completed_today;
    const priorityColor = PRIORITY_COLORS[task.priority];
    const isRepeating = task.frequency_type !== 'one_time';

    return (
        <div
            className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all group ${done
                ? isDark ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-emerald-50 border-emerald-200'
                : isDark ? 'bg-slate-800/60 border-slate-700/60 hover:border-slate-600' : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
        >
            {/* Checkbox */}
            <button
                type="button"
                onClick={() => onToggle(task.id)}
                className={`mt-0.5 flex-shrink-0 transition-all ${done ? 'text-emerald-400' : isDark ? 'text-slate-600 hover:text-emerald-400' : 'text-slate-300 hover:text-emerald-500'}`}
            >
                {done ? <FiCheckCircle size={20} /> : <FiCircle size={20} />}
            </button>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <span
                        className={`text-sm font-semibold transition-all ${done
                            ? isDark ? 'line-through text-slate-500' : 'line-through text-slate-400'
                            : isDark ? 'text-slate-100' : 'text-slate-800'
                            }`}
                    >
                        {task.title}
                    </span>
                    <span
                        style={{ backgroundColor: task.color + '22', color: task.color }}
                        className="px-1.5 py-0.5 rounded-md text-[10px] font-bold"
                    >
                        {task.category}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-${priorityColor}-500/10 text-${priorityColor}-400`}>
                        {task.priority}
                    </span>

                    {/* Repeating Status Badge */}
                    {!task.is_active ? (
                        <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-slate-500/10 text-slate-400 border border-slate-500/20">
                            Stopped
                        </span>
                    ) : task.is_paused ? (
                        <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            Paused
                        </span>
                    ) : null}

                    {task.is_carried_forward && (
                        <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                            Carried Forward
                        </span>
                    )}

                    {!hideTypeBadge && !isRepeating && !task.due_date && (
                        <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
                            Long-Term Goal
                        </span>
                    )}
                </div>

                {task.description && (
                    <p className={`text-xs mt-0.5 truncate ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{task.description}</p>
                )}

                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                    {task.estimated_minutes && (
                        <div className={`flex items-center gap-1 text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                            <FiClock size={10} />
                            <span>{task.estimated_minutes} min</span>
                        </div>
                    )}
                    {task.frequency_type === 'custom' && (
                        <div className={`flex items-center gap-1 text-[10px] ${isDark ? 'text-emerald-400/90' : 'text-emerald-600'}`}>
                            <FiRepeat size={10} />
                            <span>Every {task.frequency_x_times || 2} days</span>
                        </div>
                    )}
                    {task.end_date && isRepeating && (
                        <div className={`flex items-center gap-1 text-[10px] ${isDark ? 'text-amber-400/80' : 'text-amber-600'}`}>
                            <FiCalendar size={10} />
                            <span>Repeat until: {task.end_date}</span>
                        </div>
                    )}
                    {task.due_date && !isRepeating && (
                        <div className={`flex items-center gap-1 text-[10px] ${isDark ? 'text-indigo-400/80' : 'text-indigo-600'}`}>
                            <FiCalendar size={10} />
                            <span>Due: {task.due_date}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Actions */}
            {showControls && (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    {/* Pause / Resume button */}
                    {isRepeating && task.is_active && (
                        task.is_paused ? (
                            <button
                                type="button"
                                onClick={() => onResume?.(task.id)}
                                title="Resume repeating task"
                                className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-500/10 transition-all"
                            >
                                <FiPlay size={13} />
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() => onPause?.(task.id)}
                                title="Pause repeating task"
                                className="p-1.5 rounded-lg text-amber-400 hover:bg-amber-500/10 transition-all"
                            >
                                <FiPause size={13} />
                            </button>
                        )
                    )}

                    {/* Stop repeating button */}
                    {isRepeating && task.is_active && (
                        <button
                            type="button"
                            onClick={() => onStop?.(task.id)}
                            title="Stop recurrence permanently"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                        >
                            <FiStopCircle size={13} />
                        </button>
                    )}

                    {/* Long term goal "Do Today" button */}
                    {!isRepeating && !task.due_date && onScheduleToday && (
                        <button
                            type="button"
                            onClick={() => onScheduleToday(task.id)}
                            title="Schedule this goal for today"
                            className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/25 transition-all flex items-center gap-1"
                        >
                            <span>+ Do Today</span>
                        </button>
                    )}

                    {/* Edit button */}
                    <button
                        type="button"
                        onClick={() => onEdit(task)}
                        title="Edit task"
                        className={`p-1.5 rounded-lg transition-all ${isDark ? 'text-slate-500 hover:text-slate-200 hover:bg-slate-700' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
                    >
                        <FiEdit2 size={13} />
                    </button>

                    {/* Delete button */}
                    <button
                        type="button"
                        onClick={() => onDelete(task.id)}
                        title="Delete task and history"
                        className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                    >
                        <FiTrash2 size={13} />
                    </button>
                </div>
            )}
        </div>
    );
}

// ─── Month Heatmap Calendar ──────────────────────────────────────────────────
interface MonthHeatmapProps {
    counts: Record<string, number | undefined>;
    isDark: boolean;
    customColor?: string;
    year: number;
    month: number; // 0-indexed: 0 = Jan, 9 = Oct
    todayStr: string;
    onPrevMonth: () => void;
    onNextMonth: () => void;
    onGoToCurrentMonth: () => void;
    canGoNext: boolean;
    onDayClick?: (dateStr: string) => void;
}

function MonthHeatmap({
    counts,
    isDark,
    customColor,
    year,
    month,
    todayStr,
    onPrevMonth,
    onNextMonth,
    onGoToCurrentMonth,
    canGoNext,
    onDayClick,
}: MonthHeatmapProps) {
    const monthDate = useMemo(() => new Date(year, month, 1), [year, month]);
    const monthName = useMemo(() => monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }), [monthDate]);

    const items = useMemo(() => {
        const total = new Date(year, month + 1, 0).getDate();
        const firstDow = new Date(year, month, 1).getDay(); // 0 = Sun
        const list: ({ day: number; dateStr: string } | null)[] = [];
        for (let i = 0; i < firstDow; i++) {
            list.push(null);
        }
        for (let d = 1; d <= total; d++) {
            const mStr = String(month + 1).padStart(2, '0');
            const dStr = String(d).padStart(2, '0');
            list.push({
                day: d,
                dateStr: `${year}-${mStr}-${dStr}`,
            });
        }
        return list;
    }, [year, month]);

    const [nowY, nowM] = useMemo(() => {
        const d = new Date();
        return [d.getFullYear(), d.getMonth()];
    }, []);
    const isCurrentMonth = year === nowY && month === nowM;

    // Monthly stats
    const { activeDaysCount, daysPassed, consistencyPct, totalCompletions, bestStreak } = useMemo(() => {
        const validDates = items.filter(Boolean).map(x => x!.dateStr).filter(d => d <= todayStr);
        const active = validDates.filter(d => (counts[d] || 0) > 0).length;
        const total = validDates.reduce((acc, d) => acc + (counts[d] || 0), 0);
        const pct = validDates.length > 0 ? Math.round((active / validDates.length) * 100) : 0;

        let maxS = 0;
        let curS = 0;
        for (const d of validDates) {
            if ((counts[d] || 0) > 0) {
                curS++;
                if (curS > maxS) maxS = curS;
            } else {
                curS = 0;
            }
        }

        return {
            activeDaysCount: active,
            daysPassed: validDates.length,
            consistencyPct: pct,
            totalCompletions: total,
            bestStreak: maxS,
        };
    }, [items, counts, todayStr]);

    const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const muted = isDark ? 'text-slate-400' : 'text-slate-500';

    return (
        <div className="space-y-4">
            {/* ── Month Navigation & Stats Header ── */}
            <div className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                isDark ? 'bg-slate-800/40 border-slate-700/60' : 'bg-slate-50 border-slate-200'
            }`}>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={onPrevMonth}
                        title="Previous Month"
                        className={`p-1.5 rounded-lg border transition-all ${
                            isDark ? 'border-slate-700 hover:bg-slate-800 text-slate-300' : 'border-slate-200 hover:bg-white text-slate-700'
                        }`}
                    >
                        <FiChevronLeft size={16} />
                    </button>

                    <h4 className="font-bold text-sm tracking-tight px-1">
                        {monthName}
                    </h4>

                    <button
                        type="button"
                        onClick={onNextMonth}
                        disabled={!canGoNext}
                        title="Next Month"
                        className={`p-1.5 rounded-lg border transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
                            isDark ? 'border-slate-700 hover:bg-slate-800 text-slate-300' : 'border-slate-200 hover:bg-white text-slate-700'
                        }`}
                    >
                        <FiChevronRight size={16} />
                    </button>

                    {!isCurrentMonth && (
                        <button
                            type="button"
                            onClick={onGoToCurrentMonth}
                            className="text-xs text-emerald-400 hover:underline font-semibold ml-1.5"
                        >
                            Jump to Current Month
                        </button>
                    )}
                </div>

                {/* Quick month metrics */}
                <div className="flex items-center gap-3 text-xs flex-wrap">
                    <div className="flex items-center gap-1">
                        <span className={muted}>Active Days:</span>
                        <strong className="text-emerald-400">{activeDaysCount}/{daysPassed}d</strong>
                    </div>
                    <div className="flex items-center gap-1">
                        <span className={muted}>Consistency:</span>
                        <strong className="text-emerald-400">{consistencyPct}%</strong>
                    </div>
                    <div className="flex items-center gap-1">
                        <span className={muted}>Completions:</span>
                        <strong className={isDark ? 'text-white' : 'text-slate-900'}>{totalCompletions}</strong>
                    </div>
                    {bestStreak > 0 && (
                        <div className="flex items-center gap-1">
                            <span className={muted}>Best Streak:</span>
                            <strong className="text-amber-400">{bestStreak}d</strong>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Calendar Grid ── */}
            <div>
                {/* Day of Week Headers */}
                <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-1.5 text-center">
                    {dayHeaders.map((dh, i) => (
                        <div
                            key={dh}
                            className={`text-[11px] font-bold py-1 ${
                                i === 0 || i === 6 ? (isDark ? 'text-slate-500' : 'text-slate-400') : muted
                            }`}
                        >
                            {dh}
                        </div>
                    ))}
                </div>

                {/* Day Cells */}
                <div className="grid grid-cols-7 gap-1 sm:gap-2">
                    {items.map((item, idx) => {
                        if (!item) {
                            return (
                                <div
                                    key={`empty-${idx}`}
                                    className={`min-h-[56px] sm:min-h-[72px] rounded-xl border border-transparent ${
                                        isDark ? 'bg-slate-900/20' : 'bg-slate-100/30'
                                    }`}
                                />
                            );
                        }

                        const { day, dateStr } = item;
                        const count = counts[dateStr] || 0;
                        const isToday = dateStr === todayStr;
                        const isFuture = dateStr > todayStr;
                        const done = count > 0;

                        return (
                            <button
                                type="button"
                                key={dateStr}
                                onClick={() => onDayClick?.(dateStr)}
                                title={`${dateStr}: ${done ? `${count} completed` : 'No completions'}. Click to view focus list.`}
                                className={`min-h-[56px] sm:min-h-[72px] p-1.5 sm:p-2 rounded-xl border flex flex-col justify-between text-left transition-all relative group hover:scale-[1.02] cursor-pointer ${
                                    isToday
                                        ? 'ring-2 ring-emerald-400 ring-offset-1'
                                        : ''
                                } ${
                                    done
                                        ? customColor
                                            ? isDark ? 'border-emerald-500/30 hover:border-emerald-500/50' : 'border-emerald-500/30 hover:border-emerald-500/50'
                                            : isDark ? 'border-emerald-500/30 hover:border-emerald-500/50' : 'border-emerald-200 hover:border-emerald-300'
                                        : isDark
                                            ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                                            : 'bg-white border-slate-200 hover:border-slate-300'
                                }`}
                                style={{
                                    backgroundColor: done
                                        ? (customColor ? customColor + '20' : (isDark ? '#064e3b33' : '#dcfce7'))
                                        : undefined,
                                }}
                            >
                                {/* Top: Day Number + Today Badge */}
                                <div className="flex items-center justify-between w-full">
                                    <span className={`text-xs font-bold ${
                                        isToday
                                            ? 'text-emerald-400 font-extrabold'
                                            : isFuture
                                                ? isDark ? 'text-slate-600' : 'text-slate-400'
                                                : isDark ? 'text-slate-300' : 'text-slate-700'
                                    }`}>
                                        {day}
                                    </span>

                                    {isToday && (
                                        <span className="hidden sm:inline-block text-[9px] font-extrabold px-1 py-0.2 rounded bg-emerald-500 text-white leading-none">
                                            TODAY
                                        </span>
                                    )}
                                </div>

                                {/* Bottom: Status Indicator */}
                                <div className="mt-1">
                                    {done ? (
                                        <div className="flex items-center gap-1 text-[10px] sm:text-[11px] font-bold" style={{ color: customColor || '#10b981' }}>
                                            <FiCheckCircle size={12} className="flex-shrink-0" />
                                            <span className="truncate">
                                                {customColor ? 'Done' : `${count} task${count > 1 ? 's' : ''}`}
                                            </span>
                                        </div>
                                    ) : isFuture ? (
                                        <span className={`text-[9px] sm:text-[10px] ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
                                            Upcoming
                                        </span>
                                    ) : (
                                        <span className={`text-[10px] ${isDark ? 'text-slate-700' : 'text-slate-300'}`}>
                                            —
                                        </span>
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Click tip */}
            <p className={`text-[11px] text-center pt-1 ${muted}`}>
                Tip: Click any day in the calendar to jump to its focus list and review or log tasks.
            </p>
        </div>
    );
}

// ─── Heatmap (52-week horizontal grid) ───────────────────────────────────────
function ContributionHeatmap({
    counts,
    isDark,
    customColor
}: {
    counts: Record<string, number | undefined>;
    isDark: boolean;
    customColor?: string;
}) {
    const grid = useMemo(() => buildHeatmapGrid(), []);
    const weeks: string[][] = [];
    for (let i = 0; i < grid.length; i += 7) {
        weeks.push(grid.slice(i, i + 7));
    }
    const monthLabels: { label: string; col: number }[] = [];
    weeks.forEach((week, wi) => {
        const d = new Date(week[0]);
        if (wi === 0 || d.getDate() <= 7) {
            const label = d.toLocaleDateString('en-US', { month: 'short' });
            if (monthLabels.length === 0 || monthLabels[monthLabels.length - 1].label !== label) {
                monthLabels.push({ label, col: wi });
            }
        }
    });

    return (
        <div className="overflow-x-auto">
            {/* Month labels */}
            <div className="flex mb-1 pl-8">
                {monthLabels.map(({ label, col }, i) => (
                    <div
                        key={i}
                        className={`text-[10px] font-semibold ${isDark ? 'text-slate-500' : 'text-slate-400'}`}
                        style={{ marginLeft: i === 0 ? `${col * 14}px` : `${(col - (monthLabels[i - 1]?.col || 0)) * 14 - 24}px`, minWidth: 24 }}
                    >
                        {label}
                    </div>
                ))}
            </div>

            <div className="flex gap-0.5">
                {/* Day labels */}
                <div className="flex flex-col gap-0.5 mr-1 pt-0">
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                        <div key={i} className={`w-3 h-3 text-[9px] flex items-center justify-center ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
                            {i % 2 === 1 ? d : ''}
                        </div>
                    ))}
                </div>

                {/* Grid */}
                {weeks.map((week, wi) => (
                    <div key={wi} className="flex flex-col gap-0.5">
                        {week.map(date => {
                            const c = counts[date] || 0;
                            return (
                                <div
                                    key={date}
                                    title={`${date}: ${c > 0 ? (customColor ? 'Completed' : `${c} tasks`) : 'No completions'}`}
                                    className="w-3 h-3 rounded-sm transition-all hover:ring-1 hover:ring-emerald-400 cursor-default"
                                    style={{ backgroundColor: heatColor(c, isDark, c > 0 ? customColor : undefined) }}
                                />
                            );
                        })}
                    </div>
                ))}
            </div>

            {/* Legend */}
            <div className={`flex items-center gap-1.5 mt-2 text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                <span>Less</span>
                {customColor ? (
                    <>
                        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: heatColor(0, isDark) }} />
                        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: customColor }} />
                    </>
                ) : (
                    [0, 1, 2, 3, 5].map(v => (
                        <div key={v} className="w-3 h-3 rounded-sm" style={{ backgroundColor: heatColor(v, isDark) }} />
                    ))
                )}
                <span>More</span>
            </div>
        </div>
    );
}

// ─── Weekly Activity Chart (Current Week & Previous Weeks) ───────────────────
interface WeeklyActivityProps {
    counts: Record<string, number | undefined>;
    isDark: boolean;
    color?: string;
    todayStr: string;
    onDayClick?: (dateStr: string) => void;
}

function WeeklyActivityChart({ counts, isDark, color = '#10b981', todayStr, onDayClick }: WeeklyActivityProps) {
    const [weekOffset, setWeekOffset] = useState<number>(0); // 0 = current week, -1 = last week, etc.

    const { days, rangeLabel, isCurrentWeek, totalTasksThisWeek, activeDaysCount, elapsedDays, bestDay, maxCountInWeek } = useMemo(() => {
        const [ty, tm, td] = todayStr.split('-').map(Number);
        const today = new Date(ty, tm - 1, td);

        // Monday-based week (0 for Mon, ..., 6 for Sun)
        const dow = today.getDay();
        const diffToMonday = dow === 0 ? 6 : dow - 1;

        const monday = new Date(today);
        monday.setDate(today.getDate() - diffToMonday + (weekOffset * 7));

        const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const result = [];
        let maxVal = 1;

        for (let i = 0; i < 7; i++) {
            const d = new Date(monday);
            d.setDate(monday.getDate() + i);
            const dateStr = getLocalDateStr(d);
            const count = counts[dateStr] || 0;
            if (count > maxVal) maxVal = count;

            result.push({
                name: dayNames[i],
                dateStr,
                dayNum: d.getDate(),
                monthShort: d.toLocaleDateString('en-US', { month: 'short' }),
                count,
                isToday: dateStr === todayStr,
                isPast: dateStr < todayStr,
                isFuture: dateStr > todayStr,
            });
        }

        const start = result[0];
        const end = result[6];
        const range = `${start.monthShort} ${start.dayNum} – ${end.monthShort} ${end.dayNum}, ${monday.getFullYear()}`;

        // Stats for elapsed days in this week (days <= todayStr)
        const elapsed = result.filter(d => !d.isFuture);
        const totalTasks = elapsed.reduce((sum, d) => sum + d.count, 0);
        const activeDays = elapsed.filter(d => d.count > 0).length;

        let peakDay: { name: string; count: number } | null = null;
        for (const d of elapsed) {
            if (d.count > 0 && (!peakDay || d.count > peakDay.count)) {
                peakDay = { name: d.name, count: d.count };
            }
        }

        return {
            days: result,
            rangeLabel: range,
            isCurrentWeek: weekOffset === 0,
            totalTasksThisWeek: totalTasks,
            activeDaysCount: activeDays,
            elapsedDays: elapsed.length,
            bestDay: peakDay,
            maxCountInWeek: maxVal,
        };
    }, [todayStr, weekOffset, counts]);

    const trackBg = isDark ? 'bg-slate-800' : 'bg-slate-100';
    const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-sm sm:text-base flex items-center gap-2">
                            <FiBarChart2 size={16} className="text-emerald-400" />
                            {isCurrentWeek ? "This Week's Activity" : "Weekly Activity"}
                        </h4>
                        <span className={`text-xs px-2.5 py-0.5 rounded-lg font-semibold border ${
                            isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
                        }`}>
                            {rangeLabel}
                        </span>
                    </div>
                    <p className={`text-xs mt-0.5 ${textMuted}`}>
                        {isCurrentWeek
                            ? "Track your daily momentum for the current week (Monday to Sunday)."
                            : `Daily performance recorded for ${rangeLabel}.`
                        }
                    </p>
                </div>

                {/* Week Navigator */}
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setWeekOffset(w => w - 1)}
                        title="Previous Week"
                        className={`p-1.5 px-2.5 rounded-lg border text-xs font-semibold transition-all flex items-center gap-1 ${
                            isDark ? 'border-slate-700 hover:bg-slate-800 text-slate-300' : 'border-slate-200 hover:bg-slate-100 text-slate-700'
                        }`}
                    >
                        <FiChevronLeft size={14} />
                        <span>Last Week</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setWeekOffset(w => Math.min(0, w + 1))}
                        disabled={isCurrentWeek}
                        title="Next Week"
                        className={`p-1.5 px-2.5 rounded-lg border text-xs font-semibold transition-all flex items-center gap-1 disabled:opacity-30 disabled:cursor-not-allowed ${
                            isDark ? 'border-slate-700 hover:bg-slate-800 text-slate-300' : 'border-slate-200 hover:bg-slate-100 text-slate-700'
                        }`}
                    >
                        <span>Next Week</span>
                        <FiChevronRight size={14} />
                    </button>

                    {!isCurrentWeek && (
                        <button
                            type="button"
                            onClick={() => setWeekOffset(0)}
                            className="text-xs text-emerald-400 hover:underline font-semibold ml-1"
                        >
                            This Week
                        </button>
                    )}
                </div>
            </div>

            {/* Quick Summary Row */}
            <div className="flex items-center gap-3 text-xs pt-0.5 flex-wrap">
                <div className="flex items-center gap-1">
                    <span className={textMuted}>Tasks Done:</span>
                    <strong className="text-emerald-400">{totalTasksThisWeek}</strong>
                </div>
                <div className="flex items-center gap-1">
                    <span className={textMuted}>Active Days:</span>
                    <strong className="text-emerald-400">{activeDaysCount} / {elapsedDays} days</strong>
                </div>
                {bestDay && (
                    <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <span>Best Day:</span>
                        <span className="font-bold">{bestDay.name} ({bestDay.count} {bestDay.count === 1 ? 'task' : 'tasks'})</span>
                    </div>
                )}
            </div>

            {/* 7 Columns for Monday to Sunday */}
            <div className="grid grid-cols-7 gap-1.5 sm:gap-3 pt-2">
                {days.map((d) => {
                    const done = d.count > 0;
                    const barHeightPct = done ? Math.max(18, Math.round((d.count / maxCountInWeek) * 100)) : (d.isToday ? 8 : 4);

                    return (
                        <button
                            key={d.dateStr}
                            type="button"
                            onClick={() => onDayClick?.(d.dateStr)}
                            title={`${d.name}, ${d.monthShort} ${d.dayNum}: ${done ? `${d.count} completed` : d.isFuture ? 'Upcoming' : '0 completed'}. Click to view focus.`}
                            className={`flex flex-col items-center gap-2 group p-2 rounded-xl border transition-all cursor-pointer ${
                                d.isToday
                                    ? 'ring-2 ring-emerald-400/80 ring-offset-1 bg-emerald-500/5 border-emerald-500/30'
                                    : isDark ? 'border-transparent hover:bg-slate-800/40 hover:border-slate-700/50' : 'border-transparent hover:bg-slate-50 hover:border-slate-200'
                            }`}
                        >
                            {/* Top: Actual Task Count (NO meaningless %) */}
                            <span className={`text-[11px] font-bold transition-transform group-hover:scale-105 ${
                                done
                                    ? 'text-emerald-400 font-extrabold'
                                    : d.isToday
                                        ? 'text-amber-400 font-semibold'
                                        : d.isFuture
                                            ? textMuted + ' opacity-40'
                                            : textMuted
                            }`}>
                                {done
                                    ? `${d.count} ${d.count === 1 ? 'task' : 'tasks'}`
                                    : d.isToday
                                        ? '0 today'
                                        : d.isFuture
                                            ? '—'
                                            : '0'
                                }
                            </span>

                            {/* Bar Track */}
                            <div className={`w-full max-w-[48px] h-28 rounded-xl ${trackBg} p-1 flex flex-col justify-end relative overflow-hidden transition-all group-hover:ring-1 group-hover:ring-emerald-400/40 shadow-inner`}>
                                <div
                                    className="w-full rounded-lg transition-all duration-700 relative"
                                    style={{
                                        height: `${barHeightPct}%`,
                                        backgroundColor: color,
                                        opacity: done ? 1 : (d.isToday ? 0.35 : 0.12),
                                    }}
                                />
                            </div>

                            {/* Bottom: Day name & date */}
                            <div className="text-center">
                                <p className={`text-xs font-bold ${
                                    d.isToday
                                        ? 'text-emerald-400 font-extrabold'
                                        : isDark ? 'text-slate-200' : 'text-slate-800'
                                }`}>
                                    {d.name}
                                </p>
                                <p className={`text-[10px] ${textMuted}`}>
                                    {d.dayNum}
                                </p>
                                {d.isToday && (
                                    <span className="inline-block mt-0.5 text-[8px] font-black uppercase px-1 rounded bg-emerald-500 text-white leading-tight">
                                        Today
                                    </span>
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Click Tip */}
            <p className={`text-[11px] text-center pt-1 ${textMuted}`}>
                Tip: Click any day bar to jump to its daily focus list and review or log tasks.
            </p>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function TaskTracker() {
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const {
        todayTasks, allTasks, heatmapData,
        loading,
        fetchTodayTasks, fetchAllTasks, fetchHeatmapData,
        addTask, updateTask, deleteTask, toggleComplete,
        pauseTask, resumeTask, stopTask,
    } = useTasks();

    const [activeTab, setActiveTab] = useState<Tab>('today');
    const [showModal, setShowModal] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | undefined>(undefined);
    const [modalDefaultFreq, setModalDefaultFreq] = useState<FrequencyType | undefined>(undefined);
    const [searchQ, setSearchQ] = useState('');
    const [filterCat, setFilterCat] = useState('');
    const [filterFreq, setFilterFreq] = useState('');
    const [goalsFilter, setGoalsFilter] = useState<'all' | 'open' | 'completed' | 'scheduled'>('all');
    const [goalsSearchQ, setGoalsSearchQ] = useState('');
    const [goalsCat, setGoalsCat] = useState('');
    const [streakTaskId, setStreakTaskId] = useState<string>(() => {
        return localStorage.getItem('casham_selected_streak_task') || 'all';
    });
    const todayStr = useMemo(() => getLocalDateStr(), []);
    const yesterdayStr = useMemo(() => {
        const y = new Date();
        y.setDate(y.getDate() - 1);
        return getLocalDateStr(y);
    }, []);
    const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'long_term' | 'paused' | 'stopped'>('all');
    const [selectedDate, setSelectedDate] = useState<string>(todayStr);

    // Heatmap View Mode: 'month' (default calendar) vs 'year' (52-week grid)
    const [heatmapViewMode, setHeatmapViewMode] = useState<'month' | 'year'>('month');
    const [heatmapYear, setHeatmapYear] = useState<number>(() => new Date().getFullYear());
    const [heatmapMonth, setHeatmapMonth] = useState<number>(() => new Date().getMonth());

    const handlePrevHeatmapMonth = () => {
        if (heatmapMonth === 0) {
            setHeatmapYear(y => y - 1);
            setHeatmapMonth(11);
        } else {
            setHeatmapMonth(m => m - 1);
        }
    };

    const handleNextHeatmapMonth = () => {
        const now = new Date();
        const isCurrent = heatmapYear === now.getFullYear() && heatmapMonth === now.getMonth();
        if (isCurrent) return;

        if (heatmapMonth === 11) {
            setHeatmapYear(y => y + 1);
            setHeatmapMonth(0);
        } else {
            setHeatmapMonth(m => m + 1);
        }
    };

    const handleGoToCurrentHeatmapMonth = () => {
        const now = new Date();
        setHeatmapYear(now.getFullYear());
        setHeatmapMonth(now.getMonth());
    };

    const handleDayClickFromHeatmap = (dateStr: string) => {
        setSelectedDate(dateStr);
        setActiveTab('today');
    };

    // Web Notifications
    const [notifPermission, setNotifPermission] = useState<NotificationStatus>('default');
    const [notifMenuOpen, setNotifMenuOpen] = useState(false);
    const [notifSuccessToast, setNotifSuccessToast] = useState<string | null>(null);

    useEffect(() => {
        setNotifPermission(getNotificationPermission());
    }, []);

    // Check & dispatch reminders for today's tasks
    useEffect(() => {
        if (selectedDate === todayStr && todayTasks.length > 0 && notifPermission === 'granted') {
            checkAndNotifyPendingTasks(todayTasks, todayStr);
        }
    }, [todayTasks, selectedDate, todayStr, notifPermission]);

    const handleEnableNotifications = async () => {
        const res = await requestNotificationPermission();
        setNotifPermission(res);
        if (res === 'granted') {
            sendTestNotification();
            setNotifSuccessToast('Reminders activated! A test alert was sent.');
            setTimeout(() => setNotifSuccessToast(null), 4000);
        }
    };

    const handleSendTestNotif = () => {
        const sent = sendTestNotification();
        if (sent) {
            setNotifSuccessToast('Test notification dispatched!');
            setTimeout(() => setNotifSuccessToast(null), 3000);
        }
    };

    // Load data per tab
    useEffect(() => {
        if (activeTab === 'today') {
            fetchTodayTasks(selectedDate);
        }
    }, [activeTab, selectedDate, fetchTodayTasks]);

    useEffect(() => {
        if (activeTab === 'all' || activeTab === 'goals') fetchAllTasks();
        if (activeTab === 'performance') {
            fetchHeatmapData();
            fetchAllTasks();
        }
    }, [activeTab, fetchAllTasks, fetchHeatmapData]);

    // Only repeating habits for the Performance Habit dropdown (HIDE one_time tasks)
    const repeatingTasks = useMemo(() => {
        const source = (heatmapData?.tasks && heatmapData.tasks.length > 0)
            ? heatmapData.tasks
            : allTasks;
        return source.filter(t => t.frequency_type !== 'one_time');
    }, [heatmapData, allTasks]);

    const handleSelectStreakTask = (id: string) => {
        setStreakTaskId(id);
        localStorage.setItem('casham_selected_streak_task', id);
    };

    // Ensure selected task stays sticky and never resets automatically unless deleted
    useEffect(() => {
        if (repeatingTasks.length > 0) {
            const saved = localStorage.getItem('casham_selected_streak_task');
            if (saved === 'all') {
                if (streakTaskId !== 'all') setStreakTaskId('all');
                return;
            }
            if (saved && repeatingTasks.some(t => t.id === saved)) {
                if (streakTaskId !== saved) setStreakTaskId(saved);
                return;
            }
            if (streakTaskId === 'all' || repeatingTasks.some(t => t.id === streakTaskId)) {
                return;
            }
            // Fallback only if currently selected task was deleted
            setStreakTaskId('all');
        }
    }, [repeatingTasks, streakTaskId]);

    // Selected task object
    const selectedTask = useMemo(() => {
        if (!streakTaskId || streakTaskId === 'all') return null;
        return repeatingTasks.find(t => t.id === streakTaskId) || null;
    }, [repeatingTasks, streakTaskId]);

    // Theme classes
    const page = isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800';
    const card = isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200';
    const tabInactive = isDark ? 'text-slate-500 hover:text-slate-300 hover:bg-slate-800' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100';
    const tabActive = 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30';
    const muted = isDark ? 'text-slate-500' : 'text-slate-400';
    const inputCls = isDark
        ? 'bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-500'
        : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400';

    // ─── Today's tasks grouped by time block with Smart Sorting
    const PRIORITY_WEIGHT: Record<string, number> = { high: 3, medium: 2, low: 1 };
    const todayGrouped = useMemo(() => {
        return TIME_BLOCKS.map(block => {
            const blockTasks = todayTasks.filter(t => t.time_block === block.key);
            const sorted = [...blockTasks].sort((a, b) => {
                if (a.completed_today !== b.completed_today) {
                    return a.completed_today ? 1 : -1;
                }
                const pA = PRIORITY_WEIGHT[a.priority] || 2;
                const pB = PRIORITY_WEIGHT[b.priority] || 2;
                return pB - pA;
            });
            return {
                ...block,
                tasks: sorted,
            };
        }).filter(g => g.tasks.length > 0);
    }, [todayTasks]);

    const todayCompleted = todayTasks.filter(t => t.completed_today).length;
    const todayTotal = todayTasks.length;
    const todayPct = todayTotal > 0 ? Math.round((todayCompleted / todayTotal) * 100) : 0;

    // ─── Status counts for All Tasks pills
    const activeCount = useMemo(() => allTasks.filter(t => t.is_active && !t.is_paused && (t.frequency_type !== 'one_time' || t.due_date)).length, [allTasks]);
    const longTermCount = useMemo(() => allTasks.filter(t => t.frequency_type === 'one_time' && !t.due_date).length, [allTasks]);
    const pausedCount = useMemo(() => allTasks.filter(t => t.is_paused).length, [allTasks]);
    const stoppedCount = useMemo(() => allTasks.filter(t => !t.is_active).length, [allTasks]);

    // ─── All tasks filtered with Status, Search, Category and Frequency
    const filteredAll = useMemo(() => {
        return allTasks.filter(t => {
            // Status filter
            if (filterStatus === 'active') {
                if (!t.is_active || t.is_paused) return false;
                if (t.frequency_type === 'one_time' && !t.due_date) return false;
            } else if (filterStatus === 'long_term') {
                if (t.frequency_type !== 'one_time' || t.due_date) return false;
            } else if (filterStatus === 'paused') {
                if (!t.is_paused) return false;
            } else if (filterStatus === 'stopped') {
                if (t.is_active) return false;
            }

            const q = searchQ.toLowerCase();
            const matchQ = !q || t.title.toLowerCase().includes(q) || (t.description || '').toLowerCase().includes(q);
            const matchCat = !filterCat || t.category === filterCat;
            const matchFreq = !filterFreq || t.frequency_type === filterFreq;
            return matchQ && matchCat && matchFreq;
        });
    }, [allTasks, filterStatus, searchQ, filterCat, filterFreq]);

    // ─── Active heatmap & streaks based on selected task
    const activeHeatmapCounts = useMemo(() => {
        if (!heatmapData) return {};
        if (streakTaskId === 'all') return heatmapData.counts;
        return heatmapData.taskCounts?.[streakTaskId] || {};
    }, [heatmapData, streakTaskId]);

    const streaks = useMemo(() => {
        if (!heatmapData) return { current: 0, best: 0 };
        return calcStreaks(activeHeatmapCounts);
    }, [heatmapData, activeHeatmapCounts]);

    // Total completion count for selected task
    const selectedTaskTotalCompletions = useMemo(() => {
        return Object.values(activeHeatmapCounts).reduce((acc, v) => acc + (v ? 1 : 0), 0);
    }, [activeHeatmapCounts]);

    // ─── Handlers
    const handleSaveTask = async (payload: NewTaskPayload) => {
        if (editingTask) {
            await updateTask(editingTask.id, payload);
            if (activeTab === 'all') fetchAllTasks();
            if (activeTab === 'today') fetchTodayTasks(selectedDate);
            if (activeTab === 'performance') fetchHeatmapData();
        } else {
            const created = await addTask(payload);
            if (activeTab === 'today') fetchTodayTasks(selectedDate);
            if (activeTab === 'all' || activeTab === 'goals') fetchAllTasks();
            if (activeTab === 'performance') {
                fetchHeatmapData();
                if (payload.frequency_type !== 'one_time') {
                    handleSelectStreakTask(created.id);
                }
            }
        }
        setEditingTask(undefined);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this task? All completion history will be removed.')) return;
        await deleteTask(id);
        if (streakTaskId === id) setStreakTaskId('all');
    };

    const handleToggle = async (id: string) => {
        await toggleComplete(id, selectedDate);
        fetchHeatmapData();
    };

    const handlePause = async (id: string) => {
        await pauseTask(id);
        if (activeTab === 'performance') fetchHeatmapData();
    };

    const handleResume = async (id: string) => {
        await resumeTask(id);
        if (activeTab === 'performance') fetchHeatmapData();
    };

    const handleStop = async (id: string) => {
        if (!confirm('Stop repeating this task? It will no longer appear in daily focus, but previous completion history is preserved.')) return;
        await stopTask(id);
        if (activeTab === 'performance') fetchHeatmapData();
    };

    const handleScheduleToday = async (id: string) => {
        await updateTask(id, { due_date: todayStr, carry_forward: true });
        fetchAllTasks();
        fetchTodayTasks(selectedDate);
    };

    const openAdd = () => { setEditingTask(undefined); setModalDefaultFreq(undefined); setShowModal(true); };
    const openAddGoal = () => { setEditingTask(undefined); setModalDefaultFreq('one_time'); setShowModal(true); };
    const openEdit = (t: Task) => { setEditingTask(t); setModalDefaultFreq(t.frequency_type); setShowModal(true); };

    return (
        <div className={`min-h-screen p-4 md:p-6 lg:p-8 ${page}`}>
            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold font-heading tracking-tight flex items-center gap-2">
                        <FiCheckCircle className="text-emerald-400" size={24} /> Task Manager
                    </h1>
                    <p className={`text-sm mt-0.5 ${muted}`}>Build habits. Stay consistent.</p>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                    {/* Notification Control */}
                    {isNotificationSupported() && (
                        <div className="relative">
                            {notifPermission === 'granted' ? (
                                <button
                                    type="button"
                                    onClick={() => setNotifMenuOpen(!notifMenuOpen)}
                                    title="Notification Settings"
                                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${
                                        isDark ? 'bg-slate-800 border-slate-700 text-emerald-400 hover:border-emerald-500/40' : 'bg-white border-slate-200 text-emerald-600 hover:border-emerald-300'
                                    }`}
                                >
                                    <FiBell size={14} className="text-emerald-400" />
                                    <span className="hidden sm:inline">Reminders Active</span>
                                </button>
                            ) : notifPermission === 'denied' ? (
                                <button
                                    type="button"
                                    onClick={() => alert('Notifications are blocked by your browser settings. Please click the site settings / lock icon in your browser address bar to allow notifications for casham.site.')}
                                    title="Notifications are blocked in browser"
                                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${
                                        isDark ? 'bg-slate-800 border-slate-700 text-slate-500' : 'bg-white border-slate-200 text-slate-400'
                                    }`}
                                >
                                    <FiBellOff size={14} />
                                    <span className="hidden sm:inline">Blocked</span>
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={handleEnableNotifications}
                                    title="Enable browser reminders for daily habits"
                                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-all shadow-sm ${
                                        isDark ? 'bg-slate-800 border-slate-700 text-amber-300 hover:border-amber-400/50' : 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
                                    }`}
                                >
                                    <FiBell size={14} className="animate-pulse" />
                                    <span>Enable Reminders</span>
                                </button>
                            )}

                            {/* Dropdown menu when notifications are granted */}
                            {notifMenuOpen && notifPermission === 'granted' && (
                                <div className={`absolute right-0 mt-2 w-64 rounded-xl border shadow-xl p-3 z-30 ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
                                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-inherit">
                                        <span className="text-xs font-bold flex items-center gap-1.5 text-emerald-400">
                                            <FiBell size={12} /> Web Notifications
                                        </span>
                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                            Enabled
                                        </span>
                                    </div>
                                    <p className={`text-[11px] mb-3 ${muted}`}>
                                        CASHAM alerts you about pending habits in your morning, afternoon, and evening routines.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => { handleSendTestNotif(); setNotifMenuOpen(false); }}
                                        className="w-full py-1.5 px-2.5 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/25 transition-all text-center"
                                    >
                                        Send Test Notification
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={openAdd}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold transition-all shadow-lg shadow-emerald-500/25"
                    >
                        <FiPlus size={16} /> Add Task
                    </button>
                </div>
            </div>

            {/* Notification Toast */}
            {notifSuccessToast && (
                <div className="fixed bottom-5 right-5 z-50 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold shadow-xl flex items-center gap-2 animate-bounce">
                    <FiBell size={14} />
                    <span>{notifSuccessToast}</span>
                </div>
            )}

            {/* ── Tabs ── */}
            <div className={`flex gap-1 p-1 rounded-xl border mb-6 w-fit flex-wrap ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
                {([
                    { key: 'today', label: "Today's Focus" },
                    { key: 'all', label: 'All Tasks' },
                    { key: 'goals', label: 'Long-Term Goals' },
                    { key: 'performance', label: 'Performance' },
                ] as { key: Tab; label: string }[]).map(({ key, label }) => (
                    <button
                        type="button"
                        key={key}
                        onClick={() => setActiveTab(key)}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === key ? tabActive : tabInactive}`}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {/* ══════════════════════════════════════════════════════════════════ */}
            {/* TODAY'S FOCUS TAB */}
            {/* ══════════════════════════════════════════════════════════════════ */}
            {activeTab === 'today' && (
                <div className="space-y-6">
                    {/* ── Date Navigator Bar ── */}
                    <div className={`p-3.5 rounded-2xl border ${card} shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3`}>
                        <div className="flex items-center gap-2 flex-wrap">
                            {/* Prev Day Button */}
                            <button
                                type="button"
                                onClick={() => setSelectedDate(shiftDateStr(selectedDate, -1))}
                                title="Previous Day"
                                className={`p-2 rounded-xl border transition-all ${isDark ? 'border-slate-700 hover:bg-slate-800 text-slate-300' : 'border-slate-200 hover:bg-slate-100 text-slate-700'}`}
                            >
                                <FiChevronLeft size={16} />
                            </button>

                            {/* Date Picker Input */}
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={e => e.target.value && setSelectedDate(e.target.value)}
                                className={`px-3 py-1.5 rounded-xl border text-sm font-semibold outline-none focus:ring-2 focus:ring-emerald-500/40 cursor-pointer ${inputCls}`}
                            />

                            {/* Next Day Button */}
                            <button
                                type="button"
                                onClick={() => setSelectedDate(shiftDateStr(selectedDate, 1))}
                                title="Next Day"
                                className={`p-2 rounded-xl border transition-all ${isDark ? 'border-slate-700 hover:bg-slate-800 text-slate-300' : 'border-slate-200 hover:bg-slate-100 text-slate-700'}`}
                            >
                                <FiChevronRight size={16} />
                            </button>

                            {/* Quick Presets: Yesterday & Today */}
                            <div className="flex items-center gap-1.5 ml-1">
                                <button
                                    type="button"
                                    onClick={() => setSelectedDate(yesterdayStr)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${selectedDate === yesterdayStr
                                        ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 font-bold'
                                        : isDark ? 'border-slate-800 text-slate-400 hover:border-slate-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'
                                    }`}
                                >
                                    Yesterday
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSelectedDate(todayStr)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${selectedDate === todayStr
                                        ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm shadow-emerald-500/25 font-bold'
                                        : isDark ? 'border-slate-800 text-slate-400 hover:border-slate-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'
                                    }`}
                                >
                                    Today
                                </button>
                            </div>
                        </div>

                        {/* Date badge */}
                        <div className="flex items-center gap-2">
                            <span className={`text-xs ${muted}`}>Viewing:</span>
                            <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${selectedDate === todayStr
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                                : selectedDate === yesterdayStr
                                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/25'
                                    : isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}>
                                {formatDisplayDate(selectedDate, todayStr, yesterdayStr)}
                            </span>
                        </div>
                    </div>

                    {/* Banner when viewing non-today date */}
                    {selectedDate !== todayStr && (
                        <div className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-3 animate-fade-in ${selectedDate === yesterdayStr
                            ? 'bg-amber-500/10 border-amber-500/25 text-amber-400'
                            : isDark ? 'bg-indigo-500/10 border-indigo-500/25 text-indigo-300' : 'bg-indigo-50 border-indigo-200 text-indigo-700'
                        }`}>
                            <span className="flex items-center gap-2">
                                <FiCalendar size={15} className="flex-shrink-0" />
                                <span>
                                    Viewing tasks for <strong>{formatDisplayDate(selectedDate, todayStr, yesterdayStr)}</strong>. Checking or unchecking tasks records completion for this date.
                                </span>
                            </span>
                            <button
                                type="button"
                                onClick={() => setSelectedDate(todayStr)}
                                className="underline font-bold hover:opacity-80 flex-shrink-0"
                            >
                                Return to Today
                            </button>
                        </div>
                    )}

                    {/* Progress bar */}
                    {todayTotal > 0 && (
                        <div className={`rounded-2xl border p-4 ${card}`}>
                            <div className="flex items-center justify-between mb-2">
                                <span className={`text-sm font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                    {selectedDate === todayStr ? "Today's Progress" : `Progress for ${formatNiceDate(selectedDate)}`}
                                </span>
                                <span className="text-sm font-bold text-emerald-400">
                                    {todayCompleted}/{todayTotal} · {todayPct}%
                                </span>
                            </div>
                            <div className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
                                <div
                                    className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                                    style={{ width: `${todayPct}%` }}
                                />
                            </div>
                            {todayPct === 100 && (
                                <p className="text-xs text-emerald-400 font-semibold mt-2 flex items-center gap-1">
                                    <FiAward size={12} /> All done! Great job
                                </p>
                            )}
                        </div>
                    )}

                    {loading && (
                        <div className={`flex items-center justify-center py-16 ${muted}`}>
                            <div className="w-8 h-8 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                        </div>
                    )}

                    {!loading && todayTotal === 0 && (
                        <div className={`rounded-2xl border p-10 text-center ${card}`}>
                            <FiCheckCircle size={36} className="mx-auto mb-3 text-emerald-400 opacity-80" />
                            <p className={`font-semibold ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                                {selectedDate === todayStr ? "No tasks for today" : `No tasks scheduled for ${formatNiceDate(selectedDate)}`}
                            </p>
                            <p className={`text-sm mt-1 ${muted}`}>
                                {selectedDate === todayStr
                                    ? "Add recurring tasks or tasks due today to start building your streak."
                                    : "Add recurring or custom tasks scheduled for this day."}
                            </p>
                            <button
                                type="button"
                                onClick={openAdd}
                                className="mt-4 px-4 py-2 rounded-xl bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600 transition-all"
                            >
                                + Add Task
                            </button>
                        </div>
                    )}

                    {!loading && todayGrouped.map(group => {
                        const GroupIcon = group.icon;
                        return (
                            <div key={group.key}>
                                {/* Time block header */}
                                <div className={`flex items-center gap-2 mb-2 px-1 ${muted}`}>
                                    <GroupIcon size={14} />
                                    <span className="text-xs font-bold uppercase tracking-wider">{group.label}</span>
                                    <span className="text-xs">· {group.range}</span>
                                    <span className={`ml-auto text-xs font-semibold ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
                                        {group.tasks.filter(t => t.completed_today).length}/{group.tasks.length}
                                    </span>
                                </div>
                                <div className="space-y-2">
                                    {group.tasks.map(task => (
                                        <TaskCard
                                            key={task.id}
                                            task={task}
                                            isDark={isDark}
                                            onToggle={handleToggle}
                                            onEdit={openEdit}
                                            onDelete={handleDelete}
                                            onPause={handlePause}
                                            onResume={handleResume}
                                            onStop={handleStop}
                                            showControls
                                        />
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════ */}
            {/* ALL TASKS TAB */}
            {/* ══════════════════════════════════════════════════════════════════ */}
            {activeTab === 'all' && (
                <div className="space-y-4">
                    {/* Status Pill Tabs */}
                    <div className="flex flex-wrap gap-1.5 pb-1">
                        {[
                            { key: 'all', label: 'All Tasks', count: allTasks.length },
                            { key: 'active', label: 'Active Routines', count: activeCount },
                            { key: 'long_term', label: 'Long-Term Goals', count: longTermCount },
                            { key: 'paused', label: 'Paused', count: pausedCount },
                            { key: 'stopped', label: 'Stopped', count: stoppedCount },
                        ].map(({ key, label: l, count }) => (
                            <button
                                key={key}
                                type="button"
                                onClick={() => setFilterStatus(key as any)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 ${filterStatus === key
                                    ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm shadow-emerald-500/20'
                                    : isDark ? 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                                }`}
                            >
                                <span>{l}</span>
                                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${filterStatus === key ? 'bg-white/20 text-white' : isDark ? 'bg-slate-800 text-slate-500' : 'bg-slate-100 text-slate-500'}`}>
                                    {count}
                                </span>
                            </button>
                        ))}
                    </div>

                    {/* Filters row */}
                    <div className="flex flex-col sm:flex-row gap-2">
                        <div className={`flex items-center gap-2 flex-1 px-3 py-2.5 rounded-xl border ${inputCls}`}>
                            <FiSearch size={14} className={muted} />
                            <input
                                value={searchQ}
                                onChange={e => setSearchQ(e.target.value)}
                                placeholder="Search tasks…"
                                className="flex-1 bg-transparent text-sm outline-none"
                            />
                        </div>
                        <select
                            value={filterCat}
                            onChange={e => setFilterCat(e.target.value)}
                            className={`px-3 py-2.5 rounded-xl border text-sm outline-none ${inputCls}`}
                        >
                            <option value="">All Categories</option>
                            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <select
                            value={filterFreq}
                            onChange={e => setFilterFreq(e.target.value)}
                            className={`px-3 py-2.5 rounded-xl border text-sm outline-none ${inputCls}`}
                        >
                            <option value="">All Frequencies</option>
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                            <option value="one_time">One-Time</option>
                            <option value="custom">Custom</option>
                        </select>
                    </div>

                    {loading && (
                        <div className={`flex items-center justify-center py-16 ${muted}`}>
                            <div className="w-8 h-8 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                        </div>
                    )}

                    {!loading && filteredAll.length === 0 && (
                        <div className={`rounded-2xl border p-10 text-center ${card}`}>
                            <FiFilter size={28} className={`mx-auto mb-3 ${muted}`} />
                            <p className={`font-semibold ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                                {allTasks.length === 0 ? 'No tasks yet' : 'No tasks match your filters'}
                            </p>
                            {allTasks.length === 0 && (
                                <button
                                    type="button"
                                    onClick={openAdd}
                                    className="mt-4 px-4 py-2 rounded-xl bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600 transition-all"
                                >
                                    + Create your first task
                                </button>
                            )}
                        </div>
                    )}

                    {!loading && filteredAll.length > 0 && (
                        <div className="space-y-2">
                            {filteredAll.map(task => (
                                <TaskCard
                                    key={task.id}
                                    task={task}
                                    isDark={isDark}
                                    onToggle={handleToggle}
                                    onEdit={openEdit}
                                    onDelete={handleDelete}
                                    onPause={handlePause}
                                    onResume={handleResume}
                                    onStop={handleStop}
                                    onScheduleToday={handleScheduleToday}
                                    showControls
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════ */}
            {/* LONG-TERM GOALS TAB */}
            {/* ══════════════════════════════════════════════════════════════════ */}
            {activeTab === 'goals' && (() => {
                const allGoals = allTasks.filter(t => t.frequency_type === 'one_time');
                const openGoals = allGoals.filter(g => !g.completed_today);
                const completedGoals = allGoals.filter(g => g.completed_today);
                const scheduledTodayGoals = allGoals.filter(g => g.due_date === todayStr && !g.completed_today);

                const filteredGoals = allGoals.filter(g => {
                    if (goalsFilter === 'open' && g.completed_today) return false;
                    if (goalsFilter === 'completed' && !g.completed_today) return false;
                    if (goalsFilter === 'scheduled' && g.due_date !== todayStr) return false;

                    const q = goalsSearchQ.toLowerCase();
                    const matchQ = !q || g.title.toLowerCase().includes(q) || (g.description || '').toLowerCase().includes(q);
                    const matchCat = !goalsCat || g.category === goalsCat;
                    return matchQ && matchCat;
                });

                return (
                    <div className="space-y-6">
                        {/* ── Header Banner ── */}
                        <div className={`rounded-2xl border p-5 ${card} flex flex-col sm:flex-row sm:items-center justify-between gap-4`}>
                            <div>
                                <h2 className="text-lg font-bold tracking-tight">
                                    Long-Term Goals & Milestones
                                </h2>
                                <p className={`text-xs mt-1 ${muted}`}>
                                    Store projects, bucket-list items, and personal milestones safely without cluttering your daily routines.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={openAddGoal}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold transition-all shadow-md shadow-emerald-500/25 w-fit"
                            >
                                <FiPlus size={15} /> Add Long-Term Goal
                            </button>
                        </div>

                        {/* ── Stats Overview ── */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div className={`rounded-2xl border p-4 ${card}`}>
                                <div className="flex items-center gap-1.5 mb-1 text-indigo-400">
                                    <FiActivity size={14} />
                                    <span className="text-[10px] font-bold uppercase tracking-wider">Total Goals</span>
                                </div>
                                <p className="text-2xl font-bold">{allGoals.length}</p>
                                <p className={`text-[10px] mt-0.5 truncate ${muted}`}>Projects & Milestones</p>
                            </div>

                            <div className={`rounded-2xl border p-4 ${card}`}>
                                <div className="flex items-center gap-1.5 mb-1 text-emerald-400">
                                    <FiAward size={14} />
                                    <span className="text-[10px] font-bold uppercase tracking-wider">Completed</span>
                                </div>
                                <p className="text-2xl font-bold">{completedGoals.length}</p>
                                <p className={`text-[10px] mt-0.5 truncate ${muted}`}>
                                    {allGoals.length > 0 ? `${Math.round((completedGoals.length / allGoals.length) * 100)}% accomplished` : '0%'}
                                </p>
                            </div>

                            <div className={`rounded-2xl border p-4 ${card}`}>
                                <div className="flex items-center gap-1.5 mb-1 text-amber-400">
                                    <FiClock size={14} />
                                    <span className="text-[10px] font-bold uppercase tracking-wider">In Progress</span>
                                </div>
                                <p className="text-2xl font-bold">{openGoals.length}</p>
                                <p className={`text-[10px] mt-0.5 truncate ${muted}`}>Active aspirations</p>
                            </div>

                            <div className={`rounded-2xl border p-4 ${card}`}>
                                <div className="flex items-center gap-1.5 mb-1 text-teal-400">
                                    <FiZap size={14} />
                                    <span className="text-[10px] font-bold uppercase tracking-wider">Do Today</span>
                                </div>
                                <p className="text-2xl font-bold">{scheduledTodayGoals.length}</p>
                                <p className={`text-[10px] mt-0.5 truncate ${muted}`}>In Today's Focus</p>
                            </div>
                        </div>

                        {/* ── Filter Pills & Search ── */}
                        <div className="space-y-3">
                            <div className="flex flex-wrap gap-1.5 pb-1">
                                {[
                                    { key: 'all', label: 'All Goals', count: allGoals.length },
                                    { key: 'open', label: 'In Progress', count: openGoals.length },
                                    { key: 'completed', label: 'Completed', count: completedGoals.length },
                                    { key: 'scheduled', label: "In Today's Focus", count: scheduledTodayGoals.length },
                                ].map(({ key, label: l, count }) => (
                                    <button
                                        key={key}
                                        type="button"
                                        onClick={() => setGoalsFilter(key as any)}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 ${goalsFilter === key
                                            ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm shadow-emerald-500/20'
                                            : isDark ? 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                                        }`}
                                    >
                                        <span>{l}</span>
                                        <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${goalsFilter === key ? 'bg-white/20 text-white' : isDark ? 'bg-slate-800 text-slate-500' : 'bg-slate-100 text-slate-500'}`}>
                                            {count}
                                        </span>
                                    </button>
                                ))}
                            </div>

                            <div className="flex flex-col sm:flex-row gap-2">
                                <div className={`flex items-center gap-2 flex-1 px-3 py-2.5 rounded-xl border ${inputCls}`}>
                                    <FiSearch size={14} className={muted} />
                                    <input
                                        value={goalsSearchQ}
                                        onChange={e => setGoalsSearchQ(e.target.value)}
                                        placeholder="Search long-term goals…"
                                        className="flex-1 bg-transparent text-sm outline-none"
                                    />
                                </div>
                                <select
                                    value={goalsCat}
                                    onChange={e => setGoalsCat(e.target.value)}
                                    className={`px-3 py-2.5 rounded-xl border text-sm outline-none ${inputCls}`}
                                >
                                    <option value="">All Categories</option>
                                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* ── Goals Cards List ── */}
                        {loading && (
                            <div className={`flex items-center justify-center py-16 ${muted}`}>
                                <div className="w-8 h-8 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                            </div>
                        )}

                        {!loading && filteredGoals.length === 0 && (
                            <div className={`rounded-2xl border p-10 text-center ${card}`}>
                                <FiAward size={36} className="mx-auto mb-3 text-indigo-400 opacity-80" />
                                <p className={`font-semibold ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                                    {allGoals.length === 0 ? 'No long-term goals yet' : 'No goals match your filters'}
                                </p>
                                <p className={`text-xs mt-1 ${muted}`}>
                                    {allGoals.length === 0
                                        ? 'Set target dates or open-ended goals you want to accomplish over time.'
                                        : 'Try clearing your filters or search keywords.'
                                    }
                                </p>
                                {allGoals.length === 0 && (
                                    <button
                                        type="button"
                                        onClick={openAddGoal}
                                        className="mt-4 px-4 py-2 rounded-xl bg-emerald-500 text-white text-xs font-semibold hover:bg-emerald-600 transition-all"
                                    >
                                        + Create your first long-term goal
                                    </button>
                                )}
                            </div>
                        )}

                        {!loading && filteredGoals.length > 0 && (
                            <div className="space-y-2">
                                {filteredGoals.map(goal => (
                                    <TaskCard
                                        key={goal.id}
                                        task={goal}
                                        isDark={isDark}
                                        onToggle={handleToggle}
                                        onEdit={openEdit}
                                        onDelete={handleDelete}
                                        onScheduleToday={handleScheduleToday}
                                        showControls
                                        hideTypeBadge
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                );
            })()}

            {/* ══════════════════════════════════════════════════════════════════ */}
            {/* PERFORMANCE TAB (TASK-BASED HEATMAP & STREAK) */}
            {/* ══════════════════════════════════════════════════════════════════ */}
            {activeTab === 'performance' && (
                <div className="space-y-6">
                    {/* ── Task Selector Box ── */}
                    <div className={`rounded-2xl border p-5 ${card}`}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <label className={`text-xs font-bold uppercase tracking-wider block mb-1 ${muted}`}>
                                    Selected Habit / Task
                                </label>
                                <p className={`text-xs ${muted}`}>
                                    Select any task below to view its specific streak records and habit heatmap.
                                </p>
                            </div>
                            <select
                                value={streakTaskId}
                                onChange={e => handleSelectStreakTask(e.target.value)}
                                className={`px-3 py-2.5 rounded-xl border text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500/40 min-w-[240px] ${inputCls}`}
                            >
                                <option value="all">All Repeating Habits Combined</option>
                                {repeatingTasks.map(t => (
                                    <option key={t.id} value={t.id}>
                                        {t.title} ({t.frequency_type === 'custom' ? `every ${t.frequency_x_times || 2}d` : t.frequency_type?.replace('_', ' ')})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {selectedTask && (
                            <div className="mt-4 pt-4 border-t border-inherit flex items-center gap-3 flex-wrap">
                                <div
                                    className="w-3.5 h-3.5 rounded-full flex-shrink-0 shadow-sm"
                                    style={{ backgroundColor: selectedTask.color || '#10b981' }}
                                />
                                <span className={`text-sm font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                                    {selectedTask.title}
                                </span>
                                <span
                                    style={{ backgroundColor: (selectedTask.color || '#10b981') + '22', color: selectedTask.color || '#10b981' }}
                                    className="px-2 py-0.5 rounded-md text-[10px] font-bold"
                                >
                                    {selectedTask.category}
                                </span>
                                <span className={`text-xs ${muted}`}>
                                    · Repeats: {selectedTask.frequency_type === 'custom'
                                        ? `Every ${selectedTask.frequency_x_times || 2} days`
                                        : selectedTask.frequency_type?.replace('_', ' ')}
                                </span>
                                {selectedTask.end_date && (
                                    <span className="flex items-center gap-1 text-xs text-amber-400">
                                        <FiCalendar size={12} /> Repeat until {selectedTask.end_date}
                                    </span>
                                )}
                                {!selectedTask.is_active ? (
                                    <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-slate-500/10 text-slate-400 border border-slate-500/20">
                                        Ended
                                    </span>
                                ) : selectedTask.is_paused ? (
                                    <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                        Paused
                                    </span>
                                ) : (
                                    <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                        Active
                                    </span>
                                )}
                            </div>
                        )}
                    </div>

                    {/* ── Stat Cards for Selected Task ── */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className={`rounded-2xl border p-4 ${card}`}>
                            <div className="flex items-center gap-1.5 mb-1 text-amber-400">
                                <FiZap size={14} />
                                <span className="text-[10px] font-bold uppercase tracking-wider">Current Streak</span>
                            </div>
                            <p className="text-2xl font-bold">{streaks.current}d</p>
                            <p className={`text-[10px] mt-0.5 truncate ${muted}`}>
                                {selectedTask ? 'Consecutive days' : 'Any task'}
                            </p>
                        </div>

                        <div className={`rounded-2xl border p-4 ${card}`}>
                            <div className="flex items-center gap-1.5 mb-1 text-emerald-400">
                                <FiAward size={14} />
                                <span className="text-[10px] font-bold uppercase tracking-wider">Best Streak</span>
                            </div>
                            <p className="text-2xl font-bold">{streaks.best}d</p>
                            <p className={`text-[10px] mt-0.5 truncate ${muted}`}>
                                All-time record
                            </p>
                        </div>

                        <div className={`rounded-2xl border p-4 ${card}`}>
                            <div className="flex items-center gap-1.5 mb-1 text-indigo-400">
                                <FiActivity size={14} />
                                <span className="text-[10px] font-bold uppercase tracking-wider">
                                    {selectedTask ? 'Total Completed' : 'Total Tasks'}
                                </span>
                            </div>
                            <p className="text-2xl font-bold">
                                {selectedTask ? selectedTaskTotalCompletions : allTasks.length}
                            </p>
                            <p className={`text-[10px] mt-0.5 truncate ${muted}`}>
                                {selectedTask ? 'Days logged' : 'Configured'}
                            </p>
                        </div>

                        <div className={`rounded-2xl border p-4 ${card}`}>
                            <div className="flex items-center gap-1.5 mb-1 text-teal-400">
                                <FiTrendingUp size={14} />
                                <span className="text-[10px] font-bold uppercase tracking-wider">Done Today</span>
                            </div>
                            <p className="text-2xl font-bold">
                                {selectedTask
                                    ? (activeHeatmapCounts[todayStr] ? '1/1' : '0/1')
                                    : `${todayCompleted}/${todayTotal}`
                                }
                            </p>
                            <p className={`text-[10px] mt-0.5 truncate ${muted}`}>
                                {selectedTask
                                    ? (activeHeatmapCounts[todayStr] ? 'Completed today' : 'Pending today')
                                    : 'All today tasks'
                                }
                            </p>
                        </div>
                    </div>

                    {/* ── Weekly Activity 7-Day Chart (Current Week & Navigation) ── */}
                    <div className={`rounded-2xl border p-5 ${card}`}>
                        <WeeklyActivityChart
                            counts={activeHeatmapCounts}
                            isDark={isDark}
                            color={selectedTask?.color || '#10b981'}
                            todayStr={todayStr}
                            onDayClick={handleDayClickFromHeatmap}
                        />
                    </div>

                    {/* ── Dynamic Heatmap Card (Month Calendar vs 12-Month Grid) ── */}
                    <div className={`rounded-2xl border p-5 ${card}`}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                            <div>
                                <h3 className="font-bold text-sm sm:text-base flex items-center gap-2">
                                    <FiActivity size={16} className="text-emerald-400" />
                                    {selectedTask
                                        ? `"${selectedTask.title}" · Habit Heatmap`
                                        : 'All Tasks Combined · Habit Heatmap'
                                    }
                                </h3>
                                <p className={`text-xs mt-0.5 ${muted}`}>
                                    {heatmapViewMode === 'month'
                                        ? 'Calendar view with day-by-day consistency and task completion badges.'
                                        : 'Full 12-month bird’s-eye contribution history.'
                                    }
                                </p>
                            </div>

                            {/* View Switcher: Month View vs 12 Months (Year) */}
                            <div className="flex items-center gap-2 flex-wrap">
                                <div className={`flex gap-1 p-1 rounded-xl border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'}`}>
                                    <button
                                        type="button"
                                        onClick={() => setHeatmapViewMode('month')}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                                            heatmapViewMode === 'month'
                                                ? 'bg-emerald-500 text-white shadow-sm font-bold'
                                                : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
                                        }`}
                                    >
                                        <FiCalendar size={13} />
                                        <span>Month View</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setHeatmapViewMode('year')}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                                            heatmapViewMode === 'year'
                                                ? 'bg-emerald-500 text-white shadow-sm font-bold'
                                                : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
                                        }`}
                                    >
                                        <FiBarChart2 size={13} />
                                        <span>12 Months (Year)</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {loading && <div className={`text-sm py-8 text-center ${muted}`}>Loading habit history…</div>}

                        {!loading && heatmapData && heatmapViewMode === 'month' && (
                            <MonthHeatmap
                                counts={activeHeatmapCounts}
                                isDark={isDark}
                                customColor={selectedTask?.color || undefined}
                                year={heatmapYear}
                                month={heatmapMonth}
                                todayStr={todayStr}
                                onPrevMonth={handlePrevHeatmapMonth}
                                onNextMonth={handleNextHeatmapMonth}
                                onGoToCurrentMonth={handleGoToCurrentHeatmapMonth}
                                canGoNext={!(heatmapYear === new Date().getFullYear() && heatmapMonth >= new Date().getMonth())}
                                onDayClick={handleDayClickFromHeatmap}
                            />
                        )}

                        {!loading && heatmapData && heatmapViewMode === 'year' && (
                            <ContributionHeatmap
                                counts={activeHeatmapCounts}
                                isDark={isDark}
                                customColor={selectedTask?.color || undefined}
                            />
                        )}

                        {!loading && !heatmapData && (
                            <div className={`text-sm ${muted}`}>No completion data yet. Check off some tasks to start your heatmap!</div>
                        )}
                    </div>

                    {/* Category breakdown */}
                    {allTasks.length > 0 && (
                        <div className={`rounded-2xl border p-5 ${card}`}>
                            <h3 className="font-bold text-sm mb-4">Task Category Breakdown</h3>
                            <div className="space-y-2">
                                {CATEGORIES.map(cat => {
                                    const count = allTasks.filter(t => t.category === cat).length;
                                    if (count === 0) return null;
                                    const pct = Math.round((count / allTasks.length) * 100);
                                    return (
                                        <div key={cat} className="flex items-center gap-3">
                                            <span className={`w-20 text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{cat}</span>
                                            <div className={`flex-1 h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
                                                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                                            </div>
                                            <span className={`text-xs w-8 text-right ${muted}`}>{count}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ── Modal ── */}
            {showModal && (
                <AddEditTaskModal
                    isDark={isDark}
                    task={editingTask}
                    defaultFrequency={modalDefaultFreq}
                    onClose={() => { setShowModal(false); setEditingTask(undefined); }}
                    onSave={handleSaveTask}
                />
            )}
        </div>
    );
}
