import { useState, useMemo } from "react";
import { type Fund, type FundTransaction } from "../../hooks/useFunds";
import { type CurrencyStyle, formatCurrency, formatDate } from "../../lib/formatters";
import {
    FiArrowLeft,
    FiBriefcase,
    FiCheckCircle,
    FiClock,
    FiEdit2,
    FiPlus,
    FiRotateCcw,
    FiTrash2,
    FiTrendingDown,
    FiTrendingUp,
    FiAlertTriangle,
} from "react-icons/fi";

type SettledFilter = "all" | "completed" | "income";

interface FundDetailViewProps {
    fund: Fund;
    transactions: FundTransaction[];
    loadingTx: boolean;
    isDark: boolean;
    currencyStyle: CurrencyStyle;
    onBack: () => void;
    onEditFund: (fund: Fund) => void;
    onOpenAddIncome: () => void;
    onOpenAddExpense: (defaultPlanned?: boolean) => void;
    onEditTx: (tx: FundTransaction) => void;
    onToggleStatus: (tx: FundTransaction) => void;
    onDeleteTx: (id: string) => void;
}

/** Detail view for a single fund with direct actions, split Planned Queue, and Settled History. */
export function FundDetailView({
    fund,
    transactions,
    loadingTx,
    isDark,
    currencyStyle,
    onBack,
    onEditFund,
    onOpenAddIncome,
    onOpenAddExpense,
    onEditTx,
    onToggleStatus,
    onDeleteTx,
}: FundDetailViewProps) {
    const [settledTab, setSettledTab] = useState<SettledFilter>("all");

    const textPrimary = isDark ? "text-slate-50" : "text-slate-900";
    const textSecondary = isDark ? "text-slate-400" : "text-slate-500";
    const borderCol = isDark ? "border-white/10" : "border-slate-200";
    const dividerCol = isDark ? "divide-white/5" : "divide-slate-200";
    const rowHover = isDark ? "hover:bg-white/[0.03]" : "hover:bg-slate-50";

    const {
        plannedItems,
        settledAll,
        settledPaid,
        settledIncome,
        totalIncome,
        completedTotal,
        plannedTotal,
        actualBalance,
        projectedBalance,
    } = useMemo(() => {
        if (loadingTx) {
            return {
                plannedItems: [] as FundTransaction[],
                settledAll: [] as FundTransaction[],
                settledPaid: [] as FundTransaction[],
                settledIncome: [] as FundTransaction[],
                totalIncome: fund.totalIncome,
                completedTotal: fund.completedExpenses ?? Math.max(0, fund.totalIncome - fund.actualBalance),
                plannedTotal: fund.plannedExpenses ?? Math.max(0, fund.actualBalance - fund.projectedBalance),
                actualBalance: fund.actualBalance,
                projectedBalance: fund.projectedBalance,
            };
        }

        const planned: FundTransaction[] = [];
        const paid: FundTransaction[] = [];
        const income: FundTransaction[] = [];
        let incSum = 0;
        let paidSum = 0;
        let plannedSum = 0;

        transactions.forEach(tx => {
            if (tx.type === "income") {
                income.push(tx);
                incSum += Number(tx.amount);
            } else if (tx.status === "planned") {
                planned.push(tx);
                plannedSum += Number(tx.amount);
            } else {
                paid.push(tx);
                paidSum += Number(tx.amount);
            }
        });

        const settled = transactions.filter(
            tx => tx.type === "income" || tx.status === "completed"
        );

        return {
            plannedItems: planned,
            settledAll: settled,
            settledPaid: paid,
            settledIncome: income,
            totalIncome: incSum,
            completedTotal: paidSum,
            plannedTotal: plannedSum,
            actualBalance: incSum - paidSum,
            projectedBalance: incSum - paidSum - plannedSum,
        };
    }, [transactions, loadingTx, fund]);

    const visibleSettled = useMemo(() => {
        if (settledTab === "completed") return settledPaid;
        if (settledTab === "income") return settledIncome;
        return settledAll;
    }, [settledTab, settledAll, settledPaid, settledIncome]);

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-24 pt-6 md:pt-8 md:pb-8 px-4 sm:px-6 lg:px-8 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                    <button
                        type="button"
                        onClick={onBack}
                        aria-label="Back to funds"
                        className={`p-2.5 rounded-xl border transition-colors flex-shrink-0 ${
                            isDark
                                ? "border-white/10 hover:bg-white/5 text-slate-400 hover:text-white"
                                : "border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-900 shadow-sm"
                        }`}
                    >
                        <FiArrowLeft size={18} />
                    </button>
                    <div className="flex items-center gap-3 min-w-0">
                        <span className="w-11 h-11 rounded-xl bg-emerald-500/15 text-emerald-500 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                            <FiBriefcase size={20} />
                        </span>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <h1 className={`text-xl sm:text-2xl font-black font-heading tracking-tight truncate ${textPrimary}`}>
                                    {fund.name}
                                </h1>
                                <button
                                    type="button"
                                    onClick={() => onEditFund(fund)}
                                    title="Edit fund name or description"
                                    className={`p-1.5 rounded-lg transition-colors flex-shrink-0 ${
                                        isDark
                                            ? "text-slate-400 hover:text-emerald-400 hover:bg-white/5"
                                            : "text-slate-400 hover:text-emerald-600 hover:bg-slate-100"
                                    }`}
                                >
                                    <FiEdit2 size={14} />
                                </button>
                            </div>
                            {fund.description && (
                                <p className={`text-xs sm:text-sm truncate ${textSecondary}`}>{fund.description}</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Direct Action Buttons */}
                <div className="flex items-center gap-2.5 flex-wrap">
                    <button
                        type="button"
                        onClick={onOpenAddIncome}
                        className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-1.5 transition-all"
                    >
                        <FiPlus size={15} />
                        Add Funds
                    </button>
                    <button
                        type="button"
                        onClick={() => onOpenAddExpense(false)}
                        className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold border flex items-center justify-center gap-1.5 transition-all shadow-sm ${
                            isDark
                                ? "bg-slate-800 hover:bg-slate-700 text-slate-100 border-white/10"
                                : "bg-slate-900 hover:bg-slate-800 text-white border-slate-900"
                        }`}
                    >
                        <FiTrendingDown size={15} className="text-amber-400" />
                        Log Expense
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="glass-card p-5">
                    <p className={`text-xs font-bold uppercase tracking-wider mb-1.5 ${textSecondary}`}>
                        Total Funded
                    </p>
                    <p className="text-2xl font-bold font-heading text-emerald-500">
                        {formatCurrency(totalIncome, currencyStyle)}
                    </p>
                    <p className={`text-[11px] mt-1.5 ${textSecondary}`}>
                        {settledIncome.length} {settledIncome.length === 1 ? "deposit" : "deposits"} added to pool
                    </p>
                </div>

                <div className="glass-card p-5">
                    <p className={`text-xs font-bold uppercase tracking-wider mb-1.5 ${textSecondary}`}>
                        Actual Balance
                    </p>
                    <p className={`text-2xl font-bold font-heading ${actualBalance >= 0 ? textPrimary : "text-rose-500"}`}>
                        {formatCurrency(actualBalance, currencyStyle)}
                    </p>
                    <p className={`text-[11px] mt-1.5 ${textSecondary}`}>
                        After {formatCurrency(completedTotal, currencyStyle)} paid so far
                    </p>
                </div>

                <div className={`glass-card p-5 ${projectedBalance < 0 ? "border-rose-500/30" : ""}`}>
                    <div className="flex items-center justify-between mb-1.5">
                        <p className={`text-xs font-bold uppercase tracking-wider ${textSecondary}`}>
                            Projected Balance
                        </p>
                        {projectedBalance < 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-500 border border-rose-500/25">
                                <FiAlertTriangle size={10} />
                                Top-Up Needed
                            </span>
                        )}
                    </div>
                    <p
                        className={`text-2xl font-bold font-heading ${
                            projectedBalance >= 0 ? "text-teal-600 dark:text-teal-400" : "text-rose-500"
                        }`}
                    >
                        {formatCurrency(projectedBalance, currencyStyle)}
                    </p>
                    <p className={`text-[11px] mt-1.5 ${projectedBalance < 0 ? "text-rose-500 font-medium" : textSecondary}`}>
                        {projectedBalance < 0
                            ? `Need ${formatCurrency(Math.abs(projectedBalance), currencyStyle)} more for planned items`
                            : `After ${formatCurrency(plannedTotal, currencyStyle)} planned`}
                    </p>
                </div>
            </div>

            {/* Section 1: Planned Queue Checklist */}
            <div className="glass-card overflow-hidden">
                <div className={`p-4 sm:px-5 border-b flex flex-wrap items-center justify-between gap-3 ${borderCol}`}>
                    <div className="flex items-center gap-2.5">
                        <span className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-500 flex items-center justify-center">
                            <FiClock size={16} />
                        </span>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className={`text-base font-bold font-heading ${textPrimary}`}>Planned Queue</h2>
                                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25">
                                    {plannedItems.length} pending
                                </span>
                            </div>
                            <p className={`text-xs ${textSecondary}`}>Upcoming expenses reserved from this fund</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {plannedItems.length > 0 && (
                            <span className="text-sm font-bold font-mono text-amber-600 dark:text-amber-400">
                                {formatCurrency(plannedTotal, currencyStyle)}
                            </span>
                        )}
                        <button
                            type="button"
                            onClick={() => onOpenAddExpense(true)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1 ${
                                isDark
                                    ? "bg-amber-500/10 border-amber-500/25 text-amber-400 hover:bg-amber-500/20"
                                    : "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100"
                            }`}
                        >
                            <FiPlus size={13} />
                            Plan Item
                        </button>
                    </div>
                </div>

                {loadingTx ? (
                    <div className={`p-6 text-center text-sm ${textSecondary}`}>Loading planned items...</div>
                ) : plannedItems.length === 0 ? (
                    <div className={`p-6 text-center text-xs sm:text-sm ${textSecondary}`}>
                        All caught up — no upcoming planned expenses queued.
                    </div>
                ) : (
                    <div className={`divide-y ${dividerCol}`}>
                        {plannedItems.map(tx => (
                            <div
                                key={tx.id}
                                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:px-5 transition-colors ${rowHover}`}
                            >
                                <div className="flex items-center gap-3.5 min-w-0">
                                    <div className="w-9 h-9 rounded-full bg-amber-500/15 text-amber-500 flex items-center justify-center flex-shrink-0">
                                        <FiClock size={16} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className={`text-sm font-bold truncate ${textPrimary}`}>{tx.description}</p>
                                        <p className={`text-xs mt-0.5 ${textSecondary}`}>
                                            Planned for {formatDate(tx.date)}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between sm:justify-end gap-2.5 pl-12 sm:pl-0 flex-shrink-0">
                                    <span className="text-sm sm:text-base font-bold font-mono text-amber-600 dark:text-amber-400 mr-1">
                                        -{formatCurrency(tx.amount, currencyStyle)}
                                    </span>

                                    <button
                                        type="button"
                                        onClick={() => onToggleStatus(tx)}
                                        className="min-h-[36px] px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5 transition-all"
                                    >
                                        <FiCheckCircle size={13} />
                                        Mark Paid
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => onEditTx(tx)}
                                        title="Edit entry"
                                        aria-label="Edit entry"
                                        className={`min-w-[36px] min-h-[36px] flex items-center justify-center rounded-xl transition-colors ${
                                            isDark
                                                ? "text-slate-400 hover:text-emerald-400 hover:bg-white/5"
                                                : "text-slate-500 hover:text-emerald-600 hover:bg-slate-100"
                                        }`}
                                    >
                                        <FiEdit2 size={15} />
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => onDeleteTx(tx.id)}
                                        title="Delete entry"
                                        aria-label="Delete entry"
                                        className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                                    >
                                        <FiTrash2 size={15} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Section 2: Settled History with Tabs */}
            <div className="glass-card overflow-hidden">
                <div className={`p-4 sm:px-5 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${borderCol}`}>
                    <div>
                        <h2 className={`text-base font-bold font-heading ${textPrimary}`}>Settled History</h2>
                        <p className={`text-xs ${textSecondary}`}>Deposits added and completed payments</p>
                    </div>

                    {/* Filter Tabs */}
                    <div
                        className={`flex gap-1 p-1 rounded-xl border w-fit ${
                            isDark ? "bg-slate-900/80 border-white/10" : "bg-slate-100 border-slate-200"
                        }`}
                    >
                        {(
                            [
                                { key: "all", label: "All Settled", count: settledAll.length },
                                { key: "completed", label: "Paid Expenses", count: settledPaid.length },
                                { key: "income", label: "Funded In", count: settledIncome.length },
                            ] as { key: SettledFilter; label: string; count: number }[]
                        ).map(tab => (
                            <button
                                key={tab.key}
                                type="button"
                                onClick={() => setSettledTab(tab.key)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                                    settledTab === tab.key
                                        ? "bg-emerald-600 text-white shadow-sm"
                                        : isDark
                                            ? "text-slate-400 hover:text-slate-200"
                                            : "text-slate-600 hover:text-slate-900"
                                }`}
                            >
                                <span>{tab.label}</span>
                                <span
                                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                                        settledTab === tab.key
                                            ? "bg-white/20 text-white"
                                            : isDark
                                                ? "bg-slate-800 text-slate-400"
                                                : "bg-white text-slate-500"
                                    }`}
                                >
                                    {tab.count}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {loadingTx ? (
                    <div className={`p-8 text-center text-sm ${textSecondary}`}>Loading settled history...</div>
                ) : visibleSettled.length === 0 ? (
                    <div className={`p-10 text-center space-y-1.5 ${textSecondary}`}>
                        <p className="text-sm font-medium">
                            {settledTab === "all"
                                ? "No deposits or paid expenses recorded yet."
                                : settledTab === "completed"
                                    ? "No completed expenses yet."
                                    : "No deposits funded into this pool yet."}
                        </p>
                    </div>
                ) : (
                    <div className={`divide-y ${dividerCol}`}>
                        {visibleSettled.map(tx => {
                            const isIncome = tx.type === "income";
                            return (
                                <div
                                    key={tx.id}
                                    className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:px-5 transition-colors ${rowHover}`}
                                >
                                    <div className="flex items-center gap-3.5 min-w-0">
                                        <div
                                            className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                                                isIncome
                                                    ? "bg-emerald-500/15 text-emerald-500"
                                                    : "bg-rose-500/15 text-rose-500"
                                            }`}
                                        >
                                            {isIncome ? <FiTrendingUp size={16} /> : <FiTrendingDown size={16} />}
                                        </div>
                                        <div className="min-w-0">
                                            <p className={`text-sm font-bold truncate ${textPrimary}`}>{tx.description}</p>
                                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                                <span
                                                    className={`text-[10px] font-bold uppercase tracking-wider ${
                                                        isIncome ? "text-emerald-500" : "text-rose-500"
                                                    }`}
                                                >
                                                    {isIncome ? "Funded In" : "Paid"}
                                                </span>
                                                <span className={`text-xs ${textSecondary}`}>•</span>
                                                <span className={`text-xs ${textSecondary}`}>{formatDate(tx.date)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between sm:justify-end gap-2 pl-12 sm:pl-0 flex-shrink-0">
                                        <span
                                            className={`text-sm sm:text-base font-bold font-mono mr-1 ${
                                                isIncome ? "text-emerald-500" : "text-rose-500"
                                            }`}
                                        >
                                            {isIncome ? "+" : "-"}
                                            {formatCurrency(tx.amount, currencyStyle)}
                                        </span>

                                        {!isIncome && (
                                            <button
                                                type="button"
                                                onClick={() => onToggleStatus(tx)}
                                                title="Move back to Planned Queue"
                                                aria-label="Move back to Planned Queue"
                                                className={`min-w-[36px] min-h-[36px] flex items-center justify-center rounded-xl transition-colors ${
                                                    isDark
                                                        ? "text-slate-400 hover:text-amber-400 hover:bg-amber-500/10"
                                                        : "text-slate-500 hover:text-amber-600 hover:bg-amber-50"
                                                }`}
                                            >
                                                <FiRotateCcw size={14} />
                                            </button>
                                        )}

                                        <button
                                            type="button"
                                            onClick={() => onEditTx(tx)}
                                            title="Edit entry"
                                            aria-label="Edit entry"
                                            className={`min-w-[36px] min-h-[36px] flex items-center justify-center rounded-xl transition-colors ${
                                                isDark
                                                    ? "text-slate-400 hover:text-emerald-400 hover:bg-white/5"
                                                    : "text-slate-500 hover:text-emerald-600 hover:bg-slate-100"
                                            }`}
                                        >
                                            <FiEdit2 size={15} />
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => onDeleteTx(tx.id)}
                                            title="Delete entry"
                                            aria-label="Delete entry"
                                            className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                                        >
                                            <FiTrash2 size={15} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

