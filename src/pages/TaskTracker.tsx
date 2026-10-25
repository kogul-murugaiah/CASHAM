import { useState, useEffect, useMemo } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useTasks, getLocalDateStr, type Task, type NewTaskPayload } from '../hooks/useTasks';
import {
    isNotificationSupported,
    getNotificationPermission,
    requestNotificationPermission,
    sendTestNotification,
    checkAndNotifyPendingTasks,
    type NotificationStatus,
} from '../lib/notifications';
import {
    FiCheckCircle, FiPlus, FiBell, FiBellOff,
    FiZap, FiAward, FiTrendingUp, FiActivity,
    FiFilter, FiCalendar, FiBarChart2,
    FiChevronLeft, FiChevronRight
} from 'react-icons/fi';
import {
    type Tab,
    type FrequencyType,
    CATEGORIES,
    PRIORITY_WEIGHT,
    TIME_BLOCKS,
    formatNiceDate,
    formatDisplayDate,
    shiftDateStr,
} from '../components/tasks/taskConstants';
import { AddEditTaskModal } from '../components/tasks/TaskModal';
import { TaskCard } from '../components/tasks/TaskCard';
import {
    MonthHeatmap,
    ContributionHeatmap,
    WeeklyActivityChart,
    calcStreaks,
} from '../components/tasks/TaskHeatmap';
import { TaskFilterBar } from '../components/tasks/TaskFilterBar';

export default function TaskTracker() {
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const {
        todayTasks, allTasks, heatmapData,
        loading,
        fetchTodayTasks, fetchAllTasks, fetchHeatmapData,
        addTask, updateTask, deleteTask, toggleComplete,
        pauseTask, resumeTask, stopTask,
    } = useTasks();

    const [activeTab, setActiveTab] = useState<Tab>('today');
    const [showModal, setShowModal] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | undefined>(undefined);
    const [modalDefaultFreq, setModalDefaultFreq] = useState<FrequencyType | undefined>(undefined);
    const [searchQ, setSearchQ] = useState('');
    const [filterCat, setFilterCat] = useState('');
    const [filterFreq, setFilterFreq] = useState('');
    const [goalsFilter, setGoalsFilter] = useState<'all' | 'open' | 'completed' | 'scheduled'>('all');
    const [goalsSearchQ, setGoalsSearchQ] = useState('');
    const [goalsCat, setGoalsCat] = useState('');
    const [streakTaskId, setStreakTaskId] = useState<string>(() => {
        return localStorage.getItem('casham_selected_streak_task') || 'all';
    });
    const todayStr = useMemo(() => getLocalDateStr(), []);
    const yesterdayStr = useMemo(() => {
        const y = new Date();
        y.setDate(y.getDate() - 1);
        return getLocalDateStr(y);
    }, []);
    const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'long_term' | 'paused' | 'stopped'>('all');
    const [selectedDate, setSelectedDate] = useState<string>(todayStr);

    // Heatmap View Mode: 'month' (default calendar) vs 'year' (52-week grid)
    const [heatmapViewMode, setHeatmapViewMode] = useState<'month' | 'year'>('month');
    const [heatmapYear, setHeatmapYear] = useState<number>(() => new Date().getFullYear());
    const [heatmapMonth, setHeatmapMonth] = useState<number>(() => new Date().getMonth());

    const handlePrevHeatmapMonth = () => {
        if (heatmapMonth === 0) {
            setHeatmapYear(y => y - 1);
            setHeatmapMonth(11);
        } else {
            setHeatmapMonth(m => m - 1);
        }
    };

    const handleNextHeatmapMonth = () => {
        const now = new Date();
        const isCurrent = heatmapYear === now.getFullYear() && heatmapMonth === now.getMonth();
        if (isCurrent) return;

        if (heatmapMonth === 11) {
            setHeatmapYear(y => y + 1);
            setHeatmapMonth(0);
        } else {
            setHeatmapMonth(m => m + 1);
        }
    };

    const handleGoToCurrentHeatmapMonth = () => {
        const now = new Date();
        setHeatmapYear(now.getFullYear());
        setHeatmapMonth(now.getMonth());
    };

    const handleDayClickFromHeatmap = (dateStr: string) => {
        setSelectedDate(dateStr);
        setActiveTab('today');
    };

    // Web Notifications
    const [notifPermission, setNotifPermission] = useState<NotificationStatus>(
        () => getNotificationPermission()
    );
    const [notifMenuOpen, setNotifMenuOpen] = useState(false);
    const [notifSuccessToast, setNotifSuccessToast] = useState<string | null>(null);

    // Check & dispatch reminders for today's tasks
    useEffect(() => {
        if (selectedDate === todayStr && todayTasks.length > 0 && notifPermission === 'granted') {
            checkAndNotifyPendingTasks(todayTasks, todayStr);
        }
    }, [todayTasks, selectedDate, todayStr, notifPermission]);

    const handleEnableNotifications = async () => {
        const res = await requestNotificationPermission();
        setNotifPermission(res);
        if (res === 'granted') {
            sendTestNotification();
            setNotifSuccessToast('Reminders activated! A test alert was sent.');
            setTimeout(() => setNotifSuccessToast(null), 4000);
        }
    };

    const handleSendTestNotif = () => {
        const sent = sendTestNotification();
        if (sent) {
            setNotifSuccessToast('Test notification dispatched!');
            setTimeout(() => setNotifSuccessToast(null), 3000);
        }
    };

    // Load data per tab
    useEffect(() => {
        if (activeTab === 'today') {
            fetchTodayTasks(selectedDate);
        }
    }, [activeTab, selectedDate, fetchTodayTasks]);

    useEffect(() => {
        if (activeTab === 'all' || activeTab === 'goals') fetchAllTasks();
        if (activeTab === 'performance') {
            fetchHeatmapData();
            fetchAllTasks();
        }
    }, [activeTab, fetchAllTasks, fetchHeatmapData]);

    // Only repeating habits for the Performance Habit dropdown (HIDE one_time tasks)
    const repeatingTasks = useMemo(() => {
        const source = (heatmapData?.tasks && heatmapData.tasks.length > 0)
            ? heatmapData.tasks
            : allTasks;
        return source.filter(t => t.frequency_type !== 'one_time');
    }, [heatmapData, allTasks]);

    const handleSelectStreakTask = (id: string) => {
        setStreakTaskId(id);
        localStorage.setItem('casham_selected_streak_task', id);
    };

    // Selected task ID fallback if selected task was deleted or not in repeatingTasks
    const activeStreakTaskId = useMemo(() => {
        if (!streakTaskId || streakTaskId === 'all') return 'all';
        if (repeatingTasks.length > 0 && !repeatingTasks.some(t => t.id === streakTaskId)) {
            return 'all';
        }
        return streakTaskId;
    }, [repeatingTasks, streakTaskId]);

    // Selected task object
    const selectedTask = useMemo(() => {
        if (!activeStreakTaskId || activeStreakTaskId === 'all') return null;
        return repeatingTasks.find(t => t.id === activeStreakTaskId) || null;
    }, [repeatingTasks, activeStreakTaskId]);

    // Theme classes
    const page = isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800';
    const card = isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200';
    const tabInactive = isDark ? 'text-slate-500 hover:text-slate-300 hover:bg-slate-800' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100';
    const tabActive = 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30';
    const muted = isDark ? 'text-slate-500' : 'text-slate-400';
    const inputCls = isDark
        ? 'bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-500'
        : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400';

    // ─── Today's tasks grouped by time block with Smart Sorting
    const todayGrouped = useMemo(() => {
        return TIME_BLOCKS.map(block => {
            const blockTasks = todayTasks.filter(t => t.time_block === block.key);
            const sorted = [...blockTasks].sort((a, b) => {
                if (a.completed_today !== b.completed_today) {
                    return a.completed_today ? 1 : -1;
                }
                const pA = PRIORITY_WEIGHT[a.priority] || 2;
                const pB = PRIORITY_WEIGHT[b.priority] || 2;
                return pB - pA;
            });
            return {
                ...block,
                tasks: sorted,
            };
        }).filter(g => g.tasks.length > 0);
    }, [todayTasks]);

    const todayCompleted = todayTasks.filter(t => t.completed_today).length;
    const todayTotal = todayTasks.length;
    const todayPct = todayTotal > 0 ? Math.round((todayCompleted / todayTotal) * 100) : 0;

    // ─── Status counts for All Tasks pills
    const activeCount = useMemo(() => allTasks.filter(t => t.is_active && !t.is_paused && (t.frequency_type !== 'one_time' || t.due_date)).length, [allTasks]);
    const longTermCount = useMemo(() => allTasks.filter(t => t.frequency_type === 'one_time' && !t.due_date).length, [allTasks]);
    const pausedCount = useMemo(() => allTasks.filter(t => t.is_paused).length, [allTasks]);
    const stoppedCount = useMemo(() => allTasks.filter(t => !t.is_active).length, [allTasks]);

    // ─── All tasks filtered with Status, Search, Category and Frequency
    const filteredAll = useMemo(() => {
        return allTasks.filter(t => {
            // Status filter
            if (filterStatus === 'active') {
                if (!t.is_active || t.is_paused) return false;
                if (t.frequency_type === 'one_time' && !t.due_date) return false;
            } else if (filterStatus === 'long_term') {
                if (t.frequency_type !== 'one_time' || t.due_date) return false;
            } else if (filterStatus === 'paused') {
                if (!t.is_paused) return false;
            } else if (filterStatus === 'stopped') {
                if (t.is_active) return false;
            }

            const q = searchQ.toLowerCase();
            const matchQ = !q || t.title.toLowerCase().includes(q) || (t.description || '').toLowerCase().includes(q);
            const matchCat = !filterCat || t.category === filterCat;
            const matchFreq = !filterFreq || t.frequency_type === filterFreq;
            return matchQ && matchCat && matchFreq;
        });
    }, [allTasks, filterStatus, searchQ, filterCat, filterFreq]);

    // ─── Active heatmap & streaks based on selected task
    const activeHeatmapCounts = useMemo(() => {
        if (!heatmapData) return {};
        if (activeStreakTaskId === 'all') return heatmapData.counts;
        return heatmapData.taskCounts?.[activeStreakTaskId] || {};
    }, [heatmapData, activeStreakTaskId]);

    const streaks = useMemo(() => {
        if (!heatmapData) return { current: 0, best: 0 };
        return calcStreaks(activeHeatmapCounts);
    }, [heatmapData, activeHeatmapCounts]);

    // Total completion count for selected task
    const selectedTaskTotalCompletions = useMemo(() => {
        return Object.values(activeHeatmapCounts).reduce((acc, v) => acc + (v ? 1 : 0), 0);
    }, [activeHeatmapCounts]);

    // ─── Handlers
    const handleSaveTask = async (payload: NewTaskPayload) => {
        if (editingTask) {
            await updateTask(editingTask.id, payload);
            if (activeTab === 'all') fetchAllTasks();
            if (activeTab === 'today') fetchTodayTasks(selectedDate);
            if (activeTab === 'performance') fetchHeatmapData();
        } else {
            const created = await addTask(payload);
            if (activeTab === 'today') fetchTodayTasks(selectedDate);
            if (activeTab === 'all' || activeTab === 'goals') fetchAllTasks();
            if (activeTab === 'performance') {
                fetchHeatmapData();
                if (payload.frequency_type !== 'one_time') {
                    handleSelectStreakTask(created.id);
                }
            }
        }
        setEditingTask(undefined);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this task? All completion history will be removed.')) return;
        await deleteTask(id);
        if (streakTaskId === id) {
            setStreakTaskId('all');
            localStorage.setItem('casham_selected_streak_task', 'all');
        }
    };

    const handleToggle = async (id: string) => {
        await toggleComplete(id, selectedDate);
        fetchHeatmapData();
    };

    const handlePause = async (id: string) => {
        await pauseTask(id);
        if (activeTab === 'performance') fetchHeatmapData();
    };

    const handleResume = async (id: string) => {
        await resumeTask(id);
        if (activeTab === 'performance') fetchHeatmapData();
    };

    const handleStop = async (id: string) => {
        if (!confirm('Stop repeating this task? It will no longer appear in daily focus, but previous completion history is preserved.')) return;
        await stopTask(id);
        if (activeTab === 'performance') fetchHeatmapData();
    };

    const handleScheduleToday = async (id: string) => {
        await updateTask(id, { due_date: todayStr, carry_forward: true });
        fetchAllTasks();
        fetchTodayTasks(selectedDate);
    };

    const openAdd = () => { setEditingTask(undefined); setModalDefaultFreq(undefined); setShowModal(true); };
    const openAddGoal = () => { setEditingTask(undefined); setModalDefaultFreq('one_time'); setShowModal(true); };
    const openEdit = (t: Task) => { setEditingTask(t); setModalDefaultFreq(t.frequency_type); setShowModal(true); };

    return (
        <div className={`min-h-screen p-4 md:p-6 lg:p-8 ${page}`}>
            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold font-heading tracking-tight flex items-center gap-2">
                        <FiCheckCircle className="text-emerald-400" size={24} /> Task Manager
                    </h1>
                    <p className={`text-sm mt-0.5 ${muted}`}>Build habits. Stay consistent.</p>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                    {/* Notification Control */}
                    {isNotificationSupported() && (
                        <div className="relative">
                            {notifPermission === 'granted' ? (
                                <button
                                    type="button"
                                    onClick={() => setNotifMenuOpen(!notifMenuOpen)}
                                    title="Notification Settings"
                                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${
                                        isDark ? 'bg-slate-800 border-slate-700 text-emerald-400 hover:border-emerald-500/40' : 'bg-white border-slate-200 text-emerald-600 hover:border-emerald-300'
                                    }`}
                                >
                                    <FiBell size={14} className="text-emerald-400" />
                                    <span className="hidden sm:inline">Reminders Active</span>
                                </button>
                            ) : notifPermission === 'denied' ? (
                                <button
                                    type="button"
                                    onClick={() => alert('Notifications are blocked by your browser settings. Please click the site settings / lock icon in your browser address bar to allow notifications for casham.site.')}
                                    title="Notifications are blocked in browser"
                                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${
                                        isDark ? 'bg-slate-800 border-slate-700 text-slate-500' : 'bg-white border-slate-200 text-slate-400'
                                    }`}
                                >
                                    <FiBellOff size={14} />
                                    <span className="hidden sm:inline">Blocked</span>
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={handleEnableNotifications}
                                    title="Enable browser reminders for daily habits"
                                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-all shadow-sm ${
                                        isDark ? 'bg-slate-800 border-slate-700 text-amber-300 hover:border-amber-400/50' : 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
                                    }`}
                                >
                                    <FiBell size={14} className="animate-pulse" />
                                    <span>Enable Reminders</span>
                                </button>
                            )}

                            {/* Dropdown menu when notifications are granted */}
                            {notifMenuOpen && notifPermission === 'granted' && (
                                <div className={`absolute right-0 mt-2 w-64 rounded-xl border shadow-xl p-3 z-30 ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
                                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-inherit">
                                        <span className="text-xs font-bold flex items-center gap-1.5 text-emerald-400">
                                            <FiBell size={12} /> Web Notifications
                                        </span>
                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                            Enabled
                                        </span>
                                    </div>
                                    <p className={`text-[11px] mb-3 ${muted}`}>
                                        CASHAM alerts you about pending habits in your morning, afternoon, and evening routines.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => { handleSendTestNotif(); setNotifMenuOpen(false); }}
                                        className="w-full py-1.5 px-2.5 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/25 transition-all text-center"
                                    >
                                        Send Test Notification
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={openAdd}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold transition-all shadow-lg shadow-emerald-500/25"
                    >
                        <FiPlus size={16} /> Add Task
                    </button>
                </div>
            </div>

            {/* Notification Toast */}
            {notifSuccessToast && (
                <div className="fixed bottom-5 right-5 z-50 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold shadow-xl flex items-center gap-2 animate-bounce">
                    <FiBell size={14} />
                    <span>{notifSuccessToast}</span>
                </div>
            )}

            {/* ── Tabs ── */}
            <div className={`flex gap-1 p-1 rounded-xl border mb-6 w-fit flex-wrap ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
                {([
                    { key: 'today', label: "Today's Focus" },
                    { key: 'all', label: 'All Tasks' },
                    { key: 'goals', label: 'Long-Term Goals' },
                    { key: 'performance', label: 'Performance' },
                ] as { key: Tab; label: string }[]).map(({ key, label }) => (
                    <button
                        type="button"
                        key={key}
                        onClick={() => setActiveTab(key)}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === key ? tabActive : tabInactive}`}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {/* ══════════════════════════════════════════════════════════════════ */}
            {/* TODAY'S FOCUS TAB */}
            {/* ══════════════════════════════════════════════════════════════════ */}
            {activeTab === 'today' && (
                <div className="space-y-6">
                    {/* ── Date Navigator Bar ── */}
                    <div className={`p-3.5 rounded-2xl border ${card} shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3`}>
                        <div className="flex items-center gap-2 flex-wrap">
                            {/* Prev Day Button */}
                            <button
                                type="button"
                                onClick={() => setSelectedDate(shiftDateStr(selectedDate, -1))}
                                title="Previous Day"
                                className={`p-2 rounded-xl border transition-all ${isDark ? 'border-slate-700 hover:bg-slate-800 text-slate-300' : 'border-slate-200 hover:bg-slate-100 text-slate-700'}`}
                            >
                                <FiChevronLeft size={16} />
                            </button>

                            {/* Date Picker Input */}
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={e => e.target.value && setSelectedDate(e.target.value)}
                                className={`px-3 py-1.5 rounded-xl border text-sm font-semibold outline-none focus:ring-2 focus:ring-emerald-500/40 cursor-pointer ${inputCls}`}
                            />

                            {/* Next Day Button */}
                            <button
                                type="button"
                                onClick={() => setSelectedDate(shiftDateStr(selectedDate, 1))}
                                title="Next Day"
                                className={`p-2 rounded-xl border transition-all ${isDark ? 'border-slate-700 hover:bg-slate-800 text-slate-300' : 'border-slate-200 hover:bg-slate-100 text-slate-700'}`}
                            >
                                <FiChevronRight size={16} />
                            </button>

                            {/* Quick Presets: Yesterday & Today */}
                            <div className="flex items-center gap-1.5 ml-1">
                                <button
                                    type="button"
                                    onClick={() => setSelectedDate(yesterdayStr)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${selectedDate === yesterdayStr
                                        ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 font-bold'
                                        : isDark ? 'border-slate-800 text-slate-400 hover:border-slate-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'
                                    }`}
                                >
                                    Yesterday
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSelectedDate(todayStr)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${selectedDate === todayStr
                                        ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm shadow-emerald-500/25 font-bold'
                                        : isDark ? 'border-slate-800 text-slate-400 hover:border-slate-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'
                                    }`}
                                >
                                    Today
                                </button>
                            </div>
                        </div>

                        {/* Date badge */}
                        <div className="flex items-center gap-2">
                            <span className={`text-xs ${muted}`}>Viewing:</span>
                            <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${selectedDate === todayStr
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                                : selectedDate === yesterdayStr
                                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/25'
                                    : isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}>
                                {formatDisplayDate(selectedDate, todayStr, yesterdayStr)}
                            </span>
                        </div>
                    </div>

                    {/* Banner when viewing non-today date */}
                    {selectedDate !== todayStr && (
                        <div className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-3 animate-fade-in ${selectedDate === yesterdayStr
                            ? 'bg-amber-500/10 border-amber-500/25 text-amber-400'
                            : isDark ? 'bg-indigo-500/10 border-indigo-500/25 text-indigo-300' : 'bg-indigo-50 border-indigo-200 text-indigo-700'
                        }`}>
                            <span className="flex items-center gap-2">
                                <FiCalendar size={15} className="flex-shrink-0" />
                                <span>
                                    Viewing tasks for <strong>{formatDisplayDate(selectedDate, todayStr, yesterdayStr)}</strong>. Checking or unchecking tasks records completion for this date.
                                </span>
                            </span>
                            <button
                                type="button"
                                onClick={() => setSelectedDate(todayStr)}
                                className="underline font-bold hover:opacity-80 flex-shrink-0"
                            >
                                Return to Today
                            </button>
                        </div>
                    )}

                    {/* Progress bar */}
                    {todayTotal > 0 && (
                        <div className={`rounded-2xl border p-4 ${card}`}>
                            <div className="flex items-center justify-between mb-2">
                                <span className={`text-sm font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                    {selectedDate === todayStr ? "Today's Progress" : `Progress for ${formatNiceDate(selectedDate)}`}
                                </span>
                                <span className="text-sm font-bold text-emerald-400">
                                    {todayCompleted}/{todayTotal} · {todayPct}%
                                </span>
                            </div>
                            <div className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
                                <div
                                    className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                                    style={{ width: `${todayPct}%` }}
                                />
                            </div>
                            {todayPct === 100 && (
                                <p className="text-xs text-emerald-400 font-semibold mt-2 flex items-center gap-1">
                                    <FiAward size={12} /> All done! Great job
                                </p>
                            )}
                        </div>
                    )}

                    {loading && (
                        <div className={`flex items-center justify-center py-16 ${muted}`}>
                            <div className="w-8 h-8 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                        </div>
                    )}

                    {!loading && todayTotal === 0 && (
                        <div className={`rounded-2xl border p-10 text-center ${card}`}>
                            <FiCheckCircle size={36} className="mx-auto mb-3 text-emerald-400 opacity-80" />
                            <p className={`font-semibold ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                                {selectedDate === todayStr ? "No tasks for today" : `No tasks scheduled for ${formatNiceDate(selectedDate)}`}
                            </p>
                            <p className={`text-sm mt-1 ${muted}`}>
                                {selectedDate === todayStr
                                    ? "Add recurring tasks or tasks due today to start building your streak."
                                    : "Add recurring or custom tasks scheduled for this day."}
                            </p>
                            <button
                                type="button"
                                onClick={openAdd}
                                className="mt-4 px-4 py-2 rounded-xl bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600 transition-all"
                            >
                                + Add Task
                            </button>
                        </div>
                    )}

                    {!loading && todayGrouped.map(group => {
                        const GroupIcon = group.icon;
                        return (
                            <div key={group.key}>
                                {/* Time block header */}
                                <div className={`flex items-center gap-2 mb-2 px-1 ${muted}`}>
                                    <GroupIcon size={14} />
                                    <span className="text-xs font-bold uppercase tracking-wider">{group.label}</span>
                                    <span className="text-xs">· {group.range}</span>
                                    <span className={`ml-auto text-xs font-semibold ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
                                        {group.tasks.filter(t => t.completed_today).length}/{group.tasks.length}
                                    </span>
                                </div>
                                <div className="space-y-2">
                                    {group.tasks.map(task => (
                                        <TaskCard
                                            key={task.id}
                                            task={task}
                                            isDark={isDark}
                                            onToggle={handleToggle}
                                            onEdit={openEdit}
                                            onDelete={handleDelete}
                                            onPause={handlePause}
                                            onResume={handleResume}
                                            onStop={handleStop}
                                            showControls
                                        />
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════ */}
            {/* ALL TASKS TAB */}
            {/* ══════════════════════════════════════════════════════════════════ */}
            {activeTab === 'all' && (
                <div className="space-y-4">
                    <TaskFilterBar
                        isDark={isDark}
                        allCount={allTasks.length}
                        activeCount={activeCount}
                        longTermCount={longTermCount}
                        pausedCount={pausedCount}
                        stoppedCount={stoppedCount}
                        filterStatus={filterStatus}
                        onStatusChange={setFilterStatus}
                        searchQ={searchQ}
                        onSearchChange={setSearchQ}
                        filterCat={filterCat}
                        onCatChange={setFilterCat}
                        filterFreq={filterFreq}
                        onFreqChange={setFilterFreq}
                    />

                    {loading && (
                        <div className={`flex items-center justify-center py-16 ${muted}`}>
                            <div className="w-8 h-8 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                        </div>
                    )}

                    {!loading && filteredAll.length === 0 && (
                        <div className={`rounded-2xl border p-10 text-center ${card}`}>
                            <FiFilter size={28} className={`mx-auto mb-3 ${muted}`} />
                            <p className={`font-semibold ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                                {allTasks.length === 0 ? 'No tasks yet' : 'No tasks match your filters'}
                            </p>
                            {allTasks.length === 0 && (
                                <button
                                    type="button"
                                    onClick={openAdd}
                                    className="mt-4 px-4 py-2 rounded-xl bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600 transition-all"
                                >
                                    + Create your first task
                                </button>
                            )}
                        </div>
                    )}

                    {!loading && filteredAll.length > 0 && (
                        <div className="space-y-2">
                            {filteredAll.map(task => (
                                <TaskCard
                                    key={task.id}
                                    task={task}
                                    isDark={isDark}
                                    onToggle={handleToggle}
                                    onEdit={openEdit}
                                    onDelete={handleDelete}
                                    onPause={handlePause}
                                    onResume={handleResume}
                                    onStop={handleStop}
                                    onScheduleToday={handleScheduleToday}
                                    showControls
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════ */}
            {/* LONG-TERM GOALS TAB */}
            {/* ══════════════════════════════════════════════════════════════════ */}
            {activeTab === 'goals' && (() => {
                const allGoals = allTasks.filter(t => t.frequency_type === 'one_time');
                const filteredGoals = allGoals.filter(g => {
                    if (goalsFilter === 'open' && g.completed_today) return false;
                    if (goalsFilter === 'completed' && !g.completed_today) return false;
                    if (goalsFilter === 'scheduled' && g.due_date !== todayStr) return false;

                    const q = goalsSearchQ.toLowerCase();
                    const matchQ = !q || g.title.toLowerCase().includes(q) || (g.description || '').toLowerCase().includes(q);
                    const matchCat = !goalsCat || g.category === goalsCat;
                    return matchQ && matchCat;
                });

                return (
                    <div className="space-y-6">
                        {/* ── Header Banner ── */}
                        <div className={`rounded-2xl border p-5 ${card} flex flex-col sm:flex-row sm:items-center justify-between gap-4`}>
                            <div>
                                <h2 className="text-lg font-bold tracking-tight">
                                    Long-Term Goals & Milestones
                                </h2>
                                <p className={`text-xs mt-1 ${muted}`}>
                                    Store projects, bucket-list items, and personal milestones safely without cluttering your daily routines.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={openAddGoal}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold transition-all shadow-md shadow-emerald-500/25 w-fit"
                            >
                                <FiPlus size={15} /> Add Long-Term Goal
                            </button>
                        </div>

                        {/* ── Stats Overview ── */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div className={`rounded-2xl border p-4 ${card}`}>
                                <div className="flex items-center gap-1.5 mb-1 text-indigo-400">
                                    <FiActivity size={14} />
                                    <span className="text-[10px] font-bold uppercase tracking-wider">Total Goals</span>
                                </div>
                                <p className="text-2xl font-bold">{allGoals.length}</p>
                                <p className={`text-[10px] mt-0.5 truncate ${muted}`}>Projects & Milestones</p>
                            </div>

                            <div className={`rounded-2xl border p-4 ${card}`}>
                                <div className="flex items-center gap-1.5 mb-1 text-emerald-400">
                                    <FiAward size={14} />
                                    <span className="text-[10px] font-bold uppercase tracking-wider">Completed</span>
                                </div>
                                <p className="text-2xl font-bold">{allGoals.filter(g => g.completed_today).length}</p>
                                <p className={`text-[10px] mt-0.5 truncate ${muted}`}>Achieved</p>
                            </div>

                            <div className={`rounded-2xl border p-4 ${card}`}>
                                <div className="flex items-center gap-1.5 mb-1 text-amber-400">
                                    <FiCalendar size={14} />
                                    <span className="text-[10px] font-bold uppercase tracking-wider">Today's Focus</span>
                                </div>
                                <p className="text-2xl font-bold">{allGoals.filter(g => g.due_date === todayStr).length}</p>
                                <p className={`text-[10px] mt-0.5 truncate ${muted}`}>Scheduled Today</p>
                            </div>

                            <div className={`rounded-2xl border p-4 ${card}`}>
                                <div className="flex items-center gap-1.5 mb-1 text-teal-400">
                                    <FiTrendingUp size={14} />
                                    <span className="text-[10px] font-bold uppercase tracking-wider">In Progress</span>
                                </div>
                                <p className="text-2xl font-bold">{allGoals.filter(g => !g.completed_today).length}</p>
                                <p className={`text-[10px] mt-0.5 truncate ${muted}`}>Active Goals</p>
                            </div>
                        </div>

                        {/* ── Filters Bar ── */}
                        <div className="flex flex-col sm:flex-row gap-2">
                            <div className="flex gap-1 overflow-x-auto pb-1">
                                {[
                                    { key: 'all', label: 'All', count: allGoals.length },
                                    { key: 'open', label: 'Open', count: allGoals.filter(g => !g.completed_today).length },
                                    { key: 'completed', label: 'Completed', count: allGoals.filter(g => g.completed_today).length },
                                    { key: 'scheduled', label: "Due Today", count: allGoals.filter(g => g.due_date === todayStr).length },
                                ].map(({ key, label: l, count }) => (
                                    <button
                                        key={key}
                                        type="button"
                                        onClick={() => setGoalsFilter(key as any)}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 flex-shrink-0 ${goalsFilter === key
                                            ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm shadow-emerald-500/20'
                                            : isDark ? 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                                        }`}
                                    >
                                        <span>{l}</span>
                                        <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${goalsFilter === key ? 'bg-white/20 text-white' : isDark ? 'bg-slate-800 text-slate-500' : 'bg-slate-100 text-slate-500'}`}>
                                            {count}
                                        </span>
                                    </button>
                                ))}
                            </div>

                            <input
                                value={goalsSearchQ}
                                onChange={e => setGoalsSearchQ(e.target.value)}
                                placeholder="Search goals…"
                                className={`px-3 py-2 rounded-xl border text-sm outline-none flex-1 ${inputCls}`}
                            />

                            <select
                                value={goalsCat}
                                onChange={e => setGoalsCat(e.target.value)}
                                className={`px-3 py-2 rounded-xl border text-sm outline-none ${inputCls}`}
                            >
                                <option value="">All Categories</option>
                                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>

                        {loading && (
                            <div className={`flex items-center justify-center py-16 ${muted}`}>
                                <div className="w-8 h-8 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                            </div>
                        )}

                        {!loading && filteredGoals.length === 0 && (
                            <div className={`rounded-2xl border p-10 text-center ${card}`}>
                                <FiAward size={32} className={`mx-auto mb-3 ${muted}`} />
                                <p className={`font-semibold ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                                    {allGoals.length === 0 ? 'No long-term goals configured' : 'No goals match your criteria'}
                                </p>
                                {allGoals.length === 0 && (
                                    <button
                                        type="button"
                                        onClick={openAddGoal}
                                        className="mt-4 px-4 py-2 rounded-xl bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600 transition-all"
                                    >
                                        + Add a Goal
                                    </button>
                                )}
                            </div>
                        )}

                        {!loading && filteredGoals.length > 0 && (
                            <div className="space-y-2">
                                {filteredGoals.map(goal => (
                                    <TaskCard
                                        key={goal.id}
                                        task={goal}
                                        isDark={isDark}
                                        onToggle={handleToggle}
                                        onEdit={openEdit}
                                        onDelete={handleDelete}
                                        onScheduleToday={handleScheduleToday}
                                        showControls
                                        hideTypeBadge
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                );
            })()}

            {/* ══════════════════════════════════════════════════════════════════ */}
            {/* PERFORMANCE TAB (TASK-BASED HEATMAP & STREAK) */}
            {/* ══════════════════════════════════════════════════════════════════ */}
            {activeTab === 'performance' && (
                <div className="space-y-6">
                    {/* ── Task Selector Box ── */}
                    <div className={`rounded-2xl border p-5 ${card}`}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <label className={`text-xs font-bold uppercase tracking-wider block mb-1 ${muted}`}>
                                    Selected Habit / Task
                                </label>
                                <p className={`text-xs ${muted}`}>
                                    Select any task below to view its specific streak records and habit heatmap.
                                </p>
                            </div>
                            <select
                                value={activeStreakTaskId}
                                onChange={e => handleSelectStreakTask(e.target.value)}
                                className={`px-3 py-2.5 rounded-xl border text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500/40 min-w-[240px] ${inputCls}`}
                            >
                                <option value="all">All Repeating Habits Combined</option>
                                {repeatingTasks.map(t => (
                                    <option key={t.id} value={t.id}>
                                        {t.title} ({t.frequency_type === 'custom' ? `every ${t.frequency_x_times || 2}d` : t.frequency_type?.replace('_', ' ')})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {selectedTask && (
                            <div className="mt-4 pt-4 border-t border-inherit flex items-center gap-3 flex-wrap">
                                <div
                                    className="w-3.5 h-3.5 rounded-full flex-shrink-0 shadow-sm"
                                    style={{ backgroundColor: selectedTask.color || '#10b981' }}
                                />
                                <span className={`text-sm font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                                    {selectedTask.title}
                                </span>
                                <span
                                    style={{ backgroundColor: (selectedTask.color || '#10b981') + '22', color: selectedTask.color || '#10b981' }}
                                    className="px-2 py-0.5 rounded-md text-[10px] font-bold"
                                >
                                    {selectedTask.category}
                                </span>
                                <span className={`text-xs ${muted}`}>
                                    · Repeats: {selectedTask.frequency_type === 'custom'
                                        ? `Every ${selectedTask.frequency_x_times || 2} days`
                                        : selectedTask.frequency_type?.replace('_', ' ')}
                                </span>
                                {selectedTask.end_date && (
                                    <span className="flex items-center gap-1 text-xs text-amber-400">
                                        <FiCalendar size={12} /> Repeat until {selectedTask.end_date}
                                    </span>
                                )}
                                {!selectedTask.is_active ? (
                                    <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-slate-500/10 text-slate-400 border border-slate-500/20">
                                        Ended
                                    </span>
                                ) : selectedTask.is_paused ? (
                                    <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                        Paused
                                    </span>
                                ) : (
                                    <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                        Active
                                    </span>
                                )}
                            </div>
                        )}
                    </div>

                    {/* ── Stat Cards for Selected Task ── */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className={`rounded-2xl border p-4 ${card}`}>
                            <div className="flex items-center gap-1.5 mb-1 text-amber-400">
                                <FiZap size={14} />
                                <span className="text-[10px] font-bold uppercase tracking-wider">Current Streak</span>
                            </div>
                            <p className="text-2xl font-bold">{streaks.current}d</p>
                            <p className={`text-[10px] mt-0.5 truncate ${muted}`}>
                                {selectedTask ? 'Consecutive days' : 'Any task'}
                            </p>
                        </div>

                        <div className={`rounded-2xl border p-4 ${card}`}>
                            <div className="flex items-center gap-1.5 mb-1 text-emerald-400">
                                <FiAward size={14} />
                                <span className="text-[10px] font-bold uppercase tracking-wider">Best Streak</span>
                            </div>
                            <p className="text-2xl font-bold">{streaks.best}d</p>
                            <p className={`text-[10px] mt-0.5 truncate ${muted}`}>
                                All-time record
                            </p>
                        </div>

                        <div className={`rounded-2xl border p-4 ${card}`}>
                            <div className="flex items-center gap-1.5 mb-1 text-indigo-400">
                                <FiActivity size={14} />
                                <span className="text-[10px] font-bold uppercase tracking-wider">
                                    {selectedTask ? 'Total Completed' : 'Total Tasks'}
                                </span>
                            </div>
                            <p className="text-2xl font-bold">
                                {selectedTask ? selectedTaskTotalCompletions : allTasks.length}
                            </p>
                            <p className={`text-[10px] mt-0.5 truncate ${muted}`}>
                                {selectedTask ? 'Days logged' : 'Configured'}
                            </p>
                        </div>

                        <div className={`rounded-2xl border p-4 ${card}`}>
                            <div className="flex items-center gap-1.5 mb-1 text-teal-400">
                                <FiTrendingUp size={14} />
                                <span className="text-[10px] font-bold uppercase tracking-wider">Done Today</span>
                            </div>
                            <p className="text-2xl font-bold">
                                {selectedTask
                                    ? (activeHeatmapCounts[todayStr] ? '1/1' : '0/1')
                                    : `${todayCompleted}/${todayTotal}`
                                }
                            </p>
                            <p className={`text-[10px] mt-0.5 truncate ${muted}`}>
                                {selectedTask
                                    ? (activeHeatmapCounts[todayStr] ? 'Completed today' : 'Pending today')
                                    : 'All today tasks'
                                }
                            </p>
                        </div>
                    </div>

                    {/* ── Weekly Activity 7-Day Chart (Current Week & Navigation) ── */}
                    <div className={`rounded-2xl border p-5 ${card}`}>
                        <WeeklyActivityChart
                            counts={activeHeatmapCounts}
                            isDark={isDark}
                            color={selectedTask?.color || '#10b981'}
                            todayStr={todayStr}
                            onDayClick={handleDayClickFromHeatmap}
                        />
                    </div>

                    {/* ── Dynamic Heatmap Card (Month Calendar vs 12-Month Grid) ── */}
                    <div className={`rounded-2xl border p-5 ${card}`}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                            <div>
                                <h3 className="font-bold text-sm sm:text-base flex items-center gap-2">
                                    <FiActivity size={16} className="text-emerald-400" />
                                    {selectedTask
                                        ? `"${selectedTask.title}" · Habit Heatmap`
                                        : 'All Tasks Combined · Habit Heatmap'
                                    }
                                </h3>
                                <p className={`text-xs mt-0.5 ${muted}`}>
                                    {heatmapViewMode === 'month'
                                        ? 'Calendar view with day-by-day consistency and task completion badges.'
                                        : 'Full 12-month bird’s-eye contribution history.'
                                    }
                                </p>
                            </div>

                            {/* View Switcher: Month View vs 12 Months (Year) */}
                            <div className="flex items-center gap-2 flex-wrap">
                                <div className={`flex gap-1 p-1 rounded-xl border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'}`}>
                                    <button
                                        type="button"
                                        onClick={() => setHeatmapViewMode('month')}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                                            heatmapViewMode === 'month'
                                                ? 'bg-emerald-500 text-white shadow-sm font-bold'
                                                : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
                                        }`}
                                    >
                                        <FiCalendar size={13} />
                                        <span>Month View</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setHeatmapViewMode('year')}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                                            heatmapViewMode === 'year'
                                                ? 'bg-emerald-500 text-white shadow-sm font-bold'
                                                : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
                                        }`}
                                    >
                                        <FiBarChart2 size={13} />
                                        <span>12 Months (Year)</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {loading && <div className={`text-sm py-8 text-center ${muted}`}>Loading habit history…</div>}

                        {!loading && heatmapData && heatmapViewMode === 'month' && (
                            <MonthHeatmap
                                counts={activeHeatmapCounts}
                                isDark={isDark}
                                customColor={selectedTask?.color || undefined}
                                year={heatmapYear}
                                month={heatmapMonth}
                                todayStr={todayStr}
                                onPrevMonth={handlePrevHeatmapMonth}
                                onNextMonth={handleNextHeatmapMonth}
                                onGoToCurrentMonth={handleGoToCurrentHeatmapMonth}
                                canGoNext={!(heatmapYear === new Date().getFullYear() && heatmapMonth >= new Date().getMonth())}
                                onDayClick={handleDayClickFromHeatmap}
                            />
                        )}

                        {!loading && heatmapData && heatmapViewMode === 'year' && (
                            <ContributionHeatmap
                                counts={activeHeatmapCounts}
                                isDark={isDark}
                                customColor={selectedTask?.color || undefined}
                            />
                        )}

                        {!loading && !heatmapData && (
                            <div className={`text-sm ${muted}`}>No completion data yet. Check off some tasks to start your heatmap!</div>
                        )}
                    </div>

                    {/* Category breakdown */}
                    {allTasks.length > 0 && (
                        <div className={`rounded-2xl border p-5 ${card}`}>
                            <h3 className="font-bold text-sm mb-4">Task Category Breakdown</h3>
                            <div className="space-y-2">
                                {CATEGORIES.map(cat => {
                                    const count = allTasks.filter(t => t.category === cat).length;
                                    if (count === 0) return null;
                                    const pct = Math.round((count / allTasks.length) * 100);
                                    return (
                                        <div key={cat} className="flex items-center gap-3">
                                            <span className={`w-20 text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{cat}</span>
                                            <div className={`flex-1 h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
                                                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                                            </div>
                                            <span className={`text-xs w-8 text-right ${muted}`}>{count}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ── Modal ── */}
            {showModal && (
                <AddEditTaskModal
                    isDark={isDark}
                    task={editingTask}
                    defaultFrequency={modalDefaultFreq}
                    onClose={() => { setShowModal(false); setEditingTask(undefined); }}
                    onSave={handleSaveTask}
                />
            )}
        </div>
    );
}
