import { type Task } from '../../hooks/useTasks';
import { PRIORITY_COLORS } from './taskConstants';
import {
    FiCheckCircle, FiCircle, FiPlay, FiPause, FiStopCircle,
    FiEdit2, FiTrash2, FiClock, FiRepeat, FiCalendar
} from 'react-icons/fi';

export interface TaskCardProps {
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

export function TaskCard({
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

export default TaskCard;
