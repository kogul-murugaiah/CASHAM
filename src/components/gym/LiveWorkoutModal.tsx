import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../lib/api';
import {
    FiClock, FiCheck, FiPlus, FiTrash2,
    FiX, FiMinimize2, FiAward,
    FiPlusCircle, FiCheckCircle
} from 'react-icons/fi';
import { CustomExerciseModal } from './CustomExerciseModal';

interface LiveWorkoutModalProps {
    workoutId: string;
    onClose: () => void;
    onFinished: () => void;
    allExercises: any[];
}

interface SetRow {
    id?: string;
    set_number: number;
    weight_kg: string;
    reps: string;
    is_warmup: boolean;
    is_completed: boolean;
    is_pr?: boolean;
    saving?: boolean;
}

interface ExerciseGroup {
    exercise_id: string;
    exercise_name: string;
    target_muscle: string;
    last_performance?: string;
    sets: SetRow[];
}

export const LiveWorkoutModal: React.FC<LiveWorkoutModalProps> = ({
    workoutId,
    onClose,
    onFinished,
    allExercises,
}) => {
    const [workout, setWorkout] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [exerciseGroups, setExerciseGroups] = useState<ExerciseGroup[]>([]);
    const [finishing, setFinishing] = useState(false);
    const [notes, setNotes] = useState('');
    const [newPRCelebration, setNewPRCelebration] = useState<{ exercise: string; weight: number; diff: number } | null>(null);

    // Stopwatch elapsed time
    const [elapsedSeconds, setElapsedSeconds] = useState(0);

    // Rest Countdown Timer
    const [restRemaining, setRestRemaining] = useState<number>(0);
    const [restRunning, setRestRunning] = useState<boolean>(false);
    const restTargetTimeRef = useRef<number | null>(null);

    // Add Exercise Dropdown in live session
    const [showAddExModal, setShowAddExModal] = useState(false);
    const [searchEx, setSearchEx] = useState('');
    const [showCustomModal, setShowCustomModal] = useState(false);

    // 1. Fetch workout details & sets
    useEffect(() => {
        let isMounted = true;
        const fetchDetails = async () => {
            try {
                setLoading(true);
                const data = await api.get(`/api/gym/workouts?id=${workoutId}`);
                if (!isMounted) return;

                setWorkout(data);
                setNotes(data.notes || '');

                // Calculate initial elapsed time from started_at
                if (data.started_at) {
                    const diffSec = Math.floor((Date.now() - new Date(data.started_at).getTime()) / 1000);
                    setElapsedSeconds(Math.max(0, diffSec));
                }

                // Group sets by exercise
                const groupsMap = new Map<string, ExerciseGroup>();

                if (Array.isArray(data.gym_sets)) {
                    for (const s of data.gym_sets) {
                        const exId = s.exercise_id;
                        if (!groupsMap.has(exId)) {
                            groupsMap.set(exId, {
                                exercise_id: exId,
                                exercise_name: s.gym_exercises?.name || 'Exercise',
                                target_muscle: s.gym_exercises?.target_muscle || 'other',
                                sets: []
                            });
                        }
                        groupsMap.get(exId)!.sets.push({
                            id: s.id,
                            set_number: s.set_number,
                            weight_kg: String(s.weight_kg),
                            reps: String(s.reps),
                            is_warmup: s.is_warmup,
                            is_completed: s.is_completed,
                        });
                    }
                }

                // If groups empty, check if workout has routine exercises
                if (groupsMap.size === 0 && data.gym_routines?.gym_routine_exercises) {
                    for (const re of data.gym_routines.gym_routine_exercises) {
                        const ex = re.gym_exercises;
                        if (!ex) continue;
                        const initialSets: SetRow[] = [];
                        for (let i = 1; i <= (re.target_sets || 3); i++) {
                            initialSets.push({
                                set_number: i,
                                weight_kg: re.target_weight_kg ? String(re.target_weight_kg) : '',
                                reps: re.target_reps ? String(re.target_reps) : '10',
                                is_warmup: false,
                                is_completed: false
                            });
                        }
                        groupsMap.set(ex.id, {
                            exercise_id: ex.id,
                            exercise_name: ex.name,
                            target_muscle: ex.target_muscle,
                            sets: initialSets
                        });
                    }
                }

                setExerciseGroups(Array.from(groupsMap.values()));
            } catch (err) {
                console.error('Error loading live workout:', err);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchDetails();
        return () => { isMounted = false; };
    }, [workoutId]);

    // 2. Stopwatch ticking
    useEffect(() => {
        const interval = setInterval(() => {
            setElapsedSeconds(prev => prev + 1);
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    // 3. Rest countdown interval (re-hydrating from target end time)
    useEffect(() => {
        if (!restRunning || !restTargetTimeRef.current) return;

        const interval = setInterval(() => {
            const remaining = Math.max(0, Math.ceil((restTargetTimeRef.current! - Date.now()) / 1000));
            setRestRemaining(remaining);

            if (remaining <= 0) {
                setRestRunning(false);
                restTargetTimeRef.current = null;
                // Vibrate device if supported
                if (navigator.vibrate) {
                    navigator.vibrate([200, 100, 200]);
                }
            }
        }, 500);

        return () => clearInterval(interval);
    }, [restRunning]);

    // Start rest timer helper
    const startRest = (seconds: number) => {
        const target = Date.now() + seconds * 1000;
        restTargetTimeRef.current = target;
        setRestRemaining(seconds);
        setRestRunning(true);
    };

    const formatTimer = (totalSeconds: number) => {
        const m = Math.floor(totalSeconds / 60);
        const s = totalSeconds % 60;
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    // 4. Set modification handlers
    const updateSet = (groupIndex: number, setIndex: number, field: keyof SetRow, value: any) => {
        setExerciseGroups(prev => {
            const next = [...prev];
            const group = { ...next[groupIndex] };
            const sets = [...group.sets];
            sets[setIndex] = { ...sets[setIndex], [field]: value };
            group.sets = sets;
            next[groupIndex] = group;
            return next;
        });
    };

    // 5. Complete a set & trigger PR evaluation
    const handleToggleComplete = async (groupIndex: number, setIndex: number) => {
        const group = exerciseGroups[groupIndex];
        const targetSet = group.sets[setIndex];
        const nextDone = !targetSet.is_completed;

        updateSet(groupIndex, setIndex, 'is_completed', nextDone);

        // If completing, save to backend and check for PR
        if (nextDone) {
            try {
                updateSet(groupIndex, setIndex, 'saving', true);
                const weight = Number(targetSet.weight_kg) || 0;
                const reps = Number(targetSet.reps) || 0;

                const response = await api.post('/api/gym/sets', {
                    workout_id: workoutId,
                    exercise_id: group.exercise_id,
                    set_number: targetSet.set_number,
                    weight_kg: weight,
                    reps: reps,
                    is_warmup: targetSet.is_warmup,
                    is_completed: true
                });

                updateSet(groupIndex, setIndex, 'id', response.id);

                // If PR detected!
                if (response.is_new_pr) {
                    updateSet(groupIndex, setIndex, 'is_pr', true);
                    setNewPRCelebration({
                        exercise: group.exercise_name,
                        weight,
                        diff: response.pr_improvement_kg
                    });
                    setTimeout(() => setNewPRCelebration(null), 4000);
                }

                // Auto-start default rest timer (90s)
                startRest(90);
            } catch (err) {
                console.error('Error saving set:', err);
            } finally {
                updateSet(groupIndex, setIndex, 'saving', false);
            }
        }
    };

    // 6. Add set to exercise group
    const handleAddSet = (groupIndex: number) => {
        setExerciseGroups(prev => {
            const next = [...prev];
            const group = { ...next[groupIndex] };
            const sets = [...group.sets];
            const lastSet = sets[sets.length - 1];

            sets.push({
                set_number: sets.length + 1,
                weight_kg: lastSet ? lastSet.weight_kg : '',
                reps: lastSet ? lastSet.reps : '10',
                is_warmup: false,
                is_completed: false
            });

            group.sets = sets;
            next[groupIndex] = group;
            return next;
        });
    };

    // 7. Add exercise to workout
    const handleAddExerciseToWorkout = (ex: any) => {
        if (exerciseGroups.some(g => g.exercise_id === ex.id)) {
            setShowAddExModal(false);
            return;
        }

        setExerciseGroups(prev => [
            ...prev,
            {
                exercise_id: ex.id,
                exercise_name: ex.name,
                target_muscle: ex.target_muscle,
                sets: [
                    { set_number: 1, weight_kg: '', reps: '10', is_warmup: false, is_completed: false },
                    { set_number: 2, weight_kg: '', reps: '10', is_warmup: false, is_completed: false },
                    { set_number: 3, weight_kg: '', reps: '10', is_warmup: false, is_completed: false },
                ]
            }
        ]);
        setShowAddExModal(false);
    };

    // Remove exercise group from workout
    const handleRemoveExerciseGroup = async (groupIndex: number) => {
        const group = exerciseGroups[groupIndex];
        if (!confirm(`Remove ${group.exercise_name} from this workout?`)) return;

        for (const set of group.sets) {
            if (set.id) {
                try {
                    await api.delete(`/api/gym/sets?id=${set.id}`);
                } catch {
                    // ignore
                }
            }
        }

        setExerciseGroups(prev => prev.filter((_, idx) => idx !== groupIndex));
    };

    // 8. Finish workout
    const handleFinishWorkout = async () => {
        try {
            setFinishing(true);
            const durationMin = Math.max(1, Math.round(elapsedSeconds / 60));

            await api.patch('/api/gym/workouts', {
                id: workoutId,
                status: 'completed',
                duration_minutes: durationMin,
                notes: notes.trim() || null,
                completed_at: new Date().toISOString()
            });

            onFinished();
        } catch (err) {
            console.error('Error finishing workout:', err);
        } finally {
            setFinishing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-md animate-fade-in">
            {/* Modal Container */}
            <div className="relative w-full max-w-2xl h-[94vh] flex flex-col glass-card border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 shadow-2xl rounded-2xl overflow-hidden">
                
                {/* Top Sticky Bar: Workout Title & Session Stopwatch */}
                <div className="px-4 sm:px-6 py-3.5 border-b border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-slate-800/80 flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white font-heading truncate">
                                {workout?.name || 'Live Workout'}
                            </h2>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            {workout?.gym_routines?.name || 'Free Workout'}
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 rounded-xl font-mono text-xs sm:text-sm font-bold">
                            <FiClock size={14} />
                            <span>{formatTimer(elapsedSeconds)}</span>
                        </div>

                        <button
                            type="button"
                            onClick={onClose}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/10 transition-colors"
                            title="Minimize Session (Keeps Running in Background)"
                        >
                            <FiMinimize2 size={18} />
                        </button>
                    </div>
                </div>

                {/* Sticky Rest Timer Bar (if running or set) */}
                {restRunning && (
                    <div className="px-4 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-600 text-white flex items-center justify-between shadow-md">
                        <div className="flex items-center gap-2">
                            <FiClock className="animate-spin" size={16} />
                            <span className="text-xs font-semibold uppercase tracking-wider">Rest Timer:</span>
                            <span className="text-base font-black font-mono tracking-wider">{formatTimer(restRemaining)}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <button
                                type="button"
                                onClick={() => startRest(restRemaining + 30)}
                                className="px-2 py-0.5 rounded bg-white/20 hover:bg-white/30 text-xs font-bold transition-colors"
                            >
                                +30s
                            </button>
                            <button
                                type="button"
                                onClick={() => { setRestRunning(false); setRestRemaining(0); }}
                                className="px-2 py-0.5 rounded bg-white/20 hover:bg-white/30 text-xs font-bold transition-colors"
                            >
                                Skip
                            </button>
                        </div>
                    </div>
                )}

                {/* PR Banner Toast Celebration */}
                {newPRCelebration && (
                    <div className="mx-4 mt-3 p-3 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs sm:text-sm flex items-center justify-between shadow-lg shadow-amber-500/30 animate-bounce">
                        <div className="flex items-center gap-2">
                            <FiAward size={18} />
                            <span>🏆 NEW PR! {newPRCelebration.exercise}: {newPRCelebration.weight} KG (+{newPRCelebration.diff} kg)</span>
                        </div>
                    </div>
                )}

                {/* Scrollable Exercise Groups */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
                    {loading ? (
                        <div className="py-20 text-center text-slate-400 text-sm animate-pulse">
                            Loading your workout plan...
                        </div>
                    ) : exerciseGroups.length === 0 ? (
                        <div className="py-16 text-center border border-dashed border-slate-200 dark:border-white/10 rounded-2xl">
                            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No exercises added yet</p>
                            <button
                                type="button"
                                onClick={() => setShowAddExModal(true)}
                                className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl shadow-md"
                            >
                                <FiPlus /> Add First Exercise
                            </button>
                        </div>
                    ) : (
                        exerciseGroups.map((group, gIdx) => (
                            <div
                                key={group.exercise_id}
                                className="p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-slate-800/40 space-y-3"
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white font-heading">
                                            {group.exercise_name}
                                        </h3>
                                        <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-600 dark:text-emerald-400">
                                            {group.target_muscle}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => startRest(90)}
                                            className="text-[11px] font-bold text-slate-500 hover:text-emerald-500 dark:text-slate-400 dark:hover:text-emerald-400 transition-colors flex items-center gap-1"
                                        >
                                            <FiClock size={12} /> 90s Rest
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveExerciseGroup(gIdx)}
                                            className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
                                            title="Remove Movement from this workout"
                                        >
                                            <FiTrash2 size={13} />
                                        </button>
                                    </div>
                                </div>

                                {/* Sets Table */}
                                <div className="overflow-x-auto no-scrollbar">
                                    <table className="w-full text-left text-xs">
                                        <thead>
                                            <tr className="text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200/60 dark:border-white/5">
                                                <th className="py-1.5 w-10 text-center">Set</th>
                                                <th className="py-1.5 w-24">KG</th>
                                                <th className="py-1.5 w-20">Reps</th>
                                                <th className="py-1.5 text-center w-12">Warm</th>
                                                <th className="py-1.5 text-center w-12">Done</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200/50 dark:divide-white/5">
                                            {group.sets.map((set, sIdx) => (
                                                <tr
                                                    key={sIdx}
                                                    className={`transition-colors ${set.is_completed ? 'bg-emerald-500/5' : ''}`}
                                                >
                                                    <td className="py-2 text-center font-bold font-mono text-slate-500">
                                                        {set.set_number}
                                                    </td>
                                                    <td className="py-2 pr-2">
                                                        <input
                                                            type="number"
                                                            step="0.5"
                                                            placeholder="0"
                                                            value={set.weight_kg}
                                                            onChange={(e) => updateSet(gIdx, sIdx, 'weight_kg', e.target.value)}
                                                            className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-700/60 text-slate-900 dark:text-white font-mono font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500 text-center"
                                                        />
                                                    </td>
                                                    <td className="py-2 pr-2">
                                                        <input
                                                            type="number"
                                                            placeholder="10"
                                                            value={set.reps}
                                                            onChange={(e) => updateSet(gIdx, sIdx, 'reps', e.target.value)}
                                                            className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-700/60 text-slate-900 dark:text-white font-mono font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500 text-center"
                                                        />
                                                    </td>
                                                    <td className="py-2 text-center">
                                                        <button
                                                            type="button"
                                                            onClick={() => updateSet(gIdx, sIdx, 'is_warmup', !set.is_warmup)}
                                                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors ${
                                                                set.is_warmup
                                                                    ? 'bg-amber-500 text-slate-950'
                                                                    : 'bg-slate-200 dark:bg-white/10 text-slate-500'
                                                            }`}
                                                            title="Toggle Warmup Set"
                                                        >
                                                            W
                                                        </button>
                                                    </td>
                                                    <td className="py-2 text-center">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleToggleComplete(gIdx, sIdx)}
                                                            className={`w-7 h-7 mx-auto rounded-lg flex items-center justify-center transition-all ${
                                                                set.is_completed
                                                                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/25'
                                                                    : 'border border-slate-300 dark:border-white/20 text-slate-400 hover:border-emerald-500'
                                                            }`}
                                                        >
                                                            <FiCheck size={14} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => handleAddSet(gIdx)}
                                    className="w-full py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-emerald-500 dark:hover:text-emerald-400 bg-white/60 dark:bg-white/5 rounded-lg border border-slate-200/60 dark:border-white/5 flex items-center justify-center gap-1.5 transition-colors"
                                >
                                    <FiPlus size={13} /> Add Set
                                </button>
                            </div>
                        ))
                    )}

                    {/* Add Exercise Action */}
                    <button
                        type="button"
                        onClick={() => setShowAddExModal(true)}
                        className="w-full py-3 rounded-2xl border-2 border-dashed border-slate-200 dark:border-white/10 hover:border-emerald-500/50 text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 text-xs font-bold flex items-center justify-center gap-2 transition-colors"
                    >
                        <FiPlusCircle size={16} /> Add Another Exercise
                    </button>
                </div>

                {/* Bottom Bar: Finish Workout */}
                <div className="p-4 sm:p-5 border-t border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-slate-800/80 flex items-center justify-between gap-3">
                    <input
                        type="text"
                        placeholder="Workout notes (optional)..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-700/50 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />

                    <button
                        type="button"
                        onClick={handleFinishWorkout}
                        disabled={finishing}
                        className="px-5 py-2.5 rounded-xl font-bold text-sm text-white bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-600/25 flex items-center gap-2 transition-all disabled:opacity-50"
                    >
                        <FiCheckCircle size={16} />
                        {finishing ? 'Finishing…' : 'Finish Workout'}
                    </button>
                </div>
            </div>

            {/* Sub-modal: Pick Exercise from Library */}
            {showAddExModal && (
                <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="glass-card w-full max-w-md p-5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[80vh]">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10 mb-3">
                            <h4 className="text-base font-bold text-slate-900 dark:text-white font-heading">
                                Add Exercise
                            </h4>
                            <button
                                type="button"
                                onClick={() => setShowAddExModal(false)}
                                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg transition-colors"
                            >
                                <FiX size={18} />
                            </button>
                        </div>

                        <input
                            type="text"
                            placeholder="Search exercises..."
                            value={searchEx}
                            onChange={(e) => setSearchEx(e.target.value)}
                            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white placeholder:text-slate-400 mb-3 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />

                        <div className="flex-1 overflow-y-auto space-y-1.5 divide-y divide-slate-100 dark:divide-white/5">
                            {allExercises.filter(e => e.name.toLowerCase().includes(searchEx.toLowerCase())).length === 0 ? (
                                <div className="py-8 text-center flex flex-col items-center justify-center space-y-3">
                                    <p className="text-sm text-slate-500 dark:text-slate-400">
                                        No movement matching "<span className="text-slate-900 dark:text-white font-semibold">{searchEx}</span>"
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => setShowCustomModal(true)}
                                        className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold rounded-xl transition-all inline-flex items-center gap-1.5 shadow-md shadow-emerald-500/20"
                                    >
                                        <FiPlus size={14} /> Add "{searchEx || 'Custom Exercise'}"
                                    </button>
                                </div>
                            ) : (
                                <>
                                    {allExercises
                                        .filter(e => e.name.toLowerCase().includes(searchEx.toLowerCase()))
                                        .map(e => (
                                            <div
                                                key={e.id}
                                                onClick={() => handleAddExerciseToWorkout(e)}
                                                className="pt-2 pb-2 px-2 flex items-center justify-between hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg cursor-pointer transition-colors"
                                            >
                                                <div>
                                                    <p className="text-xs font-bold text-slate-900 dark:text-white">{e.name}</p>
                                                    <p className="text-[10px] text-slate-500 dark:text-slate-400 capitalize">{e.target_muscle} · {e.equipment}</p>
                                                </div>
                                                <FiPlus className="text-emerald-500" size={15} />
                                            </div>
                                        ))}
                                    <button
                                        type="button"
                                        onClick={() => setShowCustomModal(true)}
                                        className="w-full mt-2 py-2 border border-dashed border-slate-300 dark:border-white/10 hover:border-emerald-500/50 rounded-xl text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors flex items-center justify-center gap-1.5"
                                    >
                                        <FiPlus size={13} /> Can't find it? Add custom exercise
                                    </button>
                                </>
                            )}
                        </div>

                        {/* Custom Exercise Creator Sub-Modal */}
                        {showCustomModal && (
                            <CustomExerciseModal
                                initialName={searchEx.trim()}
                                onClose={() => setShowCustomModal(false)}
                                onCreated={(newEx) => {
                                    setShowCustomModal(false);
                                    setShowAddExModal(false);
                                    setSearchEx('');
                                    handleAddExerciseToWorkout(newEx);
                                }}
                            />
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
