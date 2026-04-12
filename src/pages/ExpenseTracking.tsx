import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAccountTypes } from "../hooks/useAccountTypes";
import { useTheme } from "../contexts/ThemeContext";
import * as XLSX from 'xlsx';
import {
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
    LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';

type Category = {
    id: number;
    name: string;
};

type Expense = {
    id: string;
    amount: number;
    date: string;
    item: string;
    description: string | null;
    category_id: number | null;
    account_type: string;
    categories: Category | null;
};

type EditingExpense = {
    id: string;
    date: string;
    item: string;
    description: string;
    category_id: string;
    account_type: string;
    amount: string;
};

type CategoryTotal = {
    categoryId: number;
    categoryName: string;
    total: number;
};

type AccountTotal = {
    accountType: string;
    total: number;
};

type PeriodTotal = {
    period: string; // Day for monthly, Month for yearly
    label: string;
    total: number;
};

const currencyFormatter = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
});

const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];

const ExpenseTracking = () => {
    const { accountTypes } = useAccountTypes();
    const { theme } = useTheme();
    const [viewMode, setViewMode] = useState<"daily" | "weekly" | "monthly" | "yearly">("monthly");
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    });
    const [selectedYear, setSelectedYear] = useState(() => {
        return new Date().getFullYear().toString();
    });
    const [selectedDate, setSelectedDate] = useState(() => {
        return new Date().toISOString().slice(0, 10);
    });
    const [selectedWeekStart, setSelectedWeekStart] = useState(() => {
        const today = new Date();
        const day = today.getDay();
        const diff = today.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(today);
        monday.setDate(diff);
        return monday.toISOString().slice(0, 10);
    });
    const [weekInputValue, setWeekInputValue] = useState(() => {
        const today = new Date();
        const day = today.getDay();
        const diff = today.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(today);
        monday.setDate(diff);
        const year = monday.getFullYear();
        const startOfYear = new Date(year, 0, 1);
        const weekNum = Math.ceil(((monday.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);
        return `${year}-W${String(weekNum).padStart(2, '0')}`;
    });

    // Editing State
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingData, setEditingData] = useState<EditingExpense | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        setError(null);

        try {
            // Fetch categories
            const categoriesData = await api.get('/api/categories');
            setCategories(categoriesData || []);

            let startDate, endDate;

            if (viewMode === "daily") {
                startDate = selectedDate;
                const d = new Date(selectedDate);
                d.setDate(d.getDate() + 1);
                endDate = d.toISOString().slice(0, 10);
            } else if (viewMode === "weekly") {
                startDate = selectedWeekStart;
                const d = new Date(selectedWeekStart);
                d.setDate(d.getDate() + 7);
                endDate = d.toISOString().slice(0, 10);
            } else if (viewMode === "monthly") {
                const [year, month] = selectedMonth.split("-").map(Number);
                startDate = `${year}-${String(month).padStart(2, "0")}-01`;
                const nextMonth = month === 12 ? 1 : month + 1;
                const nextYear = month === 12 ? year + 1 : year;
                endDate = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;
            } else {
                const year = Number(selectedYear);
                startDate = `${year}-01-01`;
                endDate = `${year + 1}-01-01`;
            }

            const data = await api.get(`/api/expenses?startDate=${startDate}&endDate=${endDate}`);

            const typedData = (data || []).map((exp: any) => ({
                ...exp,
                categories: Array.isArray(exp.categories)
                    ? exp.categories[0] || null
                    : exp.categories || null,
            })) as Expense[];

            setExpenses(typedData);
        } catch (err: any) {
            if (err.status !== 401) {
                setError(err.message || "Failed to fetch expenses");
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [viewMode, selectedMonth, selectedYear, selectedDate, selectedWeekStart]);

    // Management Logic
    const handleEdit = (expense: Expense) => {
        setEditingId(expense.id);
        setEditingData({
            id: expense.id,
            date: expense.date,
            item: expense.item,
            description: expense.description || "",
            category_id: expense.category_id?.toString() || "",
            account_type: expense.account_type,
            amount: expense.amount.toString(),
        });
        setSuccess(null);
        setError(null);
        setIsModalOpen(true);
    };

    const handleCancel = () => {
        setEditingId(null);
        setEditingData(null);
        setIsModalOpen(false);
        setError(null);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this expense?")) return;

        try {
            setError(null);
            await api.delete(`/api/expenses?id=${id}`);
            setSuccess("Expense deleted successfully");
            setExpenses(prev => prev.filter(e => e.id !== id));
            setTimeout(() => setSuccess(null), 3000);
        } catch (err: any) {
            setError(err.message || "Failed to delete expense");
        }
    };

    const handleSave = async () => {
        if (!editingData || !editingId) return;

        if (!editingData.item.trim() || !editingData.amount || Number(editingData.amount) <= 0) {
            setError("Please provide a valid item name and amount.");
            return;
        }

        setSaving(true);
        setError(null);

        try {
            await api.put('/api/expenses', {
                id: editingId,
                date: editingData.date,
                item: editingData.item.trim(),
                description: editingData.description.trim() || null,
                amount: Number(editingData.amount),
                account_type: editingData.account_type,
                category_id: editingData.category_id ? Number(editingData.category_id) : null,
            });

            setSuccess("Expense updated successfully");
            setIsModalOpen(false);
            fetchData(); // Refresh everything
            setTimeout(() => setSuccess(null), 3000);
        } catch (err: any) {
            setError(err.message || "Failed to update expense");
        } finally {
            setSaving(false);
        }
    };

    // Calculations
    const categoryTotals: CategoryTotal[] = expenses.reduce((acc, exp) => {
        const categoryId = exp.category_id || 0;
        const categoryName = exp.categories?.name || "Uncategorized";
        const existing = acc.find((item) => item.categoryId === categoryId);
        if (existing) {
            existing.total += exp.amount;
        } else {
            acc.push({ categoryId, categoryName, total: exp.amount });
        }
        return acc;
    }, [] as CategoryTotal[]);

    categoryTotals.sort((a, b) => b.total - a.total);

    const accountTotals: AccountTotal[] = accountTypes.map((type) => {
        const total = expenses
            .filter((exp) => exp.account_type === type)
            .reduce((sum, exp) => sum + exp.amount, 0);
        return { accountType: type, total };
    }).filter((acc) => acc.total > 0);

    accountTotals.sort((a, b) => b.total - a.total);

    const grandTotal = expenses.reduce((sum, exp) => sum + exp.amount, 0);

    const periodData: PeriodTotal[] = (() => {
        if (viewMode === "daily") {
            return categoryTotals.map(c => ({
                period: c.categoryName,
                label: c.categoryName,
                total: c.total,
            }));
        } else if (viewMode === "weekly") {
            const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
            return Array.from({ length: 7 }, (_, i) => {
                const d = new Date(selectedWeekStart);
                d.setDate(d.getDate() + i);
                const dateStr = d.toISOString().slice(0, 10);
                const total = expenses
                    .filter(e => e.date === dateStr)
                    .reduce((sum, e) => sum + e.amount, 0);
                const shortDate = `${d.getDate()}/${d.getMonth() + 1}`;
                return { period: DAY_NAMES[i], label: `${DAY_NAMES[i]} (${shortDate})`, total };
            });
        } else if (viewMode === "monthly") {
            const [year, month] = selectedMonth.split("-").map(Number);
            const daysInMonth = new Date(year, month, 0).getDate();
            return Array.from({ length: daysInMonth }, (_, i) => {
                const day = i + 1;
                const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const total = expenses
                    .filter(e => e.date === dateStr)
                    .reduce((sum, e) => sum + e.amount, 0);
                return { period: String(day), label: `${MONTH_NAMES[month - 1]} ${day}`, total };
            });
        } else {
            return MONTH_NAMES.map((name, index) => {
                const monthNum = index + 1;
                const total = expenses
                    .filter(e => new Date(e.date).getMonth() + 1 === monthNum)
                    .reduce((sum, e) => sum + e.amount, 0);
                return { period: name, label: name, total };
            });
        }
    })();

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const recordsPerPage = 15;
    const totalPages = Math.ceil(expenses.length / recordsPerPage);
    const indexOfLastRecord = currentPage * recordsPerPage;
    const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
    const currentExpenses = expenses.slice(indexOfFirstRecord, indexOfLastRecord);

    useEffect(() => {
        setCurrentPage(1);
    }, [viewMode, selectedMonth, selectedYear, selectedDate, selectedWeekStart]);

    const handleExport = () => {
        const exportData = expenses.map(exp => ({
            Date: new Date(exp.date).toLocaleDateString('en-IN'),
            Item: exp.item,
            Category: exp.categories?.name || "Uncategorized",
            Account: exp.account_type,
            Amount: exp.amount,
            Description: exp.description || ""
        }));

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Expenses");
        const wscols = [{ wch: 12 }, { wch: 25 }, { wch: 20 }, { wch: 15 }, { wch: 12 }, { wch: 30 }];
        worksheet['!cols'] = wscols;

        const fileName =
            viewMode === "daily"   ? `Expenses_${selectedDate}.xlsx` :
            viewMode === "weekly"  ? `Expenses_Week_${selectedWeekStart}.xlsx` :
            viewMode === "monthly" ? `Expenses_${selectedMonth}.xlsx` :
                                     `Expenses_${selectedYear}.xlsx`;
        XLSX.writeFile(workbook, fileName);
    };

    return (
        <div className="pb-24 pt-8 md:pb-8">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between animate-fade-in">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <span className="p-2 bg-emerald-500/10 rounded-lg">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500"><rect width="20" height="14" x="2" y="5" rx="2" /><line x1="2" x2="22" y1="10" y2="10" /></svg>
                            </span>
                            <h1 className="text-3xl font-bold font-heading text-white">Expense Tracking</h1>
                        </div>
                        <p className="text-slate-400">
                            Manage and analyze{
                                viewMode === "daily"   ? " today's" :
                                viewMode === "weekly"  ? " this week's" :
                                viewMode === "monthly" ? " monthly" : " yearly"
                            } spendings
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                        <div className="flex p-1 bg-slate-700/50 backdrop-blur rounded-xl border border-white/5">
                            <button
                                id="view-mode-daily"
                                onClick={() => setViewMode("daily")}
                                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${viewMode === "daily" ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20" : "text-slate-400 hover:text-white"}`}
                            >
                                Daily
                            </button>
                            <button
                                id="view-mode-weekly"
                                onClick={() => setViewMode("weekly")}
                                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${viewMode === "weekly" ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20" : "text-slate-400 hover:text-white"}`}
                            >
                                Weekly
                            </button>
                            <button
                                id="view-mode-monthly"
                                onClick={() => setViewMode("monthly")}
                                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${viewMode === "monthly" ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20" : "text-slate-400 hover:text-white"}`}
                            >
                                Monthly
                            </button>
                            <button
                                id="view-mode-yearly"
                                onClick={() => setViewMode("yearly")}
                                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${viewMode === "yearly" ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20" : "text-slate-400 hover:text-white"}`}
                            >
                                Yearly
                            </button>
                        </div>

                        {viewMode === "daily" && (
                            <input
                                id="date-picker-daily"
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                style={{ colorScheme: theme }}
                                className="w-full sm:w-auto rounded-xl border border-white/10 bg-slate-700/50 backdrop-blur px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 cursor-pointer"
                            />
                        )}

                        {viewMode === "weekly" && (
                            <input
                                id="date-picker-weekly"
                                type="week"
                                value={weekInputValue}
                                onChange={(e) => {
                                    const val = e.target.value; // e.g. "2026-W14"
                                    setWeekInputValue(val);
                                    const [yearStr, weekStr] = val.split("-W");
                                    const year = parseInt(yearStr);
                                    const week = parseInt(weekStr);
                                    // ISO 8601 week to date (Monday)
                                    const jan4 = new Date(year, 0, 4);
                                    const startOfWeek1 = new Date(jan4);
                                    startOfWeek1.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7));
                                    const monday = new Date(startOfWeek1);
                                    monday.setDate(startOfWeek1.getDate() + (week - 1) * 7);
                                    setSelectedWeekStart(monday.toISOString().slice(0, 10));
                                }}
                                style={{ colorScheme: theme }}
                                className="w-full sm:w-auto rounded-xl border border-white/10 bg-slate-700/50 backdrop-blur px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 cursor-pointer"
                            />
                        )}

                        {viewMode === "monthly" && (
                            <input
                                id="date-picker-monthly"
                                type="month"
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                                style={{ colorScheme: theme }}
                                className="w-full sm:w-auto rounded-xl border border-white/10 bg-slate-700/50 backdrop-blur px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 cursor-pointer"
                            />
                        )}

                        {viewMode === "yearly" && (
                            <input
                                id="date-picker-yearly"
                                type="number"
                                min="2000"
                                max="2100"
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(e.target.value)}
                                className="w-full sm:w-auto rounded-xl border border-white/10 bg-slate-700/50 backdrop-blur px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 cursor-pointer"
                            />
                        )}
                    </div>
                </div>

                {error && (
                    <div className="mb-6 glass-card border-red-500/20 bg-red-500/10 p-4 text-red-300 text-sm">
                        {error}
                    </div>
                )}

                {success && (
                    <div className="mb-6 glass-card border-emerald-500/20 bg-emerald-500/10 p-4 text-emerald-300 text-sm animate-fade-in text-center font-semibold">
                        {success}
                    </div>
                )}

                {loading ? (
                    <div className="grid gap-6 md:grid-cols-3">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="h-32 animate-pulse rounded-3xl bg-slate-700/50" />
                        ))}
                    </div>
                ) : (
                    <div className="space-y-8 animate-fade-in">
                        {expenses.length === 0 ? (
                            <div className="glass-card p-12 text-center border-emerald-500/10">
                                <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500"><line x1="18" x2="18" y1="20" y2="10" /><line x1="12" x2="12" y1="20" y2="4" /><line x1="6" x2="6" y1="20" y2="14" /></svg>
                                </div>
                                <h3 className="text-lg font-bold text-white mb-2">No Expenses Found</h3>
                                <p className="text-slate-400">No data for the selected period.</p>
                            </div>
                        ) : (
                            <>
                                <div className="glass-card p-8 bg-gradient-to-r from-emerald-600/20 to-teal-600/20 border-emerald-500/30 relative overflow-hidden">
                                    <div className="relative z-10">
                                        <p className="text-sm font-medium text-emerald-200 mb-2 uppercase tracking-widest text-shadow-sm">Total Spendings</p>
                                        <div className="text-5xl font-bold text-white font-heading tracking-tight sm:text-6xl drop-shadow-lg">
                                            {currencyFormatter.format(grandTotal)}
                                        </div>
                                    </div>
                                    <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/20 rounded-full blur-[100px] -mr-20 -mt-20 pointer-events-none opacity-50"></div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {/* Daily Trend — NAV Style */}
                                    <div className="glass-card p-8 bg-slate-800/10 border-white/5 relative overflow-hidden group">
                                        <div className="flex justify-between items-start mb-8">
                                            <div>
                                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Daily Spend Tracker</p>
                                                <h3 className="text-2xl font-bold text-white font-heading">Financial Trend</h3>
                                            </div>
                                            <div className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-black border border-emerald-500/20 uppercase">
                                                NAV Style
                                            </div>
                                        </div>
                                        <div className="h-[280px] w-full">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <LineChart data={periodData}>
                                                    <defs>
                                                        <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                                        </linearGradient>
                                                    </defs>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} vertical={false} />
                                                    <XAxis 
                                                        dataKey="period" 
                                                        stroke="#475569" 
                                                        fontSize={10} 
                                                        tickLine={false} 
                                                        axisLine={false} 
                                                        dy={10}
                                                        tickFormatter={(val) => viewMode === "monthly" ? val : val.slice(0,3)}
                                                    />
                                                    <YAxis hide domain={['auto', 'auto']} />
                                                    <Tooltip 
                                                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.5)' }} 
                                                        itemStyle={{ color: '#10b981', fontWeight: 'bold' }}
                                                        labelStyle={{ color: '#64748b', fontSize: '10px', textTransform: 'uppercase', marginBottom: '4px' }}
                                                        formatter={(val: any) => [currencyFormatter.format(val), 'Spent']}
                                                    />
                                                    <Line 
                                                        type="monotone" 
                                                        dataKey="total" 
                                                        stroke="#10b981" 
                                                        strokeWidth={4} 
                                                        dot={false} 
                                                        activeDot={{ r: 6, fill: '#10b981', stroke: '#0f172a', strokeWidth: 2 }}
                                                        animationDuration={2000}
                                                    />
                                                </LineChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>

                                    {/* Weekly Comparison */}
                                    <div className="glass-card p-8 bg-slate-800/10 border-white/5 relative overflow-hidden group">
                                        <div className="flex justify-between items-start mb-8">
                                            <div>
                                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Weekly Tracker</p>
                                                <h3 className="text-2xl font-bold text-white font-heading">Spend Intensity</h3>
                                            </div>
                                            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 20v-6M6 20V10M18 20V4"/></svg>
                                            </div>
                                        </div>
                                        <div className="h-[280px] w-full">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={periodData.filter((_, i) => viewMode === 'monthly' ? i % 7 === 0 : true)}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} vertical={false} />
                                                    <XAxis dataKey="period" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} dy={10} />
                                                    <YAxis hide />
                                                    <Tooltip 
                                                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', color: '#f8fafc' }}
                                                        itemStyle={{ color: '#f59e0b', fontWeight: 'bold' }}
                                                        labelStyle={{ color: '#64748b', fontSize: '10px', textTransform: 'uppercase' as const }}
                                                        formatter={(val: any) => [currencyFormatter.format(val), 'Total']}
                                                    />
                                                    <Bar dataKey="total" fill="url(#barGradient)" radius={[6, 6, 0, 0]} animationDuration={1500}>
                                                        <defs>
                                                            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                                                <stop offset="0%" stopColor="#f59e0b" stopOpacity={1}/>
                                                                <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.3}/>
                                                            </linearGradient>
                                                        </defs>
                                                        {periodData.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={entry.total > (grandTotal / periodData.length) * 1.5 ? '#f43f5e' : '#f59e0b'} />
                                                        ))}
                                                    </Bar>
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                </div>

                                {/* Category Intensity (Pie) */}
                                <div className="glass-card p-6 bg-slate-800/10 border-white/5">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-2 h-8 bg-emerald-500 rounded-full" />
                                        <h3 className="text-lg font-bold text-white font-heading uppercase tracking-widest">Category Distribution</h3>
                                    </div>
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
                                        <div className="lg:col-span-1 h-[250px]">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={categoryTotals.map(c => ({ name: c.categoryName, value: c.total }))}
                                                        cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={2} dataKey="value"
                                                    >
                                                        {categoryTotals.map((_, index) => (
                                                            <Cell key={`cell-${index}`} fill={['#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#3b82f6'][index % 5]} stroke="none" />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px', color: '#f8fafc' }} itemStyle={{ color: '#94a3b8' }} labelStyle={{ color: '#f8fafc' }} formatter={(v: any) => currencyFormatter.format(v)} />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                        <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-4">
                                            {categoryTotals.slice(0, 6).map((c, i) => (
                                                <div key={c.categoryId} className="p-4 rounded-3xl bg-slate-800/40 border border-white/5 group hover:border-emerald-500/30 transition-all">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ['#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#3b82f6'][i % 5] }} />
                                                        <p className="text-[10px] font-bold text-slate-500 uppercase truncate">{c.categoryName}</p>
                                                    </div>
                                                    <p className="text-sm font-bold text-white font-mono">{currencyFormatter.format(c.total)}</p>
                                                    <p className="text-[9px] text-slate-600 mt-1">{((c.total / grandTotal) * 100).toFixed(1)}% of total</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="glass-card p-0 overflow-hidden">
                                    <div className="border-b border-white/5 bg-slate-700/40 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div className="flex items-center gap-3">
                                            <h2 className="text-lg font-bold text-white font-heading">Expense History</h2>
                                            <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                                                {expenses.length} Records
                                            </span>
                                        </div>
                                        <button onClick={handleExport} className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500/10 px-5 py-2.5 text-sm font-bold text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-all shadow-lg shadow-emerald-500/5">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                            Download Excel
                                        </button>
                                    </div>
                                    {/* Desktop Table View */}
                                    <div className="hidden md:block overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead>
                                                <tr className="border-b border-white/5 bg-slate-700/40 text-[11px] font-bold uppercase tracking-widest text-slate-500">
                                                    <th className="px-6 py-4">Date</th>
                                                    <th className="px-6 py-4">Item</th>
                                                    <th className="px-6 py-4">Category</th>
                                                    <th className="px-6 py-4">Account</th>
                                                    <th className="px-6 py-4">Description</th>
                                                    <th className="px-6 py-4 text-right">Amount</th>
                                                    <th className="px-6 py-4 text-center">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {currentExpenses.map((exp) => (
                                                    <tr key={exp.id} className="group hover:bg-white/5 transition-colors">
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">{new Date(exp.date).toLocaleDateString("en-IN", { day: '2-digit', month: 'short' })}</td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{exp.item}</td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <span className="inline-flex px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 uppercase">
                                                                {exp.categories?.name || "Uncategorized"}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500 uppercase tracking-tighter">{exp.account_type}</td>
                                                        <td className="px-6 py-4 text-sm text-slate-400 max-w-[150px] truncate" title={exp.description || ""}>
                                                            {exp.description || "-"}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-white font-mono">{currencyFormatter.format(exp.amount)}</td>
                                                        <td className="px-6 py-4 text-center">
                                                            <div className="flex items-center justify-center gap-2 transition-all">
                                                                <button onClick={() => handleEdit(exp)} className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-600 hover:text-white transition-all"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg></button>
                                                                <button onClick={() => handleDelete(exp.id)} className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-600 hover:text-white transition-all"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Mobile Cards View */}
                                    <div className="md:hidden divide-y divide-white/5">
                                        {currentExpenses.map((exp) => (
                                            <div key={exp.id} className="p-4 hover:bg-slate-700/30 transition-colors">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div>
                                                        <h4 className="text-sm font-bold text-white mb-1">{exp.item}</h4>
                                                        <div className="flex items-center gap-2 text-xs">
                                                            <span className="text-slate-400">{new Date(exp.date).toLocaleDateString("en-IN", { day: '2-digit', month: 'short' })}</span>
                                                            <span className="text-slate-600">•</span>
                                                            <span className="inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-300 uppercase">
                                                                {exp.categories?.name || "Uncategorized"}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-sm font-bold text-white font-mono">{currencyFormatter.format(exp.amount)}</div>
                                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter block mt-0.5">{exp.account_type}</span>
                                                    </div>
                                                </div>
                                                {/* Description if present */}
                                                {(exp.description) && (
                                                    <div className="text-xs text-slate-500 mb-3 border-l-2 border-white/10 pl-2">
                                                        {exp.description}
                                                    </div>
                                                )}
                                                <div className="flex items-center justify-end gap-2 pt-3 mt-1">
                                                    <button onClick={() => handleEdit(exp)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-600 hover:text-white transition-all text-xs font-bold">
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg> Edit
                                                    </button>
                                                    <button onClick={() => handleDelete(exp.id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-600 hover:text-white transition-all text-xs font-bold">
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg> Delete
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {totalPages > 1 && (
                                        <div className="border-t border-white/5 bg-slate-700/40 px-6 py-4 flex items-center justify-between">
                                            <p className="text-xs font-medium text-slate-500">Page {currentPage} of {totalPages}</p>
                                            <div className="flex gap-2">
                                                <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="rounded-lg bg-slate-700 px-4 py-1.5 text-xs font-bold text-slate-300 transition hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed border border-white/5">Prev</button>
                                                <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="rounded-lg bg-slate-700 px-4 py-1.5 text-xs font-bold text-slate-300 transition hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed border border-white/5">Next</button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Edit Modal */}
            {isModalOpen && editingData && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-700/80 backdrop-blur-sm px-4 animate-fade-in shadow-2xl">
                    <div className="w-full max-w-xl glass-card p-6 sm:p-8 animate-float-slow transform transition-all shadow-emerald-500/10">
                        <div className="mb-6 flex items-start justify-between gap-4">
                            <div>
                                <p className="text-[10px] uppercase tracking-widest text-emerald-400 mb-1 font-bold">Quick Edit</p>
                                <h3 className="text-2xl font-bold text-white font-heading">{editingData.item}</h3>
                            </div>
                            <button onClick={handleCancel} className="rounded-full p-2 bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-all">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <div className="space-y-5">
                            <div className="grid gap-5 sm:grid-cols-2">
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Date</label>
                                    <input type="date" value={editingData.date} onChange={(e) => setEditingData({ ...editingData, date: e.target.value })} className="w-full rounded-xl border border-white/10 bg-slate-700/50 backdrop-blur px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Amount (₹)</label>
                                    <input type="number" value={editingData.amount} onChange={(e) => setEditingData({ ...editingData, amount: e.target.value })} className="w-full rounded-xl border border-white/10 bg-slate-700/50 backdrop-blur px-4 py-2.5 text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 font-mono" />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Item Name</label>
                                <input type="text" value={editingData.item} onChange={(e) => setEditingData({ ...editingData, item: e.target.value })} className="w-full rounded-xl border border-white/10 bg-slate-700/50 backdrop-blur px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
                            </div>

                            <div className="grid gap-5 sm:grid-cols-2">
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Category</label>
                                    <select value={editingData.category_id} onChange={(e) => setEditingData({ ...editingData, category_id: e.target.value })} className="w-full rounded-xl border border-white/10 bg-slate-700/50 backdrop-blur px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 appearance-none cursor-pointer">
                                        <option value="">Uncategorized</option>
                                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Account</label>
                                    <select value={editingData.account_type} onChange={(e) => setEditingData({ ...editingData, account_type: e.target.value })} className="w-full rounded-xl border border-white/10 bg-slate-700/50 backdrop-blur px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 appearance-none cursor-pointer">
                                        {accountTypes.map(at => <option key={at} value={at}>{at}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Description</label>
                                <textarea value={editingData.description} onChange={(e) => setEditingData({ ...editingData, description: e.target.value })} rows={2} className="w-full rounded-xl border border-white/10 bg-slate-700/50 backdrop-blur px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 resize-none" />
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <button onClick={handleCancel} disabled={saving} className="rounded-xl px-6 py-2.5 text-xs font-bold text-slate-500 hover:text-white hover:bg-white/5 transition-all">Cancel</button>
                                <button onClick={handleSave} disabled={saving} className="rounded-xl bg-emerald-600 px-8 py-2.5 text-xs font-bold text-white shadow-xl shadow-emerald-600/20 hover:bg-emerald-500 transition-all disabled:opacity-50">{saving ? "Saving..." : "Apply Changes"}</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExpenseTracking;
