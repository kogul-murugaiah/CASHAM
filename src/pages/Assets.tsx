import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';

const Assets = () => {
    const [assets, setAssets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchAssets = async () => {
        try {
            const data = await api.get('/api/wealth?action=assets');
            setAssets(data || []);
        } catch (error) {
            console.error('Failed to fetch assets:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAssets();
    }, []);

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this asset?')) return;
        try {
            await api.delete(`/api/wealth?action=assets&id=${id}`);
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

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto w-full animate-fade-in relative z-10 pb-24">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold font-heading text-white">Assets</h1>
                    <p className="text-sm text-slate-400 mt-1">{assets.length} assets tracked</p>
                </div>
                <div className="flex gap-3 w-full sm:w-auto">
                    <button className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-slate-800 text-slate-200 font-medium hover:bg-slate-700 transition flex items-center justify-center gap-2 border border-white/5 opacity-50 cursor-not-allowed">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                        Import
                    </button>
                    <Link to="/add-asset" className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-green-600/20 text-green-500 font-medium hover:bg-green-600/30 transition flex items-center justify-center gap-2 border border-green-500/20">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        Add Asset
                    </Link>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-2 mb-6">
                <button className="px-4 py-1.5 rounded-full bg-green-600/20 text-green-500 text-sm font-semibold border border-green-500/20 transition-all">
                    All ({assets.length})
                </button>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="w-8 h-8 border-4 border-green-500/20 border-t-green-500 rounded-full animate-spin"></div>
                </div>
            ) : assets.length === 0 ? (
                <div className="bg-slate-900/40 backdrop-blur-sm border border-white/5 rounded-3xl p-12 lg:p-24 flex flex-col items-center justify-center text-center shadow-lg w-full">
                    <div className="w-16 h-16 bg-slate-800/80 rounded-2xl flex items-center justify-center mb-6 border border-white/5 shadow-inner">
                        <div className="flex items-end gap-1 w-8 h-8">
                            <div className="w-1/3 bg-green-400 rounded-sm h-[60%]"></div>
                            <div className="w-1/3 bg-blue-400 rounded-sm h-[80%]"></div>
                            <div className="w-1/3 bg-purple-400 rounded-sm h-[40%]"></div>
                        </div>
                    </div>
                    <h2 className="text-xl font-bold font-heading text-white mb-2">No assets yet</h2>
                    <p className="text-sm text-slate-400 max-w-sm">
                        Add your investments, savings, and properties to see your complete financial picture.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {assets.map((item) => {
                        const isLiveTracked = !!item.live_price;
                        const icon = item.type === 'stocks' ? '📈' :
                            item.type === 'mutual_funds' ? '📊' :
                                item.type === 'gold' ? '🥇' :
                                    item.type === 'real_estate' ? '🏠' :
                                        item.type === 'crypto' ? '₿' :
                                            item.type === 'cash' ? '💵' :
                                                item.type === 'vehicle' ? '🚗' : '📦';

                        // Calculate P&L if we have original invested amount and current value.
                        let pnl = 0;
                        let pnlPercent = 0;
                        if (item.purchase_price && item.units) {
                            const invested = item.purchase_price * item.units;
                            if (invested > 0) {
                                pnl = item.value - invested;
                                pnlPercent = (pnl / invested) * 100;
                            }
                        } else if (item.purchase_price && !item.units) {
                            // Manual full amount invested
                            if (item.purchase_price > 0 && item.value > 0) {
                                pnl = item.value - item.purchase_price;
                                pnlPercent = (pnl / item.purchase_price) * 100;
                            }
                        }

                        return (
                            <div key={item.id} className="bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-3xl p-6 shadow-xl relative group transition hover:border-white/10 flex flex-col h-full">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-3 bg-green-500/10 rounded-2xl text-green-400 border border-green-500/20">
                                            <span className="text-2xl">{icon}</span>
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-white max-w-[150px] truncate" title={item.name}>{item.name}</h3>
                                            <div className="flex items-center gap-2">
                                                <p className="text-xs text-slate-400 uppercase tracking-wider">{item.type.replace('_', ' ')}</p>
                                                {isLiveTracked && <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" title="Live Pricing active"></span>}
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleDelete(item.id)}
                                        className="p-2 text-slate-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                </div>

                                <div className="mt-auto space-y-3 pt-4 border-t border-white/5">
                                    <div className="flex justify-between items-end">
                                        <span className="text-slate-400 text-sm">Current Value</span>
                                        <div className="text-right">
                                            <span className="font-bold text-white text-xl font-mono block">{formatCurrency(item.value)}</span>
                                            {pnlPercent !== 0 && (
                                                <span className={`text-xs font-medium inline-flex items-center gap-0.5 ${pnlPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                    {pnlPercent >= 0 ? '▲' : '▼'}
                                                    {Math.abs(pnlPercent).toFixed(2)}% ({formatCurrency(Math.abs(pnl))})
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {(item.units || isLiveTracked) && (
                                        <div className="flex justify-between items-center text-xs bg-slate-950/50 p-2 rounded-xl mt-2 border border-white/5">
                                            {item.units && (
                                                <div className="flex flex-col">
                                                    <span className="text-slate-500">Units</span>
                                                    <span className="text-slate-300 font-medium">{item.units}</span>
                                                </div>
                                            )}
                                            {item.live_price && (
                                                <div className="flex flex-col text-right">
                                                    <span className="text-slate-500">Live API Price</span>
                                                    <span className="text-green-400 font-medium font-mono">{formatCurrency(item.live_price)}</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    );
};

export default Assets;
