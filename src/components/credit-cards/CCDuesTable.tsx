import React from "react";
import { FiCreditCard, FiCheckCircle, FiX, FiAlertCircle, FiRotateCcw } from "react-icons/fi";
import { formatCurrency, formatDate } from "../../lib/formatters";
import type { CreditCard, UnsettledExpense, CurrencyStyle } from "./types";

interface CCDuesTableProps {
  cards: CreditCard[];
  displayedExpenses: UnsettledExpense[];
  duesSearch: string;
  setDuesSearch: (val: string) => void;
  duesFilterCard: string;
  onFilterCardChange: (cardId: string) => void;
  duesFilterFundsStatus: "all" | "moved" | "pending" | "shortfall";
  setDuesFilterFundsStatus: (status: "all" | "moved" | "pending" | "shortfall") => void;
  duesFilterCycle?: "all" | "statement" | "unbilled";
  setDuesFilterCycle?: (cycle: "all" | "statement" | "unbilled") => void;
  onToggleExpenseFundsSetAside: (
    expense: UnsettledExpense,
    action?: "toggle" | "cover_shortfall" | "reset_pending"
  ) => void;
  currencyStyle?: CurrencyStyle;
  isDark: boolean;
}

export const CCDuesTable: React.FC<CCDuesTableProps> = ({
  cards,
  displayedExpenses,
  duesSearch,
  setDuesSearch,
  duesFilterCard,
  onFilterCardChange,
  duesFilterFundsStatus,
  setDuesFilterFundsStatus,
  duesFilterCycle = "all",
  setDuesFilterCycle,
  onToggleExpenseFundsSetAside,
  currencyStyle,
  isDark,
}) => {
  const cardBg = isDark ? "bg-slate-800/80 border-white/10" : "bg-white border-slate-200 shadow-sm";
  const textPrimary = isDark ? "text-white" : "text-slate-800";
  const textSecondary = isDark ? "text-slate-400" : "text-slate-500";
  const textMuted = isDark ? "text-slate-500" : "text-slate-400";
  const divider = isDark ? "border-white/10" : "border-slate-200";
  const rowHover = isDark ? "hover:bg-white/5" : "hover:bg-slate-50";
  const theadBg = isDark ? "bg-slate-700/40" : "bg-slate-50";
  const inputClass = isDark
    ? "w-full rounded-xl border border-white/10 bg-slate-700/50 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500/40 outline-none"
    : "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500/30 outline-none";
  const categoryChip = isDark ? "bg-slate-700/50 text-slate-300" : "bg-slate-100 text-slate-600";

  return (
    <div className="space-y-6 animate-fade-in">
      <div className={`rounded-2xl border overflow-hidden ${cardBg}`}>
        <div className={`p-4 sm:p-6 border-b space-y-4 ${divider}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className={`text-base font-bold flex items-center gap-2 ${textPrimary}`}>
                Unsettled Statement Transactions
                <span
                  className={`text-xs font-mono font-normal px-2 py-0.5 rounded-full ${
                    isDark ? "bg-slate-700 text-slate-300" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {displayedExpenses.length} transactions
                </span>
              </h3>
              <p className={`text-xs mt-0.5 ${textSecondary}`}>
                Use <strong>Settle Statement</strong> in the header to settle these transactions by date.
              </p>
            </div>
          </div>

          {/* Search + Filter Row */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <svg
                className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textMuted}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                placeholder="Search item, category, account, card..."
                value={duesSearch}
                onChange={(e) => setDuesSearch(e.target.value)}
                className={`${inputClass} pl-9`}
              />
              {duesSearch && (
                <button
                  onClick={() => setDuesSearch("")}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 ${textMuted} hover:text-red-400 transition-colors`}
                >
                  <FiX size={14} />
                </button>
              )}
            </div>
            <select
              value={duesFilterCard}
              onChange={(e) => onFilterCardChange(e.target.value)}
              className={`${inputClass} sm:w-48`}
            >
              <option value="all">All Cards</option>
              {cards.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.card_last4 ? ` ••${c.card_last4}` : ""}
                </option>
              ))}
            </select>
            <select
              value={duesFilterFundsStatus}
              onChange={(e) => setDuesFilterFundsStatus(e.target.value as "all" | "moved" | "pending" | "shortfall")}
              className={`${inputClass} sm:w-44`}
            >
              <option value="all">All Funds Status</option>
              <option value="moved">Funds Moved</option>
              <option value="shortfall">Shortfall / Underfunded</option>
              <option value="pending">Funds Pending</option>
            </select>
            {setDuesFilterCycle && (
              <select
                value={duesFilterCycle}
                onChange={(e) => setDuesFilterCycle(e.target.value as "all" | "statement" | "unbilled")}
                className={`${inputClass} sm:w-44`}
              >
                <option value="all">All Cycles</option>
                <option value="statement">Statement Dues (Past/Due)</option>
                <option value="unbilled">Unbilled (Next Cycle)</option>
              </select>
            )}
          </div>
        </div>

        {displayedExpenses.length === 0 ? (
          <div className={`p-12 text-center text-sm ${textSecondary}`}>
            {duesSearch || duesFilterCard !== "all" || duesFilterFundsStatus !== "all"
              ? "No transactions match your search/filter."
              : "No unsettled expenses found for this selection."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={`border-b text-left text-xs font-semibold uppercase tracking-wider ${textSecondary} ${theadBg} ${divider}`}>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Item & Notes</th>
                  <th className="px-6 py-4">Budget Account</th>
                  <th className="px-6 py-4">Card Used</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4 text-center">Funds Moved?</th>
                  <th className="px-6 py-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${divider}`}>
                {displayedExpenses.map((expense) => (
                  <tr key={expense.id} className={`transition-colors ${rowHover}`}>
                    <td className={`px-6 py-4 text-sm whitespace-nowrap ${textSecondary}`}>
                      {formatDate(expense.date)}
                    </td>
                    <td className={`px-6 py-4 text-sm font-medium ${textPrimary}`}>
                      <div>{expense.item}</div>
                      {expense.description && (
                        <div className={`text-xs font-normal ${textSecondary}`}>{expense.description}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-600">
                        {expense.account_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-500/10 border border-emerald-500/20 text-emerald-600">
                        <FiCreditCard size={12} /> {expense.credit_card_name || "Credit Card"}
                      </span>
                    </td>
                    <td className={`px-6 py-4 text-sm ${textSecondary}`}>
                      {expense.categories ? (
                        <span className={`text-xs px-2 py-0.5 rounded ${categoryChip}`}>{expense.categories.name}</span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {(() => {
                        const total = Number(expense.amount || 0);
                        const moved = expense.funds_moved_amount != null
                          ? Number(expense.funds_moved_amount)
                          : (expense.cc_funds_set_aside ? total : 0);
                        const isFullyMoved = moved >= total && total > 0;
                        const isShortfall = moved > 0 && moved < total;
                        const shortfall = Math.max(0, total - moved);

                        if (isShortfall) {
                          return (
                            <div className="inline-flex flex-col items-center gap-1">
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => onToggleExpenseFundsSetAside(expense, "cover_shortfall")}
                                  title={`Only ${formatCurrency(moved, currencyStyle)} was moved. Click to cover shortfall of ${formatCurrency(shortfall, currencyStyle)}`}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/25 transition-all shadow-sm"
                                >
                                  <FiAlertCircle size={12} className="text-amber-500 shrink-0" />
                                  <span>Short {formatCurrency(shortfall, currencyStyle)}</span>
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300">
                                    +Cover
                                  </span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onToggleExpenseFundsSetAside(expense, "reset_pending")}
                                  title="Reset to Pending (unmoved)"
                                  aria-label="Reset to Pending"
                                  className={`p-1.5 rounded-lg text-xs transition-colors ${
                                    isDark
                                      ? "text-slate-400 hover:text-rose-400 hover:bg-slate-700"
                                      : "text-slate-400 hover:text-rose-500 hover:bg-slate-100"
                                  }`}
                                >
                                  <FiRotateCcw size={11} />
                                </button>
                              </div>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {formatCurrency(moved, currencyStyle)} moved · {formatCurrency(shortfall, currencyStyle)} needed
                              </span>
                            </div>
                          );
                        }

                        if (isFullyMoved) {
                          return (
                            <button
                              type="button"
                              onClick={() => onToggleExpenseFundsSetAside(expense, "toggle")}
                              title="Funds moved from bank account to cover this card expense. Click to mark Pending."
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 hover:bg-emerald-500/25 transition-all"
                            >
                              <FiCheckCircle size={12} /> Moved
                            </button>
                          );
                        }

                        return (
                          <button
                            type="button"
                            onClick={() => onToggleExpenseFundsSetAside(expense, "toggle")}
                            title="Funds not yet set aside from budget account. Click to mark as Moved."
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                              isDark
                                ? "bg-slate-700/60 text-slate-400 border border-white/10 hover:bg-slate-700"
                                : "bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100"
                            }`}
                          >
                            Pending
                          </button>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-right text-red-500 font-mono whitespace-nowrap">
                      {formatCurrency(expense.amount, currencyStyle)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
