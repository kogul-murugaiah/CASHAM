import { useState, useEffect } from "react";
import { useFunds, type Fund, type FundTransaction } from "../hooks/useFunds";
import { useUserPreferences } from "../hooks/useUserPreferences";
import { useTheme } from "../contexts/ThemeContext";
import { formatCurrency } from "../lib/formatters";
import {
    FiBriefcase,
    FiPlus,
    FiArrowLeft,
    FiTrash2,
    FiX,
    FiCheck,
    FiDollarSign,
    FiTrendingDown,
    FiTrendingUp,
    FiClock,
    FiCheckCircle
} from "react-icons/fi";

const FundTracker = () => {
    const {
        funds,
        loading,
        error,
        fetchFunds,
        createFund,
        deleteFund,
        fetchTransactions,
        addTransaction,
        updateTransactionStatus,
        deleteTransaction
    } = useFunds();

    const { currencyStyle } = useUserPreferences();
    const { theme } = useTheme();
    const isDark = theme === "dark";

    const [activeFund, setActiveFund] = useState<Fund | null>(null);
    const [transactions, setTransactions] = useState<FundTransaction[]>([]);
    const [loadingTx, setLoadingTx] = useState(false);

    const [showFundModal, setShowFundModal] = useState(false);
    const [fundForm, setFundForm] = useState({ name: "", description: "" });
    const [isSaving, setIsSaving] = useState(false);

    const [showTxModal, setShowTxModal] = useState(false);
    const [txForm, setTxForm] = useState<{
        type: "income" | "expense";
        amount: string;
        date: string;
        description: string;
        status: "planned" | "completed";
    }>({
        type: "expense",
        amount: "",
        date: new Date().toISOString().slice(0, 10),
        description: "",
        status: "completed"
    });

    useEffect(() => {
        fetchFunds();
    }, [fetchFunds]);

    // Keep activeFund in sync if it gets updated in the background
    useEffect(() => {
        if (activeFund) {
            const updated = funds.find(f => f.id === activeFund.id);
            if (updated) setActiveFund(updated);
        }
    }, [funds, activeFund]);

    const loadTransactions = async (fund_id: string) => {
        setLoadingTx(true);
        try {
            const txs = await fetchTransactions(fund_id);
            setTransactions(txs);
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingTx(false);
        }
    };

    const handleOpenFund = (fund: Fund) => {
        setActiveFund(fund);
        loadTransactions(fund.id);
    };

    const handleCreateFund = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!fundForm.name) return;
        setIsSaving(true);
        try {
            await createFund(fundForm.name, fundForm.description);
            setShowFundModal(false);
            setFundForm({ name: "", description: "" });
        } catch (err) {
            console.error(err);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteFund = async (id: string, name: string) => {
        if (!window.confirm(`Delete fund "${name}" and all its transactions?`)) return;
        await deleteFund(id);
        if (activeFund?.id === id) setActiveFund(null);
    };

    const handleAddTx = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeFund || !txForm.amount || !txForm.date || !txForm.description) return;
        setIsSaving(true);
        try {
            await addTransaction({
                fund_id: activeFund.id,
                type: txForm.type,
                amount: Number(txForm.amount),
                date: txForm.date,
                description: txForm.description,
                status: txForm.type === 'income' ? 'completed' : txForm.status
            });
            setShowTxModal(false);
            setTxForm(prev => ({ ...prev, amount: "", description: "" }));
            loadTransactions(activeFund.id);
        } catch (err) {
            console.error(err);
        } finally {
            setIsSaving(false);
        }
    };

    const handleToggleStatus = async (tx: FundTransaction) => {
        if (tx.type === 'income') return; // Incomes are always completed in this simple model
        const newStatus = tx.status === 'completed' ? 'planned' : 'completed';
        try {
            await updateTransactionStatus(tx.id, newStatus);
            setTransactions(prev => prev.map(t => t.id === tx.id ? { ...t, status: newStatus } : t));
        } catch (err) {
            console.error(err);
        }
    };

    const handleDeleteTx = async (id: string) => {
        if (!window.confirm('Delete this transaction?')) return;
        try {
            await deleteTransaction(id);
            setTransactions(prev => prev.filter(t => t.id !== id));
        } catch (err) {
            console.error(err);
        }
    };

    const cardBg = isDark ? "bg-slate-800 border-white/5" : "bg-white border-slate-200";
    const modalBg = isDark ? "bg-slate-800 border-white/10" : "bg-white border-slate-200";
    const textPrimary = isDark ? "text-slate-50" : "text-slate-900";
    const textSecondary = isDark ? "text-slate-400" : "text-slate-500";
    const inputClass = `w-full px-4 py-2.5 rounded-xl border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${isDark ? "bg-slate-900/50 border-white/10 text-white placeholder:text-slate-500" : "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400"}`;

    if (activeFund) {
        return (
            <div className="max-w-5xl mx-auto space-y-6 pb-24 pt-8 md:pb-8 px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <button onClick={() => setActiveFund(null)} className={`p-2 rounded-xl border transition-colors ${isDark ? "border-white/10 hover:bg-white/5 text-slate-400 hover:text-white" : "border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-900"}`}>
                        <FiArrowLeft size={20} />
                    </button>
                    <div className="flex-1">
                        <div className="flex items-center gap-3">
                            <span className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-500 flex items-center justify-center">
                                <FiBriefcase size={20} />
                            </span>
                            <div>
                                <h1 className={`text-2xl font-black tracking-tight ${textPrimary}`}>{activeFund.name}</h1>
                                {activeFund.description && <p className={`text-sm ${textSecondary}`}>{activeFund.description}</p>}
                            </div>
                        </div>
                    </div>
                    <button onClick={() => setShowTxModal(true)} className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold shadow-lg flex items-center gap-2">
                        <FiPlus size={16} /> Add Log
                    </button>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className={`rounded-2xl border p-5 ${cardBg}`}>
                        <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${textSecondary}`}>Total Funded</p>
                        <p className="text-2xl font-bold font-heading text-emerald-500">{formatCurrency(activeFund.totalIncome, currencyStyle)}</p>
                    </div>
                    <div className={`rounded-2xl border p-5 ${cardBg}`}>
                        <p className={`text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-1 ${textSecondary}`}>
                            Actual Balance
                        </p>
                        <p className={`text-2xl font-bold font-heading ${activeFund.actualBalance >= 0 ? "text-blue-500" : "text-red-500"}`}>
                            {formatCurrency(activeFund.actualBalance, currencyStyle)}
                        </p>
                        <p className={`text-[10px] mt-1 ${textSecondary}`}>Total Funded minus Completed Expenses</p>
                    </div>
                    <div className={`rounded-2xl border p-5 ${cardBg}`}>
                        <p className={`text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-1 ${textSecondary}`}>
                            Projected Balance
                        </p>
                        <p className={`text-2xl font-bold font-heading ${activeFund.projectedBalance >= 0 ? "text-indigo-500" : "text-red-500"}`}>
                            {formatCurrency(activeFund.projectedBalance, currencyStyle)}
                        </p>
                        <p className={`text-[10px] mt-1 ${textSecondary}`}>After all Planned Expenses</p>
                    </div>
                </div>

                {/* Transactions List */}
                <div className={`rounded-2xl border overflow-hidden ${cardBg}`}>
                    <div className={`p-4 border-b ${isDark ? "border-white/5" : "border-slate-200"}`}>
                        <h3 className={`text-base font-bold ${textPrimary}`}>Transaction Logs</h3>
                    </div>
                    {loadingTx ? (
                        <div className={`p-8 text-center text-sm ${textSecondary}`}>Loading transactions...</div>
                    ) : transactions.length === 0 ? (
                        <div className={`p-12 text-center space-y-2 ${textSecondary}`}>
                            <p className="text-sm">No transactions logged yet.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-white/5">
                            {transactions.map(tx => (
                                <div key={tx.id} className={`flex items-center justify-between p-4 sm:p-5 transition-colors ${isDark ? "hover:bg-white/5" : "hover:bg-slate-50"}`}>
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.type === 'income' ? 'bg-emerald-500/10 text-emerald-500' : (tx.status === 'planned' ? 'bg-amber-500/10 text-amber-500' : 'bg-red-500/10 text-red-500')}`}>
                                            {tx.type === 'income' ? <FiTrendingUp size={18} /> : <FiTrendingDown size={18} />}
                                        </div>
                                        <div>
                                            <p className={`text-sm font-bold ${textPrimary}`}>{tx.description}</p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className={`text-[10px] font-semibold uppercase tracking-wider ${tx.type === 'income' ? 'text-emerald-500' : 'text-red-500'}`}>
                                                    {tx.type}
                                                </span>
                                                <span className={`text-xs ${textSecondary}`}>•</span>
                                                <span className={`text-xs ${textSecondary}`}>{new Date(tx.date).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <p className={`text-base font-bold font-mono ${tx.type === 'income' ? 'text-emerald-500' : 'text-red-500'}`}>
                                                {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount, currencyStyle)}
                                            </p>
                                            {tx.type === 'expense' && (
                                                <button onClick={() => handleToggleStatus(tx)} className={`text-[10px] mt-0.5 flex items-center gap-1 justify-end font-semibold hover:underline ${tx.status === 'completed' ? 'text-emerald-500' : 'text-amber-500'}`}>
                                                    {tx.status === 'completed' ? <><FiCheckCircle size={10} /> Completed</> : <><FiClock size={10} /> Planned</>}
                                                </button>
                                            )}
                                        </div>
                                        <button onClick={() => handleDeleteTx(tx.id)} className={`p-2 rounded-lg opacity-50 hover:opacity-100 hover:bg-red-500/10 text-red-500 transition-all`}>
                                            <FiTrash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Add Transaction Modal */}
                {showTxModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                        <div className={`max-w-md w-full p-6 space-y-5 rounded-2xl shadow-2xl border ${modalBg}`}>
                            <div className="flex items-center justify-between border-b border-white/10 pb-3">
                                <h3 className={`text-lg font-bold flex items-center gap-2 ${textPrimary}`}>Add Log</h3>
                                <button onClick={() => setShowTxModal(false)} className={`p-1.5 rounded-lg hover:bg-white/10 text-slate-400`}><FiX size={16} /></button>
                            </div>
                            <form onSubmit={handleAddTx} className="space-y-4">
                                <div className="grid grid-cols-2 gap-2">
                                    <button type="button" onClick={() => setTxForm({ ...txForm, type: "income" })} className={`py-2 rounded-xl text-xs font-bold transition-all border ${txForm.type === "income" ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-500" : "bg-transparent border-white/10 text-slate-400 hover:bg-white/5"}`}>Fund In (+)</button>
                                    <button type="button" onClick={() => setTxForm({ ...txForm, type: "expense" })} className={`py-2 rounded-xl text-xs font-bold transition-all border ${txForm.type === "expense" ? "bg-red-500/20 border-red-500/50 text-red-500" : "bg-transparent border-white/10 text-slate-400 hover:bg-white/5"}`}>Expense Out (-)</button>
                                </div>

                                <div>
                                    <label className={`block text-xs font-medium mb-1 ${textSecondary}`}>Description</label>
                                    <input type="text" placeholder="e.g. Flight Tickets" value={txForm.description} onChange={e => setTxForm({ ...txForm, description: e.target.value })} className={inputClass} required />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className={`block text-xs font-medium mb-1 ${textSecondary}`}>Amount</label>
                                        <input type="number" min="0" step="any" value={txForm.amount} onChange={e => setTxForm({ ...txForm, amount: e.target.value })} className={inputClass} required />
                                    </div>
                                    <div>
                                        <label className={`block text-xs font-medium mb-1 ${textSecondary}`}>Date</label>
                                        <input type="date" value={txForm.date} onChange={e => setTxForm({ ...txForm, date: e.target.value })} className={inputClass} required />
                                    </div>
                                </div>

                                {txForm.type === "expense" && (
                                    <div>
                                        <label className={`block text-xs font-medium mb-1 ${textSecondary}`}>Status</label>
                                        <select value={txForm.status} onChange={e => setTxForm({ ...txForm, status: e.target.value as any })} className={inputClass}>
                                            <option value="planned">Planned (Upcoming)</option>
                                            <option value="completed">Completed (Paid)</option>
                                        </select>
                                    </div>
                                )}

                                <button type="submit" disabled={isSaving} className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-colors">
                                    {isSaving ? "Saving..." : "Save Log"}
                                </button>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-24 pt-8 md:pb-8 px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className={`text-2xl font-black tracking-tight flex items-center gap-2 ${textPrimary}`}>
                        <FiBriefcase className="text-blue-500" /> Independent Funds
                    </h1>
                    <p className={`text-sm mt-1 ${textSecondary}`}>Track specific goals, projects, or family funds separate from your monthly budget.</p>
                </div>
                <button onClick={() => setShowFundModal(true)} className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg flex items-center gap-2 w-fit">
                    <FiPlus size={16} /> New Fund
                </button>
            </div>

            {error && <div className="p-4 rounded-xl bg-red-500/10 text-red-500 text-sm">{error}</div>}

            {loading && funds.length === 0 ? (
                <div className={`p-12 text-center text-sm ${textSecondary}`}>Loading funds...</div>
            ) : funds.length === 0 ? (
                <div className={`p-12 text-center space-y-2 border border-dashed rounded-2xl ${isDark ? "border-white/10" : "border-slate-300"} ${textSecondary}`}>
                    <FiBriefcase size={32} className="mx-auto opacity-30" />
                    <p className="text-sm">No independent funds tracked yet.</p>
                    <p className="text-xs opacity-70">Create a fund for a family trip, house renovation, or emergency savings.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {funds.map(fund => (
                        <div key={fund.id} onClick={() => handleOpenFund(fund)} className={`p-5 rounded-2xl border cursor-pointer group transition-all hover:-translate-y-1 hover:shadow-xl ${cardBg}`}>
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <h3 className={`text-lg font-bold group-hover:text-blue-500 transition-colors ${textPrimary}`}>{fund.name}</h3>
                                    {fund.description && <p className={`text-xs mt-1 line-clamp-2 ${textSecondary}`}>{fund.description}</p>}
                                </div>
                                <button onClick={(e) => { e.stopPropagation(); handleDeleteFund(fund.id, fund.name); }} className={`p-2 rounded-xl opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500/10 text-red-500`}>
                                    <FiTrash2 size={16} />
                                </button>
                            </div>
                            <div className="space-y-3 pt-4 border-t border-white/5">
                                <div className="flex justify-between items-center text-sm">
                                    <span className={textSecondary}>Total Funded</span>
                                    <span className="font-bold text-emerald-500 font-mono">{formatCurrency(fund.totalIncome, currencyStyle)}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className={textSecondary}>Actual Bal</span>
                                    <span className={`font-bold font-mono ${fund.actualBalance >= 0 ? textPrimary : "text-red-500"}`}>{formatCurrency(fund.actualBalance, currencyStyle)}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className={textSecondary}>Projected Bal</span>
                                    <span className={`font-bold font-mono ${fund.projectedBalance >= 0 ? "text-indigo-500" : "text-red-500"}`}>{formatCurrency(fund.projectedBalance, currencyStyle)}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Fund Modal */}
            {showFundModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className={`max-w-md w-full p-6 space-y-5 rounded-2xl shadow-2xl border ${modalBg}`}>
                        <div className="flex items-center justify-between border-b border-white/10 pb-3">
                            <h3 className={`text-lg font-bold flex items-center gap-2 ${textPrimary}`}><FiBriefcase className="text-blue-500" /> New Fund</h3>
                            <button onClick={() => setShowFundModal(false)} className={`p-1.5 rounded-lg hover:bg-white/10 text-slate-400`}><FiX size={16} /></button>
                        </div>
                        <form onSubmit={handleCreateFund} className="space-y-4">
                            <div>
                                <label className={`block text-xs font-medium mb-1 ${textSecondary}`}>Fund Name</label>
                                <input type="text" placeholder="e.g. Family Trip to Bali" value={fundForm.name} onChange={e => setFundForm({ ...fundForm, name: e.target.value })} className={inputClass} required />
                            </div>
                            <div>
                                <label className={`block text-xs font-medium mb-1 ${textSecondary}`}>Description (optional)</label>
                                <input type="text" placeholder="Saving up for our summer vacation" value={fundForm.description} onChange={e => setFundForm({ ...fundForm, description: e.target.value })} className={inputClass} />
                            </div>
                            <button type="submit" disabled={isSaving} className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-colors">
                                {isSaving ? "Saving..." : "Create Fund"}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FundTracker;
