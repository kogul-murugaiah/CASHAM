import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';

const Liabilities = () => {
    const [liabilities, setLiabilities] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchLiabilities = async () => {
        try {
            const data = await api.get('/api/wealth?action=liabilities');
            setLiabilities(data || []);
        } catch (error) {
            console.error('Failed to fetch liabilities:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLiabilities();
    }, []);

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this liability?')) return;
        try {
            await api.delete(`/api/wealth?action=liabilities&id=${id}`);
            fetchLiabilities();
        } catch (error) {
            console.error('Failed to delete liability:', error);
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
        <div className="p-4 md:p-8 max-w-7xl mx-auto w-full animate-fade-in relative z-10">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold font-heading text-white">Liabilities</h1>
                    <p className="text-sm text-slate-400 mt-1">{liabilities.length} liabilities tracked</p>
                </div>
                <div className="flex gap-3 w-full sm:w-auto">
                    <button className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-slate-800 text-slate-200 font-medium hover:bg-slate-700 transition flex items-center justify-center gap-2 border border-white/5 opacity-50 cursor-not-allowed">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                        Import
                    </button>
                    <Link to="/add-liability" className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-red-600/20 text-red-500 font-medium hover:bg-red-600/30 transition flex items-center justify-center gap-2 border border-red-500/20">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        Add Liability
                    </Link>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-2 mb-6">
                <button className="px-4 py-1.5 rounded-full bg-red-600/20 text-red-500 text-sm font-semibold border border-red-500/20 transition-all">
                    All ({liabilities.length})
                </button>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="w-8 h-8 border-4 border-red-500/20 border-t-red-500 rounded-full animate-spin"></div>
                </div>
            ) : liabilities.length === 0 ? (
                <div className="bg-slate-900/40 backdrop-blur-sm border border-white/5 rounded-3xl p-12 lg:p-24 flex flex-col items-center justify-center text-center shadow-lg w-full">
                    <div className="w-16 h-16 bg-slate-800/80 rounded-2xl flex items-center justify-center mb-6 border border-white/5 shadow-inner">
                        <div className="flex items-end gap-1 w-8 h-8 opacity-75">
                            <div className="w-1/3 bg-red-400 rounded-sm h-[80%]"></div>
                            <div className="w-1/3 bg-orange-400 rounded-sm h-[50%]"></div>
                            <div className="w-1/3 bg-red-600 rounded-sm h-[30%]"></div>
                        </div>
                    </div>
                    <h2 className="text-xl font-bold font-heading text-white mb-2">No liabilities yet</h2>
                    <p className="text-sm text-slate-400 max-w-sm">
                        Add your loans, mortgages, and debts to get an accurate view of your net worth.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {liabilities.map((item) => (
                        <div key={item.id} className="bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-3xl p-6 shadow-xl relative group transition hover:border-white/10">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-red-500/10 rounded-2xl text-red-400 border border-red-500/20">
                                    <span className="text-2xl">
                                        {item.type === 'credit_card' ? '💳' :
                                            item.type === 'personal_loan' ? '💸' :
                                                item.type === 'auto_loan' ? '🚗' :
                                                    item.type === 'mortgage' ? '🏠' :
                                                        item.type === 'student_loan' ? '🎓' :
                                                            item.type === 'taxes' ? '🧾' :
                                                                item.type === 'medical' ? '🏥' : '📝'}
                                    </span>
                                </div>
                                <button
                                    onClick={() => handleDelete(item.id)}
                                    className="p-2 text-slate-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                            </div>
                            <h3 className="text-lg font-bold text-white mb-1">{item.name}</h3>
                            <p className="text-xs text-slate-400 uppercase tracking-wider mb-4">{item.type.replace('_', ' ')}</p>

                            <div className="space-y-2">
                                <div className="flex justify-between items-center text-sm border-t border-white/5 pt-3 mt-3">
                                    <span className="text-slate-400">Current Balance</span>
                                    <span className="font-bold text-white text-lg font-mono">{formatCurrency(item.balance)}</span>
                                </div>
                                {item.interest_rate && (
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-slate-500">Interest Rate</span>
                                        <span className="font-medium text-slate-300">{item.interest_rate}% APR</span>
                                    </div>
                                )}
                                {item.minimum_payment && (
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-slate-500">Min Payment</span>
                                        <span className="font-medium text-slate-300">{formatCurrency(item.minimum_payment)}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Liabilities;
