import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAccountTypes } from "../hooks/useAccountTypes";
import * as XLSX from 'xlsx';
import {
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
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
    const [viewMode, setViewMode] = useState<"monthly" | "yearly">("monthly");
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

    // Editing State
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingData, setEditingData] = useState<EditingExpense | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        setError(null);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("User not authenticated");

            // Fetch categories
            const { data: categoriesData } = await supabase
                .from("categories")
                .select("*")
                .order("name");
            setCategories(categoriesData || []);

            let startDate, endDate;

            if (viewMode === "monthly") {
                const [year, month] = selectedMonth.split("-").map(Number);
                startDate = `${year}-${String(month).padStart(2, "0")}-01`;
                endDate = new Date(year, month, 0).toISOString().split("T")[0];
            } else {
                const year = Number(selectedYear);
                startDate = `${year}-01-01`;
                endDate = `${year}-12-31`;
            }

            const { data, error } = await supabase
                .from("expenses")
                .select(`
          id,
          amount,
          date,
          item,
          description,
          category_id,
          account_type,
          categories (
            id,
            name
          )
        `)
                .eq("user_id", user.id)
                .gte("date", startDate)
                .lte("date", endDate)
                .order("date", { ascending: false });

            if (error) throw error;

            const typedData = (data || []).map((exp: any) => ({
                ...exp,
                categories: Array.isArray(exp.categories)
                    ? exp.categories[0] || null
                    : exp.categories || null,
            })) as Expense[];

            setExpenses(typedData);
        } catch (err: any) {
            setError(err.message || "Failed to fetch expenses");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [viewMode, selectedMonth, selectedYear]);

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
            const { error } = await supabase.from("expenses").delete().eq("id", id);
            if (error) throw error;
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
            const { error } = await supabase
                .from("expenses")
                .update({
                    date: editingData.date,
                    item: editingData.item.trim(),
                    description: editingData.description.trim() || null,
                    amount: Number(editingData.amount),
                    account_type: editingData.account_type,
                    category_id: editingData.category_id ? Number(editingData.category_id) : null,
                })
                .eq("id", editingId);

            if (error) throw error;

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
        if (viewMode === "monthly") {
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
    }, [viewMode, selectedMonth, selectedYear]);

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

        const fileName = viewMode === "monthly" ? `Expenses_${selectedMonth}.xlsx` : `Expenses_${selectedYear}.xlsx`;
        XLSX.writeFile(workbook, fileName);
    };

    return (
        <div className="pb-24 pt-8 md:pb-8">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between animate-fade-in">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <span className="p-2 bg-blue-500/10 rounded-lg text-xl">💸</span>
                            <h1 className="text-3xl font-bold font-heading text-white">Expense Tracking</h1>
                        </div>
                        <p className="text-slate-400">
                            Manage and analyze {viewMode === "monthly" ? "monthly" : "yearly"} spendings
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                        <div className="flex p-1 bg-slate-900/50 backdrop-blur rounded-xl border border-white/5">
                            <button
                                onClick={() => setViewMode("monthly")}
                                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${viewMode === "monthly" ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "text-slate-400 hover:text-white"}`}
                            >
                                Monthly
                            </button>
                            <button
                                onClick={() => setViewMode("yearly")}
                                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${viewMode === "yearly" ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "text-slate-400 hover:text-white"}`}
                            >
                                Yearly
                            </button>
                        </div>

                        {viewMode === "monthly" ? (
                            <input
                                type="month"
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                                style={{ colorScheme: "dark" }}
                                className="w-full sm:w-auto rounded-xl border border-white/10 bg-slate-900/50 backdrop-blur px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer"
                            />
                        ) : (
                            <input
                                type="number"
                                min="2000"
                                max="2100"
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(e.target.value)}
                                className="w-full sm:w-auto rounded-xl border border-white/10 bg-slate-900/50 backdrop-blur px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer"
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
                            <div key={i} className="h-32 animate-pulse rounded-3xl bg-slate-800/50" />
                        ))}
                    </div>
                ) : (
                    <div className="space-y-8 animate-fade-in">
                        {expenses.length === 0 ? (
                            <div className="glass-card p-12 text-center border-blue-500/10">
                                <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <span className="text-2xl">📊</span>
                                </div>
                                <h3 className="text-lg font-bold text-white mb-2">No Expenses Found</h3>
                                <p className="text-slate-400">No data for the selected period.</p>
                            </div>
                        ) : (
                            <>
                                <div className="glass-card p-8 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 border-blue-500/30 relative overflow-hidden">
                                    <div className="relative z-10">
                                        <p className="text-sm font-medium text-blue-200 mb-2 uppercase tracking-widest text-shadow-sm">Total Spendings</p>
                                        <div className="text-5xl font-bold text-white font-heading tracking-tight sm:text-6xl drop-shadow-lg">
                                            {currencyFormatter.format(grandTotal)}
                                        </div>
                                    </div>
                                    <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/20 rounded-full blur-[100px] -mr-20 -mt-20 pointer-events-none opacity-50"></div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <div className="glass-card p-6">
                                        <h3 className="text-lg font-bold text-white mb-6 font-heading">Category Distribution</h3>
                                        <div className="h-[300px] w-full">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={categoryTotals.map(c => ({ name: c.categoryName, value: c.total }))}
                                                        cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={4} dataKey="value"
                                                    >
                                                        {categoryTotals.map((_, index) => {
                                                            const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#6366f1'];
                                                            return <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(0,0,0,0)" />;
                                                        })}
                                                    </Pie>
                                                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#f8fafc' }} formatter={(val: any) => currencyFormatter.format(val)} />
                                                    <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>

                                    <div className="glass-card p-6">
                                        <h3 className="text-lg font-bold text-white mb-6 font-heading">{viewMode === "monthly" ? "Daily Trend" : "Monthly Trend"}</h3>
                                        <div className="h-[300px] w-full">
                                            <ResponsiveContainer width="100%" height="100%">
                                                {viewMode === "monthly" ? (
                                                    <LineChart data={periodData}>
                                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} vertical={false} />
                                                        <XAxis dataKey="period" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                                                        <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `₹${val}`} />
                                                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} formatter={(val: any) => currencyFormatter.format(val)} />
                                                        <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6' }} activeDot={{ r: 6 }} />
                                                    </LineChart>
                                                ) : (
                                                    <BarChart data={periodData}>
                                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} vertical={false} />
                                                        <XAxis dataKey="period" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => val.slice(0, 3)} dy={10} />
                                                        <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `₹${val}`} />
                                                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} formatter={(val: any) => currencyFormatter.format(val)} />
                                                        <Bar dataKey="total" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                                                    </BarChart>
                                                )}
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                </div>

                                <div className="glass-card p-0 overflow-hidden">
                                    <div className="border-b border-white/5 bg-slate-900/40 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div className="flex items-center gap-3">
                                            <h2 className="text-lg font-bold text-white font-heading">Expense History</h2>
                                            <span className="text-xs font-semibold text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-full border border-blue-500/20">
                                                {expenses.length} Records
                                            </span>
                                        </div>
                                        <button onClick={handleExport} className="flex items-center justify-center gap-2 rounded-xl bg-blue-500/10 px-5 py-2.5 text-sm font-bold text-blue-400 border border-blue-500/20 hover:bg-blue-500 hover:text-white transition-all shadow-lg shadow-blue-500/5">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                            Download Excel
                                        </button>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead>
                                                <tr className="border-b border-white/5 bg-slate-900/40 text-[11px] font-bold uppercase tracking-widest text-slate-500">
                                                    <th className="px-6 py-4">Date</th>
                                                    <th className="px-6 py-4">Item</th>
                                                    <th className="px-6 py-4">Category</th>
                                                    <th className="px-6 py-4">Account</th>
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
                                                            <span className="inline-flex px-2 py-0.5 rounded-lg text-[10px] font-bold bg-blue-500/10 text-blue-300 border border-blue-500/20 uppercase">
                                                                {exp.categories?.name || "Uncategorized"}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500 uppercase tracking-tighter">{exp.account_type}</td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-white font-mono">{currencyFormatter.format(exp.amount)}</td>
                                                        <td className="px-6 py-4 text-center">
                                                            <div className="flex items-center justify-center gap-2 transition-all">
                                                                <button onClick={() => handleEdit(exp)} className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-600 hover:text-white transition-all"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg></button>
                                                                <button onClick={() => handleDelete(exp.id)} className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-600 hover:text-white transition-all"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {totalPages > 1 && (
                                        <div className="border-t border-white/5 bg-slate-900/40 px-6 py-4 flex items-center justify-between">
                                            <p className="text-xs font-medium text-slate-500">Page {currentPage} of {totalPages}</p>
                                            <div className="flex gap-2">
                                                <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="rounded-lg bg-slate-800 px-4 py-1.5 text-xs font-bold text-slate-300 transition hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed border border-white/5">Prev</button>
                                                <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="rounded-lg bg-slate-800 px-4 py-1.5 text-xs font-bold text-slate-300 transition hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed border border-white/5">Next</button>
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
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm px-4 animate-fade-in shadow-2xl">
                    <div className="w-full max-w-xl glass-card p-6 sm:p-8 animate-float-slow transform transition-all shadow-blue-500/10">
                        <div className="mb-6 flex items-start justify-between gap-4">
                            <div>
                                <p className="text-[10px] uppercase tracking-widest text-blue-400 mb-1 font-bold">Quick Edit</p>
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
                                    <input type="date" value={editingData.date} onChange={(e) => setEditingData({ ...editingData, date: e.target.value })} className="w-full rounded-xl border border-white/10 bg-slate-900/50 backdrop-blur px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Amount (₹)</label>
                                    <input type="number" value={editingData.amount} onChange={(e) => setEditingData({ ...editingData, amount: e.target.value })} className="w-full rounded-xl border border-white/10 bg-slate-900/50 backdrop-blur px-4 py-2.5 text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 font-mono" />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Item Name</label>
                                <input type="text" value={editingData.item} onChange={(e) => setEditingData({ ...editingData, item: e.target.value })} className="w-full rounded-xl border border-white/10 bg-slate-900/50 backdrop-blur px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                            </div>

                            <div className="grid gap-5 sm:grid-cols-2">
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Category</label>
                                    <select value={editingData.category_id} onChange={(e) => setEditingData({ ...editingData, category_id: e.target.value })} className="w-full rounded-xl border border-white/10 bg-slate-900/50 backdrop-blur px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 appearance-none cursor-pointer">
                                        <option value="">Uncategorized</option>
                                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Account</label>
                                    <select value={editingData.account_type} onChange={(e) => setEditingData({ ...editingData, account_type: e.target.value })} className="w-full rounded-xl border border-white/10 bg-slate-900/50 backdrop-blur px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 appearance-none cursor-pointer">
                                        {accountTypes.map(at => <option key={at} value={at}>{at}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Description</label>
                                <textarea value={editingData.description} onChange={(e) => setEditingData({ ...editingData, description: e.target.value })} rows={2} className="w-full rounded-xl border border-white/10 bg-slate-900/50 backdrop-blur px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none" />
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <button onClick={handleCancel} disabled={saving} className="rounded-xl px-6 py-2.5 text-xs font-bold text-slate-500 hover:text-white hover:bg-white/5 transition-all">Cancel</button>
                                <button onClick={handleSave} disabled={saving} className="rounded-xl bg-blue-600 px-8 py-2.5 text-xs font-bold text-white shadow-xl shadow-blue-600/20 hover:bg-blue-500 transition-all disabled:opacity-50">{saving ? "Saving..." : "Apply Changes"}</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExpenseTracking;
