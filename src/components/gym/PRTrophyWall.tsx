import { useState, useMemo } from 'react';
import { FiAward, FiTrendingUp } from 'react-icons/fi';

export interface PREntry {
    exercise_id: string;
    exercise_name: string;
    target_muscle: string;
    equipment: string;
    max_weight_kg: number;
    reps: number;
    date_achieved: string;
    workout_name?: string;
}

interface PRTrophyWallProps {
    prs: PREntry[];
    onExerciseClick?: (pr: PREntry) => void;
}

const MUSCLE_FILTERS = [
    { id: 'all', label: 'All Muscles' },
    { id: 'chest', label: 'Chest' },
    { id: 'back', label: 'Back' },
    { id: 'shoulders', label: 'Shoulders' },
    { id: 'biceps', label: 'Biceps' },
    { id: 'triceps', label: 'Triceps' },
    { id: 'legs', label: 'Legs' },
    { id: 'core', label: 'Core' },
];

export const PRTrophyWall: React.FC<PRTrophyWallProps> = ({ prs, onExerciseClick }) => {
    const [selectedMuscle, setSelectedMuscle] = useState<string>('all');

    const filteredPRs = useMemo(() => {
        if (selectedMuscle === 'all') return prs;
        return prs.filter(p => p.target_muscle?.toLowerCase() === selectedMuscle);
    }, [prs, selectedMuscle]);

    return (
        <div className="glass-card p-5 sm:p-6 border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 shadow-sm rounded-2xl">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                <div className="flex items-center gap-2.5">
                    <span className="p-2 bg-amber-500/10 text-amber-500 rounded-xl border border-amber-500/20">
                        <FiAward size={20} />
                    </span>
                    <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white font-heading">
                            Personal Records (PR) Wall
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Your heaviest working lifts in KG
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full text-xs font-bold text-amber-700 dark:text-amber-300 self-start sm:self-auto font-mono">
                    🏆 {prs.length} Total Records
                </div>
            </div>

            {/* Filter Pills */}
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-3 mb-4">
                {MUSCLE_FILTERS.map(f => (
                    <button
                        key={f.id}
                        type="button"
                        onClick={() => setSelectedMuscle(f.id)}
                        className={`px-3 py-1 text-xs rounded-full font-bold whitespace-nowrap transition-all ${
                            selectedMuscle === f.id
                                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25'
                                : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {/* Grid of PR Cards */}
            {filteredPRs.length === 0 ? (
                <div className="py-12 text-center border border-dashed border-slate-200 dark:border-white/10 rounded-2xl bg-slate-50/50 dark:bg-slate-800/20">
                    <FiTrendingUp className="mx-auto text-slate-400 mb-2" size={28} />
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        {prs.length === 0 ? 'No Personal Records Yet' : `No records found for ${selectedMuscle}`}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
                        Complete working sets with your heaviest weights to unlock trophy records!
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {filteredPRs.map((pr) => (
                        <div
                            key={pr.exercise_id}
                            onClick={() => onExerciseClick?.(pr)}
                            className="p-4 rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-slate-700/30 hover:border-amber-500/30 cursor-pointer transition-all group relative overflow-hidden"
                        >
                            <div className="flex items-start justify-between mb-2">
                                <span className="text-xs uppercase tracking-wider font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                                    {pr.target_muscle}
                                </span>
                                <span className="text-[10px] text-slate-400 font-medium">
                                    {pr.date_achieved}
                                </span>
                            </div>

                            <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate mb-2">
                                {pr.exercise_name}
                            </h4>

                            <div className="flex items-baseline justify-between mt-auto pt-2 border-t border-slate-200/60 dark:border-white/5">
                                <div className="flex items-baseline gap-1">
                                    <span className="text-2xl font-black text-amber-500 dark:text-amber-400 font-mono">
                                        {pr.max_weight_kg}
                                    </span>
                                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 font-mono">
                                        KG
                                    </span>
                                </div>
                                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                                    {pr.reps} {pr.reps === 1 ? 'rep' : 'reps'}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
