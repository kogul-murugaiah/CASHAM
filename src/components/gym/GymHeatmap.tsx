import { useState, useMemo } from 'react';
import { FiChevronLeft, FiChevronRight, FiCalendar } from 'react-icons/fi';

interface GymHeatmapProps {
    attendanceDates: string[]; // ['2026-10-15', '2026-11-01', ...]
    isDark?: boolean;
}

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const GymHeatmap: React.FC<GymHeatmapProps> = ({ attendanceDates, isDark }) => {
    const today = new Date();
    const [selectedYear, setSelectedYear] = useState<number>(today.getFullYear());
    const [selectedMonth, setSelectedMonth] = useState<number>(today.getMonth()); // 0-indexed

    const attendanceSet = useMemo(() => new Set(attendanceDates), [attendanceDates]);

    // Calculate days for the selected month calendar
    const calendarDays = useMemo(() => {
        const firstDay = new Date(selectedYear, selectedMonth, 1);
        const lastDay = new Date(selectedYear, selectedMonth + 1, 0);
        const totalDays = lastDay.getDate();

        // Monday-based day of week for 1st of month: 0=Mon, ..., 6=Sun
        const startDayOfWeek = (firstDay.getDay() + 6) % 7;

        const cells: { dateStr: string | null; dayNum: number | null; isAttended: boolean }[] = [];

        // Leading empty cells
        for (let i = 0; i < startDayOfWeek; i++) {
            cells.push({ dateStr: null, dayNum: null, isAttended: false });
        }

        // Days of month
        for (let d = 1; d <= totalDays; d++) {
            const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            cells.push({
                dateStr,
                dayNum: d,
                isAttended: attendanceSet.has(dateStr)
            });
        }

        return cells;
    }, [selectedYear, selectedMonth, attendanceSet]);

    // Monthly attendance count
    const monthPrefix = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;
    const daysAttendedThisMonth = useMemo(() => {
        return attendanceDates.filter(d => d.startsWith(monthPrefix)).length;
    }, [attendanceDates, monthPrefix]);

    const handlePrevMonth = () => {
        if (selectedMonth === 0) {
            setSelectedMonth(11);
            setSelectedYear(y => y - 1);
        } else {
            setSelectedMonth(m => m - 1);
        }
    };

    const handleNextMonth = () => {
        if (selectedMonth === 11) {
            setSelectedMonth(0);
            setSelectedYear(y => y + 1);
        } else {
            setSelectedMonth(m => m + 1);
        }
    };

    return (
        <div className="glass-card p-5 sm:p-6 border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 shadow-sm rounded-2xl">
            {/* Header & Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                <div>
                    <div className="flex items-center gap-2">
                        <FiCalendar className="text-emerald-500" size={18} />
                        <h3 className="text-base font-bold text-slate-900 dark:text-white font-heading">
                            Gym Attendance Calendar
                        </h3>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {daysAttendedThisMonth} workout {daysAttendedThisMonth === 1 ? 'day' : 'days'} in {MONTH_NAMES[selectedMonth]} {selectedYear}
                    </p>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                        type="button"
                        onClick={handlePrevMonth}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-300 transition-colors"
                        title="Previous Month"
                    >
                        <FiChevronLeft size={16} />
                    </button>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 min-w-[100px] text-center font-heading">
                        {MONTH_NAMES[selectedMonth]} {selectedYear}
                    </span>
                    <button
                        type="button"
                        onClick={handleNextMonth}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-300 transition-colors"
                        title="Next Month"
                    >
                        <FiChevronRight size={16} />
                    </button>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2 text-center">
                {/* Day Labels M T W T F S S */}
                {DAY_LABELS.map((label, idx) => (
                    <div
                        key={idx}
                        className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider py-1"
                    >
                        {label}
                    </div>
                ))}

                {/* Day Cells */}
                {calendarDays.map((cell, idx) => {
                    if (!cell.dayNum) {
                        return <div key={`empty-${idx}`} className="h-10 sm:h-12 rounded-xl bg-transparent" />;
                    }

                    const isToday = cell.dateStr === today.toISOString().split('T')[0];

                    return (
                        <div
                            key={cell.dateStr}
                            title={cell.isAttended ? `${cell.dateStr}: Workout Logged 🏋️` : cell.dateStr || ''}
                            className={`h-10 sm:h-12 rounded-xl flex flex-col items-center justify-center relative transition-all border ${
                                cell.isAttended
                                    ? 'bg-emerald-500 text-white font-bold border-emerald-600 shadow-md shadow-emerald-500/20 scale-[1.02]'
                                    : isDark
                                        ? 'bg-slate-700/40 text-slate-400 border-white/5 hover:border-white/15'
                                        : 'bg-slate-50 text-slate-600 border-slate-200/80 hover:border-slate-300'
                            } ${isToday ? 'ring-2 ring-emerald-400/80 ring-offset-1 dark:ring-offset-slate-900' : ''}`}
                        >
                            <span className="text-xs sm:text-sm">{cell.dayNum}</span>
                            {cell.isAttended && (
                                <span className="w-1.5 h-1.5 rounded-full bg-white mt-0.5" />
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Footer Legend */}
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-4 pt-3 border-t border-slate-100 dark:border-white/5">
                <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full ring-2 ring-emerald-400" />
                    <span>Today</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-white/10" />
                        <span>Rest</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded bg-emerald-500 border border-emerald-600 shadow-sm" />
                        <span>Trained</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
