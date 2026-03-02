import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../lib/api';

const CategoryPortfolio = () => {
    const { category } = useParams();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const fetchCategoryData = async () => {
        try {
            const result = await api.get('/api/wealth?action=assets');
            // Filter categories based on the URL param
            if (result && result.categories && category) {
                setData({
                    items: result.categories[category] || [],
                    summary: result.summary
                });
            }
        } catch (error) {
            console.error('Failed to fetch category data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCategoryData();
    }, [category]);

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

    const items = data?.items || [];
    const categoryName = categoryNames[category || ''] || category;

    // Calculate category totals
    const catValue = items.reduce((sum: number, h: any) => sum + h.current_value, 0);
    const catInvested = items.reduce((sum: number, h: any) => sum + h.total_invested, 0);
    const catPnl = catValue - catInvested;
    const catPnlPercent = catInvested > 0 ? (catPnl / catInvested) * 100 : 0;

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto w-full animate-fade-in relative z-10 pb-24">
            {/* Header / Breadcrumbs */}
            <div className="mb-8">
                <Link to="/assets" className="text-slate-500 hover:text-white transition flex items-center gap-2 text-sm font-bold uppercase tracking-widest mb-4 group">
                    <svg className="w-4 h-4 group-hover:-translate-x-1 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
                    Back to Portfolio
                </Link>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <span className="text-3xl">{getIcon(category || '')}</span>
                            <h1 className="text-3xl font-bold font-heading text-white">{categoryName}</h1>
                        </div>
                        <p className="text-sm text-slate-400">Detailed view of your {(categoryName || '').toLowerCase()} holdings</p>
                    </div>
                </div>
            </div>

            {/* Category Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
                <div className="bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-3xl p-6 shadow-xl">
                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">Value in {categoryName}</p>
                    <h2 className="text-2xl font-bold text-white font-mono">{formatCurrency(catValue)}</h2>
                </div>
                <div className="bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-3xl p-6 shadow-xl">
                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">Invested Amount</p>
                    <h2 className="text-xl font-bold text-slate-300 font-mono">{formatCurrency(catInvested)}</h2>
                </div>
                <div className={`bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-3xl p-6 shadow-xl ${catPnl >= 0 ? 'border-green-500/20' : 'border-red-500/20'}`}>
                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">Category P&L</p>
                    <div className="flex items-baseline gap-2">
                        <h2 className={`text-xl font-bold font-mono ${catPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {catPnl >= 0 ? '+' : ''}{formatCurrency(catPnl)}
                        </h2>
                        <span className={`text-sm font-bold ${catPnl >= 0 ? 'text-green-500/60' : 'text-red-500/60'}`}>
                            ({catPnlPercent.toFixed(2)}%)
                        </span>
                    </div>
                </div>
            </div>

            {items.length === 0 ? (
                <div className="bg-slate-900/40 backdrop-blur-sm border border-white/5 rounded-3xl p-12 flex flex-col items-center justify-center text-center shadow-lg w-full">
                    <p className="text-slate-400">No holdings found in this category.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {items.map((item: any) => (
                        <Link
                            key={item.symbol || item.id}
                            to={`/holding/${item.symbol || item.id}`}
                            className="bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-3xl p-5 shadow-xl relative group transition hover:border-white/10 flex flex-col"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center border border-white/5 group-hover:bg-slate-700 transition">
                                        <span className="text-xl">{getIcon(category || '')}</span>
                                    </div>
                                    <div className="overflow-hidden">
                                        <h3 className="text-base font-bold text-white truncate w-40" title={item.name}>{item.name}</h3>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{item.symbol || 'Manual Entry'}</p>
                                    </div>
                                </div>
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
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Current Value</p>
                                    <p className="text-lg font-bold text-white font-mono">{formatCurrency(item.current_value)}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Holding P&L</p>
                                    {item.total_invested > 0 ? (
                                        <p className={`text-sm font-bold font-mono ${item.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                            {item.pnl >= 0 ? '▲' : '▼'}{Math.abs(item.pnl_percent).toFixed(2)}%
                                        </p>
                                    ) : (
                                        <p className="text-[10px] text-slate-500 italic">N/A</p>
                                    )}
                                </div>
                            </div>

                            {item.total_units > 0 && (
                                <div className="absolute top-2 right-2 px-2 py-0.5 bg-slate-800/80 rounded-md border border-white/5 text-[9px] font-bold text-slate-400">
                                    {item.total_units} UNIT{item.total_units > 1 ? 'S' : ''}
                                </div>
                            )}
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
};

export default CategoryPortfolio;
