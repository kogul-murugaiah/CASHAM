import { useState, useEffect, useMemo, type ElementType } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useTasks, getLocalDateStr, type Task, type NewTaskPayload } from '../hooks/useTasks';
import {
    FiCheckCircle, FiCircle, FiPlus, FiTrash2, FiEdit2,
    FiZap, FiSun, FiMoon, FiCoffee, FiClock,
    FiX, FiSave, FiAward, FiTrendingUp, FiActivity,
    FiSearch, FiFilter, FiPause, FiPlay, FiStopCircle, FiCalendar, FiBarChart2, FiRotateCcw
} from 'react-icons/fi';

// ─── Types ──────────────────────────────────────────────────────────────────────
type Tab = 'today' | 'all' | 'performance';
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
    onClose: () => void;
    onSave: (payload: NewTaskPayload) => Promise<void>;
}

function AddEditTaskModal({ isDark, task, onClose, onSave }: ModalProps) {
    const [title, setTitle] = useState(task?.title || '');
    const [description, setDescription] = useState(task?.description || '');
    const [category, setCategory] = useState(task?.category || 'Personal');
    const [color, setColor] = useState(task?.color || '#10b981');
    const [frequencyType, setFrequencyType] = useState<FrequencyType>(task?.frequency_type || 'daily');
    const [freqDays, setFreqDays] = useState<number[]>(task?.frequency_days || []);
    const [freqMonthlyDate, setFreqMonthlyDate] = useState(task?.frequency_monthly_date || 1);
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
                time_block: timeBlock,
                priority,
                estimated_minutes: estimatedMins ? parseInt(estimatedMins) : undefined,
                due_date: frequencyType === 'one_time' ? (dueDate || undefined) : undefined,
                end_date: frequencyType !== 'one_time' ? (endDate || undefined) : undefined,
                carry_forward: frequencyType === 'one_time' ? carryForward : false,
            });
            onClose();
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className={`relative w-full max-w-lg rounded-2xl border shadow-2xl ${card} max-h-[90vh] overflow-y-auto`}>
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-inherit">
                    <h2 className="font-bold text-lg">{task ? 'Edit Task' : 'New Task'}</h2>
                    <button onClick={onClose} className={`p-1.5 rounded-lg hover:bg-slate-700/30 ${label}`}>
                        <FiX size={18} />
                    </button>
                </div>

                <div className="p-5 space-y-4">
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
                                            ? "📌 Scheduled for a specific date: Appears in your daily focus on that date."
                                            : "🎯 Long-term goal (No date): Stored safely in All Tasks and will NOT clutter your daily focus list."
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
                <div className="flex gap-3 p-5 border-t border-inherit">
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
}

function TaskCard({
    task, isDark, onToggle, onEdit, onDelete,
    onPause, onResume, onStop, onScheduleToday, showControls = false
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

                    {!isRepeating && !task.due_date && (
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
                <div className={`flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0`}>
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

// ─── Heatmap ──────────────────────────────────────────────────────────────────
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

// ─── Day-of-Week Consistency Chart ──────────────────────────────────────────
interface DayOfWeekProps {
    counts: Record<string, number | undefined>;
    isDark: boolean;
    color?: string;
}

function DayOfWeekConsistencyChart({ counts, isDark, color = '#10b981' }: DayOfWeekProps) {
    const { days, bestDay, bestPct } = useMemo(() => {
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const dayCounts = [0, 0, 0, 0, 0, 0, 0];
        const dayTotals = [0, 0, 0, 0, 0, 0, 0];

        const today = getLocalDateStr();
        const dates = buildHeatmapGrid().filter(d => d <= today);

        for (const dateStr of dates) {
            const d = new Date(dateStr);
            const dow = d.getDay();
            dayTotals[dow]++;
            if ((counts[dateStr] || 0) > 0) {
                dayCounts[dow]++;
            }
        }

        let maxPct = -1;
        let bestIdx = -1;

        const result = dayNames.map((name, i) => {
            const completed = dayCounts[i];
            const total = dayTotals[i] || 52;
            const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
            if (pct > maxPct && completed > 0) {
                maxPct = pct;
                bestIdx = i;
            }
            return { name, completed, total, pct };
        });

        return {
            days: result,
            bestDay: bestIdx >= 0 ? dayNames[bestIdx] : null,
            bestPct: maxPct >= 0 ? maxPct : 0,
        };
    }, [counts]);

    const trackBg = isDark ? 'bg-slate-800' : 'bg-slate-100';
    const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                    <h4 className="font-bold text-sm flex items-center gap-2">
                        <FiBarChart2 size={15} className="text-emerald-400" />
                        Day-of-Week Consistency
                    </h4>
                    <p className={`text-xs ${textMuted}`}>
                        Habit completion frequency across each day of the week over the past year.
                    </p>
                </div>
                {bestDay && (
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 w-fit">
                        <span>⭐ Peak Day:</span>
                        <span className="font-bold">{bestDay} ({bestPct}% consistency)</span>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-7 gap-2 sm:gap-4 pt-3">
                {days.map((d) => {
                    const isBest = bestDay === d.name && d.completed > 0;
                    return (
                        <div key={d.name} className="flex flex-col items-center gap-2 group">
                            <span className={`text-[11px] font-bold transition-transform group-hover:scale-110 ${isBest ? 'text-emerald-400 font-extrabold' : textMuted}`}>
                                {d.pct}%
                            </span>

                            <div className={`w-full max-w-[44px] h-28 rounded-xl ${trackBg} p-1 flex flex-col justify-end relative overflow-hidden transition-all group-hover:ring-1 group-hover:ring-emerald-400/40 shadow-inner`}>
                                <div
                                    className="w-full rounded-lg transition-all duration-700 relative"
                                    style={{
                                        height: `${Math.max(d.pct, 4)}%`,
                                        backgroundColor: color,
                                        opacity: d.completed === 0 ? 0.15 : (isBest ? 1 : 0.8),
                                    }}
                                />
                            </div>

                            <div className="text-center">
                                <p className={`text-xs font-bold ${isBest ? (isDark ? 'text-white' : 'text-slate-900') : textMuted}`}>
                                    {d.name}
                                </p>
                                <p className={`text-[10px] ${textMuted}`}>
                                    {d.completed}d
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>
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
    const [searchQ, setSearchQ] = useState('');
    const [filterCat, setFilterCat] = useState('');
    const [filterFreq, setFilterFreq] = useState('');
    const [streakTaskId, setStreakTaskId] = useState<string>('');
    const todayStr = useMemo(() => getLocalDateStr(), []);
    const yesterdayStr = useMemo(() => {
        const y = new Date();
        y.setDate(y.getDate() - 1);
        return getLocalDateStr(y);
    }, []);
    const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'long_term' | 'paused' | 'stopped'>('all');
    const [selectedDate, setSelectedDate] = useState<string>(todayStr);
    const isYesterday = selectedDate === yesterdayStr;

    // Load data per tab
    useEffect(() => {
        if (activeTab === 'today') fetchTodayTasks(selectedDate);
        if (activeTab === 'all') fetchAllTasks();
        if (activeTab === 'performance') {
            fetchHeatmapData();
            fetchAllTasks();
        }
    }, [activeTab, fetchTodayTasks, fetchAllTasks, fetchHeatmapData]);

    // Available tasks list for dropdown
    const availableTasks = useMemo(() => {
        return heatmapData?.tasks && heatmapData.tasks.length > 0
            ? heatmapData.tasks
            : allTasks;
    }, [heatmapData, allTasks]);

    // Automatically default streakTaskId to the first task if not set or invalid
    useEffect(() => {
        if (availableTasks.length > 0) {
            if (!streakTaskId || (streakTaskId !== 'all' && !availableTasks.some(t => t.id === streakTaskId))) {
                setStreakTaskId(availableTasks[0].id);
            }
        }
    }, [availableTasks, streakTaskId]);

    // Selected task object
    const selectedTask = useMemo(() => {
        if (!streakTaskId || streakTaskId === 'all') return null;
        return availableTasks.find(t => t.id === streakTaskId) || null;
    }, [availableTasks, streakTaskId]);

    // Theme classes
    const page = isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800';
    const card = isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200';
    const tabInactive = isDark ? 'text-slate-500 hover:text-slate-300 hover:bg-slate-800' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100';
    const tabActive = 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30';
    const muted = isDark ? 'text-slate-500' : 'text-slate-400';
    const inputCls = isDark
        ? 'bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-500'
        : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400';

    // ─── Today's tasks grouped by time block with Smart Sorting (incomplete high-priority first, completed sink to bottom)
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
            if (activeTab === 'today') fetchTodayTasks();
            if (activeTab === 'performance') fetchHeatmapData();
        } else {
            const created = await addTask(payload);
            if (activeTab === 'today') fetchTodayTasks();
            if (activeTab === 'all') fetchAllTasks();
            if (activeTab === 'performance') {
                fetchHeatmapData();
                setStreakTaskId(created.id);
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
        if (isYesterday) {
            // Refetch heatmap to immediately show streak updated
            fetchHeatmapData();
        }
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

    const openAdd = () => { setEditingTask(undefined); setShowModal(true); };
    const openEdit = (t: Task) => { setEditingTask(t); setShowModal(true); };

    return (
        <div className={`min-h-screen p-4 md:p-6 lg:p-8 ${page}`}>
            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold font-heading tracking-tight flex items-center gap-2">
                        <span className="text-emerald-400">✓</span> Task Tracker
                    </h1>
                    <p className={`text-sm mt-0.5 ${muted}`}>Build habits. Stay consistent.</p>
                </div>
                <button
                    type="button"
                    onClick={openAdd}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold transition-all shadow-lg shadow-emerald-500/25"
                >
                    <FiPlus size={16} /> Add Task
                </button>
            </div>

            {/* ── Tabs ── */}
            <div className={`flex gap-1 p-1 rounded-xl border mb-6 w-fit ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
                {([
                    { key: 'today', label: "Today's Focus" },
                    { key: 'all', label: 'All Tasks' },
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
                    {/* ── Date Navigator & Backdate (Log for Yesterday) ── */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setSelectedDate(isYesterday ? todayStr : yesterdayStr)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                                    isYesterday
                                        ? "bg-amber-500/15 text-amber-400 border-amber-500/30 shadow-sm"
                                        : isDark ? "bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500" : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                                }`}
                            >
                                <FiRotateCcw size={13} />
                                <span>{isYesterday ? "⏪ Viewing Yesterday" : "⏪ Log for Yesterday"}</span>
                            </button>

                            {isYesterday && (
                                <button
                                    type="button"
                                    onClick={() => setSelectedDate(todayStr)}
                                    className="text-xs text-emerald-400 hover:underline font-semibold"
                                >
                                    Back to Today
                                </button>
                            )}
                        </div>

                        <span className={`text-xs ${muted}`}>
                            Date: <strong className={isDark ? "text-slate-200" : "text-slate-800"}>{selectedDate}</strong>
                        </span>
                    </div>

                    {isYesterday && (
                        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-400 text-xs flex items-center justify-between gap-3 animate-fade-in">
                            <span className="flex items-center gap-2">
                                <FiRotateCcw size={15} className="flex-shrink-0" />
                                <span>
                                    Logging for <strong>Yesterday ({yesterdayStr})</strong>. Tasks checked here count toward yesterday and save your streak!
                                </span>
                            </span>
                            <button
                                type="button"
                                onClick={() => setSelectedDate(todayStr)}
                                className="underline font-bold hover:text-amber-300 flex-shrink-0"
                            >
                                Done
                            </button>
                        </div>
                    )}
                    {/* Progress bar */}
                    {todayTotal > 0 && (
                        <div className={`rounded-2xl border p-4 ${card}`}>
                            <div className="flex items-center justify-between mb-2">
                                <span className={`text-sm font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                    Today's Progress
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
                                    <FiAward size={12} /> All done for today! Great job 🎉
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
                            <div className="text-4xl mb-3">🎯</div>
                            <p className={`font-semibold ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>No tasks for today</p>
                            <p className={`text-sm mt-1 ${muted}`}>Add recurring tasks or tasks due today to start building your streak.</p>
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
                            { key: 'long_term', label: '🎯 Long-Term Goals', count: longTermCount },
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
                                    Select any task below to view its specific streak records and 12-month habit heatmap.
                                </p>
                            </div>
                            <select
                                value={streakTaskId}
                                onChange={e => setStreakTaskId(e.target.value)}
                                className={`px-3 py-2.5 rounded-xl border text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500/40 min-w-[240px] ${inputCls}`}
                            >
                                {availableTasks.map(t => (
                                    <option key={t.id} value={t.id}>
                                        {t.title} ({t.frequency_type?.replace('_', ' ')})
                                    </option>
                                ))}
                                <option value="all">⚡ All Tasks Combined</option>
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
                                    · Repeats: {selectedTask.frequency_type?.replace('_', ' ')}
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

                    {/* ── Day-of-Week Consistency 7-Day Chart ── */}
                    <div className={`rounded-2xl border p-5 ${card}`}>
                        <DayOfWeekConsistencyChart
                            counts={activeHeatmapCounts}
                            isDark={isDark}
                            color={selectedTask?.color || '#10b981'}
                        />
                    </div>

                    {/* ── Heatmap ── */}
                    <div className={`rounded-2xl border p-5 ${card}`}>
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="font-bold text-sm flex items-center gap-2">
                                <FiActivity size={14} className="text-emerald-400" />
                                {selectedTask
                                    ? `"${selectedTask.title}" · Habit Heatmap (Last 12 Months)`
                                    : 'All Tasks Combined · Contribution History'
                                }
                            </h3>
                            {selectedTask && (
                                <span className={`text-xs ${muted}`}>
                                    Color: <span style={{ color: selectedTask.color || '#10b981' }} className="font-bold">●</span>
                                </span>
                            )}
                        </div>
                        <p className={`text-xs mb-4 ${muted}`}>
                            {selectedTask
                                ? 'Each illuminated cell indicates a day you completed this specific habit.'
                                : 'Each colored cell represents your total task completions on that day.'
                            }
                        </p>

                        {loading && <div className={`text-sm ${muted}`}>Loading habit history…</div>}
                        {!loading && heatmapData && (
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
                    onClose={() => { setShowModal(false); setEditingTask(undefined); }}
                    onSave={handleSaveTask}
                />
            )}
        </div>
    );
}
