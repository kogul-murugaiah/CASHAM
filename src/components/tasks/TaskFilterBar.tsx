import { FiSearch } from 'react-icons/fi';
import { CATEGORIES } from './taskConstants';

export interface TaskFilterBarProps {
    isDark: boolean;
    allCount: number;
    activeCount: number;
    longTermCount: number;
    pausedCount: number;
    stoppedCount: number;
    filterStatus: 'all' | 'active' | 'long_term' | 'paused' | 'stopped';
    onStatusChange: (status: 'all' | 'active' | 'long_term' | 'paused' | 'stopped') => void;
    searchQ: string;
    onSearchChange: (q: string) => void;
    filterCat: string;
    onCatChange: (cat: string) => void;
    filterFreq: string;
    onFreqChange: (freq: string) => void;
}

export function TaskFilterBar({
    isDark,
    allCount,
    activeCount,
    longTermCount,
    pausedCount,
    stoppedCount,
    filterStatus,
    onStatusChange,
    searchQ,
    onSearchChange,
    filterCat,
    onCatChange,
    filterFreq,
    onFreqChange,
}: TaskFilterBarProps) {
    const inputCls = isDark
        ? 'bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-500'
        : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400';
    const muted = isDark ? 'text-slate-500' : 'text-slate-400';

    return (
        <div className="space-y-4">
            {/* Status Pill Tabs */}
            <div className="flex flex-wrap gap-1.5 pb-1">
                {[
                    { key: 'all', label: 'All Tasks', count: allCount },
                    { key: 'active', label: 'Active Routines', count: activeCount },
                    { key: 'long_term', label: 'Long-Term Goals', count: longTermCount },
                    { key: 'paused', label: 'Paused', count: pausedCount },
                    { key: 'stopped', label: 'Stopped', count: stoppedCount },
                ].map(({ key, label: l, count }) => (
                    <button
                        key={key}
                        type="button"
                        onClick={() => onStatusChange(key as 'all' | 'active' | 'long_term' | 'paused' | 'stopped')}
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
                        onChange={e => onSearchChange(e.target.value)}
                        placeholder="Search tasks…"
                        className="flex-1 bg-transparent text-sm outline-none"
                    />
                </div>
                <select
                    value={filterCat}
                    onChange={e => onCatChange(e.target.value)}
                    className={`px-3 py-2.5 rounded-xl border text-sm outline-none ${inputCls}`}
                >
                    <option value="">All Categories</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select
                    value={filterFreq}
                    onChange={e => onFreqChange(e.target.value)}
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
        </div>
    );
}

export default TaskFilterBar;
