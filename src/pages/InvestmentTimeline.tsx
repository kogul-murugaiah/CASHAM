import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useUserPreferences } from "../hooks/useUserPreferences";
import { formatCurrency, formatDate } from "../lib/formatters";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { FiCamera, FiTrendingUp } from "react-icons/fi";
import { useTheme } from "../contexts/ThemeContext";

type Snapshot = {
    id: string;
    snapshot_date: string;
    total_invested: number;
    total_current_value: number;
    total_pnl: number;
    breakdown: any;
};

export default function InvestmentTimeline() {
    const { currencyStyle } = useUserPreferences();
    const { theme } = useTheme();
    const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
    const [loading, setLoading] = useState(true);
    const [capturing, setCapturing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const isDark = theme === "dark";
    const axisColor = isDark ? "#94a3b8" : "#64748b";
    const gridColor = isDark ? "#334155" : "#e2e8f0";
    const tooltipBg = isDark ? "#0f172a" : "#ffffff";
    const tooltipBorder = isDark ? "rgba(255,255,255,0.1)" : "#e2e8f0";

    const fetchSnapshots = async () => {
        setLoading(true);
        try {
            const data = await api.get("/api/investments?snapshots=true");
            setSnapshots(data || []);
        } catch (err: any) {
            setError(err.message || "Failed to load timeline");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSnapshots();
    }, []);

    const captureSnapshot = async () => {
        setCapturing(true);
        try {
            setError(null);
            await api.post("/api/investments?snapshot=capture");
            setSuccess("Snapshot captured successfully!");
            fetchSnapshots();
            setTimeout(() => setSuccess(null), 3000);
        } catch (err: any) {
            setError(err.message || "Failed to capture snapshot");
        } finally {
            setCapturing(false);
        }
    };

    // Format data for Recharts
    const chartData = snapshots.map(s => {
        const d = new Date(s.snapshot_date);
        return {
            name: `${d.toLocaleString('default', { month: 'short' })} '${d.getFullYear().toString().slice(2)}`,
            Invested: s.total_invested,
            "Current Value": s.total_current_value,
            fullDate: s.snapshot_date
        };
    });

    const latest = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;
    const first = snapshots.length > 0 ? snapshots[0] : null;

    const allTimeGrowth = (latest && first && first.total_current_value > 0)
        ? ((latest.total_current_value - first.total_current_value) / first.total_current_value) * 100
        : 0;

    return (
        <div className="pb-24 pt-8 md:pb-8">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between animate-fade-in">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <span className="p-2 bg-blue-500/10 rounded-lg">
                                <FiTrendingUp className="text-blue-500" size={20} />
                            </span>
                            <h1 className="text-3xl font-bold font-heading text-white">Investment Timeline</h1>
                        </div>
                        <p className="text-slate-400">Track your portfolio's growth over time via monthly snapshots.</p>
                    </div>
                    <button
                        onClick={captureSnapshot}
                        disabled={capturing || loading}
                        className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50"
                    >
                        <FiCamera size={16} /> {capturing ? "Capturing..." : "Capture Snapshot"}
                    </button>
                </div>

                {error && <div className="mb-6 glass-card border-red-500/20 bg-red-500/10 p-4 text-red-300 text-sm text-center">{error}</div>}
                {success && <div className="mb-6 glass-card border-emerald-500/20 bg-emerald-500/10 p-4 text-emerald-300 text-sm text-center font-semibold">{success}</div>}

                {loading ? (
                    <div className="h-96 animate-pulse rounded-3xl bg-slate-700/50 mb-8" />
                ) : snapshots.length === 0 ? (
                    <div className="glass-card p-12 text-center border-blue-500/10 animate-fade-in">
                        <div className="text-5xl mb-4 text-blue-500"><FiTrendingUp className="mx-auto" /></div>
                        <h3 className="text-lg font-bold text-white mb-2">No Timeline Data</h3>
                        <p className="text-slate-400 mb-6">Capture your first snapshot to start tracking your portfolio's history.</p>
                        <button onClick={captureSnapshot} className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-blue-500 transition-all">
                            Capture Initial Snapshot
                        </button>
                    </div>
                ) : (
                    <div className="space-y-8 animate-fade-in">
                        {/* Summary Cards */}
                        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                            <div className="glass-card p-6 border-blue-500/10 bg-gradient-to-br from-slate-800/50 to-blue-900/10">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Current Portfolio Value</p>
                                <p className="text-3xl font-bold text-white mt-2 font-mono">{formatCurrency(latest?.total_current_value || 0, currencyStyle)}</p>
                            </div>
                            <div className="glass-card p-6 border-slate-700/50">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Invested</p>
                                <p className="text-2xl font-bold text-slate-300 mt-2 font-mono">{formatCurrency(latest?.total_invested || 0, currencyStyle)}</p>
                            </div>
                            <div className="glass-card p-6 border-emerald-500/10">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total P&L</p>
                                <p className={`text-2xl font-bold mt-2 font-mono ${(latest?.total_pnl || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {(latest?.total_pnl || 0) >= 0 ? '+' : ''}{formatCurrency(latest?.total_pnl || 0, currencyStyle)}
                                </p>
                            </div>
                            <div className="glass-card p-6 border-purple-500/10">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Timeline Growth</p>
                                <p className={`text-2xl font-bold mt-2 ${allTimeGrowth >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {allTimeGrowth >= 0 ? '+' : ''}{allTimeGrowth.toFixed(2)}%
                                </p>
                            </div>
                        </div>

                        {/* Chart */}
                        {snapshots.length > 1 ? (
                            <div className="glass-card p-6 h-[400px]">
                                <h3 className="text-lg font-bold text-white mb-6 font-heading">Growth Chart</h3>
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="colorInvested" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.2} />
                                                <stop offset="95%" stopColor="#94a3b8" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} opacity={0.5} />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: axisColor, fontSize: 12 }} dy={10} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: axisColor, fontSize: 12 }} tickFormatter={(val) => `₹${val / 1000}k`} dx={-10} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, borderRadius: '12px' }}
                                            itemStyle={{ fontWeight: 'bold' }}
                                            formatter={(value: any) => formatCurrency(value, currencyStyle)}
                                        />
                                        <Area type="monotone" dataKey="Invested" stroke="#94a3b8" strokeWidth={2} fillOpacity={1} fill="url(#colorInvested)" />
                                        <Area type="monotone" dataKey="Current Value" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="glass-card p-12 text-center text-slate-400">
                                <p>You need at least 2 snapshots to view the growth chart.</p>
                            </div>
                        )}

                        {/* Snapshot History Table */}
                        <div className="glass-card overflow-hidden">
                            <div className="px-6 py-4 border-b border-white/5 bg-slate-700/40">
                                <h3 className="text-lg font-bold text-white font-heading">History Log</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-white/5 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                            <th className="px-6 py-4">Date</th>
                                            <th className="px-6 py-4 text-right">Invested</th>
                                            <th className="px-6 py-4 text-right">Current Value</th>
                                            <th className="px-6 py-4 text-right">P&L</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {[...snapshots].reverse().map((snap) => (
                                            <tr key={snap.id} className="hover:bg-white/5 transition-colors">
                                                <td className="px-6 py-4 text-sm font-medium text-white">
                                                    {formatDate(snap.snapshot_date)}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-right text-slate-300 font-mono">
                                                    {formatCurrency(snap.total_invested, currencyStyle)}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-right font-bold text-white font-mono">
                                                    {formatCurrency(snap.total_current_value, currencyStyle)}
                                                </td>
                                                <td className={`px-6 py-4 text-sm text-right font-bold font-mono ${snap.total_pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                    {snap.total_pnl >= 0 ? '+' : ''}{formatCurrency(snap.total_pnl, currencyStyle)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
