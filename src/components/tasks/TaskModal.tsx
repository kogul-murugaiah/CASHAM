import { useState } from 'react';
import { type Task, type NewTaskPayload, getLocalDateStr } from '../../hooks/useTasks';
import {
    CATEGORIES,
    COLORS,
    TIME_BLOCKS,
    type FrequencyType,
    type TimeBlock,
} from './taskConstants';
import { FiX, FiSave } from 'react-icons/fi';

export interface ModalProps {
    isDark: boolean;
    task?: Task;
    defaultFrequency?: FrequencyType;
    onClose: () => void;
    onSave: (payload: NewTaskPayload) => Promise<void>;
}

export function AddEditTaskModal({ isDark, task, defaultFrequency, onClose, onSave }: ModalProps) {
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
                        <div className="mt-1.5 grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {(['daily', 'weekly', 'monthly', 'custom', 'one_time'] as FrequencyType[]).map(f => (
                                <button
                                    type="button"
                                    key={f}
                                    onClick={() => setFrequencyType(f)}
                                    className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all capitalize ${frequencyType === f
                                        ? 'bg-emerald-500 text-white border-emerald-500'
                                        : isDark ? 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500' : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                                        }`}
                                >
                                    {f === 'one_time' ? 'One-Time Goal' : f === 'custom' ? 'Custom Gap' : f}
                                </button>
                            ))}
                        </div>

                        {/* Weekly Day Selector */}
                        {frequencyType === 'weekly' && (
                            <div className="mt-3">
                                <label className={`text-xs ${label}`}>Repeat on days:</label>
                                <div className="mt-1.5 flex gap-1.5">
                                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                                        <button
                                            type="button"
                                            key={i}
                                            onClick={() => toggleDay(i)}
                                            className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all ${freqDays.includes(i)
                                                ? 'bg-emerald-500 text-white border-emerald-500'
                                                : isDark ? 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500' : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                                                }`}
                                        >
                                            {d}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Monthly Date Selector */}
                        {frequencyType === 'monthly' && (
                            <div className="mt-3">
                                <label className={`text-xs ${label}`}>Day of month:</label>
                                <input
                                    type="number"
                                    min={1}
                                    max={31}
                                    value={freqMonthlyDate}
                                    onChange={e => setFreqMonthlyDate(parseInt(e.target.value) || 1)}
                                    className={`mt-1.5 w-24 px-3 py-2 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-emerald-500/40 ${input}`}
                                />
                            </div>
                        )}

                        {/* Custom Interval (Every X days) */}
                        {frequencyType === 'custom' && (
                            <div className="mt-3 space-y-3">
                                <div>
                                    <label className={`text-xs ${label}`}>Repeat Every (Days):</label>
                                    <div className="flex items-center gap-2 mt-1.5">
                                        <input
                                            type="number"
                                            min={2}
                                            max={365}
                                            value={freqXTimes}
                                            onChange={e => setFreqXTimes(Math.max(2, parseInt(e.target.value) || 2))}
                                            className={`w-24 px-3 py-2 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-emerald-500/40 ${input}`}
                                        />
                                        <span className={`text-xs ${label}`}>days (e.g. 2 for alternate days)</span>
                                    </div>
                                </div>
                                <div>
                                    <label className={`text-xs ${label}`}>First Scheduled Date (Anchor):</label>
                                    <input
                                        type="date"
                                        value={customStartDate}
                                        onChange={e => setCustomStartDate(e.target.value)}
                                        className={`mt-1.5 w-full px-3 py-2 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-emerald-500/40 ${input}`}
                                    />
                                    <p className={`text-[11px] mt-1 ${label}`}>
                                        The interval is calculated from this date forward.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* One-Time Due Date & Carry Forward Option */}
                        {frequencyType === 'one_time' && (
                            <div className="mt-3 space-y-3">
                                <div>
                                    <label className={`text-xs ${label}`}>Target Due Date (Optional):</label>
                                    <input
                                        type="date"
                                        value={dueDate}
                                        onChange={e => setDueDate(e.target.value)}
                                        className={`mt-1.5 w-full px-3 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-emerald-500/40 ${input}`}
                                    />
                                    <p className={`text-[11px] mt-1 ${label}`}>
                                        Leave blank if this is a long-term goal with no strict deadline.
                                    </p>
                                </div>

                                <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-900/60 border-slate-700/60' : 'bg-slate-50 border-slate-200'}`}>
                                    <label className="flex items-center gap-2.5 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={carryForward}
                                            onChange={e => setCarryForward(e.target.checked)}
                                            className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500/30"
                                        />
                                        <div>
                                            <span className="text-xs font-semibold block">Carry Forward If Uncompleted</span>
                                            <span className={`text-[11px] block ${label}`}>
                                                Automatically moves this task to Today's Focus if it is overdue.
                                            </span>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        )}

                        {/* Recurrence End Date (Optional for Repeating Tasks) */}
                        {frequencyType !== 'one_time' && (
                            <div className="mt-3">
                                <label className={`text-xs ${label}`}>Stop Recurrence Date (Optional):</label>
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
                                onChange={e => setPriority(e.target.value as 'low' | 'medium' | 'high')}
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

export default AddEditTaskModal;
