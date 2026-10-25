import React from "react";
import { FiCreditCard, FiDownload, FiX } from "react-icons/fi";
import { formatCurrency, formatDate } from "../../lib/formatters";
import type { CreditCard, UnifiedMasterTransaction, CurrencyStyle } from "./types";

interface CCMasterHistoryProps {
  cards: CreditCard[];
  displayedMasterTransactions: UnifiedMasterTransaction[];
  masterStats: {
    totalAmount: number;
    expenseTotal: number;
    advanceTotal: number;
    unsettledTotal: number;
  };
  loadingMaster: boolean;
  masterSearch: string;
  setMasterSearch: (val: string) => void;
  masterFilterCard: string;
  onFilterCardChange: (cardId: string) => void;
  masterFilterType: "all" | "expense" | "advance";
  setMasterFilterType: (val: "all" | "expense" | "advance") => void;
  masterFilterStatus: "all" | "unsettled" | "settled";
  setMasterFilterStatus: (val: "all" | "unsettled" | "settled") => void;
  onExportCSV: () => void;
  currencyStyle?: CurrencyStyle;
  isDark: boolean;
}

export const CCMasterHistory: React.FC<CCMasterHistoryProps> = ({
  cards,
  displayedMasterTransactions,
  masterStats,
  loadingMaster,
  masterSearch,
  setMasterSearch,
  masterFilterCard,
  onFilterCardChange,
  masterFilterType,
  setMasterFilterType,
  masterFilterStatus,
  setMasterFilterStatus,
  onExportCSV,
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
      {/* Quick KPI summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`rounded-2xl border p-4 ${cardBg}`}>
          <p className={`text-[10px] font-bold uppercase tracking-wider ${textSecondary}`}>Total Activity Volume</p>
          <p className="text-xl font-bold font-heading text-emerald-500 font-mono mt-1">
            {formatCurrency(masterStats.totalAmount, currencyStyle)}
          </p>
          <p className={`text-[11px] mt-1 ${textMuted}`}>{displayedMasterTransactions.length} total entries</p>
        </div>

        <div className={`rounded-2xl border p-4 ${cardBg}`}>
          <p className={`text-[10px] font-bold uppercase tracking-wider ${textSecondary}`}>Card Purchases</p>
          <p className="text-xl font-bold font-heading text-rose-400 font-mono mt-1">
            {formatCurrency(masterStats.expenseTotal, currencyStyle)}
          </p>
          <p className={`text-[11px] mt-1 ${textMuted}`}>
            {displayedMasterTransactions.filter((t) => t.type === "expense").length} expenses
          </p>
        </div>

        <div className={`rounded-2xl border p-4 ${cardBg}`}>
          <p className={`text-[10px] font-bold uppercase tracking-wider ${textSecondary}`}>CC Advances</p>
          <p className="text-xl font-bold font-heading text-blue-400 font-mono mt-1">
            {formatCurrency(masterStats.advanceTotal, currencyStyle)}
          </p>
          <p className={`text-[11px] mt-1 ${textMuted}`}>
            {displayedMasterTransactions.filter((t) => t.type === "advance").length} advances
          </p>
        </div>

        <div className={`rounded-2xl border p-4 ${cardBg}`}>
          <p className={`text-[10px] font-bold uppercase tracking-wider ${textSecondary}`}>Active Dues (Unsettled)</p>
          <p className="text-xl font-bold font-heading text-amber-400 font-mono mt-1">
            {formatCurrency(masterStats.unsettledTotal, currencyStyle)}
          </p>
          <p className={`text-[11px] mt-1 ${textMuted}`}>
            {displayedMasterTransactions.filter((t) => !t.settled).length} pending bill settlement
          </p>
        </div>
      </div>

      {/* Table Container */}
      <div className={`rounded-2xl border overflow-hidden ${cardBg}`}>
        <div className={`p-4 sm:p-6 border-b space-y-4 ${divider}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className={`text-base font-bold flex items-center gap-2 ${textPrimary}`}>
                Master Card History
                <span
                  className={`text-xs font-mono font-normal px-2 py-0.5 rounded-full ${
                    isDark ? "bg-slate-700 text-slate-300" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {displayedMasterTransactions.length} entries
                </span>
              </h3>
              <p className={`text-xs mt-0.5 ${textSecondary}`}>
                Unified chronological activity statement of card purchases and CC advances across all cards.
              </p>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                onClick={onExportCSV}
                disabled={displayedMasterTransactions.length === 0}
                className="btn-primary rounded-xl px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-500/20 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
                title="Download current filtered statement as CSV"
              >
                <FiDownload size={14} /> Export Statement (CSV)
              </button>
            </div>
          </div>

          {/* Search + 3 Filters Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative">
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
                placeholder="Search item, person, note..."
                value={masterSearch}
                onChange={(e) => setMasterSearch(e.target.value)}
                className={`${inputClass} pl-9`}
              />
              {masterSearch && (
                <button
                  onClick={() => setMasterSearch("")}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 ${textMuted} hover:text-red-400 transition-colors`}
                >
                  <FiX size={14} />
                </button>
              )}
            </div>

            <select
              value={masterFilterCard}
              onChange={(e) => onFilterCardChange(e.target.value)}
              className={inputClass}
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
              value={masterFilterType}
              onChange={(e) => setMasterFilterType(e.target.value as "all" | "expense" | "advance")}
              className={inputClass}
            >
              <option value="all">All Types (Purchases & Advances)</option>
              <option value="expense">Card Purchases Only</option>
              <option value="advance">CC Advances Only</option>
            </select>

            <select
              value={masterFilterStatus}
              onChange={(e) => setMasterFilterStatus(e.target.value as "all" | "unsettled" | "settled")}
              className={inputClass}
            >
              <option value="all">All Settlement Status</option>
              <option value="unsettled">Active (Unsettled Dues)</option>
              <option value="settled">Settled (Archived)</option>
            </select>
          </div>
        </div>

        {loadingMaster ? (
          <div className={`p-16 text-center ${textSecondary}`}>
            <div className="w-8 h-8 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm">Loading card history...</p>
          </div>
        ) : displayedMasterTransactions.length === 0 ? (
          <div className={`p-16 text-center space-y-2 ${textSecondary}`}>
            <FiCreditCard size={32} className="mx-auto opacity-30" />
            <p className="text-sm font-semibold">No card activity found</p>
            <p className="text-xs opacity-70">Try adjusting your filters, card selection, or search keywords.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={`border-b text-left text-xs font-semibold uppercase tracking-wider ${textSecondary} ${theadBg} ${divider}`}>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Item / Person & Notes</th>
                  <th className="px-6 py-4">Card Used</th>
                  <th className="px-6 py-4">Account / Category</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${divider}`}>
                {displayedMasterTransactions.map((t) => (
                  <tr key={t.id} className={`transition-colors ${rowHover}`}>
                    <td className={`px-6 py-4 text-sm whitespace-nowrap ${textSecondary}`}>{formatDate(t.date)}</td>
                    <td className="px-6 py-4 text-xs whitespace-nowrap">
                      {t.type === "expense" ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                          Purchase
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          CC Advance
                        </span>
                      )}
                    </td>
                    <td className={`px-6 py-4 text-sm font-medium ${textPrimary}`}>
                      <div>{t.title}</div>
                      {t.description && <div className={`text-xs font-normal ${textSecondary}`}>{t.description}</div>}
                    </td>
                    <td className="px-6 py-4 text-sm whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-500/10 border border-emerald-500/20 text-emerald-600">
                        <FiCreditCard size={12} /> {t.credit_card_name || "Credit Card"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {t.account_type && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20">
                            {t.account_type}
                          </span>
                        )}
                        {t.category && (
                          <span className={`text-xs px-2 py-0.5 rounded ${categoryChip}`}>{t.category}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center whitespace-nowrap">
                      <div className="flex flex-col items-center gap-1">
                        {t.settled ? (
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              isDark ? "bg-slate-700/80 text-slate-300" : "bg-slate-200 text-slate-600"
                            }`}
                          >
                            Settled
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-500 border border-amber-500/25">
                            Active Due
                          </span>
                        )}
                        {t.type === "expense" && (
                          <span className="text-[10px] font-medium text-slate-400">
                            {t.funds_set_aside ? "Funds Moved" : "Funds Pending"}
                          </span>
                        )}
                        {t.type === "advance" && (
                          <span className="text-[10px] font-medium text-slate-400">
                            {t.cash_received ? "Cash Received" : "Cash Pending"}
                          </span>
                        )}
                      </div>
                    </td>
                    <td
                      className={`px-6 py-4 text-sm font-bold text-right font-mono whitespace-nowrap ${
                        t.type === "expense" ? "text-rose-400" : "text-blue-400"
                      }`}
                    >
                      {formatCurrency(t.amount, currencyStyle)}
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
