import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';

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

    const handleDelete = async (item: any) => {
        const message = item.symbol
            ? `Are you sure you want to delete ALL records for ${item.name} (${item.symbol})?`
            : `Are you sure you want to delete ${item.name}?`;

        if (!window.confirm(message)) return;

        try {
            const query = item.symbol ? `symbol=${item.symbol}` : `id=${item.id}`;
            await api.delete(`/api/wealth?action=assets&${query}`);
            fetchAssets();
        } catch (error) {
            console.error('Failed to delete asset:', error);
        }
    };

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

    if (loading) {
        return (
            <div className="flex items-center justify-center py-40">
                <div className="w-10 h-10 border-4 border-green-500/20 border-t-green-500 rounded-full animate-spin"></div>
            </div>
        );
    }

    const { summary, categories, holdings } = data || { summary: {}, categories: {}, holdings: [] };

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto w-full animate-fade-in relative z-10 pb-24">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold font-heading text-white">Portfolio</h1>
                    <p className="text-sm text-slate-400 mt-1">{holdings.length} holdings across {Object.keys(categories).length} categories</p>
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
                    {/* Overall Summary Card */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-3xl p-6 shadow-xl">
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Total Current Value</p>
                            <h2 className="text-3xl font-bold text-white font-mono">{formatCurrency(summary.total_value)}</h2>
                        </div>
                        <div className="bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-3xl p-6 shadow-xl">
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Total Invested</p>
                            <h2 className="text-2xl font-bold text-slate-300 font-mono">{formatCurrency(summary.total_invested)}</h2>
                        </div>
                        <div className={`bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-3xl p-6 shadow-xl ${summary.total_pnl >= 0 ? 'border-green-500/20' : 'border-red-500/20'}`}>
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Overall P&L</p>
                            <div className="flex items-baseline gap-2">
                                <h2 className={`text-2xl font-bold font-mono ${summary.total_pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {summary.total_pnl >= 0 ? '+' : ''}{formatCurrency(summary.total_pnl)}
                                </h2>
                                <span className={`text-sm font-bold ${summary.total_pnl >= 0 ? 'text-green-500/80' : 'text-red-500/80'}`}>
                                    ({summary.total_pnl_percent.toFixed(2)}%)
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Categories */}
                    {Object.entries(categories).map(([type, items]: [string, any]) => (
                        <div key={type} className="space-y-4">
                            <div className="flex items-center gap-3 px-2">
                                <span className="text-2xl">{getIcon(type)}</span>
                                <h2 className="text-xl font-bold text-white font-heading">{categoryNames[type] || type}</h2>
                                <span className="text-xs bg-slate-800 text-slate-400 px-2.5 py-0.5 rounded-full font-bold">{items.length}</span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {items.map((item: any) => (
                                    <div key={item.id} className="bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-3xl p-5 shadow-xl relative group transition hover:border-white/10 flex flex-col">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center border border-white/5">
                                                    <span className="text-xl">{getIcon(type)}</span>
                                                </div>
                                                <div className="overflow-hidden">
                                                    <h3 className="text-base font-bold text-white truncate w-40" title={item.name}>{item.name}</h3>
                                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{item.symbol || 'Manual Entry'}</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleDelete(item)}
                                                className="p-2 text-slate-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 mb-4">
                                            <div>
                                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Avg. Cost</p>
                                                <p className="text-sm font-bold text-slate-300 font-mono">{formatCurrency(item.avg_buy_price)}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Live Price</p>
                                                <p className={`text-sm font-bold font-mono ${item.live_price ? 'text-blue-400' : 'text-slate-500'}`}>
                                                    {item.live_price ? formatCurrency(item.live_price) : 'N/A'}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="mt-auto pt-4 border-t border-white/5 flex justify-between items-end">
                                            <div>
                                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Total Value</p>
                                                <p className="text-lg font-bold text-white font-mono">{formatCurrency(item.current_value)}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Daily P&L</p>
                                                <p className={`text-sm font-bold font-mono ${item.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                    {item.pnl >= 0 ? '▲' : '▼'}{Math.abs(item.pnl_percent).toFixed(2)}%
                                                </p>
                                            </div>
                                        </div>

                                        {item.total_units > 0 && (
                                            <div className="absolute top-2 right-2 px-2 py-0.5 bg-slate-800/80 rounded-md border border-white/5 text-[9px] font-bold text-slate-400">
                                                {item.total_units} UNIT{item.total_units > 1 ? 'S' : ''}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Assets;

