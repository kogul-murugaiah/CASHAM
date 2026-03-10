import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAccountTypes } from "../hooks/useAccountTypes";
import * as XLSX from "xlsx";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend,
} from "recharts";

type Investment = {
    id: string;
    name: string;
    type: string;
    action: "buy" | "sell";
    units: number | null;
    price_per_unit: number | null;
    amount: number;
    account_type: string | null;
    date: string;
    description: string | null;
};

type EditingInvestment = {
    id: string;
    name: string;
    type: string;
    action: string;
    units: string;
    price_per_unit: string;
    amount: string;
    account_type: string;
    date: string;
    description: string;
};

const INVESTMENT_TYPES = ["Stock", "Mutual Fund", "Crypto", "Gold", "FD", "Other"];

const currencyFormatter = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
});

const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];

const TYPE_COLORS: Record<string, string> = {
    "Stock": "#f59e0b",
    "Mutual Fund": "#3b82f6",
    "Crypto": "#8b5cf6",
    "Gold": "#fbbf24",
    "FD": "#10b981",
    "Other": "#64748b",
};

const InvestmentTracking = () => {
    const { accountTypes } = useAccountTypes();
    const [viewMode, setViewMode] = useState<"monthly" | "yearly">("monthly");
    const [records, setRecords] = useState<Investment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    });
    const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear().toString());

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingData, setEditingData] = useState<EditingInvestment | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    const fetchRecords = async () => {
        setLoading(true);
        setError(null);
        try {
            let startDate, endDate;
            if (viewMode === "monthly") {
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
            const data = await api.get(`/api/investments?startDate=${startDate}&endDate=${endDate}`);
            setRecords(data || []);
        } catch (err: any) {
            if (err.status !== 401) setError(err.message || "Failed to fetch investments");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRecords();
    }, [viewMode, selectedMonth, selectedYear]);

    const handleEdit = (inv: Investment) => {
        setEditingId(inv.id);
        setEditingData({
            id: inv.id, name: inv.name, type: inv.type, action: inv.action,
            units: inv.units?.toString() || "", price_per_unit: inv.price_per_unit?.toString() || "",
            amount: inv.amount.toString(), account_type: inv.account_type || "",
            date: inv.date, description: inv.description || "",
        });
        setError(null);
        setSuccess(null);
        setIsModalOpen(true);
    };

    const handleCancel = () => { setEditingId(null); setEditingData(null); setIsModalOpen(false); setError(null); };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this investment record?")) return;
        try {
            await api.delete(`/api/investments?id=${id}`);
            setSuccess("Investment deleted");
            setRecords((prev) => prev.filter((r) => r.id !== id));
            setTimeout(() => setSuccess(null), 3000);
        } catch (err: any) {
            setError(err.message || "Failed to delete");
        }
    };

    const handleSave = async () => {
        if (!editingData || !editingId) return;
        if (!editingData.name || !editingData.amount || Number(editingData.amount) <= 0) {
            setError("Name and a valid amount are required.");
            return;
        }
        setSaving(true);
        setError(null);
        try {
            await api.put("/api/investments", {
                id: editingId, name: editingData.name, type: editingData.type,
                action: editingData.action, units: editingData.units ? Number(editingData.units) : null,
                price_per_unit: editingData.price_per_unit ? Number(editingData.price_per_unit) : null,
                amount: Number(editingData.amount), account_type: editingData.account_type || null,
                date: editingData.date, description: editingData.description.trim() || null,
            });
            setSuccess("Investment updated");
            setIsModalOpen(false);
            fetchRecords();
            setTimeout(() => setSuccess(null), 3000);
        } catch (err: any) {
            setError(err.message || "Failed to update");
        } finally {
            setSaving(false);
        }
    };

    // Calculations
    const buyRecords = records.filter((r) => r.action === "buy");
    const sellRecords = records.filter((r) => r.action === "sell");
    const totalInvested = buyRecords.reduce((s, r) => s + r.amount, 0);
    const totalReturned = sellRecords.reduce((s, r) => s + r.amount, 0);
    const netInvested = totalInvested - totalReturned;

    const typeTotals = INVESTMENT_TYPES.map((type) => ({
        name: type,
        value: buyRecords.filter((r) => r.type === type).reduce((s, r) => s + r.amount, 0),
    })).filter((t) => t.value > 0);

    const periodData = (() => {
        if (viewMode === "monthly") {
            const [year, month] = selectedMonth.split("-").map(Number);
            const days = new Date(year, month, 0).getDate();
            return Array.from({ length: days }, (_, i) => {
                const day = i + 1;
                const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                return {
                    period: String(day),
                    total: buyRecords.filter((r) => r.date === dateStr).reduce((s, r) => s + r.amount, 0),
                };
            });
        }
        return MONTH_NAMES.map((name, i) => ({
            period: name.slice(0, 3),
            total: buyRecords.filter((r) => new Date(r.date).getMonth() === i).reduce((s, r) => s + r.amount, 0),
        }));
    })();

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const perPage = 15;
    const totalPages = Math.ceil(records.length / perPage);
    const currentRecords = records.slice((currentPage - 1) * perPage, currentPage * perPage);
    useEffect(() => setCurrentPage(1), [viewMode, selectedMonth, selectedYear]);

    const handleExport = () => {
        const exportData = records.map((r) => ({
            Date: new Date(r.date).toLocaleDateString("en-IN"),
            Name: r.name, Type: r.type, Action: r.action.toUpperCase(),
            Units: r.units ?? "", "Price/Unit": r.price_per_unit ?? "",
            Amount: r.amount, Account: r.account_type ?? "", Description: r.description ?? "",
        }));
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Investments");
        XLSX.writeFile(wb, viewMode === "monthly" ? `Investments_${selectedMonth}.xlsx` : `Investments_${selectedYear}.xlsx`);
    };

    return (
        <div className="pb-24 pt-8 md:pb-8">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between animate-fade-in">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <span className="p-2 bg-amber-500/10 rounded-lg">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500">
                                    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                                    <polyline points="16 7 22 7 22 13" />
                                </svg>
                            </span>
                            <h1 className="text-3xl font-bold font-heading text-white">Investment Tracking</h1>
                        </div>
                        <p className="text-slate-400">Portfolio history and analysis</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                        <div className="flex p-1 bg-slate-900/50 backdrop-blur rounded-xl border border-white/5">
                            <button onClick={() => setViewMode("monthly")} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${viewMode === "monthly" ? "bg-amber-500 text-white shadow-lg shadow-amber-500/20" : "text-slate-400 hover:text-white"}`}>Monthly</button>
                            <button onClick={() => setViewMode("yearly")} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${viewMode === "yearly" ? "bg-amber-500 text-white shadow-lg shadow-amber-500/20" : "text-slate-400 hover:text-white"}`}>Yearly</button>
                        </div>
                        {viewMode === "monthly" ? (
                            <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="rounded-xl border border-white/10 bg-slate-900/50 backdrop-blur px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 cursor-pointer" />
                        ) : (
                            <input type="number" min="2000" max="2100" value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="w-24 rounded-xl border border-white/10 bg-slate-900/50 backdrop-blur px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 cursor-pointer" />
                        )}
                    </div>
                </div>

                {error && <div className="mb-6 glass-card border-red-500/20 bg-red-500/10 p-4 text-red-300 text-sm">{error}</div>}
                {success && <div className="mb-6 glass-card border-amber-500/20 bg-amber-500/10 p-4 text-amber-300 text-sm text-center font-semibold animate-fade-in">{success}</div>}

                {loading ? (
                    <div className="grid gap-6 md:grid-cols-3">
                        {[...Array(3)].map((_, i) => <div key={i} className="h-32 animate-pulse rounded-3xl bg-slate-800/50" />)}
                    </div>
                ) : (
                    <div className="space-y-8 animate-fade-in">
                        {records.length === 0 ? (
                            <div className="glass-card p-12 text-center border-amber-500/10">
                                <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500">
                                        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-bold text-white mb-2">No Investments Found</h3>
                                <p className="text-slate-400">No investment data for the selected period.</p>
                            </div>
                        ) : (
                            <>
                                {/* KPI Cards */}
                                <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                                    <div className="glass-card p-6 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-4 opacity-10">
                                            <div className="w-24 h-24 rounded-full bg-amber-500 blur-2xl" />
                                        </div>
                                        <p className="text-sm font-medium text-slate-400">Total Invested</p>
                                        <div className="mt-2 text-3xl font-bold text-amber-400 font-heading">{currencyFormatter.format(totalInvested)}</div>
                                        <div className="mt-4 flex items-center text-xs text-amber-300 bg-amber-500/10 w-fit px-2 py-1 rounded-lg">
                                            <span className="w-2 h-2 rounded-full bg-amber-400 mr-2 animate-pulse" />Buy Total
                                        </div>
                                    </div>
                                    <div className="glass-card p-6 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-4 opacity-10">
                                            <div className="w-24 h-24 rounded-full bg-blue-500 blur-2xl" />
                                        </div>
                                        <p className="text-sm font-medium text-slate-400">Total Returned</p>
                                        <div className="mt-2 text-3xl font-bold text-blue-400 font-heading">{currencyFormatter.format(totalReturned)}</div>
                                        <div className="mt-4 flex items-center text-xs text-blue-300 bg-blue-500/10 w-fit px-2 py-1 rounded-lg">
                                            <span className="w-2 h-2 rounded-full bg-blue-400 mr-2 animate-pulse" />Sell Total
                                        </div>
                                    </div>
                                    <div className="glass-card p-6 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-4 opacity-10">
                                            <div className={`w-24 h-24 rounded-full blur-2xl ${netInvested >= 0 ? "bg-green-500" : "bg-red-500"}`} />
                                        </div>
                                        <p className="text-sm font-medium text-slate-400">Net Deployed</p>
                                        <div className={`mt-2 text-3xl font-bold font-heading ${netInvested >= 0 ? "text-green-400" : "text-red-400"}`}>{currencyFormatter.format(netInvested)}</div>
                                        <div className={`mt-4 flex items-center text-xs w-fit px-2 py-1 rounded-lg ${netInvested >= 0 ? "text-green-300 bg-green-500/10" : "text-red-300 bg-red-500/10"}`}>
                                            <span className={`w-2 h-2 rounded-full mr-2 animate-pulse ${netInvested >= 0 ? "bg-green-400" : "bg-red-400"}`} />
                                            Buy − Sell
                                        </div>
                                    </div>
                                </div>

                                {/* Charts */}
                                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                                    <div className="glass-card p-6">
                                        <h3 className="text-lg font-bold text-white mb-6 font-heading">Investment by Type</h3>
                                        <div className="h-64 w-full">
                                            {typeTotals.length > 0 ? (
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <PieChart>
                                                        <Pie data={typeTotals} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                                            {typeTotals.map((entry) => (
                                                                <Cell key={entry.name} fill={TYPE_COLORS[entry.name] || "#64748b"} stroke="rgba(0,0,0,0)" />
                                                            ))}
                                                        </Pie>
                                                        <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "12px", color: "#f8fafc" }} formatter={(val: any) => currencyFormatter.format(val)} />
                                                        <Legend verticalAlign="bottom" height={36} iconType="circle" formatter={(val) => <span className="text-slate-400 text-sm ml-1">{val}</span>} />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                            ) : (
                                                <div className="h-full flex items-center justify-center text-slate-500">No buy data available</div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="glass-card p-6">
                                        <h3 className="text-lg font-bold text-white mb-6 font-heading">{viewMode === "monthly" ? "Daily Buys" : "Monthly Buys"}</h3>
                                        <div className="h-64 w-full">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={periodData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} vertical={false} />
                                                    <XAxis dataKey="period" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} dy={10} />
                                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={(v) => `₹${v / 1000}k`} />
                                                    <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "12px", color: "#f8fafc" }} formatter={(val: any) => currencyFormatter.format(val)} />
                                                    <Bar dataKey="total" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                </div>

                                {/* Table */}
                                <div className="glass-card p-0 overflow-hidden">
                                    <div className="border-b border-white/5 bg-slate-900/40 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div className="flex items-center gap-3">
                                            <h2 className="text-lg font-bold text-white font-heading">Investment History</h2>
                                            <span className="text-xs font-semibold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                                                {records.length} Records
                                            </span>
                                        </div>
                                        <button onClick={handleExport} className="flex items-center justify-center gap-2 rounded-xl bg-amber-500/10 px-5 py-2.5 text-sm font-bold text-amber-400 border border-amber-500/20 hover:bg-amber-500 hover:text-white transition-all">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                                            Excel Report
                                        </button>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead>
                                                <tr className="border-b border-white/5 bg-slate-900/40 text-[11px] font-bold uppercase tracking-widest text-slate-500">
                                                    <th className="px-6 py-4">Date</th>
                                                    <th className="px-6 py-4">Name</th>
                                                    <th className="px-6 py-4">Type</th>
                                                    <th className="px-6 py-4">Action</th>
                                                    <th className="px-6 py-4">Units</th>
                                                    <th className="px-6 py-4">Account</th>
                                                    <th className="px-6 py-4 text-right">Amount</th>
                                                    <th className="px-6 py-4 text-center">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {currentRecords.map((rec) => (
                                                    <tr key={rec.id} className="group hover:bg-white/5 transition-colors">
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">{new Date(rec.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</td>
                                                        <td className="px-6 py-4 text-sm font-medium text-white">{rec.name}</td>
                                                        <td className="px-6 py-4">
                                                            <span className="inline-flex items-center rounded-lg bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-300 border border-white/5">{rec.type}</span>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-bold border ${rec.action === "buy" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-blue-500/10 text-blue-400 border-blue-500/20"}`}>
                                                                {rec.action === "buy" ? "↑ Buy" : "↓ Sell"}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-slate-400">{rec.units ?? "-"}</td>
                                                        <td className="px-6 py-4 text-[10px] text-slate-500 uppercase">{rec.account_type ?? "-"}</td>
                                                        <td className={`px-6 py-4 whitespace-nowrap text-right text-sm font-bold font-mono ${rec.action === "buy" ? "text-amber-400" : "text-blue-400"}`}>
                                                            {currencyFormatter.format(rec.amount)}
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <div className="flex items-center justify-center gap-2">
                                                                <button onClick={() => handleEdit(rec)} className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500 hover:text-white transition-all">
                                                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" /></svg>
                                                                </button>
                                                                <button onClick={() => handleDelete(rec.id)} className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-600 hover:text-white transition-all">
                                                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                                                                </button>
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
                                                <button onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))} disabled={currentPage === 1} className="rounded-lg bg-slate-800 px-4 py-1.5 text-xs font-bold text-slate-300 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed border border-white/5">Prev</button>
                                                <button onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages} className="rounded-lg bg-slate-800 px-4 py-1.5 text-xs font-bold text-slate-300 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed border border-white/5">Next</button>
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
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm px-4 animate-fade-in">
                    <div className="w-full max-w-xl glass-card p-6 sm:p-8 shadow-amber-500/10">
                        <div className="mb-6 flex items-start justify-between gap-4">
                            <div>
                                <p className="text-[10px] uppercase tracking-widest text-amber-400 mb-1 font-bold">Manage Record</p>
                                <h3 className="text-2xl font-bold text-white font-heading">Update Investment</h3>
                            </div>
                            <button onClick={handleCancel} className="rounded-full p-2 bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-all">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <div className="space-y-5">
                            <div className="grid gap-5 sm:grid-cols-2">
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Name</label>
                                    <input value={editingData.name} onChange={(e) => setEditingData({ ...editingData, name: e.target.value })} className="w-full rounded-xl border border-white/10 bg-slate-900/50 backdrop-blur px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/30" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Type</label>
                                    <select value={editingData.type} onChange={(e) => setEditingData({ ...editingData, type: e.target.value })} className="w-full rounded-xl border border-white/10 bg-slate-900/50 backdrop-blur px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 appearance-none cursor-pointer">
                                        {INVESTMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Action</label>
                                    <select value={editingData.action} onChange={(e) => setEditingData({ ...editingData, action: e.target.value })} className="w-full rounded-xl border border-white/10 bg-slate-900/50 backdrop-blur px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 appearance-none cursor-pointer">
                                        <option value="buy">Buy</option>
                                        <option value="sell">Sell</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Amount (₹)</label>
                                    <input type="number" value={editingData.amount} onChange={(e) => setEditingData({ ...editingData, amount: e.target.value })} className="w-full rounded-xl border border-white/10 bg-slate-900/50 backdrop-blur px-4 py-2.5 text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 font-mono" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Date</label>
                                    <input type="date" value={editingData.date} onChange={(e) => setEditingData({ ...editingData, date: e.target.value })} className="w-full rounded-xl border border-white/10 bg-slate-900/50 backdrop-blur px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/30" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Account</label>
                                    <select value={editingData.account_type} onChange={(e) => setEditingData({ ...editingData, account_type: e.target.value })} className="w-full rounded-xl border border-white/10 bg-slate-900/50 backdrop-blur px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 appearance-none cursor-pointer">
                                        <option value="">No account</option>
                                        {accountTypes.map((at) => <option key={at} value={at}>{at}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Description</label>
                                <textarea value={editingData.description} onChange={(e) => setEditingData({ ...editingData, description: e.target.value })} rows={2} className="w-full rounded-xl border border-white/10 bg-slate-900/50 backdrop-blur px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 resize-none" />
                            </div>

                            {error && <p className="text-sm text-red-400 text-center">{error}</p>}

                            <div className="flex justify-end gap-3 pt-4">
                                <button onClick={handleCancel} disabled={saving} className="rounded-xl px-6 py-2.5 text-xs font-bold text-slate-500 hover:text-white hover:bg-white/5 transition-all">Cancel</button>
                                <button onClick={handleSave} disabled={saving} className="rounded-xl bg-amber-500 px-8 py-2.5 text-xs font-bold text-white shadow-xl shadow-amber-500/20 hover:bg-amber-400 transition-all disabled:opacity-50">
                                    {saving ? "Saving..." : "Apply Changes"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InvestmentTracking;
