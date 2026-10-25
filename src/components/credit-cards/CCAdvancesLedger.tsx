import React from "react";
import { FiUsers, FiPlus, FiX, FiCreditCard, FiCheckCircle, FiTrash2, FiInfo } from "react-icons/fi";
import { formatCurrency, formatDate } from "../../lib/formatters";
import type { CreditCard, CCAdvance, CurrencyStyle } from "./types";

interface CCAdvancesLedgerProps {
  cards: CreditCard[];
  filteredAdvances: CCAdvance[];
  displayedAdvances: CCAdvance[];
  advancesSearch: string;
  setAdvancesSearch: (val: string) => void;
  advancesFilterCard: string;
  onFilterCardChange: (cardId: string) => void;
  advancesFilterCashStatus: "all" | "received" | "pending";
  setAdvancesFilterCashStatus: (status: "all" | "received" | "pending") => void;
  onOpenAdvanceModal: () => void;
  onToggleReceived: (advance: CCAdvance) => void;
  onDeleteAdvance: (id: string, personName: string) => void;
  currencyStyle?: CurrencyStyle;
  isDark: boolean;
}

export const CCAdvancesLedger: React.FC<CCAdvancesLedgerProps> = ({
  cards,
  filteredAdvances,
  displayedAdvances,
  advancesSearch,
  setAdvancesSearch,
  advancesFilterCard,
  onFilterCardChange,
  advancesFilterCashStatus,
  setAdvancesFilterCashStatus,
  onOpenAdvanceModal,
  onToggleReceived,
  onDeleteAdvance,
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

  const pendingCollection = filteredAdvances
    .filter((a) => !a.cash_received && !(a as { cc_bill_settled?: boolean }).cc_bill_settled)
    .reduce((s, a) => s + Number(a.amount), 0);

  const cashCollected = filteredAdvances
    .filter((a) => a.cash_received && !(a as { cc_bill_settled?: boolean }).cc_bill_settled)
    .reduce((s, a) => s + Number(a.amount), 0);

  const billSettled = filteredAdvances
    .filter((a) => (a as { cc_bill_settled?: boolean }).cc_bill_settled)
    .reduce((s, a) => s + Number(a.amount), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className={`rounded-2xl border p-5 ${cardBg}`}>
          <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${textSecondary}`}>Pending Collection</p>
          <p className="text-2xl font-bold font-heading text-amber-500">
            {formatCurrency(pendingCollection, currencyStyle)}
          </p>
          <p className={`text-xs mt-1 ${textSecondary}`}>
            {filteredAdvances.filter((a) => !a.cash_received && !(a as { cc_bill_settled?: boolean }).cc_bill_settled).length}{" "}
            awaiting cash
          </p>
        </div>
        <div className={`rounded-2xl border p-5 ${cardBg}`}>
          <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${textSecondary}`}>Cash Collected</p>
          <p className="text-2xl font-bold font-heading text-emerald-500">
            {formatCurrency(cashCollected, currencyStyle)}
          </p>
          <p className={`text-xs mt-1 ${textSecondary}`}>
            {filteredAdvances.filter((a) => a.cash_received && !(a as { cc_bill_settled?: boolean }).cc_bill_settled).length}{" "}
            received — ready to settle
          </p>
        </div>
        <div className={`rounded-2xl border p-5 ${cardBg}`}>
          <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${textSecondary}`}>Bill Settled</p>
          <p className="text-2xl font-bold font-heading text-slate-400">
            {formatCurrency(billSettled, currencyStyle)}
          </p>
          <p className={`text-xs mt-1 ${textSecondary}`}>
            {filteredAdvances.filter((a) => (a as { cc_bill_settled?: boolean }).cc_bill_settled).length} settled with bill
          </p>
        </div>
      </div>

      {/* Info Banner */}
      <div
        className={`rounded-2xl border border-blue-500/20 p-4 flex items-start gap-3 ${
          isDark ? "bg-blue-500/5" : "bg-blue-50"
        }`}
      >
        <FiInfo className="text-blue-500 flex-shrink-0 mt-0.5" size={16} />
        <div>
          <p className={`text-sm font-semibold ${isDark ? "text-blue-300" : "text-blue-700"}`}>
            How CC Advances Work
          </p>
          <p className={`text-xs mt-0.5 ${isDark ? "text-blue-300/70" : "text-blue-600/80"}`}>
            When you pay for someone using your credit card, log it here. Once they pay you back, mark &quot;Cash Received&quot;.
            When your credit card bill arrives, use &quot;Settle Statement&quot; in the header to settle all card expenses and CC advances up to your statement date in one go.
          </p>
        </div>
      </div>

      {/* Advances Table */}
      <div className={`rounded-2xl border overflow-hidden ${cardBg}`}>
        <div className={`p-4 sm:p-6 border-b space-y-4 ${divider}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className={`text-base font-bold flex items-center gap-2 ${textPrimary}`}>
                Unsettled Advances
                <span
                  className={`text-xs font-mono font-normal px-2 py-0.5 rounded-full ${
                    isDark ? "bg-slate-700 text-slate-300" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {displayedAdvances.length} advances
                </span>
              </h3>
              <p className={`text-xs mt-0.5 ${textSecondary}`}>
                Use <strong>Settle Statement</strong> in the header to settle these advances along with card expenses by date.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={onOpenAdvanceModal}
                disabled={cards.length === 0}
                className="btn-primary rounded-xl px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-500/20 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <FiPlus size={14} /> Log Advance
              </button>
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
                placeholder="Search person, description, card..."
                value={advancesSearch}
                onChange={(e) => setAdvancesSearch(e.target.value)}
                className={`${inputClass} pl-9`}
              />
              {advancesSearch && (
                <button
                  onClick={() => setAdvancesSearch("")}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 ${textMuted} hover:text-red-400 transition-colors`}
                >
                  <FiX size={14} />
                </button>
              )}
            </div>
            <select
              value={advancesFilterCard}
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
              value={advancesFilterCashStatus}
              onChange={(e) => setAdvancesFilterCashStatus(e.target.value as "all" | "received" | "pending")}
              className={`${inputClass} sm:w-44`}
            >
              <option value="all">All Cash Status</option>
              <option value="received">Cash Received</option>
              <option value="pending">Cash Pending</option>
            </select>
          </div>
        </div>

        {displayedAdvances.length === 0 ? (
          <div className={`p-12 text-center space-y-2 ${textSecondary}`}>
            <FiUsers size={32} className="mx-auto opacity-30" />
            <p className="text-sm">
              {advancesSearch || advancesFilterCard !== "all" || advancesFilterCashStatus !== "all"
                ? "No advances match your search/filter."
                : "No unsettled advances. All cleared!"}
            </p>
            {!advancesSearch && advancesFilterCard === "all" && (
              <p className="text-xs opacity-70">Settled advances are archived in Settlement History.</p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={`border-b text-left text-xs font-semibold uppercase tracking-wider ${textSecondary} ${theadBg} ${divider}`}>
                  <th className="px-6 py-4">Person</th>
                  <th className="px-6 py-4">Description</th>
                  <th className="px-6 py-4">Card Used</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4 text-center">Cash Received?</th>
                  <th className="px-6 py-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${divider}`}>
                {displayedAdvances.map((advance) => (
                  <tr key={advance.id} className={`transition-colors ${rowHover}`}>
                    <td className={`px-6 py-4 text-sm font-semibold ${textPrimary}`}>
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center text-xs font-bold">
                          {advance.person_name[0].toUpperCase()}
                        </span>
                        {advance.person_name}
                      </div>
                    </td>
                    <td className={`px-6 py-4 text-sm ${textSecondary}`}>{advance.description || "—"}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-500/10 border border-emerald-500/20 text-emerald-600">
                        <FiCreditCard size={12} /> {advance.credit_card_name}
                      </span>
                    </td>
                    <td className={`px-6 py-4 text-sm whitespace-nowrap ${textSecondary}`}>
                      {formatDate(advance.date)}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-blue-500 font-mono">
                      {formatCurrency(advance.amount, currencyStyle)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => onToggleReceived(advance)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          advance.cash_received
                            ? "bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 hover:bg-emerald-500/25"
                            : `${
                                isDark
                                  ? "bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20"
                                  : "bg-amber-50 text-amber-600 border border-amber-300 hover:bg-amber-100"
                              }`
                        }`}
                      >
                        {advance.cash_received ? (
                          <>
                            <FiCheckCircle size={12} /> Received
                          </>
                        ) : (
                          "Pending"
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => onDeleteAdvance(advance.id, advance.person_name)}
                        className="p-1.5 rounded-lg hover:bg-red-500/15 text-slate-400 hover:text-red-500 transition-colors"
                        title="Delete advance"
                      >
                        <FiTrash2 size={14} />
                      </button>
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
