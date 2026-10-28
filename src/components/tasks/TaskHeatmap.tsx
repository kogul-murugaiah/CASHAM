import { useState, useMemo } from 'react';
import { FiCheckCircle, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { getLocalDateStr } from '../../hooks/useTasks';
import { SchedulableTask, isTaskScheduledOnDate } from './taskConstants';

// ─── Heatmap cell color ──────────────────────────────────────────────────────
export function heatColor(count: number, isDark: boolean, customColor?: string): string {
    if (count === 0) return isDark ? '#1e293b' : '#f1f5f9';
    if (customColor) return customColor;
    if (count === 1) return '#bbf7d0';
    if (count === 2) return '#4ade80';
    if (count === 3) return '#22c55e';
    return '#16a34a';
}

// ─── Generate 52 weeks (Monday to Sunday) grid ending on the current week ──────
export function buildHeatmapGrid(): string[] {
    const today = new Date();
    // Monday-based week: 0 for Mon, ..., 6 for Sun
    const dow = today.getDay();
    const diffToMonday = dow === 0 ? 6 : dow - 1;

    // Current week's Monday
    const currentMonday = new Date(today);
    currentMonday.setDate(today.getDate() - diffToMonday);

    // 52 weeks total (51 past weeks + current week), starting 51 weeks before current Monday
    const startMonday = new Date(currentMonday);
    startMonday.setDate(currentMonday.getDate() - 51 * 7);

    // 52 weeks * 7 days = 364 days total
    const dates: string[] = [];
    for (let i = 0; i < 52 * 7; i++) {
        const d = new Date(startMonday);
        d.setDate(startMonday.getDate() + i);
        dates.push(getLocalDateStr(d));
    }
    return dates;
}

// ─── Streak calculation ──────────────────────────────────────────────────────
export function calcStreaks(
    counts: Record<string, number | undefined>,
    task?: SchedulableTask | null
): { current: number; best: number } {
    const today = getLocalDateStr();
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = getLocalDateStr(yesterdayDate);

    const dates = buildHeatmapGrid().filter(d => d <= today);

    // If no specific task is provided, use the standard calendar-day streak (all repeating habits combined)
    if (!task) {
        let best = 0;
        let temp = 0;
        for (const d of dates) {
            if ((counts[d] || 0) > 0) {
                temp++;
                if (temp > best) best = temp;
            } else {
                temp = 0;
            }
        }

        let current = 0;
        const hasToday = (counts[today] || 0) > 0;
        const hasYesterday = (counts[yesterday] || 0) > 0;

        if (hasToday) {
            const allDates = [...dates].reverse();
            for (const d of allDates) {
                if ((counts[d] || 0) > 0) current++;
                else break;
            }
        } else if (hasYesterday) {
            const allDates = [...dates].filter(d => d <= yesterday).reverse();
            for (const d of allDates) {
                if ((counts[d] || 0) > 0) current++;
                else break;
            }
        } else {
            current = 0;
        }

        return { current, best };
    }

    // Task-specific streak calculation: evaluates scheduled days + bonus completions without breaking flow
    // A date is considered an evaluation checkpoint if:
    // 1. It is a scheduled day for the task, OR
    // 2. The user completed the task on that day (bonus completion on rest day - preserves/advances flow)
    const relevantDates = dates.filter(d => isTaskScheduledOnDate(task, d) || (counts[d] || 0) > 0);

    if (relevantDates.length === 0) {
        return { current: 0, best: 0 };
    }

    // 1. Best Streak (consecutive completed scheduled/bonus sessions)
    let best = 0;
    let temp = 0;
    for (const d of relevantDates) {
        if ((counts[d] || 0) > 0) {
            temp++;
            if (temp > best) best = temp;
        } else {
            // Only reset if date is in the past; if it's today and pending, don't reset ongoing streak
            if (d < today) {
                temp = 0;
            }
        }
    }

    // 2. Current Streak
    let current = 0;
    const isTodayScheduled = isTaskScheduledOnDate(task, today);
    const hasToday = (counts[today] || 0) > 0;

    const pastRelevant = relevantDates.filter(d => d < today).reverse();
    const lastPastDate = pastRelevant[0];

    if (hasToday) {
        // Completed today! Count backwards including today
        const rev = [...relevantDates].reverse();
        for (const d of rev) {
            if ((counts[d] || 0) > 0) current++;
            else break;
        }
    } else if (isTodayScheduled) {
        // Today is scheduled but not completed yet. Day is ongoing.
        // Check if the previous session was completed:
        if (lastPastDate && (counts[lastPastDate] || 0) > 0) {
            for (const d of pastRelevant) {
                if ((counts[d] || 0) > 0) current++;
                else break;
            }
        } else {
            current = 0;
        }
    } else {
        // Today is a REST DAY (not scheduled, not completed today)
        // Check if the previous scheduled session was completed:
        if (lastPastDate && (counts[lastPastDate] || 0) > 0) {
            for (const d of pastRelevant) {
                if ((counts[d] || 0) > 0) current++;
                else break;
            }
        } else {
            current = 0;
        }
    }

    return { current, best };
}


// ─── Month Heatmap Calendar ──────────────────────────────────────────────────
export interface MonthHeatmapProps {
    counts: Record<string, number | undefined>;
    isDark: boolean;
    customColor?: string;
    year: number;
    month: number; // 0-indexed: 0 = Jan, 9 = Oct
    todayStr: string;
    onPrevMonth: () => void;
    onNextMonth: () => void;
    onGoToCurrentMonth: () => void;
    canGoNext: boolean;
    onDayClick?: (dateStr: string) => void;
    task?: SchedulableTask | null;
}

export function MonthHeatmap({
    counts,
    isDark,
    customColor,
    year,
    month,
    todayStr,
    onPrevMonth,
    onNextMonth,
    onGoToCurrentMonth,
    canGoNext,
    onDayClick,
    task,
}: MonthHeatmapProps) {
    const monthDate = useMemo(() => new Date(year, month, 1), [year, month]);
    const monthName = useMemo(() => monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }), [monthDate]);

    const items = useMemo(() => {
        const total = new Date(year, month + 1, 0).getDate();
        const firstDow = new Date(year, month, 1).getDay(); // 0 = Sun
        const list: ({ day: number; dateStr: string } | null)[] = [];
        for (let i = 0; i < firstDow; i++) {
            list.push(null);
        }
        for (let d = 1; d <= total; d++) {
            const mStr = String(month + 1).padStart(2, '0');
            const dStr = String(d).padStart(2, '0');
            list.push({
                day: d,
                dateStr: `${year}-${mStr}-${dStr}`,
            });
        }
        return list;
    }, [year, month]);

    const [nowY, nowM] = useMemo(() => {
        const d = new Date();
        return [d.getFullYear(), d.getMonth()];
    }, []);
    const isCurrentMonth = year === nowY && month === nowM;

    // Monthly stats
    const { activeDaysCount, daysPassed, consistencyPct, totalCompletions, bestStreak } = useMemo(() => {
        const validDates = items.filter(Boolean).map(x => x!.dateStr).filter(d => d <= todayStr);
        const total = validDates.reduce((acc, d) => acc + (counts[d] || 0), 0);

        if (task) {
            // Task-specific monthly stats
            const scheduledPastOrToday = validDates.filter(d => isTaskScheduledOnDate(task, d));
            const activeScheduled = scheduledPastOrToday.filter(d => (counts[d] || 0) > 0).length;
            const bonusCompleted = validDates.filter(d => !isTaskScheduledOnDate(task, d) && (counts[d] || 0) > 0).length;
            const active = activeScheduled + bonusCompleted;
            const scheduledTarget = scheduledPastOrToday.length;
            const pct = scheduledTarget > 0 ? Math.min(100, Math.round((activeScheduled / scheduledTarget) * 100)) : (active > 0 ? 100 : 0);

            // Month best streak for this task
            const relevantMonthDates = validDates.filter(d => isTaskScheduledOnDate(task, d) || (counts[d] || 0) > 0);
            let maxS = 0;
            let curS = 0;
            for (const d of relevantMonthDates) {
                if ((counts[d] || 0) > 0) {
                    curS++;
                    if (curS > maxS) maxS = curS;
                } else if (d < todayStr) {
                    curS = 0;
                }
            }

            return {
                activeDaysCount: active,
                daysPassed: scheduledTarget,
                consistencyPct: pct,
                totalCompletions: total,
                bestStreak: maxS,
            };
        }

        const active = validDates.filter(d => (counts[d] || 0) > 0).length;
        const pct = validDates.length > 0 ? Math.round((active / validDates.length) * 100) : 0;

        let maxS = 0;
        let curS = 0;
        for (const d of validDates) {
            if ((counts[d] || 0) > 0) {
                curS++;
                if (curS > maxS) maxS = curS;
            } else {
                curS = 0;
            }
        }

        return {
            activeDaysCount: active,
            daysPassed: validDates.length,
            consistencyPct: pct,
            totalCompletions: total,
            bestStreak: maxS,
        };
    }, [items, counts, todayStr, task]);


    const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const muted = isDark ? 'text-slate-400' : 'text-slate-500';

    return (
        <div className="space-y-4">
            {/* ── Month Navigation & Stats Header ── */}
            <div className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                isDark ? 'bg-slate-800/40 border-slate-700/60' : 'bg-slate-50 border-slate-200'
            }`}>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={onPrevMonth}
                        title="Previous Month"
                        className={`p-1.5 rounded-lg border transition-all ${
                            isDark ? 'border-slate-700 hover:bg-slate-800 text-slate-300' : 'border-slate-200 hover:bg-white text-slate-700'
                        }`}
                    >
                        <FiChevronLeft size={16} />
                    </button>

                    <h4 className="font-bold text-sm tracking-tight px-1">
                        {monthName}
                    </h4>

                    <button
                        type="button"
                        onClick={onNextMonth}
                        disabled={!canGoNext}
                        title="Next Month"
                        className={`p-1.5 rounded-lg border transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
                            isDark ? 'border-slate-700 hover:bg-slate-800 text-slate-300' : 'border-slate-200 hover:bg-white text-slate-700'
                        }`}
                    >
                        <FiChevronRight size={16} />
                    </button>

                    {!isCurrentMonth && (
                        <button
                            type="button"
                            onClick={onGoToCurrentMonth}
                            className="text-xs text-emerald-400 hover:underline font-semibold ml-1.5"
                        >
                            Jump to Current Month
                        </button>
                    )}
                </div>

                {/* Quick month metrics */}
                <div className="flex items-center gap-3 text-xs flex-wrap">
                    <div className="flex items-center gap-1">
                        <span className={muted}>{task ? 'Scheduled Done:' : 'Active Days:'}</span>
                        <strong className="text-emerald-400">{activeDaysCount}/{daysPassed}{task ? ' sessions' : 'd'}</strong>
                    </div>
                    <div className="flex items-center gap-1">
                        <span className={muted}>Consistency:</span>
                        <strong className="text-emerald-400">{consistencyPct}%</strong>
                    </div>
                    <div className="flex items-center gap-1">
                        <span className={muted}>Completions:</span>
                        <strong className={isDark ? 'text-white' : 'text-slate-900'}>{totalCompletions}</strong>
                    </div>
                    {bestStreak > 0 && (
                        <div className="flex items-center gap-1">
                            <span className={muted}>Best Streak:</span>
                            <strong className="text-amber-400">🔥 {bestStreak}d</strong>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Calendar Grid ── */}
            <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-800/20 border-slate-700/60' : 'bg-white border-slate-200'}`}>
                {/* Day of Week Headers */}
                <div className="grid grid-cols-7 gap-1.5 sm:gap-2 mb-2">
                    {dayHeaders.map((dh, i) => (
                        <div
                            key={dh}
                            className={`text-center text-[11px] font-bold py-1 ${
                                i === 0 || i === 6
                                    ? isDark ? 'text-slate-500' : 'text-slate-400'
                                    : isDark ? 'text-slate-400' : 'text-slate-600'
                            }`}
                        >
                            {dh}
                        </div>
                    ))}
                </div>

                {/* Day Cells */}
                <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                    {items.map((item, idx) => {
                        if (!item) {
                            return <div key={`empty-${idx}`} className="h-14 sm:h-16 rounded-xl opacity-0" />;
                        }

                        const { day, dateStr } = item;
                        const count = counts[dateStr] || 0;
                        const done = count > 0;
                        const isToday = dateStr === todayStr;
                        const isFuture = dateStr > todayStr;
                        const isScheduled = task ? isTaskScheduledOnDate(task, dateStr) : true;

                        let bgCls = '';
                        let borderCls = '';
                        if (done) {
                            bgCls = isDark ? 'bg-emerald-500/15' : 'bg-emerald-50';
                            borderCls = isDark ? 'border-emerald-500/30' : 'border-emerald-300';
                        } else if (isFuture) {
                            bgCls = isDark ? 'bg-slate-900/30 opacity-40' : 'bg-slate-50/50 opacity-40';
                            borderCls = isDark ? 'border-slate-800' : 'border-slate-200';
                        } else if (task && !isScheduled) {
                            // Rest day in the past or today
                            bgCls = isDark ? 'bg-slate-900/20' : 'bg-slate-50/50';
                            borderCls = isDark ? 'border-slate-800/60' : 'border-slate-100';
                        } else {
                            bgCls = isDark ? 'bg-slate-900/40' : 'bg-slate-50';
                            borderCls = isDark ? 'border-slate-800 hover:border-slate-700' : 'border-slate-200 hover:border-slate-300';
                        }

                        const dayTooltip = `${dateStr}: ${
                            done
                                ? `${count} completed${task && !isScheduled ? ' (Bonus)' : ''}`
                                : isFuture
                                    ? (task && !isScheduled ? 'Rest day' : 'Upcoming')
                                    : (task && !isScheduled ? 'Rest day (not scheduled)' : 'None completed')
                        }`;

                        return (
                            <button
                                key={dateStr}
                                type="button"
                                disabled={isFuture}
                                onClick={() => onDayClick?.(dateStr)}
                                title={dayTooltip}
                                className={`h-14 sm:h-16 p-1.5 sm:p-2 rounded-xl border flex flex-col justify-between text-left transition-all ${bgCls} ${borderCls} ${
                                    isToday ? 'ring-2 ring-emerald-400 ring-offset-1' : ''
                                } ${isFuture ? 'cursor-not-allowed' : 'cursor-pointer hover:scale-[1.02]'}`}
                            >
                                <div className="flex items-center justify-between">
                                    <span className={`text-xs font-bold ${
                                        isToday
                                            ? 'text-emerald-400 font-extrabold'
                                            : done
                                                ? isDark ? 'text-white' : 'text-slate-900'
                                                : isDark ? 'text-slate-400' : 'text-slate-600'
                                    }`}>
                                        {day}
                                    </span>
                                    {isToday && (
                                        <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-400">
                                            Today
                                        </span>
                                    )}
                                </div>

                                <div className="flex items-center justify-between">
                                    {done ? (
                                        <div className="flex items-center gap-1 text-[10px] sm:text-[11px] font-bold" style={{ color: customColor || '#10b981' }}>
                                            <FiCheckCircle size={12} className="flex-shrink-0" />
                                            <span className="truncate">
                                                {customColor ? (task && !isScheduled ? 'Bonus' : 'Done') : `${count} task${count > 1 ? 's' : ''}`}
                                            </span>
                                        </div>
                                    ) : isFuture ? (
                                        <span className={`text-[9px] sm:text-[10px] ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
                                            {task && !isScheduled ? 'Rest' : 'Upcoming'}
                                        </span>
                                    ) : task && !isScheduled ? (
                                        <span className={`text-[9px] font-semibold italic ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                            Rest
                                        </span>
                                    ) : (
                                        <span className={`text-[10px] ${isDark ? 'text-slate-700' : 'text-slate-300'}`}>
                                            —
                                        </span>
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Click tip */}
            <p className={`text-[11px] text-center pt-1 ${muted}`}>
                Tip: Click any day in the calendar to jump to its focus list and review or log tasks.
            </p>
        </div>
    );
}

// ─── Heatmap (52-week horizontal grid) ───────────────────────────────────────
export function ContributionHeatmap({
    counts,
    isDark,
    customColor
}: {
    counts: Record<string, number | undefined>;
    isDark: boolean;
    customColor?: string;
}) {
    const todayStr = useMemo(() => getLocalDateStr(), []);
    const grid = useMemo(() => buildHeatmapGrid(), []);
    const weeks: string[][] = [];
    for (let i = 0; i < grid.length; i += 7) {
        weeks.push(grid.slice(i, i + 7));
    }
    const monthLabels: { label: string; col: number }[] = [];
    weeks.forEach((week, wi) => {
        const [y, m, dayNum] = week[0].split('-').map(Number);
        const d = new Date(y, m - 1, dayNum);
        if (wi === 0 || dayNum <= 7) {
            const label = d.toLocaleDateString('en-US', { month: 'short' });
            if (monthLabels.length === 0 || monthLabels[monthLabels.length - 1].label !== label) {
                monthLabels.push({ label, col: wi });
            }
        }
    });

    return (
        <div className="overflow-x-auto">
            {/* Month labels */}
            <div className="flex mb-1 pl-8">
                {monthLabels.map(({ label, col }, i) => (
                    <div
                        key={i}
                        className={`text-[10px] font-semibold ${isDark ? 'text-slate-500' : 'text-slate-400'}`}
                        style={{ marginLeft: i === 0 ? `${col * 14}px` : `${(col - (monthLabels[i - 1]?.col || 0)) * 14 - 24}px`, minWidth: 24 }}
                    >
                        {label}
                    </div>
                ))}
            </div>

            <div className="flex gap-0.5">
                {/* Day labels: Mon to Sun with M, W, F labeled */}
                <div className="flex flex-col gap-0.5 mr-1 pt-0">
                    {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                        <div key={i} className={`w-3 h-3 text-[9px] flex items-center justify-center ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
                            {i === 0 || i === 2 || i === 4 ? d : ''}
                        </div>
                    ))}
                </div>

                {/* Grid */}
                {weeks.map((week, wi) => (
                    <div key={wi} className="flex flex-col gap-0.5">
                        {week.map(date => {
                            const isToday = date === todayStr;
                            const isFuture = date > todayStr;
                            const c = counts[date] || 0;
                            return (
                                <div
                                    key={date}
                                    title={`${date}${isToday ? ' (Today)' : ''}: ${isFuture ? 'Upcoming' : c > 0 ? (customColor ? 'Completed' : `${c} task${c > 1 ? 's' : ''}`) : 'No completions'}`}
                                    className={`w-3 h-3 rounded-sm transition-all cursor-default ${
                                        isToday ? 'ring-1 ring-emerald-400 ring-offset-1' : ''
                                    } ${
                                        isFuture ? 'opacity-25' : 'hover:ring-1 hover:ring-emerald-400'
                                    }`}
                                    style={{
                                        backgroundColor: isFuture
                                            ? (isDark ? '#1e293b' : '#f1f5f9')
                                            : heatColor(c, isDark, c > 0 ? customColor : undefined)
                                    }}
                                />
                            );
                        })}
                    </div>
                ))}
            </div>

            {/* Legend */}
            <div className={`flex items-center gap-1.5 mt-2 text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                <span>Less</span>
                {customColor ? (
                    <>
                        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: heatColor(0, isDark) }} />
                        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: customColor }} />
                    </>
                ) : (
                    [0, 1, 2, 3, 5].map(v => (
                        <div key={v} className="w-3 h-3 rounded-sm" style={{ backgroundColor: heatColor(v, isDark) }} />
                    ))
                )}
                <span>More</span>
            </div>
        </div>
    );
}

// ─── Weekly Activity Chart (Current Week & Previous Weeks) ───────────────────
export interface WeeklyActivityProps {
    counts: Record<string, number | undefined>;
    isDark: boolean;
    color?: string;
    todayStr: string;
    onDayClick?: (dateStr: string) => void;
    task?: SchedulableTask | null;
}

export function WeeklyActivityChart({ counts, isDark, color = '#10b981', todayStr, onDayClick, task }: WeeklyActivityProps) {
    const [weekOffset, setWeekOffset] = useState<number>(0);

    const { days, rangeLabel, isCurrentWeek, totalTasksThisWeek, activeDaysCount, elapsedDays, bestDay, maxCountInWeek, scheduledActiveCount, scheduledElapsedCount } = useMemo(() => {
        const [ty, tm, td] = todayStr.split('-').map(Number);
        const today = new Date(ty, tm - 1, td);

        // Monday-based week (0 for Mon, ..., 6 for Sun)
        const dow = today.getDay();
        const diffToMonday = dow === 0 ? 6 : dow - 1;

        const monday = new Date(today);
        monday.setDate(today.getDate() - diffToMonday + (weekOffset * 7));

        const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        type DayActivity = {
            name: string;
            dateStr: string;
            dayNum: number;
            monthShort: string;
            count: number;
            isToday: boolean;
            isPast: boolean;
            isFuture: boolean;
            isScheduled: boolean;
        };
        const result: DayActivity[] = [];
        let maxVal = 1;

        for (let i = 0; i < 7; i++) {
            const d = new Date(monday);
            d.setDate(monday.getDate() + i);
            const dateStr = getLocalDateStr(d);
            const count = counts[dateStr] || 0;
            if (count > maxVal) maxVal = count;

            result.push({
                name: dayNames[i],
                dateStr,
                dayNum: d.getDate(),
                monthShort: d.toLocaleDateString('en-US', { month: 'short' }),
                count,
                isToday: dateStr === todayStr,
                isPast: dateStr < todayStr,
                isFuture: dateStr > todayStr,
                isScheduled: task ? isTaskScheduledOnDate(task, dateStr) : true,
            });
        }

        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);

        const rLabel = `${monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

        const totalThisWeek = result.reduce((s, d) => s + d.count, 0);
        const activeDays = result.filter(d => d.count > 0).length;
        const elapsed = weekOffset === 0 ? Math.min(7, (dow === 0 ? 7 : dow)) : 7;

        const schedActive = result.filter(d => d.count > 0 && d.isScheduled).length;
        const bonusActive = result.filter(d => d.count > 0 && !d.isScheduled).length;
        const schedElapsed = result.filter(d => d.isScheduled && !d.isFuture).length;

        const bDay = result.reduce<{ name: string; count: number } | null>((acc, d) => {
            if (d.count > 0 && (!acc || d.count > acc.count)) {
                return { name: d.name, count: d.count };
            }
            return acc;
        }, null);

        return {
            days: result,
            rangeLabel: rLabel,
            isCurrentWeek: weekOffset === 0,
            totalTasksThisWeek: totalThisWeek,
            activeDaysCount: activeDays,
            elapsedDays: elapsed,
            bestDay: bDay,
            maxCountInWeek: maxVal,
            scheduledActiveCount: schedActive + bonusActive,
            scheduledElapsedCount: schedElapsed,
        };
    }, [counts, todayStr, weekOffset, task]);


    const trackBg = isDark ? 'bg-slate-900/80 border border-slate-700/60' : 'bg-slate-100 border border-slate-200';
    const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';

    return (
        <div className={`p-5 rounded-2xl border ${isDark ? 'bg-slate-800/40 border-slate-700/60' : 'bg-white border-slate-200'} space-y-4`}>
            {/* Header with Week Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm tracking-tight">
                            Weekly Activity
                        </h4>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${
                            isCurrentWeek
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                                : isDark ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                            {rangeLabel}
                        </span>
                    </div>
                    <p className={`text-xs mt-0.5 ${textMuted}`}>
                        {isCurrentWeek
                            ? "Track your daily momentum for the current week (Monday to Sunday)."
                            : `Daily performance recorded for ${rangeLabel}.`
                        }
                    </p>
                </div>

                {/* Week Navigator */}
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setWeekOffset(w => w - 1)}
                        title="Previous Week"
                        className={`p-1.5 px-2.5 rounded-lg border text-xs font-semibold transition-all flex items-center gap-1 ${
                            isDark ? 'border-slate-700 hover:bg-slate-800 text-slate-300' : 'border-slate-200 hover:bg-slate-100 text-slate-700'
                        }`}
                    >
                        <FiChevronLeft size={14} />
                        <span>Last Week</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setWeekOffset(w => Math.min(0, w + 1))}
                        disabled={isCurrentWeek}
                        title="Next Week"
                        className={`p-1.5 px-2.5 rounded-lg border text-xs font-semibold transition-all flex items-center gap-1 disabled:opacity-30 disabled:cursor-not-allowed ${
                            isDark ? 'border-slate-700 hover:bg-slate-800 text-slate-300' : 'border-slate-200 hover:bg-slate-100 text-slate-700'
                        }`}
                    >
                        <span>Next Week</span>
                        <FiChevronRight size={14} />
                    </button>

                    {!isCurrentWeek && (
                        <button
                            type="button"
                            onClick={() => setWeekOffset(0)}
                            className="text-xs text-emerald-400 hover:underline font-semibold ml-1"
                        >
                            This Week
                        </button>
                    )}
                </div>
            </div>

            {/* Quick Summary Row */}
            <div className="flex items-center gap-3 text-xs pt-0.5 flex-wrap">
                <div className="flex items-center gap-1">
                    <span className={textMuted}>Tasks Done:</span>
                    <strong className="text-emerald-400">{totalTasksThisWeek}</strong>
                </div>
                <div className="flex items-center gap-1">
                    <span className={textMuted}>{task ? 'Target Sessions:' : 'Active Days:'}</span>
                    <strong className="text-emerald-400">
                        {task
                            ? `${scheduledActiveCount} / ${scheduledElapsedCount} sessions`
                            : `${activeDaysCount} / ${elapsedDays} days`}
                    </strong>
                </div>
                {bestDay && (
                    <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <span>Best Day:</span>
                        <span className="font-bold">{bestDay.name} ({bestDay.count} {bestDay.count === 1 ? 'task' : 'tasks'})</span>
                    </div>
                )}
            </div>

            {/* 7 Columns for Monday to Sunday */}
            <div className="grid grid-cols-7 gap-1.5 sm:gap-3 pt-2">
                {days.map((d) => {
                    const done = d.count > 0;
                    const barHeightPct = done ? Math.max(18, Math.round((d.count / maxCountInWeek) * 100)) : (d.isToday ? 8 : 4);

                    return (
                        <button
                            key={d.dateStr}
                            type="button"
                            onClick={() => onDayClick?.(d.dateStr)}
                            title={`${d.name}, ${d.monthShort} ${d.dayNum}: ${
                                done
                                    ? `${d.count} completed${task && !d.isScheduled ? ' (Bonus)' : ''}`
                                    : d.isFuture
                                        ? (task && !d.isScheduled ? 'Rest day' : 'Upcoming')
                                        : (task && !d.isScheduled ? 'Rest day' : '0 completed')
                            }. Click to view focus.`}
                            className={`flex flex-col items-center gap-2 group p-2 rounded-xl border transition-all cursor-pointer ${
                                d.isToday
                                    ? 'ring-2 ring-emerald-400/80 ring-offset-1 bg-emerald-500/5 border-emerald-500/30'
                                    : isDark ? 'border-transparent hover:bg-slate-800/40 hover:border-slate-700/50' : 'border-transparent hover:bg-slate-50 hover:border-slate-200'
                            }`}
                        >
                            {/* Top: Actual Task Count */}
                            <span className={`text-[11px] font-bold transition-transform group-hover:scale-105 ${
                                done
                                    ? 'text-emerald-400 font-extrabold'
                                    : d.isToday
                                        ? (task && !d.isScheduled ? 'text-slate-400 font-medium' : 'text-amber-400 font-semibold')
                                        : d.isFuture
                                            ? textMuted + ' opacity-40'
                                            : textMuted
                            }`}>
                                {done
                                    ? (task && !d.isScheduled ? 'Bonus 1' : `${d.count} ${d.count === 1 ? 'task' : 'tasks'}`)
                                    : d.isToday
                                        ? (task && !d.isScheduled ? 'Rest' : '0 today')
                                        : d.isFuture
                                            ? (task && !d.isScheduled ? 'Rest' : '—')
                                            : (task && !d.isScheduled ? 'Rest' : '0')
                                }
                            </span>

                            {/* Bar Track */}
                            <div className={`w-full max-w-[48px] h-28 rounded-xl ${trackBg} p-1 flex flex-col justify-end relative overflow-hidden transition-all group-hover:ring-1 group-hover:ring-emerald-400/40 shadow-inner`}>
                                <div
                                    className="w-full rounded-lg transition-all duration-700 relative"
                                    style={{
                                        height: `${barHeightPct}%`,
                                        backgroundColor: color,
                                        opacity: done ? 1 : (d.isToday ? 0.35 : 0.12),
                                    }}
                                />
                            </div>

                            {/* Bottom: Day name & date */}
                            <div className="text-center">
                                <p className={`text-xs font-bold ${
                                    d.isToday
                                        ? 'text-emerald-400 font-extrabold'
                                        : isDark ? 'text-slate-200' : 'text-slate-800'
                                }`}>
                                    {d.name}
                                </p>
                                <p className={`text-[10px] ${textMuted}`}>
                                    {d.dayNum}
                                </p>
                                {d.isToday && (
                                    <span className="inline-block mt-0.5 text-[8px] font-black uppercase px-1 rounded bg-emerald-500 text-white leading-tight">
                                        Today
                                    </span>
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Click Tip */}
            <p className={`text-[11px] text-center pt-1 ${textMuted}`}>
                Tip: Click any day bar to jump to its daily focus list and review or log tasks.
            </p>
        </div>
    );
}
