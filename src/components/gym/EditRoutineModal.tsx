import React, { useState } from 'react';
import { api } from '../../lib/api';
import {
    FiX, FiPlus, FiTrash2, FiArrowUp, FiArrowDown,
    FiCheck, FiAlertCircle, FiRotateCcw
} from 'react-icons/fi';

interface Exercise {
    id: string;
    name: string;
    target_muscle: string;
    equipment: string;
}

interface RoutineItem {
    exercise_id: string;
    exercise_name: string;
    target_muscle: string;
    target_sets: number;
    target_reps: string;
    rest_seconds: number;
    notes?: string;
}

interface EditRoutineModalProps {
    routine: any;
    allExercises: Exercise[];
    onClose: () => void;
    onSaved: () => void;
}

const MUSCLE_OPTIONS = [
    { value: 'chest', label: 'Chest' },
    { value: 'back', label: 'Back & Lats' },
    { value: 'shoulders', label: 'Shoulders (Delts)' },
    { value: 'biceps', label: 'Biceps' },
    { value: 'triceps', label: 'Triceps' },
    { value: 'arms', label: 'Arms (Bi & Tri)' },
    { value: 'legs', label: 'Legs & Calves' },
    { value: 'core', label: 'Core / Abs' },
    { value: 'cardio', label: 'Cardio' },
    { value: 'full_body', label: 'Full Body' },
];

const DAYS_OF_WEEK = [
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' },
    { value: 0, label: 'Sunday' },
];

export const EditRoutineModal: React.FC<EditRoutineModalProps> = ({
    routine,
    allExercises,
    onClose,
    onSaved,
}) => {
    // Initialise routine state
    const [name, setName] = useState<string>(routine.name || '');
    const [targetMuscle, setTargetMuscle] = useState<string>(routine.target_muscle || 'chest');
    const [dayOfWeek, setDayOfWeek] = useState<number | null>(
        routine.day_of_week !== undefined && routine.day_of_week !== null
            ? Number(routine.day_of_week)
            : 1
    );
    const [description, setDescription] = useState<string>(routine.description || '');

    // Parse initial exercises
    const initialExercises: RoutineItem[] = (
        routine.gym_routine_exercises ||
        routine.exercises ||
        []
    ).map((rx: any) => ({
        exercise_id: rx.exercise_id,
        exercise_name: rx.exercise_name || rx.gym_exercises?.name || 'Exercise',
        target_muscle: rx.target_muscle || rx.gym_exercises?.target_muscle || 'chest',
        target_sets: rx.target_sets || 3,
        target_reps: String(rx.target_reps || '8-12'),
        rest_seconds: rx.rest_seconds || 90,
        notes: rx.notes || '',
    }));

    const [exerciseList, setExerciseList] = useState<RoutineItem[]>(initialExercises);

    // Exercise search modal
    const [showExPicker, setShowExPicker] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const [saving, setSaving] = useState(false);
    const [resetting, setResetting] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Reordering
    const moveItem = (index: number, direction: 'up' | 'down') => {
        if (
            (direction === 'up' && index === 0) ||
            (direction === 'down' && index === exerciseList.length - 1)
        ) {
            return;
        }

        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        const updated = [...exerciseList];
        const [moved] = updated.splice(index, 1);
        updated.splice(targetIndex, 0, moved);
        setExerciseList(updated);
    };

    const removeItem = (index: number) => {
        setExerciseList((prev) => prev.filter((_, i) => i !== index));
    };

    const updateItem = (index: number, field: keyof RoutineItem, value: any) => {
        setExerciseList((prev) => {
            const next = [...prev];
            next[index] = { ...next[index], [field]: value };
            return next;
        });
    };

    const addExercise = (exercise: Exercise) => {
        if (exerciseList.some((e) => e.exercise_id === exercise.id)) {
            setShowExPicker(false);
            setSearchQuery('');
            return;
        }

        const newItem: RoutineItem = {
            exercise_id: exercise.id,
            exercise_name: exercise.name,
            target_muscle: exercise.target_muscle,
            target_sets: 3,
            target_reps: '8-12',
            rest_seconds: 90,
        };

        setExerciseList((prev) => [...prev, newItem]);
        setShowExPicker(false);
        setSearchQuery('');
    };

    // Save Routine
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);

        if (!name.trim()) {
            setErrorMsg('Routine name is required.');
            return;
        }

        if (exerciseList.length === 0) {
            setErrorMsg('Please add at least one exercise to this split.');
            return;
        }

        try {
            setSaving(true);

            const payloadExercises = exerciseList.map((item, idx) => ({
                exercise_id: item.exercise_id,
                order_index: idx + 1,
                target_sets: Number(item.target_sets) || 3,
                target_reps: item.target_reps.trim() || '8-12',
                rest_seconds: Number(item.rest_seconds) || 90,
                notes: item.notes?.trim() || null,
            }));

            if (routine.is_preset) {
                // Presets are global; clone/create as the user's custom routine for this day
                const createPayload = {
                    name: name.trim(),
                    target_muscle: targetMuscle,
                    description: description.trim() || null,
                    day_of_week: dayOfWeek,
                    exercises: payloadExercises,
                };
                await api.post('/api/gym/routines', createPayload);
            } else {
                // Existing custom routine; update in-place
                const updatePayload = {
                    id: routine.id,
                    name: name.trim(),
                    target_muscle: targetMuscle,
                    description: description.trim() || null,
                    day_of_week: dayOfWeek,
                    exercises: payloadExercises,
                };
                await api.patch('/api/gym/routines', updatePayload);
            }

            onSaved();
            onClose();
        } catch (err: any) {
            setErrorMsg(err.message || 'Failed to save routine');
        } finally {
            setSaving(false);
        }
    };

    // Reset custom routine back to default Bro Split preset
    const handleResetToDefault = async () => {
        if (!confirm('Reset this day back to the default Bro Split preset? Your custom changes will be removed.')) {
            return;
        }

        try {
            setResetting(true);
            await api.delete(`/api/gym/routines?id=${routine.id}`);
            onSaved();
            onClose();
        } catch (err: any) {
            alert(err.message || 'Failed to reset routine');
        } finally {
            setResetting(false);
        }
    };

    const filteredExercises = allExercises.filter(
        (e) =>
            e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            e.target_muscle.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
            <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                                {routine.is_preset ? 'Customize Bro Split' : 'Edit Routine'}
                            </h2>
                            {routine.is_preset ? (
                                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-500/10 text-amber-500">
                                    Customizing Preset
                                </span>
                            ) : (
                                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500">
                                    Your Custom Split
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Modify movements, target rep ranges, and rest intervals
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg transition-colors"
                    >
                        <FiX size={20} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
                    {errorMsg && (
                        <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs rounded-xl flex items-center gap-2">
                            <FiAlertCircle size={16} className="shrink-0" />
                            <span>{errorMsg}</span>
                        </div>
                    )}

                    {/* Metadata */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-2">
                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                                Routine Title *
                            </label>
                            <input
                                type="text"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. Monday - Chest Power"
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                                Day of Week
                            </label>
                            <select
                                value={dayOfWeek !== null ? dayOfWeek : ''}
                                onChange={(e) => setDayOfWeek(e.target.value ? Number(e.target.value) : null)}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            >
                                {DAYS_OF_WEEK.map((d) => (
                                    <option key={d.value} value={d.value}>
                                        {d.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                                Primary Target Muscle
                            </label>
                            <select
                                value={targetMuscle}
                                onChange={(e) => setTargetMuscle(e.target.value)}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 capitalize"
                            >
                                {MUSCLE_OPTIONS.map((m) => (
                                    <option key={m.value} value={m.value}>
                                        {m.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="sm:col-span-2">
                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                                Description / Focus Note
                            </label>
                            <input
                                type="text"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="e.g. Focus on deep eccentric stretch and triceps extension"
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                        </div>
                    </div>

                    {/* Exercises Section */}
                    <div className="pt-2 space-y-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                                    Exercises & Targets ({exerciseList.length})
                                </h3>
                                <p className="text-[11px] text-slate-400">
                                    Adjust sets, target rep ranges, and rest periods
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowExPicker(true)}
                                className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors"
                            >
                                <FiPlus size={14} /> Add Movement
                            </button>
                        </div>

                        {exerciseList.length === 0 ? (
                            <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                                <p className="text-xs text-slate-400 mb-2">No exercises in this routine yet.</p>
                                <button
                                    type="button"
                                    onClick={() => setShowExPicker(true)}
                                    className="px-3 py-1.5 bg-emerald-500 text-slate-950 text-xs font-bold rounded-lg"
                                >
                                    Select Movement
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-2.5">
                                {exerciseList.map((item, idx) => (
                                    <div
                                        key={`${item.exercise_id}-${idx}`}
                                        className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-2.5"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center text-xs font-bold">
                                                    {idx + 1}
                                                </span>
                                                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                                                    {item.exercise_name}
                                                </h4>
                                                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                                                    {item.target_muscle}
                                                </span>
                                            </div>

                                            {/* Order controls & delete */}
                                            <div className="flex items-center gap-1">
                                                <button
                                                    type="button"
                                                    disabled={idx === 0}
                                                    onClick={() => moveItem(idx, 'up')}
                                                    className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 transition-colors"
                                                    title="Move Up"
                                                >
                                                    <FiArrowUp size={14} />
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={idx === exerciseList.length - 1}
                                                    onClick={() => moveItem(idx, 'down')}
                                                    className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 transition-colors"
                                                    title="Move Down"
                                                >
                                                    <FiArrowDown size={14} />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => removeItem(idx)}
                                                    className="p-1 text-slate-400 hover:text-rose-500 transition-colors ml-1"
                                                    title="Remove from split"
                                                >
                                                    <FiTrash2 size={14} />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Target Settings */}
                                        <div className="grid grid-cols-3 gap-2.5">
                                            <div>
                                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                                    Target Sets
                                                </label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="10"
                                                    value={item.target_sets}
                                                    onChange={(e) => updateItem(idx, 'target_sets', e.target.value)}
                                                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-900 dark:text-white focus:ring-1 focus:ring-emerald-500"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                                    Target Reps
                                                </label>
                                                <input
                                                    type="text"
                                                    value={item.target_reps}
                                                    placeholder="8-12"
                                                    onChange={(e) => updateItem(idx, 'target_reps', e.target.value)}
                                                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-900 dark:text-white focus:ring-1 focus:ring-emerald-500"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                                    Rest Interval
                                                </label>
                                                <select
                                                    value={item.rest_seconds}
                                                    onChange={(e) => updateItem(idx, 'rest_seconds', Number(e.target.value))}
                                                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-900 dark:text-white focus:ring-1 focus:ring-emerald-500"
                                                >
                                                    <option value={45}>45s (Fast)</option>
                                                    <option value={60}>60s (Standard)</option>
                                                    <option value={90}>90s (Hypertrophy)</option>
                                                    <option value={120}>120s (2 min)</option>
                                                    <option value={180}>180s (3 min)</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer Actions */}
                    <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                        {!routine.is_preset ? (
                            <button
                                type="button"
                                disabled={resetting || saving}
                                onClick={handleResetToDefault}
                                className="px-3.5 py-2 rounded-xl text-xs font-bold text-rose-500 hover:bg-rose-500/10 flex items-center gap-1.5 transition-colors disabled:opacity-50"
                            >
                                <FiRotateCcw size={13} />
                                <span>Reset to Bro Split Default</span>
                            </button>
                        ) : <div />}

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={saving}
                                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-slate-950 shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition-all flex items-center gap-1.5"
                            >
                                {saving ? (
                                    <>
                                        <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                                        <span>Saving Split...</span>
                                    </>
                                ) : (
                                    <>
                                        <FiCheck size={14} />
                                        <span>Save Routine Split</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </form>

                {/* Exercise Search Picker Overlay */}
                {showExPicker && (
                    <div className="absolute inset-0 z-30 bg-slate-900/90 backdrop-blur-sm p-4 flex flex-col">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                            <h4 className="text-sm font-bold text-white">Add Movement to Split</h4>
                            <button
                                onClick={() => {
                                    setShowExPicker(false);
                                    setSearchQuery('');
                                }}
                                className="text-slate-400 hover:text-white"
                            >
                                <FiX size={18} />
                            </button>
                        </div>

                        <div className="my-3">
                            <input
                                type="text"
                                autoFocus
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search movement by name or muscle (e.g. Chest, Incline, Dips)..."
                                className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                            {filteredExercises.map((ex) => (
                                <button
                                    key={ex.id}
                                    type="button"
                                    onClick={() => addExercise(ex)}
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
                                        + Add
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

