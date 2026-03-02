import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const Assets = () => {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const fetchAssets = async () => {
        try {
            const result = await api.get('/api/wealth?action=assets');
            setData(result);
        } catch (error) {
            console.error('Failed to fetch assets:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAssets();
    }, []);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(value);
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'stocks': return '📈';
            case 'mutual_funds': return '📊';
            case 'gold': return '🥇';
            case 'real_estate': return '🏠';
            case 'crypto': return '₿';
            case 'cash': return '💵';
            case 'vehicle': return '🚗';
            default: return '📦';
        }
    };

    const categoryNames: Record<string, string> = {
        stocks: 'Equity Holdings',
        mutual_funds: 'Mutual Funds',
        crypto: 'Cryptocurrencies',
        gold: 'Gold & Bullion',
        real_estate: 'Real Estate',
        cash: 'Cash & Savings',
        vehicle: 'Vehicles',
        other: 'Other Assets'
    };

    const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#64748b'];

    if (loading) {
        return (
            <div className="flex items-center justify-center py-40">
                <div className="w-10 h-10 border-4 border-green-500/20 border-t-green-500 rounded-full animate-spin"></div>
            </div>
        );
    }

    const { summary, categories, holdings } = data || { summary: {}, categories: {}, holdings: [] };

    // Prepare chart data
    const chartData = Object.entries(categories).map(([type, items]: [string, any]) => {
        const value = items.reduce((sum: number, item: any) => sum + item.current_value, 0);
        return {
            name: categoryNames[type] || type,
            value: value,
            type: type
        };
    }).filter(d => d.value > 0);

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto w-full animate-fade-in relative z-10 pb-24">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold font-heading text-white">Wealth Overview</h1>
                    <p className="text-sm text-slate-400 mt-1">Unified view of your diversified assets</p>
                </div>
                <div className="flex gap-3 w-full sm:w-auto">
                    <Link to="/add-asset" className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-green-600 text-white font-bold hover:bg-green-500 transition flex items-center justify-center gap-2 shadow-lg shadow-green-600/20">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                        Add Asset
                    </Link>
                </div>
            </div>

            {holdings.length === 0 ? (
                <div className="bg-slate-900/40 backdrop-blur-sm border border-white/5 rounded-3xl p-12 lg:p-24 flex flex-col items-center justify-center text-center shadow-lg w-full">
                    <div className="w-16 h-16 bg-slate-800/80 rounded-2xl flex items-center justify-center mb-6 border border-white/5 shadow-inner">
                        <span className="text-3xl">💰</span>
                    </div>
                    <h2 className="text-xl font-bold font-heading text-white mb-2">No holdings yet</h2>
                    <p className="text-sm text-slate-400 max-w-sm mb-8">
                        Track your stocks, mutual funds, and properties to see your portfolio performance.
                    </p>
                    <Link to="/add-asset" className="px-6 py-2 rounded-xl bg-white text-slate-900 font-bold hover:bg-slate-200 transition">
                        Get Started
                    </Link>
                </div>
            ) : (
                <div className="space-y-10">
                    {/* Top Row: Chart + Summary */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* Chart Card */}
                        <div className="lg:col-span-8 bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row items-center gap-8">
                            <div className="w-full md:w-1/2 h-[240px] relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={chartData}
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="value"
                                            stroke="none"
                                        >
                                            {chartData.map((_entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px' }}
                                            itemStyle={{ color: '#fff' }}
                                            formatter={(value: any) => formatCurrency(Number(value))}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Total Value</p>
                                    <p className="text-lg font-bold text-white">{formatCurrency(summary.total_value)}</p>
                                </div>
                            </div>
                            <div className="w-full md:w-1/2 space-y-3">
                                <h3 className="text-lg font-bold text-white mb-4 italic text-slate-400">Portfolio Allocation</h3>
                                <div className="grid grid-cols-1 gap-2">
                                    {chartData.map((d, index) => (
                                        <div key={d.type} className="flex items-center justify-between group">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                                                <span className="text-sm text-slate-300 font-medium">{d.name}</span>
                                            </div>
                                            <span className="text-sm text-slate-500 font-mono">
                                                {summary.total_value > 0 ? ((d.value / summary.total_value) * 100).toFixed(1) : '0'}%
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Summary Stats Card */}
                        <div className="lg:col-span-4 flex flex-col gap-4">
                            <div className="bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-3xl p-6 shadow-xl flex-1 flex flex-col justify-center">
                                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">Total Invested</p>
                                <h2 className="text-2xl font-bold text-white font-mono">{formatCurrency(summary.total_invested)}</h2>
                            </div>
                            <div className={`bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-3xl p-6 shadow-xl flex-1 flex flex-col justify-center ${summary.total_pnl >= 0 ? 'border-green-500/20' : 'border-red-500/20'}`}>
                                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">Overall P&L</p>
                                <div className="flex items-baseline gap-2">
                                    <h2 className={`text-2xl font-bold font-mono ${summary.total_pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        {summary.total_pnl >= 0 ? '▲' : '▼'}{formatCurrency(Math.abs(summary.total_pnl))}
                                    </h2>
                                    <span className={`text-sm font-bold ${summary.total_pnl >= 0 ? 'text-green-500/60' : 'text-red-500/60'}`}>
                                        ({summary.total_pnl_percent.toFixed(2)}%)
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Category Selection Grid */}
                    <div className="space-y-4">
                        <h2 className="text-xl font-bold text-white font-heading px-2">Asset Classes</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {Object.entries(categories).map(([type, items]: [string, any]) => {
                                const catValue = items.reduce((sum: number, h: any) => sum + h.current_value, 0);
                                const catInvested = items.reduce((sum: number, h: any) => sum + h.total_invested, 0);
                                const catPnl = catValue - catInvested;
                                const catPnlPercent = catInvested > 0 ? (catPnl / catInvested) * 100 : 0;

                                return (
                                    <Link
                                        key={type}
                                        to={`/assets/${type}`}
                                        className="bg-slate-900/40 backdrop-blur-md border border-white/5 rounded-3xl p-6 shadow-lg hover:bg-slate-800/60 transition group relative overflow-hidden"
                                    >
                                        <div className="flex items-start justify-between mb-8">
                                            <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center border border-white/5 group-hover:scale-110 transition duration-300">
                                                <span className="text-2xl">{getIcon(type)}</span>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">{items.length} Holdings</p>
                                                <p className={`text-xs font-bold ${catPnl >= 0 ? 'text-green-500/80' : 'text-red-500/80'}`}>
                                                    {catPnl >= 0 ? '+' : ''}{catPnlPercent.toFixed(1)}%
                                                </p>
                                            </div>
                                        </div>

                                        <div className="mt-auto">
                                            <h3 className="text-lg font-bold text-white mb-1 group-hover:text-green-400 transition">{categoryNames[type] || type}</h3>
                                            <div className="flex items-baseline gap-2">
                                                <p className="text-xl font-bold font-mono text-slate-300">{formatCurrency(catValue)}</p>
                                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest italic">Current</p>
                                            </div>
                                        </div>

                                        {/* Decorative Arrow */}
                                        <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <svg className="w-6 h-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Assets;

