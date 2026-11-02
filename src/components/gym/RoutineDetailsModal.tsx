import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import {
    FiX, FiPlay, FiCalendar, FiClock, FiEdit3
} from 'react-icons/fi';

interface RoutineExercise {
    id: string;
    exercise_id: string;
    exercise_name: string;
    target_muscle: string;
    equipment?: string;
    target_sets: number;
    target_reps: string;
    rest_seconds: number;
    order_index: number;
}

interface Routine {
    id: string;
    name: string;
    split_type: string;
    target_muscle: string;
    day_of_week?: number;
    description?: string;
    is_preset?: boolean;
    exercises?: RoutineExercise[];
    gym_routine_exercises?: any[];
}

interface RoutineDetailsModalProps {
    routine: Routine;
    onClose: () => void;
    onStartLive: (routine: Routine) => void;
    onQuickLog: (routine: Routine) => void;
    onEdit: (routine: Routine) => void;
}

export const RoutineDetailsModal: React.FC<RoutineDetailsModalProps> = ({
    routine,
    onClose,
    onStartLive,
    onQuickLog,
    onEdit,
}) => {
    const [fullRoutine, setFullRoutine] = useState<Routine>(routine);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let isMounted = true;
        const fetchExercises = async () => {
            if (routine.exercises && routine.exercises.length > 0) return;
            try {
                setLoading(true);
                const data = await api.get<any>(`/api/gym/routines?id=${routine.id}`);
                if (isMounted && data) {
                    const rawList = data.gym_routine_exercises || data.exercises || [];
                    setFullRoutine({
                        ...routine,
                        ...data,
                        exercises: rawList.map((rx: any) => ({
                            id: rx.id,
                            exercise_id: rx.exercise_id,
                            exercise_name: rx.exercise_name || rx.gym_exercises?.name || 'Exercise',
                            target_muscle: rx.target_muscle || rx.gym_exercises?.target_muscle || 'chest',
                            equipment: rx.gym_exercises?.equipment,
                            target_sets: rx.target_sets || 3,
                            target_reps: rx.target_reps || '8-12',
                            rest_seconds: rx.rest_seconds || 90,
                            order_index: rx.order_index || 0,
                        })),
                    });
                }
            } catch {
                // keep fallback
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchExercises();
        return () => {
            isMounted = false;
        };
    }, [routine]);

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayLabel = fullRoutine.day_of_week !== undefined && fullRoutine.day_of_week !== null
        ? dayNames[fullRoutine.day_of_week]
        : null;

    const exercises = fullRoutine.exercises || [];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
            <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent relative">
                    <div className="absolute right-5 top-5 flex items-center gap-1.5">
                        <button
                            onClick={() => onEdit(fullRoutine)}
                            className="p-2 text-slate-400 hover:text-emerald-500 dark:hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors flex items-center gap-1 text-xs font-bold"
                            title="Edit this Split"
                        >
                            <FiEdit3 size={16} />
                            <span className="hidden sm:inline">Edit Split</span>
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg transition-colors"
                        >
                            <FiX size={20} />
                        </button>
                    </div>

                    <div className="flex items-center gap-2 mb-2">
                        {dayLabel && (
                            <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                                {dayLabel}
                            </span>
                        )}
                        <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {fullRoutine.target_muscle?.replace(/_/g, ' ') || 'SPLIT'}
                        </span>
                        {fullRoutine.is_preset ? (
                            <span className="text-[10px] font-semibold text-slate-400">
                                Bro Split Preset
                            </span>
                        ) : (
                            <span className="text-[10px] font-semibold text-emerald-400">
                                Custom Split
                            </span>
                        )}
                    </div>

                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                        {fullRoutine.name}
                    </h2>
                    {fullRoutine.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md">
                            {fullRoutine.description}
                        </p>
                    )}
                </div>

                {/* Exercises List */}
                <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
                        <span>Curated Movements ({exercises.length})</span>
                        <span>Targets & Rest</span>
                    </div>

                    {loading ? (
                        <div className="py-12 flex flex-col items-center justify-center gap-3">
                            <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                            <p className="text-xs text-slate-400">Loading routine movements...</p>
                        </div>
                    ) : exercises.length === 0 ? (
                        <div className="py-10 text-center text-slate-400 text-xs">
                            No exercises configured in this routine yet.
                        </div>
                    ) : (
                        exercises.map((rx, idx) => (
                            <div
                                key={rx.id || idx}
                                className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 flex items-center justify-between hover:border-emerald-500/30 transition-all group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center text-xs font-bold shrink-0">
                                        {idx + 1}
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-emerald-500 dark:group-hover:text-emerald-400 transition-colors">
                                            {rx.exercise_name}
                                        </h4>
                                        <p className="text-[11px] text-slate-400 capitalize">
                                            {rx.target_muscle} {rx.equipment ? `• ${rx.equipment}` : ''}
                                        </p>
                                    </div>
                                </div>

                                <div className="text-right">
                                    <p className="text-xs font-bold text-slate-900 dark:text-white">
                                        {rx.target_sets} sets × {rx.target_reps}
                                    </p>
                                    <p className="text-[10px] text-slate-400 flex items-center justify-end gap-1">
                                        <FiClock size={10} /> {rx.rest_seconds}s rest
                                    </p>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer Action Buttons */}
                <div className="p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button
                            onClick={() => onEdit(fullRoutine)}
                            className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:border-emerald-500/50 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                        >
                            <FiEdit3 size={14} /> Edit Split
                        </button>
                        <button
                            onClick={() => onQuickLog(fullRoutine)}
                            className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                        >
                            <FiCalendar size={14} /> Log Past
                        </button>
                    </div>

                    <button
                        onClick={() => onStartLive(fullRoutine)}
                        className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all"
                    >
                        <FiPlay size={15} /> Start Live Workout
                    </button>
                </div>
            </div>
        </div>
    );
};
