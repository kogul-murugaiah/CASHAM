import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAccountTypes } from "../hooks/useAccountTypes";
import * as XLSX from 'xlsx';
import {
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
    LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';

type IncomeSource = {
    id: number;
    name: string;
};

type Income = {
    id: string;
    source_id: number;
    amount: number;
    date: string;
    account_type: string;
    description: string | null;
    income_sources: IncomeSource | null;
};

type EditingIncome = {
    id: string;
    date: string;
    source_id: string;
    description: string;
    account_type: string;
    amount: string;
};

type SourceTotal = {
    sourceId: number;
    sourceName: string;
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

const IncomeTracking = () => {
    const { accountTypes } = useAccountTypes();
    const [viewMode, setViewMode] = useState<"monthly" | "yearly">("monthly");
    const [records, setRecords] = useState<Income[]>([]);
    const [sources, setSources] = useState<IncomeSource[]>([]);
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
    const [editingData, setEditingData] = useState<EditingIncome | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    const fetchRecords = async () => {
        setLoading(true);
        setError(null);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("User not authenticated");

            // Fetch sources
            const { data: sourcesData } = await supabase
                .from("income_sources")
                .select("*")
                .order("name");
            setSources(sourcesData || []);

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
                .from("income")
                .select(`
          id,
          source_id,
          amount,
          date,
          account_type,
          description,
          income_sources (
            id,
            name
          )
        `)
                .eq("user_id", user.id)
                .gte("date", startDate)
                .lte("date", endDate)
                .order("date", { ascending: false });

            if (error) throw error;

            const typedData = (data || []).map((rec: any) => ({
                ...rec,
                income_sources: Array.isArray(rec.income_sources)
                    ? rec.income_sources[0] || null
                    : rec.income_sources || null,
            })) as Income[];

            setRecords(typedData);
        } catch (err: any) {
            setError(err.message || "Failed to fetch records");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRecords();
    }, [viewMode, selectedMonth, selectedYear]);

    // Management Logic
    const handleEdit = (inc: Income) => {
        setEditingId(inc.id);
        setEditingData({
            id: inc.id,
            date: inc.date,
            source_id: inc.source_id.toString(),
            description: inc.description || "",
            account_type: inc.account_type,
            amount: inc.amount.toString(),
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
        if (!confirm("Delete this income record?")) return;

        try {
            setError(null);
            const { error } = await supabase.from("income").delete().eq("id", id);
            if (error) throw error;
            setSuccess("Income record deleted");
            setRecords(prev => prev.filter(r => r.id !== id));
            setTimeout(() => setSuccess(null), 3000);
        } catch (err: any) {
            setError(err.message || "Failed to delete");
        }
    };

    const handleSave = async () => {
        if (!editingData || !editingId) return;

        if (!editingData.source_id || !editingData.amount || Number(editingData.amount) <= 0) {
            setError("Please select a source and provide a valid amount.");
            return;
        }

        setSaving(true);
        setError(null);

        try {
            const { error } = await supabase
                .from("income")
                .update({
                    date: editingData.date,
                    source_id: Number(editingData.source_id),
                    description: editingData.description.trim() || null,
                    amount: Number(editingData.amount),
                    account_type: editingData.account_type,
                })
                .eq("id", editingId);

            if (error) throw error;

            setSuccess("Income updated successfully");
            setIsModalOpen(false);
            fetchRecords(); // Refresh everything
            setTimeout(() => setSuccess(null), 3000);
        } catch (err: any) {
            setError(err.message || "Failed to update income");
        } finally {
            setSaving(false);
        }
    };

    // Calculations
    const sourceTotals: SourceTotal[] = records.reduce((acc, rec) => {
        const sourceId = rec.source_id;
        const sourceName = rec.income_sources?.name || "Unknown";
        const existing = acc.find((item) => item.sourceId === sourceId);
        if (existing) {
            existing.total += rec.amount;
        } else {
            acc.push({ sourceId, sourceName, total: rec.amount });
        }
        return acc;
    }, [] as SourceTotal[]);

    sourceTotals.sort((a, b) => b.total - a.total);

    const grandTotal = records.reduce((sum, rec) => sum + rec.amount, 0);

    const periodData: PeriodTotal[] = (() => {
        if (viewMode === "monthly") {
            const [year, month] = selectedMonth.split("-").map(Number);
            const daysInMonth = new Date(year, month, 0).getDate();
            return Array.from({ length: daysInMonth }, (_, i) => {
                const day = i + 1;
                const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const total = records
                    .filter(e => e.date === dateStr)
                    .reduce((sum, e) => sum + e.amount, 0);
                return { period: String(day), label: `${MONTH_NAMES[month - 1]} ${day}`, total };
            });
        } else {
            return MONTH_NAMES.map((name, index) => {
                const monthNum = index + 1;
                const total = records
                    .filter(e => new Date(e.date).getMonth() + 1 === monthNum)
                    .reduce((sum, e) => sum + e.amount, 0);
                return { period: name, label: name, total };
            });
        }
    })();

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const recordsPerPage = 15;
    const totalPages = Math.ceil(records.length / recordsPerPage);
    const indexOfLastRecord = currentPage * recordsPerPage;
    const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
    const currentRecords = records.slice(indexOfFirstRecord, indexOfLastRecord);

    useEffect(() => {
        setCurrentPage(1);
    }, [viewMode, selectedMonth, selectedYear]);

    const handleExport = () => {
        const exportData = records.map(rec => ({
            Date: new Date(rec.date).toLocaleDateString('en-IN'),
            Source: rec.income_sources?.name || "Unknown",
            Account: rec.account_type,
            Amount: rec.amount,
            Description: rec.description || ""
        }));

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Income");
        const wscols = [{ wch: 12 }, { wch: 25 }, { wch: 15 }, { wch: 12 }, { wch: 30 }];
        worksheet['!cols'] = wscols;

        const fileName = viewMode === "monthly" ? `Income_${selectedMonth}.xlsx` : `Income_${selectedYear}.xlsx`;
        XLSX.writeFile(workbook, fileName);
    };

    return (
        <div className="pb-24 pt-8 md:pb-8">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between animate-fade-in">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <span className="p-2 bg-emerald-500/10 rounded-lg">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500"><rect width="20" height="12" x="2" y="6" rx="2" /><circle cx="12" cy="12" r="2" /><path d="M6 12h.01M18 12h.01" /></svg>
                            </span>
                            <h1 className="text-3xl font-bold font-heading text-white">Income Tracking</h1>
                        </div>
                        <p className="text-slate-400">
                            Detailed earnings history and analysis
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                        <div className="flex p-1 bg-slate-900/50 backdrop-blur rounded-xl border border-white/5">
                            <button
                                onClick={() => setViewMode("monthly")}
                                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${viewMode === "monthly" ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20" : "text-slate-400 hover:text-white"}`}
                            >
                                Monthly
                            </button>
                            <button
                                onClick={() => setViewMode("yearly")}
                                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${viewMode === "yearly" ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20" : "text-slate-400 hover:text-white"}`}
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
                                className="w-full sm:w-auto rounded-xl border border-white/10 bg-slate-900/50 backdrop-blur px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 cursor-pointer"
                            />
                        ) : (
                            <input
                                type="number"
                                min="2000"
                                max="2100"
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(e.target.value)}
                                className="w-full sm:w-auto rounded-xl border border-white/10 bg-slate-900/50 backdrop-blur px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 cursor-pointer"
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
                    <div className="space-y-8 animate-fade-in text-shadow-sm">
                        {records.length === 0 ? (
                            <div className="glass-card p-12 text-center border-emerald-500/10">
                                <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>
                                </div>
                                <h3 className="text-lg font-bold text-white mb-2">No Records Found</h3>
                                <p className="text-slate-400">No income data for the selected period.</p>
                            </div>
                        ) : (
                            <>
                                <div className="glass-card p-8 bg-gradient-to-r from-emerald-600/20 to-teal-600/20 border-emerald-500/30 relative overflow-hidden">
                                    <div className="relative z-10">
                                        <p className="text-sm font-medium text-emerald-200 mb-2 uppercase tracking-widest">Total Earnings</p>
                                        <div className="text-5xl font-bold text-white font-heading tracking-tight sm:text-6xl drop-shadow-md">
                                            {currencyFormatter.format(grandTotal)}
                                        </div>
                                    </div>
                                    <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/20 rounded-full blur-[100px] -mr-20 -mt-20 pointer-events-none opacity-50"></div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <div className="glass-card p-6">
                                        <h3 className="text-lg font-bold text-white mb-6 font-heading text-shadow-sm">Source Breakdown</h3>
                                        <div className="h-[300px] w-full">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={sourceTotals.map(s => ({ name: s.sourceName, value: s.total }))}
                                                        cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={4} dataKey="value"
                                                    >
                                                        {sourceTotals.map((_, index) => {
                                                            const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];
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
                                        <h3 className="text-lg font-bold text-white mb-6 font-heading text-shadow-sm">{viewMode === "monthly" ? "Daily Trend" : "Monthly Trend"}</h3>
                                        <div className="h-[300px] w-full">
                                            <ResponsiveContainer width="100%" height="100%">
                                                {viewMode === "monthly" ? (
                                                    <LineChart data={periodData}>
                                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} vertical={false} />
                                                        <XAxis dataKey="period" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                                                        <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `₹${val}`} />
                                                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} formatter={(val: any) => currencyFormatter.format(val)} />
                                                        <Line type="monotone" dataKey="total" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981' }} activeDot={{ r: 6 }} />
                                                    </LineChart>
                                                ) : (
                                                    <BarChart data={periodData}>
                                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} vertical={false} />
                                                        <XAxis dataKey="period" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => val.slice(0, 3)} dy={10} />
                                                        <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `₹${val}`} />
                                                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} formatter={(val: any) => currencyFormatter.format(val)} />
                                                        <Bar dataKey="total" fill="#10b981" radius={[6, 6, 0, 0]} />
                                                    </BarChart>
                                                )}
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                </div>

                                <div className="glass-card p-0 overflow-hidden">
                                    <div className="border-b border-white/5 bg-slate-900/40 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div className="flex items-center gap-3">
                                            <h2 className="text-lg font-bold text-white font-heading">Income History</h2>
                                            <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                                                {records.length} Transactions
                                            </span>
                                        </div>
                                        <button onClick={handleExport} className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500/10 px-5 py-2.5 text-sm font-bold text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-all shadow-lg shadow-emerald-500/5">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                            Excel Report
                                        </button>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead>
                                                <tr className="border-b border-white/5 bg-slate-900/40 text-[11px] font-bold uppercase tracking-widest text-slate-500">
                                                    <th className="px-6 py-4">Date</th>
                                                    <th className="px-6 py-4">Source</th>
                                                    <th className="px-6 py-4">Account</th>
                                                    <th className="px-6 py-4 text-right">Amount</th>
                                                    <th className="px-6 py-4 text-center">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {currentRecords.map((rec) => (
                                                    <tr key={rec.id} className="group hover:bg-white/5 transition-colors">
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">{new Date(rec.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{rec.income_sources?.name || "Unknown"}</td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-[10px] text-slate-500 uppercase tracking-tight">{rec.account_type}</td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-emerald-400 font-mono">{currencyFormatter.format(rec.amount)}</td>
                                                        <td className="px-6 py-4 text-center">
                                                            <div className="flex items-center justify-center gap-2 transition-all">
                                                                <button onClick={() => handleEdit(rec)} className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-600 hover:text-white transition-all"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg></button>
                                                                <button onClick={() => handleDelete(rec.id)} className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-600 hover:text-white transition-all"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
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
                    <div className="w-full max-w-xl glass-card p-6 sm:p-8 animate-float-slow transform transition-all shadow-emerald-500/10">
                        <div className="mb-6 flex items-start justify-between gap-4">
                            <div>
                                <p className="text-[10px] uppercase tracking-widest text-emerald-400 mb-1 font-bold">Manage Record</p>
                                <h3 className="text-2xl font-bold text-white font-heading">Update Income</h3>
                            </div>
                            <button onClick={handleCancel} className="rounded-full p-2 bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-all">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <div className="space-y-5">
                            <div className="grid gap-5 sm:grid-cols-2">
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Date</label>
                                    <input type="date" value={editingData.date} onChange={(e) => setEditingData({ ...editingData, date: e.target.value })} className="w-full rounded-xl border border-white/10 bg-slate-900/50 backdrop-blur px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Amount (₹)</label>
                                    <input type="number" value={editingData.amount} onChange={(e) => setEditingData({ ...editingData, amount: e.target.value })} className="w-full rounded-xl border border-white/10 bg-slate-900/50 backdrop-blur px-4 py-2.5 text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 font-mono" />
                                </div>
                            </div>

                            <div className="grid gap-5 sm:grid-cols-2">
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Source</label>
                                    <select value={editingData.source_id} onChange={(e) => setEditingData({ ...editingData, source_id: e.target.value })} className="w-full rounded-xl border border-white/10 bg-slate-900/50 backdrop-blur px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 appearance-none cursor-pointer">
                                        {sources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Account</label>
                                    <select value={editingData.account_type} onChange={(e) => setEditingData({ ...editingData, account_type: e.target.value })} className="w-full rounded-xl border border-white/10 bg-slate-900/50 backdrop-blur px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 appearance-none cursor-pointer">
                                        {accountTypes.map(at => <option key={at} value={at}>{at}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Description</label>
                                <textarea value={editingData.description} onChange={(e) => setEditingData({ ...editingData, description: e.target.value })} rows={2} className="w-full rounded-xl border border-white/10 bg-slate-900/50 backdrop-blur px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 resize-none" />
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

export default IncomeTracking;
