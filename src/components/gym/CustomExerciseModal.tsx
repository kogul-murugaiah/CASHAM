import React, { useState } from 'react';
import { api } from '../../lib/api';
import { FiX, FiAlertCircle, FiCheck } from 'react-icons/fi';

interface CustomExerciseModalProps {
    onClose: () => void;
    onCreated: (exercise: any) => void;
    initialName?: string;
    initialMuscle?: string;
}

const MUSCLE_OPTIONS = [
    { value: 'chest', label: 'Chest' },
    { value: 'back', label: 'Back & Lats' },
    { value: 'shoulders', label: 'Shoulders & Delts' },
    { value: 'biceps', label: 'Biceps' },
    { value: 'triceps', label: 'Triceps' },
    { value: 'legs', label: 'Legs & Calves' },
    { value: 'core', label: 'Core / Abs' },
];

const EQUIPMENT_OPTIONS = [
    { value: 'barbell', label: 'Barbell' },
    { value: 'dumbbell', label: 'Dumbbell' },
    { value: 'cable', label: 'Cable' },
    { value: 'machine', label: 'Machine' },
    { value: 'bodyweight', label: 'Bodyweight' },
    { value: 'other', label: 'Other' },
];

export const CustomExerciseModal: React.FC<CustomExerciseModalProps> = ({
    onClose,
    onCreated,
    initialName = '',
    initialMuscle = 'chest',
}) => {
    const [name, setName] = useState(initialName);
    const [targetMuscle, setTargetMuscle] = useState(initialMuscle);
    const [equipment, setEquipment] = useState('dumbbell');
    const [selectedSecondary, setSelectedSecondary] = useState<string[]>([]);
    const [description, setDescription] = useState('');
    const [saving, setSaving] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const toggleSecondary = (muscle: string) => {
        if (selectedSecondary.includes(muscle)) {
            setSelectedSecondary((prev) => prev.filter((m) => m !== muscle));
        } else {
            if (muscle === targetMuscle) return; // Can't be both primary and secondary
            setSelectedSecondary((prev) => [...prev, muscle]);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);

        if (!name.trim()) {
            setErrorMsg('Exercise name is required.');
            return;
        }

        try {
            setSaving(true);
            const payload = {
                name: name.trim(),
                target_muscle: targetMuscle,
                equipment: equipment,
                description: description.trim() || null,
                secondary_muscles: selectedSecondary,
            };

            const created = await api.post<any>('/api/gym/exercises', payload);
            onCreated(created);
            onClose();
        } catch (err: any) {
            setErrorMsg(err.message || 'Failed to create custom exercise.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
            <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                            Create Custom Exercise
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Add a custom movement to your exercise library
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
                <form onSubmit={handleCreate} className="p-6 overflow-y-auto space-y-4">
                    {errorMsg && (
                        <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs rounded-xl flex items-center gap-2">
                            <FiAlertCircle size={16} className="shrink-0" />
                            <span>{errorMsg}</span>
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                            Exercise Name *
                        </label>
                        <input
                            type="text"
                            required
                            placeholder="e.g. Incline Dumbbell Press (Neutral Grip)"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                                Primary Target Muscle *
                            </label>
                            <select
                                value={targetMuscle}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setTargetMuscle(val);
                                    // Remove from secondary if matching
                                    setSelectedSecondary((prev) => prev.filter((m) => m !== val));
                                }}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            >
                                {MUSCLE_OPTIONS.map((m) => (
                                    <option key={m.value} value={m.value}>
                                        {m.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                                Equipment Type *
                            </label>
                            <select
                                value={equipment}
                                onChange={(e) => setEquipment(e.target.value)}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            >
                                {EQUIPMENT_OPTIONS.map((eq) => (
                                    <option key={eq.value} value={eq.value}>
                                        {eq.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Secondary muscles */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                            Secondary Muscles Activated (Optional)
                        </label>
                        <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1">
                            {MUSCLE_OPTIONS.filter((m) => m.value !== targetMuscle).map((m) => {
                                const isSelected = selectedSecondary.includes(m.value);
                                return (
                                    <button
                                        type="button"
                                        key={m.value}
                                        onClick={() => toggleSecondary(m.value)}
                                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                                            isSelected
                                                ? 'bg-emerald-500 text-slate-950 font-bold'
                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                                        }`}
                                    >
                                        {m.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                            Technique / Form Notes (Optional)
                        </label>
                        <textarea
                            rows={2}
                            placeholder="Keep elbows at 45 degrees, pause for 1 second at the bottom stretch."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                    </div>

                    <div className="pt-2 flex items-center justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
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
                                    <span>Saving...</span>
                                </>
                            ) : (
                                <>
                                    <FiCheck size={14} />
                                    <span>Save Exercise</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
