import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import {
    FiCalendar, FiClock, FiPlus, FiTrash2,
    FiX, FiAward, FiCheck, FiChevronDown, FiAlertCircle
} from 'react-icons/fi';

interface Exercise {
    id: string;
    name: string;
    target_muscle: string;
    equipment: string;
}

interface RoutineExercise {
    exercise_id: string;
    exercise_name: string;
    target_muscle: string;
    target_sets: number;
    target_reps: string;
}

interface Routine {
    id: string;
    name: string;
    split_type: string;
    target_muscle: string;
    is_preset?: boolean;
    exercises?: RoutineExercise[];
}

interface SetRow {
    set_number: number;
    weight_kg: string;
    reps: string;
    is_warmup: boolean;
}

interface ExerciseBlock {
    exercise_id: string;
    exercise_name: string;
    target_muscle: string;
    sets: SetRow[];
}

interface QuickLogModalProps {
    onClose: () => void;
    onFinished: () => void;
    allExercises: Exercise[];
    routines: Routine[];
    initialRoutine?: Routine | null;
}

const cleanRoutineName = (name?: string) =>
    (name || '')
        .replace(/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s*[\u2013\u2014\-]\s*/i, '')
        .trim();

export const QuickLogModal: React.FC<QuickLogModalProps> = ({
    onClose,
    onFinished,
    allExercises,
    routines,
    initialRoutine = null,
}) => {
    const todayStr = new Date().toISOString().split('T')[0];

    const [workoutDate, setWorkoutDate] = useState(todayStr);
    const [workoutName, setWorkoutName] = useState(initialRoutine ? cleanRoutineName(initialRoutine.name) : 'Workout Session');
    const [selectedRoutineId, setSelectedRoutineId] = useState(initialRoutine?.id || '');
    const [durationMinutes, setDurationMinutes] = useState<string>('60');
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Exercises in this workout
    const [exerciseBlocks, setExerciseBlocks] = useState<ExerciseBlock[]>([]);

    // Exercise picker state
    const [showExPicker, setShowExPicker] = useState(false);
    const [searchEx, setSearchEx] = useState('');

    // PR Celebration Modal after save
    const [prResults, setPrResults] = useState<any[] | null>(null);

    // Pre-populate if initial routine is passed
    useEffect(() => {
        if (initialRoutine && initialRoutine.exercises && initialRoutine.exercises.length > 0) {
            const blocks: ExerciseBlock[] = initialRoutine.exercises.map((rx) => ({
                exercise_id: rx.exercise_id,
                exercise_name: rx.exercise_name,
                target_muscle: rx.target_muscle,
                sets: Array.from({ length: rx.target_sets || 3 }, (_, i) => ({
                    set_number: i + 1,
                    weight_kg: '',
                    reps: '',
                    is_warmup: i === 0,
                })),
            }));
            setExerciseBlocks(blocks);
            setWorkoutName(cleanRoutineName(initialRoutine.name));
            setSelectedRoutineId(initialRoutine.id);
        }
    }, [initialRoutine]);

    const handleRoutineChange = async (routineId: string) => {
        setSelectedRoutineId(routineId);
        if (!routineId) return;

        const found = routines.find((r) => r.id === routineId);
        if (found) {
            setWorkoutName(cleanRoutineName(found.name));
            if (found.exercises && found.exercises.length > 0) {
                const blocks: ExerciseBlock[] = found.exercises.map((rx) => ({
                    exercise_id: rx.exercise_id,
                    exercise_name: rx.exercise_name,
                    target_muscle: rx.target_muscle,
                    sets: Array.from({ length: rx.target_sets || 3 }, (_, i) => ({
                        set_number: i + 1,
                        weight_kg: '',
                        reps: '',
                        is_warmup: i === 0,
                    })),
                }));
                setExerciseBlocks(blocks);
            } else {
                // Fetch full routine details with exercises
                try {
                    const data = await api.get<any>(`/api/gym/routines?id=${routineId}`);
                    if (data && data.exercises) {
                        const blocks: ExerciseBlock[] = data.exercises.map((rx: any) => ({
                            exercise_id: rx.exercise_id,
                            exercise_name: rx.exercise_name || (rx.gym_exercises ? rx.gym_exercises.name : 'Exercise'),
                            target_muscle: rx.target_muscle || (rx.gym_exercises ? rx.gym_exercises.target_muscle : 'chest'),
                            sets: Array.from({ length: rx.target_sets || 3 }, (_, i) => ({
                                set_number: i + 1,
                                weight_kg: '',
                                reps: '',
                                is_warmup: i === 0,
                            })),
                        }));
                        setExerciseBlocks(blocks);
                    }
                } catch {
                    // Ignore error, keep existing blocks
                }
            }
        }
    };

    const handleAddExercise = (exercise: Exercise) => {
        // Prevent duplicate exercise block if already in list
        const exists = exerciseBlocks.some((b) => b.exercise_id === exercise.id);
        if (exists) {
            setShowExPicker(false);
            setSearchEx('');
            return;
        }

        const newBlock: ExerciseBlock = {
            exercise_id: exercise.id,
            exercise_name: exercise.name,
            target_muscle: exercise.target_muscle,
            sets: [
                { set_number: 1, weight_kg: '', reps: '', is_warmup: true },
                { set_number: 2, weight_kg: '', reps: '', is_warmup: false },
                { set_number: 3, weight_kg: '', reps: '', is_warmup: false },
            ],
        };

        setExerciseBlocks((prev) => [...prev, newBlock]);
        setShowExPicker(false);
        setSearchEx('');
    };

    const handleRemoveExercise = (index: number) => {
        setExerciseBlocks((prev) => prev.filter((_, i) => i !== index));
    };

    const handleAddSet = (exerciseIndex: number) => {
        setExerciseBlocks((prev) => {
            const next = [...prev];
            const block = { ...next[exerciseIndex] };
            const nextSetNum = block.sets.length + 1;
            const lastSet = block.sets[block.sets.length - 1];

            block.sets = [
                ...block.sets,
                {
                    set_number: nextSetNum,
                    weight_kg: lastSet ? lastSet.weight_kg : '',
                    reps: lastSet ? lastSet.reps : '',
                    is_warmup: false,
                },
            ];
            next[exerciseIndex] = block;
            return next;
        });
    };

    const handleRemoveSet = (exerciseIndex: number, setIndex: number) => {
        setExerciseBlocks((prev) => {
            const next = [...prev];
            const block = { ...next[exerciseIndex] };
            block.sets = block.sets
                .filter((_, i) => i !== setIndex)
                .map((s, idx) => ({ ...s, set_number: idx + 1 }));
            next[exerciseIndex] = block;
            return next;
        });
    };

    const handleSetChange = (
        exerciseIndex: number,
        setIndex: number,
        field: keyof SetRow,
        value: any
    ) => {
        setExerciseBlocks((prev) => {
            const next = [...prev];
            const block = { ...next[exerciseIndex] };
            const sets = [...block.sets];
            sets[setIndex] = { ...sets[setIndex], [field]: value };
            block.sets = sets;
            next[exerciseIndex] = block;
            return next;
        });
    };

    const handleSaveWorkout = async () => {
        setErrorMsg(null);

        // Validation
        if (!workoutName.trim()) {
            setErrorMsg('Please give your workout a title.');
            return;
        }

        if (exerciseBlocks.length === 0) {
            setErrorMsg('Add at least one exercise to save a workout.');
            return;
        }

        // Check if any valid set exists
        let totalValidSets = 0;
        const flattenedSets: any[] = [];

        exerciseBlocks.forEach((block) => {
            block.sets.forEach((set) => {
                const wt = parseFloat(set.weight_kg);
                const rp = parseInt(set.reps, 10);
                if (!isNaN(wt) && wt >= 0 && !isNaN(rp) && rp > 0) {
                    totalValidSets++;
                    flattenedSets.push({
                        exercise_id: block.exercise_id,
                        set_number: set.set_number,
                        weight_kg: wt,
                        reps: rp,
                        is_warmup: set.is_warmup,
                        is_completed: true,
                    });
                }
            });
        });

        if (totalValidSets === 0) {
            setErrorMsg('Please enter weight and reps for at least one completed set.');
            return;
        }

        try {
            setSaving(true);

            // 1. Create completed workout
            const foundRoutine = routines.find((r) => r.id === selectedRoutineId);
            const workoutPayload = {
                name: workoutName.trim(),
                split_type: foundRoutine ? foundRoutine.split_type : 'custom',
                routine_id: selectedRoutineId || null,
                workout_date: workoutDate,
                duration_minutes: durationMinutes ? parseInt(durationMinutes, 10) : 60,
                notes: notes.trim() || null,
                logging_mode: 'quick',
                is_completed: true,
                completed_at: new Date(workoutDate).toISOString(),
            };

            const createdWorkout = await api.post<any>('/api/gym/workouts', workoutPayload);

            // 2. Batch save sets with automated PR calculation
            const setsPayload = {
                workout_id: createdWorkout.id,
                batch: flattenedSets,
                sets: flattenedSets,
            };

            const setsRes = await api.post<any>('/api/gym/sets', setsPayload);

            // Check if any new PRs were hit!
            if (setsRes && setsRes.new_prs && setsRes.new_prs.length > 0) {
                // Map exercise names
                const mappedPrs = setsRes.new_prs.map((pr: any) => {
                    const ex = allExercises.find((e) => e.id === pr.exercise_id);
                    return {
                        ...pr,
                        exercise_name: ex ? ex.name : 'Exercise',
                    };
                });
                setPrResults(mappedPrs);
            } else {
                onFinished();
                onClose();
            }
        } catch (err: any) {
            setErrorMsg(err.message || 'Failed to save past workout.');
        } finally {
            setSaving(false);
        }
    };

    const filteredExercises = allExercises.filter((e) =>
        e.name.toLowerCase().includes(searchEx.toLowerCase()) ||
        e.target_muscle.toLowerCase().includes(searchEx.toLowerCase())
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
            {/* PR Celebration Overlay */}
            {prResults && (
                <div className="relative w-full max-w-md bg-slate-900 border border-amber-500/30 rounded-3xl p-6 shadow-2xl text-center animate-in fade-in zoom-in-95 z-60">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
                        <FiAward className="text-slate-950 text-3xl" />
                    </div>
                    <span className="text-xs uppercase font-extrabold tracking-widest text-amber-400">
                        New Record Achieved!
                    </span>
                    <h3 className="text-xl font-black text-white mt-1 mb-2">
                        Personal Record Unlocked
                    </h3>
                    <p className="text-xs text-slate-400 mb-5">
                        Your past workout included new all-time high max weights:
                    </p>

                    <div className="space-y-2 mb-6 max-h-48 overflow-y-auto">
                        {prResults.map((pr, idx) => (
                            <div
                                key={idx}
                                className="flex items-center justify-between p-3 rounded-xl bg-slate-800/80 border border-amber-500/20 text-left"
                            >
                                <div>
                                    <p className="text-sm font-bold text-white">{pr.exercise_name}</p>
                                    <p className="text-xs text-amber-300 font-semibold">
                                        New PR: {pr.weight_kg} KG ({pr.reps} reps)
                                    </p>
                                </div>
                                <span className="text-xs px-2.5 py-1 bg-amber-500/20 text-amber-300 font-bold rounded-lg">
                                    +PR
                                </span>
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={() => {
                            setPrResults(null);
                            onFinished();
                            onClose();
                        }}
                        className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition-all"
                    >
                        Awesome! View Dashboard
                    </button>
                </div>
            )}

            {!prResults && (
                <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
                    {/* Header */}
                    <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 flex items-center justify-center">
                                <FiCalendar size={20} />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                                    Log Past Workout
                                </h2>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Record your completed session & update PRs
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg transition-colors"
                        >
                            <FiX size={20} />
                        </button>
                    </div>

                    {/* Scrollable Body */}
                    <div className="flex-1 overflow-y-auto p-5 space-y-5">
                        {errorMsg && (
                            <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs rounded-xl flex items-center gap-2">
                                <FiAlertCircle size={16} className="shrink-0" />
                                <span>{errorMsg}</span>
                            </div>
                        )}

                        {/* Metadata grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                                    Workout Date
                                </label>
                                <div className="relative">
                                    <input
                                        type="date"
                                        value={workoutDate}
                                        onChange={(e) => setWorkoutDate(e.target.value)}
                                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                                    Duration (Minutes)
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={durationMinutes}
                                        onChange={(e) => setDurationMinutes(e.target.value)}
                                        placeholder="60"
                                        min="5"
                                        max="360"
                                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    />
                                    <FiClock className="absolute right-3.5 top-3.5 text-slate-400" size={16} />
                                </div>
                            </div>

                            <div className="sm:col-span-2">
                                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                                    Training Routine (Muscle Focus or Custom)
                                </label>
                                <div className="relative">
                                    <select
                                        value={selectedRoutineId}
                                        onChange={(e) => handleRoutineChange(e.target.value)}
                                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none pr-9"
                                    >
                                        <option value="">-- Choose Muscle Routine (or Custom) --</option>
                                        {routines
                                            .filter((r) => !r.is_preset || !r.target_muscle?.includes('_'))
                                            .map((r) => (
                                                <option key={r.id} value={r.id}>
                                                    {cleanRoutineName(r.name)} • {r.target_muscle.replace(/_/g, ' ').toUpperCase()}
                                                </option>
                                            ))}
                                    </select>
                                    <FiChevronDown className="absolute right-3.5 top-3.5 text-slate-400 pointer-events-none" size={16} />
                                </div>
                            </div>

                            <div className="sm:col-span-2">
                                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                                    Workout Title
                                </label>
                                <input
                                    type="text"
                                    value={workoutName}
                                    onChange={(e) => setWorkoutName(e.target.value)}
                                    placeholder="e.g. Chest Hypertrophy Session"
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>
                        </div>

                        {/* Exercise Blocks */}
                        <div className="space-y-4 pt-2">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                                    Exercises & Sets ({exerciseBlocks.length})
                                </h3>
                                <button
                                    type="button"
                                    onClick={() => setShowExPicker(true)}
                                    className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors"
                                >
                                    <FiPlus size={14} /> Add Exercise
                                </button>
                            </div>

                            {exerciseBlocks.length === 0 ? (
                                <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
                                        No exercises added yet. Pick a routine or add exercises manually.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => setShowExPicker(true)}
                                        className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold rounded-xl transition-all inline-flex items-center gap-1.5"
                                    >
                                        <FiPlus size={14} /> Select Exercise
                                    </button>
                                </div>
                            ) : (
                                exerciseBlocks.map((block, exIdx) => (
                                    <div
                                        key={`${block.exercise_id}-${exIdx}`}
                                        className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-3"
                                    >
                                        {/* Exercise Card Header */}
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-slate-400">
                                                    #{exIdx + 1}
                                                </span>
                                                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                                                    {block.exercise_name}
                                                </h4>
                                                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                                                    {block.target_muscle}
                                                </span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveExercise(exIdx)}
                                                className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                                                title="Remove Exercise"
                                            >
                                                <FiTrash2 size={16} />
                                            </button>
                                        </div>

                                        {/* Sets Table */}
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left text-xs">
                                                <thead>
                                                    <tr className="text-slate-400 border-b border-slate-200 dark:border-slate-700 pb-1">
                                                        <th className="py-1 px-1 font-semibold w-12">SET</th>
                                                        <th className="py-1 px-2 font-semibold">WEIGHT (KG)</th>
                                                        <th className="py-1 px-2 font-semibold">REPS</th>
                                                        <th className="py-1 px-2 font-semibold text-center w-16">WARMUP</th>
                                                        <th className="py-1 px-1 text-right w-10"></th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                    {block.sets.map((set, setIdx) => (
                                                        <tr key={setIdx}>
                                                            <td className="py-1.5 px-1 font-bold text-slate-500">
                                                                {set.set_number}
                                                            </td>
                                                            <td className="py-1.5 px-2">
                                                                <input
                                                                    type="number"
                                                                    step="0.5"
                                                                    min="0"
                                                                    placeholder="kg"
                                                                    value={set.weight_kg}
                                                                    onChange={(e) =>
                                                                        handleSetChange(exIdx, setIdx, 'weight_kg', e.target.value)
                                                                    }
                                                                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium focus:ring-1 focus:ring-emerald-500"
                                                                />
                                                            </td>
                                                            <td className="py-1.5 px-2">
                                                                <input
                                                                    type="number"
                                                                    min="1"
                                                                    placeholder="reps"
                                                                    value={set.reps}
                                                                    onChange={(e) =>
                                                                        handleSetChange(exIdx, setIdx, 'reps', e.target.value)
                                                                    }
                                                                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium focus:ring-1 focus:ring-emerald-500"
                                                                />
                                                            </td>
                                                            <td className="py-1.5 px-2 text-center">
                                                                <label className="inline-flex items-center cursor-pointer">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={set.is_warmup}
                                                                        onChange={(e) =>
                                                                            handleSetChange(exIdx, setIdx, 'is_warmup', e.target.checked)
                                                                        }
                                                                        className="rounded border-slate-300 text-amber-500 focus:ring-amber-400"
                                                                    />
                                                                    <span className="ml-1 text-[10px] text-slate-400">Warm</span>
                                                                </label>
                                                            </td>
                                                            <td className="py-1.5 px-1 text-right">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleRemoveSet(exIdx, setIdx)}
                                                                    className="text-slate-400 hover:text-rose-500"
                                                                >
                                                                    <FiTrash2 size={13} />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Add Set Button */}
                                        <button
                                            type="button"
                                            onClick={() => handleAddSet(exIdx)}
                                            className="w-full py-1.5 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 text-slate-500 hover:text-emerald-500 hover:border-emerald-500/40 text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                                        >
                                            <FiPlus size={13} /> Add Set
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Notes */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                                Session Notes / How did it feel? (Optional)
                            </label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                rows={2}
                                placeholder="Felt great, increased bench press by 2.5kg, solid pump on incline dumbbells."
                                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="px-5 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={saving}
                            className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleSaveWorkout}
                            disabled={saving}
                            className="px-6 py-2.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-slate-950 shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition-all flex items-center gap-2"
                        >
                            {saving ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                                    <span>Saving Sets & PRs...</span>
                                </>
                            ) : (
                                <>
                                    <FiCheck size={16} />
                                    <span>Save Past Workout</span>
                                </>
                            )}
                        </button>
                    </div>

                    {/* Nested Exercise Picker Modal */}
                    {showExPicker && (
                        <div className="absolute inset-0 z-30 bg-slate-900/90 backdrop-blur-sm p-4 flex flex-col">
                            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                                <h4 className="text-sm font-bold text-white">Select Exercise</h4>
                                <button
                                    onClick={() => {
                                        setShowExPicker(false);
                                        setSearchEx('');
                                    }}
                                    className="text-slate-400 hover:text-white"
                                >
                                    <FiX size={18} />
                                </button>
                            </div>

                            <div className="my-3">
                                <input
                                    type="text"
                                    value={searchEx}
                                    onChange={(e) => setSearchEx(e.target.value)}
                                    placeholder="Search by exercise or muscle (e.g. Chest, Incline)..."
                                    className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    autoFocus
                                />
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                                {filteredExercises.map((ex) => (
                                    <button
                                        key={ex.id}
                                        type="button"
                                        onClick={() => handleAddExercise(ex)}
                                        className="w-full p-2.5 rounded-xl bg-slate-800/80 hover:bg-emerald-500/10 border border-slate-700/60 hover:border-emerald-500/30 text-left flex items-center justify-between transition-colors group"
                                    >
                                        <div>
                                            <p className="text-xs font-bold text-white group-hover:text-emerald-400">
                                                {ex.name}
                                            </p>
                                            <p className="text-[10px] text-slate-400 capitalize">
                                                {ex.target_muscle} • {ex.equipment}
                                            </p>
                                        </div>
                                        <span className="text-xs font-bold text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                            + Select
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

