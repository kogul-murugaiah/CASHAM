import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import {
    FiActivity, FiPlus, FiCalendar, FiPlay,
    FiAward, FiChevronRight,
    FiTrendingUp, FiLayers, FiTrash2, FiRefreshCw,
    FiChevronDown, FiChevronUp, FiEdit3
} from 'react-icons/fi';

import { GymHeatmap } from '../components/gym/GymHeatmap';
import { PRTrophyWall } from '../components/gym/PRTrophyWall';
import { LiveWorkoutModal } from '../components/gym/LiveWorkoutModal';
import { QuickLogModal } from '../components/gym/QuickLogModal';
import { RoutineDetailsModal } from '../components/gym/RoutineDetailsModal';
import { CustomExerciseModal } from '../components/gym/CustomExerciseModal';
import { EditRoutineModal } from '../components/gym/EditRoutineModal';

interface GymStats {
    month?: string;
    total_workouts?: number;
    workouts_this_month?: number;
    total_sets?: number;
    total_working_sets?: number;
    distinct_gym_days?: number;
    total_attendance_days?: number;
    attendance_dates?: string[];
    all_time_prs_count?: number;
    current_week_workouts?: number;
    muscle_volume: {
        chest: number;
        back: number;
        shoulders: number;
        biceps: number;
        triceps: number;
        arms?: number;
        legs: number;
        core: number;
    };
    recent_workouts?: any[];
}

const cleanRoutineName = (name?: string) =>
    (name || '')
        .replace(/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s*[\u2013\u2014\-]\s*/i, '')
        .trim();

export const GymTracker: React.FC = () => {
    // Core data state
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [inProgressWorkout, setInProgressWorkout] = useState<any>(null);
    const [stats, setStats] = useState<GymStats | null>(null);
    const [prs, setPrs] = useState<any[]>([]);
    const [routines, setRoutines] = useState<any[]>([]);
    const [allExercises, setAllExercises] = useState<any[]>([]);
    const [recentWorkouts, setRecentWorkouts] = useState<any[]>([]);
    const [expandedWorkoutId, setExpandedWorkoutId] = useState<string | null>(null);

    // Modals state
    const [activeLiveWorkoutId, setActiveLiveWorkoutId] = useState<string | null>(null);
    const [showQuickLogModal, setShowQuickLogModal] = useState(false);
    const [quickLogRoutine, setQuickLogRoutine] = useState<any | null>(null);
    const [selectedRoutineForDetails, setSelectedRoutineForDetails] = useState<any | null>(null);
    const [selectedRoutineForEdit, setSelectedRoutineForEdit] = useState<any | null>(null);
    const [showCustomExModal, setShowCustomExModal] = useState(false);

    // ─── Fetch All Hub Data ───────────────────────────────────────
    const loadDashboardData = useCallback(async (isRefresh = false) => {
        try {
            if (isRefresh) setRefreshing(true);
            else setLoading(true);

            // Run in parallel for fastest loading
            const [
                inProgressRes,
                statsRes,
                prsRes,
                routinesRes,
                exercisesRes,
                workoutsRes,
            ] = await Promise.all([
                api.get<any>('/api/gym/workouts?in_progress=true').catch(() => null),
                api.get<any>('/api/gym/stats').catch(() => null),
                api.get<any>('/api/gym/prs').catch(() => []),
                api.get<any>('/api/gym/routines').catch(() => []),
                api.get<any>('/api/gym/exercises').catch(() => []),
                api.get<any>('/api/gym/workouts?page=1&limit=10').catch(() => []),
            ]);

            setInProgressWorkout(inProgressRes || null);
            setStats(statsRes || null);
            const loadedPrs = Array.isArray(prsRes) ? prsRes : (prsRes?.prs || []);
            setPrs(loadedPrs);
            setRoutines(Array.isArray(routinesRes) ? routinesRes : []);
            setAllExercises(Array.isArray(exercisesRes) ? exercisesRes : []);
            const loadedWorkouts = Array.isArray(workoutsRes?.workouts)
                ? workoutsRes.workouts
                : (Array.isArray(workoutsRes) ? workoutsRes : []);
            setRecentWorkouts(loadedWorkouts);
        } catch (err) {
            console.error('Failed to load gym data:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadDashboardData();
    }, [loadDashboardData]);

    // ─── Start Live Session from Scratch ──────────────────────────
    const handleStartLiveWorkout = async (routine?: any) => {
        try {
            const payload: any = {
                name: routine ? cleanRoutineName(routine.name) : 'Workout Session',
                split_type: routine ? routine.split_type : 'custom',
                routine_id: routine ? routine.id : null,
                workout_date: new Date().toISOString().split('T')[0],
                logging_mode: 'live',
                is_completed: false,
                started_at: new Date().toISOString(),
            };

            const created = await api.post<any>('/api/gym/workouts', payload);
            if (created && created.id) {
                setInProgressWorkout(created);
                setActiveLiveWorkoutId(created.id);
                if (selectedRoutineForDetails) {
                    setSelectedRoutineForDetails(null);
                }
            }
        } catch (err: any) {
            alert(err.message || 'Failed to start live session');
        }
    };

    // ─── Quick Log From Routine Details ───────────────────────────
    const handleTriggerQuickLog = (routine?: any) => {
        setSelectedRoutineForDetails(null);
        setQuickLogRoutine(routine || null);
        setShowQuickLogModal(true);
    };

    // ─── Discard in-progress workout ──────────────────────────────
    const handleDiscardInProgress = async () => {
        if (!inProgressWorkout) return;
        if (!confirm('Are you sure you want to discard this in-progress workout session?')) return;

        try {
            await api.delete(`/api/gym/workouts?id=${inProgressWorkout.id}`);
            setInProgressWorkout(null);
            loadDashboardData(true);
        } catch (err: any) {
            alert(err.message || 'Failed to discard session');
        }
    };

    // ─── Delete Past Workout ───────────────────────────────────────
    const handleDeleteWorkout = async (workoutId: string) => {
        if (!confirm('Are you sure you want to delete this workout? This will also remove its sets.')) return;
        try {
            await api.delete(`/api/gym/workouts?id=${workoutId}`);
            setRecentWorkouts((prev) => prev.filter((w) => w.id !== workoutId));
            loadDashboardData(true);
        } catch (err: any) {
            alert(err.message || 'Failed to delete workout');
        }
    };

    if (loading) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                <p className="text-sm font-medium text-slate-400 animate-pulse">
                    Loading your Gym Tracker data...
                </p>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
            {/* ─── Top Header & Primary Actions ─────────────────────── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                            CASHAM Fitness
                        </span>
                        <span className="text-xs text-slate-400">Metric (KG)</span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                        <FiActivity className="text-emerald-500" />
                        Gym Tracker
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                        Targeted muscle splits, set overload & PR trophy wall
                    </p>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center flex-wrap gap-2.5">
                    <button
                        onClick={() => loadDashboardData(true)}
                        disabled={refreshing}
                        className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                        title="Refresh Data"
                    >
                        <FiRefreshCw className={refreshing ? 'animate-spin' : ''} size={16} />
                    </button>

                    <button
                        onClick={() => setShowCustomExModal(true)}
                        className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold flex items-center gap-1.5 transition-colors"
                    >
                        <FiPlus size={15} /> Add Exercise
                    </button>

                    <button
                        onClick={() => {
                            setQuickLogRoutine(null);
                            setShowQuickLogModal(true);
                        }}
                        className="px-4 py-2.5 rounded-xl border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 text-xs font-bold flex items-center gap-1.5 transition-colors"
                    >
                        <FiCalendar size={15} /> Log Past Workout
                    </button>

                    <button
                        onClick={() => handleStartLiveWorkout()}
                        className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-extrabold shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition-all hover:scale-102"
                    >
                        <FiPlay size={15} /> Start Live Workout
                    </button>
                </div>
            </div>

            {/* ─── Active Workout Sticky Notification Banner ────────── */}
            {inProgressWorkout && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/20 via-teal-500/15 to-emerald-500/20 border border-emerald-500/40 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <span className="flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                            </span>
                        </div>
                        <div>
                            <p className="text-xs uppercase font-extrabold tracking-wider text-emerald-600 dark:text-emerald-400">
                                Live Session In Progress
                            </p>
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                {inProgressWorkout.name}
                            </h3>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleDiscardInProgress}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold text-rose-500 hover:bg-rose-500/10 transition-colors"
                        >
                            Discard
                        </button>
                        <button
                            onClick={() => setActiveLiveWorkoutId(inProgressWorkout.id)}
                            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-black shadow-md shadow-emerald-500/20 flex items-center gap-1.5 transition-all"
                        >
                            <FiPlay size={13} /> Resume Workout
                        </button>
                    </div>
                </div>
            )}

            {/* ─── 4 Metric Stat Cards ──────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {/* 1. Monthly Attendance */}
                <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                    <div className="flex items-center justify-between text-slate-400 mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider">Gym Days</span>
                        <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                            <FiCalendar size={16} />
                        </div>
                    </div>
                    <div>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                                {stats?.distinct_gym_days ?? stats?.total_attendance_days ?? stats?.workouts_this_month ?? 0}
                            </span>
                            <span className="text-xs text-slate-400 font-semibold">days</span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                            Attended this month
                        </p>
                    </div>
                </div>

                {/* 2. All-Time PRs */}
                <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                    <div className="flex items-center justify-between text-slate-400 mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider">Max PRs</span>
                        <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                            <FiAward size={16} />
                        </div>
                    </div>
                    <div>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-2xl sm:text-3xl font-black text-amber-500">
                                {prs.length}
                            </span>
                            <span className="text-xs text-slate-400 font-semibold">records</span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                            Lifting achievements in KG
                        </p>
                    </div>
                </div>

                {/* 3. Working Sets This Month */}
                <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                    <div className="flex items-center justify-between text-slate-400 mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider">Working Sets</span>
                        <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center">
                            <FiLayers size={16} />
                        </div>
                    </div>
                    <div>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                                {stats?.total_working_sets ?? stats?.total_sets ?? 0}
                            </span>
                            <span className="text-xs text-slate-400 font-semibold">sets</span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                            Total volume this month
                        </p>
                    </div>
                </div>

                {/* 4. Weekly Consistency */}
                <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                    <div className="flex items-center justify-between text-slate-400 mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider">This Week</span>
                        <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
                            <FiTrendingUp size={16} />
                        </div>
                    </div>
                    <div>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                                {stats?.current_week_workouts ?? 0}
                            </span>
                            <span className="text-xs text-slate-400 font-semibold">/ 5 days</span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                            Flexible weekly target
                        </p>
                    </div>
                </div>
            </div>

            {/* ─── Muscle Group Routines Row ──────────────────────── */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                            Training Routines by Muscle Group
                        </h2>
                        <p className="text-xs text-slate-400">
                            Customizable splits (Bro Split, PPL, Upper/Lower) — train any muscle on any day without restrictions
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
                    {routines
                        .filter((r) => !r.is_preset || !r.target_muscle?.includes('_'))
                        .map((routine) => {
                        return (
                            <div
                                key={routine.id}
                                onClick={() => setSelectedRoutineForDetails(routine)}
                                className="p-4 rounded-2xl border text-left cursor-pointer transition-all hover:scale-102 flex flex-col justify-between relative group bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-500/40 shadow-sm"
                            >
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                            {routine.target_muscle?.replace(/_/g, ' ') || 'MUSCLE'}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedRoutineForEdit(routine);
                                            }}
                                            className="p-1 rounded-md text-slate-400 hover:text-emerald-500 hover:bg-emerald-500/10 transition-colors"
                                            title="Edit Routine"
                                        >
                                            <FiEdit3 size={13} />
                                        </button>
                                    </div>
                                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white line-clamp-1 group-hover:text-emerald-500 transition-colors">
                                        {cleanRoutineName(routine.name)}
                                    </h3>
                                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">
                                        {routine.description || 'Targeted hypertrophy session'}
                                    </p>
                                </div>

                                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                    <span>View Workout</span>
                                    <FiChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ─── Two-Column Hub Layout ────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Column: Heatmap & Muscle Volume */}
                <div className="lg:col-span-7 space-y-6">
                    {/* 1. Heatmap */}
                    <GymHeatmap attendanceDates={stats?.attendance_dates || []} />

                    {/* 2. Target Muscle Volume Breakdown */}
                    {stats?.muscle_volume && (
                        <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                                        Muscle Volume Distribution
                                    </h3>
                                    <p className="text-xs text-slate-400">
                                        Working sets completed across key muscle groups
                                    </p>
                                </div>
                                <span className="text-xs font-bold text-slate-400">
                                    {stats.total_working_sets ?? stats.total_sets ?? 0} Sets Total
                                </span>
                            </div>

                            <div className="space-y-3 pt-2">
                                {(() => {
                                    const volumeItems = [
                                        { key: 'chest', label: 'Chest', sets: stats.muscle_volume.chest || 0, color: 'bg-emerald-500' },
                                        { key: 'back', label: 'Back & Lats', sets: stats.muscle_volume.back || 0, color: 'bg-teal-500' },
                                        { key: 'shoulders', label: 'Shoulders & Traps', sets: stats.muscle_volume.shoulders || 0, color: 'bg-cyan-500' },
                                        { key: 'biceps', label: 'Biceps', sets: stats.muscle_volume.biceps || 0, color: 'bg-amber-500' },
                                        { key: 'triceps', label: 'Triceps', sets: stats.muscle_volume.triceps || 0, color: 'bg-orange-500' },
                                        { key: 'legs', label: 'Legs & Calves', sets: stats.muscle_volume.legs || 0, color: 'bg-blue-500' },
                                        { key: 'core', label: 'Core & Abs', sets: stats.muscle_volume.core || 0, color: 'bg-emerald-400' },
                                    ];
                                    const totalCalculatedSets = volumeItems.reduce((acc, curr) => acc + curr.sets, 0);

                                    return volumeItems.map((item) => {
                                        const pct = totalCalculatedSets > 0
                                            ? Math.round((item.sets / totalCalculatedSets) * 100)
                                            : 0;

                                        return (
                                            <div key={item.key} className="space-y-1">
                                                <div className="flex items-center justify-between text-xs">
                                                    <span className="font-bold text-slate-700 dark:text-slate-300">
                                                        {item.label}
                                                    </span>
                                                    <span className="font-semibold text-slate-400">
                                                        {item.sets} sets ({pct}%)
                                                    </span>
                                                </div>
                                                <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                                    <div
                                                        className={`h-full ${item.color} rounded-full transition-all duration-500`}
                                                        style={{ width: `${Math.min(pct, 100)}%` }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    });
                                })()}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Column: PR Trophy Wall */}
                <div className="lg:col-span-5 space-y-6">
                    <PRTrophyWall
                        prs={prs}
                        onExerciseClick={(pr: any) => {
                            // Find matching exercise and open quick log or details
                            const matchedRoutine = routines.find((r) => r.target_muscle === pr.target_muscle);
                            if (matchedRoutine) {
                                setSelectedRoutineForDetails(matchedRoutine);
                            }
                        }}
                    />
                </div>
            </div>

            {/* ─── Recent Workout History ───────────────────────────── */}
            <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                            Recent Workouts History
                        </h3>
                        <p className="text-xs text-slate-400">
                            Log history, tonnage and set-by-set breakdown
                        </p>
                    </div>
                </div>

                {recentWorkouts.length === 0 ? (
                    <div className="py-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                        <FiActivity className="mx-auto text-slate-400 mb-2" size={28} />
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                            No workout sessions logged yet
                        </p>
                        <p className="text-xs text-slate-400 mt-1 mb-4">
                            Start a live session or log a past workout to see your history.
                        </p>
                        <button
                            onClick={() => handleStartLiveWorkout()}
                            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold rounded-xl transition-all inline-flex items-center gap-1.5"
                        >
                            <FiPlay size={14} /> Start First Workout
                        </button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {recentWorkouts.map((w) => {
                            const isExpanded = expandedWorkoutId === w.id;
                            const setsList = w.gym_sets || [];
                            const totalVolume = setsList.reduce(
                                (acc: number, s: any) => acc + (s.weight_kg || 0) * (s.reps || 0),
                                0
                            );

                            return (
                                <div
                                    key={w.id}
                                    className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 transition-all space-y-3"
                                >
                                    {/* Header Row */}
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                                                <FiCalendar size={18} />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                                                        {w.name}
                                                    </h4>
                                                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                                                        {w.split_type}
                                                    </span>
                                                    {w.logging_mode === 'live' && (
                                                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500">
                                                            Live
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-slate-400">
                                                    {w.workout_date} • {w.duration_minutes || 60} mins • {setsList.length} sets • {totalVolume.toLocaleString()} KG volume
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 self-end sm:self-auto">
                                            <button
                                                type="button"
                                                onClick={() => setExpandedWorkoutId(isExpanded ? null : w.id)}
                                                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold flex items-center gap-1 transition-colors"
                                            >
                                                {isExpanded ? (
                                                    <>Hide Sets <FiChevronUp size={13} /></>
                                                ) : (
                                                    <>View Sets <FiChevronDown size={13} /></>
                                                )}
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => handleDeleteWorkout(w.id)}
                                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                                                title="Delete Workout"
                                            >
                                                <FiTrash2 size={15} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Expanded Sets Detail Table */}
                                    {isExpanded && (
                                        <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60 overflow-x-auto">
                                            {setsList.length === 0 ? (
                                                <p className="text-xs text-slate-400 py-2">No sets recorded for this workout.</p>
                                            ) : (
                                                <table className="w-full text-left text-xs">
                                                    <thead>
                                                        <tr className="text-slate-400 border-b border-slate-200 dark:border-slate-800 pb-1">
                                                            <th className="py-1 px-2 font-semibold">EXERCISE</th>
                                                            <th className="py-1 px-2 font-semibold">SET</th>
                                                            <th className="py-1 px-2 font-semibold">WEIGHT</th>
                                                            <th className="py-1 px-2 font-semibold">REPS</th>
                                                            <th className="py-1 px-2 font-semibold">TYPE</th>
                                                            <th className="py-1 px-2 font-semibold">PR STATUS</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                        {setsList.map((set: any, sIdx: number) => {
                                                            const exName = set.gym_exercises?.name || 'Exercise';
                                                            return (
                                                                <tr key={set.id || sIdx}>
                                                                    <td className="py-1.5 px-2 font-bold text-slate-900 dark:text-white">
                                                                        {exName}
                                                                    </td>
                                                                    <td className="py-1.5 px-2 text-slate-400 font-semibold">
                                                                        #{set.set_number}
                                                                    </td>
                                                                    <td className="py-1.5 px-2 font-black text-slate-900 dark:text-white">
                                                                        {set.weight_kg} KG
                                                                    </td>
                                                                    <td className="py-1.5 px-2 font-bold text-slate-700 dark:text-slate-300">
                                                                        {set.reps} reps
                                                                    </td>
                                                                    <td className="py-1.5 px-2">
                                                                        {set.is_warmup ? (
                                                                            <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 font-bold">
                                                                                Warmup
                                                                            </span>
                                                                        ) : (
                                                                            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 font-bold">
                                                                                Working
                                                                            </span>
                                                                        )}
                                                                    </td>
                                                                    <td className="py-1.5 px-2">
                                                                        {set.is_pr && (
                                                                            <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-black inline-flex items-center gap-1">
                                                                                <FiAward size={10} /> PR
                                                                            </span>
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ─── Modals ───────────────────────────────────────────── */}
            {/* 1. Live Workout Modal */}
            {activeLiveWorkoutId && (
                <LiveWorkoutModal
                    workoutId={activeLiveWorkoutId}
                    allExercises={allExercises}
                    onClose={() => {
                        setActiveLiveWorkoutId(null);
                        loadDashboardData(true);
                    }}
                    onFinished={() => {
                        setActiveLiveWorkoutId(null);
                        setInProgressWorkout(null);
                        loadDashboardData(true);
                    }}
                />
            )}

            {/* 2. Quick Log Modal */}
            {showQuickLogModal && (
                <QuickLogModal
                    allExercises={allExercises}
                    routines={routines}
                    initialRoutine={quickLogRoutine}
                    onClose={() => {
                        setShowQuickLogModal(false);
                        setQuickLogRoutine(null);
                    }}
                    onFinished={() => {
                        loadDashboardData(true);
                    }}
                />
            )}

            {/* 3. Routine Details Modal */}
            {selectedRoutineForDetails && (
                <RoutineDetailsModal
                    routine={selectedRoutineForDetails}
                    onClose={() => setSelectedRoutineForDetails(null)}
                    onStartLive={(r) => handleStartLiveWorkout(r)}
                    onQuickLog={(r) => handleTriggerQuickLog(r)}
                    onEdit={(r) => {
                        setSelectedRoutineForDetails(null);
                        setSelectedRoutineForEdit(r);
                    }}
                />
            )}

            {/* 4. Edit Routine Modal */}
            {selectedRoutineForEdit && (
                <EditRoutineModal
                    routine={selectedRoutineForEdit}
                    allExercises={allExercises}
                    onClose={() => setSelectedRoutineForEdit(null)}
                    onSaved={() => {
                        setSelectedRoutineForEdit(null);
                        loadDashboardData(true);
                    }}
                />
            )}

            {/* 5. Custom Exercise Modal */}
            {showCustomExModal && (
                <CustomExerciseModal
                    onClose={() => setShowCustomExModal(false)}
                    onCreated={(newEx) => {
                        setAllExercises((prev) => [newEx, ...prev]);
                        loadDashboardData(true);
                    }}
                />
            )}
        </div>
    );
};

export default GymTracker;
