import { useState, useEffect, useMemo } from "react";
import { useFunds, type Fund, type FundTransaction } from "../hooks/useFunds";
import { useUserPreferences } from "../hooks/useUserPreferences";
import { useTheme } from "../contexts/ThemeContext";
import { formatCurrency } from "../lib/formatters";
import {
    FundFormModal,
    FundTxModal,
    type FundTxFormValues,
} from "../components/funds/FundModals";
import { FundDetailView } from "../components/funds/FundDetailView";
import {
    FiBriefcase,
    FiPlus,
    FiTrash2,
    FiEdit2,
    FiClock,
    FiAlertTriangle,
    FiLayers,
    FiShield,
} from "react-icons/fi";

const FundTracker = () => {
    const {
        funds,
        loading,
        error,
        fetchFunds,
        createFund,
        updateFund,
        deleteFund,
        fetchTransactions,
        addTransaction,
        updateTransaction,
        updateTransactionStatus,
        deleteTransaction,
    } = useFunds();

    const { currencyStyle } = useUserPreferences();
    const { theme } = useTheme();
    const isDark = theme === "dark";

    const [activeFund, setActiveFund] = useState<Fund | null>(null);
    const [transactions, setTransactions] = useState<FundTransaction[]>([]);
    const [loadingTx, setLoadingTx] = useState(false);

    // Fund Create / Edit Modal state
    const [showFundModal, setShowFundModal] = useState(false);
    const [editingFund, setEditingFund] = useState<Fund | null>(null);

    // Transaction Create / Edit Modal state
    const [showTxModal, setShowTxModal] = useState(false);
    const [txModalType, setTxModalType] = useState<"income" | "expense">("expense");
    const [txModalStatus, setTxModalStatus] = useState<"planned" | "completed">("completed");
    const [editingTx, setEditingTx] = useState<FundTransaction | null>(null);

    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        fetchFunds();
    }, [fetchFunds]);

    // Keep activeFund synced if refreshed in background
    useEffect(() => {
        if (activeFund) {
            const updated = funds.find(f => f.id === activeFund.id);
            if (updated) setActiveFund(updated);
        }
    }, [funds, activeFund]);

    const loadTransactions = async (fundId: string) => {
        setLoadingTx(true);
        try {
            const txs = await fetchTransactions(fundId);
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

    const openCreateFundModal = () => {
        setEditingFund(null);
        setShowFundModal(true);
    };

    const openEditFundModal = (fund: Fund) => {
        setEditingFund(fund);
        setShowFundModal(true);
    };

    const handleSaveFund = async (name: string, description: string) => {
        setIsSaving(true);
        try {
            if (editingFund) {
                await updateFund(editingFund.id, name, description);
            } else {
                await createFund(name, description);
            }
            setShowFundModal(false);
            setEditingFund(null);
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

    const openAddIncome = () => {
        setEditingTx(null);
        setTxModalType("income");
        setTxModalStatus("completed");
        setShowTxModal(true);
    };

    const openAddExpense = (defaultPlanned = false) => {
        setEditingTx(null);
        setTxModalType("expense");
        setTxModalStatus(defaultPlanned ? "planned" : "completed");
        setShowTxModal(true);
    };

    const openEditTx = (tx: FundTransaction) => {
        setEditingTx(tx);
        setTxModalType(tx.type);
        setTxModalStatus(tx.status);
        setShowTxModal(true);
    };

    const handleSaveTx = async (values: FundTxFormValues) => {
        if (!activeFund) return;
        setIsSaving(true);
        try {
            if (editingTx) {
                const updated = await updateTransaction({
                    id: editingTx.id,
                    ...values,
                });
                setTransactions(prev =>
                    prev
                        .map(t => (t.id === editingTx.id ? updated : t))
                        .sort((a, b) => b.date.localeCompare(a.date))
                );
            } else {
                await addTransaction({
                    fund_id: activeFund.id,
                    ...values,
                });
                await loadTransactions(activeFund.id);
            }
            setShowTxModal(false);
            setEditingTx(null);
        } catch (err) {
            console.error(err);
        } finally {
            setIsSaving(false);
        }
    };

    const handleToggleStatus = async (tx: FundTransaction) => {
        if (tx.type === "income") return;
        const newStatus = tx.status === "completed" ? "planned" : "completed";
        try {
            await updateTransactionStatus(tx.id, newStatus);
            setTransactions(prev =>
                prev.map(t => (t.id === tx.id ? { ...t, status: newStatus } : t))
            );
        } catch (err) {
            console.error(err);
        }
    };

    const handleDeleteTx = async (id: string) => {
        if (!window.confirm("Delete this transaction?")) return;
        try {
            await deleteTransaction(id);
            setTransactions(prev => prev.filter(t => t.id !== id));
        } catch (err) {
            console.error(err);
        }
    };

    // Portfolio-level summary across all independent funds
    const portfolioSummary = useMemo(() => {
        let totalCashHeld = 0;
        let totalPlanned = 0;
        let totalPlannedCount = 0;
        let netFree = 0;

        funds.forEach(f => {
            totalCashHeld += Number(f.actualBalance || 0);
            const plannedAmt =
                f.plannedExpenses !== undefined
                    ? Number(f.plannedExpenses)
                    : Math.max(0, Number(f.actualBalance || 0) - Number(f.projectedBalance || 0));
            totalPlanned += plannedAmt;
            totalPlannedCount += Number(f.plannedCount || 0);
            netFree += Number(f.projectedBalance || 0);
        });

        return { totalCashHeld, totalPlanned, totalPlannedCount, netFree };
    }, [funds]);

    const textPrimary = isDark ? "text-slate-50" : "text-slate-900";
    const textSecondary = isDark ? "text-slate-400" : "text-slate-500";
    const dividerCol = isDark ? "border-white/10" : "border-slate-200";

    return (
        <>
            {activeFund ? (
                <FundDetailView
                    fund={activeFund}
                    transactions={transactions}
                    loadingTx={loadingTx}
                    isDark={isDark}
                    currencyStyle={currencyStyle}
                    onBack={() => setActiveFund(null)}
                    onEditFund={openEditFundModal}
                    onOpenAddIncome={openAddIncome}
                    onOpenAddExpense={openAddExpense}
                    onEditTx={openEditTx}
                    onToggleStatus={handleToggleStatus}
                    onDeleteTx={handleDeleteTx}
                />
            ) : (
                <div className="max-w-7xl mx-auto space-y-6 pb-24 pt-6 md:pt-8 md:pb-8 px-4 sm:px-6 lg:px-8 animate-fade-in">
                    {/* Overview Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h1 className={`text-2xl sm:text-3xl font-black font-heading tracking-tight flex items-center gap-2.5 ${textPrimary}`}>
                                <span className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-500 border border-emerald-500/20 flex items-center justify-center">
                                    <FiBriefcase size={20} />
                                </span>
                                Independent Funds
                            </h1>
                            <p className={`text-sm mt-1.5 ${textSecondary}`}>
                                Track dedicated projects, events, or family pools separate from your monthly budget.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={openCreateFundModal}
                            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-emerald-600/20 flex items-center gap-2 w-fit transition-all"
                        >
                            <FiPlus size={16} />
                            New Fund
                        </button>
                    </div>

                    {error && (
                        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-500 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Portfolio Summary Strip */}
                    {funds.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="glass-card p-5">
                                <div className="flex items-center gap-2 text-emerald-500 mb-1.5">
                                    <FiLayers size={14} />
                                    <p className={`text-xs font-bold uppercase tracking-wider ${textSecondary}`}>
                                        Total Cash Held
                                    </p>
                                </div>
                                <p className={`text-2xl font-bold font-heading ${portfolioSummary.totalCashHeld >= 0 ? textPrimary : "text-rose-500"}`}>
                                    {formatCurrency(portfolioSummary.totalCashHeld, currencyStyle)}
                                </p>
                                <p className={`text-[11px] mt-1 ${textSecondary}`}>
                                    Across {funds.length} {funds.length === 1 ? "active fund" : "active funds"}
                                </p>
                            </div>

                            <div className="glass-card p-5">
                                <div className="flex items-center gap-2 text-amber-500 mb-1.5">
                                    <FiClock size={14} />
                                    <p className={`text-xs font-bold uppercase tracking-wider ${textSecondary}`}>
                                        Upcoming Planned
                                    </p>
                                </div>
                                <p className="text-2xl font-bold font-heading text-amber-500">
                                    {formatCurrency(portfolioSummary.totalPlanned, currencyStyle)}
                                </p>
                                <p className={`text-[11px] mt-1 ${textSecondary}`}>
                                    {portfolioSummary.totalPlannedCount} planned {portfolioSummary.totalPlannedCount === 1 ? "item" : "items"} queued
                                </p>
                            </div>

                            <div className="glass-card p-5">
                                <div className="flex items-center gap-2 text-teal-500 mb-1.5">
                                    <FiShield size={14} />
                                    <p className={`text-xs font-bold uppercase tracking-wider ${textSecondary}`}>
                                        Net Free Across Funds
                                    </p>
                                </div>
                                <p className={`text-2xl font-bold font-heading ${portfolioSummary.netFree >= 0 ? "text-teal-600 dark:text-teal-400" : "text-rose-500"}`}>
                                    {formatCurrency(portfolioSummary.netFree, currencyStyle)}
                                </p>
                                <p className={`text-[11px] mt-1 ${textSecondary}`}>
                                    Uncommitted reserve after planned expenses
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Fund Cards Grid */}
                    {loading && funds.length === 0 ? (
                        <div className={`p-12 text-center text-sm ${textSecondary}`}>Loading funds...</div>
                    ) : funds.length === 0 ? (
                        <div className={`glass-card p-12 text-center space-y-2 border-dashed ${isDark ? "border-white/10" : "border-slate-300"} ${textSecondary}`}>
                            <FiBriefcase size={32} className="mx-auto text-emerald-500/40" />
                            <p className={`text-sm font-semibold ${textPrimary}`}>No independent funds tracked yet</p>
                            <p className="text-xs opacity-80">
                                Create a fund for a family trip, house renovation, event, or rainy-day reserve.
                            </p>
                            <button
                                type="button"
                                onClick={openCreateFundModal}
                                className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all"
                            >
                                <FiPlus size={14} /> Create First Fund
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {funds.map(fund => {
                                const hasShortfall = fund.projectedBalance < 0;
                                const plannedCount = fund.plannedCount ?? 0;

                                return (
                                    <div
                                        key={fund.id}
                                        onClick={() => handleOpenFund(fund)}
                                        className={`glass-card p-5 cursor-pointer group flex flex-col justify-between hover:-translate-y-0.5 ${
                                            hasShortfall ? "border-rose-500/25" : ""
                                        }`}
                                    >
                                        <div>
                                            <div className="flex items-start justify-between gap-2 mb-3">
                                                <div className="min-w-0 flex-1">
                                                    <h3 className={`text-lg font-bold font-heading truncate group-hover:text-emerald-500 transition-colors ${textPrimary}`}>
                                                        {fund.name}
                                                    </h3>
                                                    {fund.description && (
                                                        <p className={`text-xs mt-1 line-clamp-2 ${textSecondary}`}>
                                                            {fund.description}
                                                        </p>
                                                    )}
                                                </div>

                                                {/* Mobile-friendly visible Edit & Delete controls */}
                                                <div className="flex items-center gap-1 flex-shrink-0">
                                                    <button
                                                        type="button"
                                                        onClick={e => {
                                                            e.stopPropagation();
                                                            openEditFundModal(fund);
                                                        }}
                                                        title="Edit fund"
                                                        aria-label={`Edit ${fund.name}`}
                                                        className={`min-w-[34px] min-h-[34px] flex items-center justify-center rounded-xl transition-colors opacity-80 sm:opacity-65 group-hover:opacity-100 ${
                                                            isDark
                                                                ? "text-slate-400 hover:text-emerald-400 hover:bg-white/10"
                                                                : "text-slate-500 hover:text-emerald-600 hover:bg-slate-100"
                                                        }`}
                                                    >
                                                        <FiEdit2 size={15} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={e => {
                                                            e.stopPropagation();
                                                            handleDeleteFund(fund.id, fund.name);
                                                        }}
                                                        title="Delete fund"
                                                        aria-label={`Delete ${fund.name}`}
                                                        className="min-w-[34px] min-h-[34px] flex items-center justify-center rounded-xl transition-colors opacity-80 sm:opacity-65 group-hover:opacity-100 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10"
                                                    >
                                                        <FiTrash2 size={15} />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Quick status pills */}
                                            {(plannedCount > 0 || hasShortfall) && (
                                                <div className="flex items-center gap-2 flex-wrap mb-3">
                                                    {plannedCount > 0 && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25">
                                                            <FiClock size={10} />
                                                            {plannedCount} planned
                                                        </span>
                                                    )}
                                                    {hasShortfall && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-500 border border-rose-500/25">
                                                            <FiAlertTriangle size={10} />
                                                            Needs Top-Up
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        <div className={`space-y-2.5 pt-4 border-t ${dividerCol}`}>
                                            <div className="flex justify-between items-center text-sm">
                                                <span className={textSecondary}>Total Funded</span>
                                                <span className="font-bold text-emerald-500 font-mono">
                                                    {formatCurrency(fund.totalIncome, currencyStyle)}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center text-sm">
                                                <span className={textSecondary}>Actual Bal</span>
                                                <span className={`font-bold font-mono ${fund.actualBalance >= 0 ? textPrimary : "text-rose-500"}`}>
                                                    {formatCurrency(fund.actualBalance, currencyStyle)}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center text-sm">
                                                <span className={textSecondary}>Projected Bal</span>
                                                <span
                                                    className={`font-bold font-mono ${
                                                        fund.projectedBalance >= 0
                                                            ? "text-teal-600 dark:text-teal-400"
                                                            : "text-rose-500"
                                                    }`}
                                                >
                                                    {formatCurrency(fund.projectedBalance, currencyStyle)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Shared Modals */}
            {showFundModal && (
                <FundFormModal
                    key={editingFund?.id ?? "new-fund"}
                    isDark={isDark}
                    editingFund={editingFund}
                    isSaving={isSaving}
                    onClose={() => {
                        setShowFundModal(false);
                        setEditingFund(null);
                    }}
                    onSubmit={handleSaveFund}
                />
            )}

            {showTxModal && (
                <FundTxModal
                    key={editingTx?.id ?? `new-${txModalType}-${txModalStatus}`}
                    isDark={isDark}
                    initialType={txModalType}
                    initialStatus={txModalStatus}
                    editingTx={editingTx}
                    isSaving={isSaving}
                    onClose={() => {
                        setShowTxModal(false);
                        setEditingTx(null);
                    }}
                    onSubmit={handleSaveTx}
                />
            )}
        </>
    );
};

export default FundTracker;
