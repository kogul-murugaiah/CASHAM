import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';

const NetWorth = () => {
    const [loading, setLoading] = useState(true);
    const [totalAssets, setTotalAssets] = useState(0);
    const [totalLiabilities, setTotalLiabilities] = useState(0);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [assetsData, liabilitiesData] = await Promise.all([
                api.get('/api/wealth?action=assets'),
                api.get('/api/wealth?action=liabilities')
            ]);

            const aTotal = assetsData?.summary?.total_value || 0;
            const lTotal = (liabilitiesData || []).reduce((acc: number, curr: any) => acc + (Number(curr.balance) || 0), 0);

            setTotalAssets(aTotal);
            setTotalLiabilities(lTotal);
        } catch (error) {
            console.error('Failed to fetch net worth data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(value);
    };

    const netWorth = totalAssets - totalLiabilities;

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto w-full animate-fade-in relative z-10 pb-24">
            <div className="mb-8">
                <h1 className="text-3xl font-bold font-heading text-white">Net Worth</h1>
                <p className="text-sm text-slate-400 mt-1">Your comprehensive financial snapshot</p>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="w-8 h-8 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                </div>
            ) : (
                <>
                    {/* Top Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <Link to="/assets" className="bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-3xl p-6 shadow-xl relative group transition hover:border-green-500/30 block">
                            <div className="flex items-center gap-3 mb-2 text-slate-400 text-sm font-medium">
                                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                Total Assets
                            </div>
                            <div className="text-3xl font-bold text-white font-mono">{formatCurrency(totalAssets)}</div>
                        </Link>

                        <Link to="/liabilities" className="bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-3xl p-6 shadow-xl relative group transition hover:border-red-500/30 block">
                            <div className="flex items-center gap-3 mb-2 text-slate-400 text-sm font-medium">
                                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                Total Liabilities
                            </div>
                            <div className="text-3xl font-bold text-white font-mono">{formatCurrency(totalLiabilities)}</div>
                        </Link>

                        <div className="bg-gradient-to-br from-blue-900/40 to-indigo-900/40 backdrop-blur-sm border border-blue-500/30 rounded-3xl p-6 shadow-xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
                            <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl -ml-10 -mb-10 pointer-events-none"></div>

                            <div className="flex items-center gap-3 mb-2 text-blue-200 text-sm font-medium relative z-10">
                                <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></div>
                                Net Worth
                            </div>
                            <div className="text-4xl font-bold text-white relative z-10 font-mono">
                                {formatCurrency(netWorth)}
                            </div>
                        </div>
                    </div>

                    {/* Main Chart Area */}
                    <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-3xl p-6 shadow-xl min-h-[400px] flex flex-col">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-white font-heading">Net Worth Over Time</h3>
                            <div className="flex gap-2">
                                <button className="px-3 py-1 text-xs font-medium rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/20">ALL</button>
                            </div>
                        </div>

                        {/* Empty State Chart Area */}
                        <div className="flex-1 border-t border-white/5 mt-2 pt-16 flex flex-col items-center justify-center relative">
                            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/10 via-transparent to-transparent opacity-50 pointer-events-none"></div>

                            {/* Simulated empty graph line */}
                            <svg className="w-full h-32 absolute top-1/2 -translate-y-1/2 opacity-20 pointer-events-none" preserveAspectRatio="none" viewBox="0 0 100 100">
                                <path d="M0 50 Q 25 50 50 50 T 100 50" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" className="text-slate-500" />
                            </svg>

                            <p className="text-slate-300 z-10 font-medium">Historical chart coming soon</p>
                            <p className="text-xs text-slate-500 mt-2 z-10 text-center max-w-sm">Keep tracking your assets and liabilities. In the future, this will show your wealth's growth over time.</p>

                            <div className="flex gap-4 mt-8 z-10">
                                <Link to="/add-asset" className="px-5 py-2.5 rounded-xl bg-green-500/20 text-green-400 text-sm font-medium hover:bg-green-500/30 transition border border-green-500/20 shadow-lg shadow-green-500/10">
                                    + Add Asset
                                </Link>
                                <Link to="/add-liability" className="px-5 py-2.5 rounded-xl bg-red-500/20 text-red-400 text-sm font-medium hover:bg-red-500/30 transition border border-red-500/20 shadow-lg shadow-red-500/10">
                                    + Add Liability
                                </Link>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default NetWorth;
