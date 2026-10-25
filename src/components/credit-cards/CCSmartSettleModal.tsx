import React from "react";
import { FiCalendar, FiX, FiCheck } from "react-icons/fi";
import { formatCurrency, getLocalDateString } from "../../lib/formatters";
import type { CreditCard, UnsettledExpense, CCAdvance, CurrencyStyle } from "./types";

interface CCSmartSettleModalProps {
  isOpen: boolean;
  cards: CreditCard[];
  smartSettleCardId: string;
  setSmartSettleCardId: (id: string) => void;
  smartSettleCutoffDate: string;
  setSmartSettleCutoffDate: (date: string) => void;
  smartSettleActualBill: string;
  setSmartSettleActualBill: (bill: string) => void;
  smartSettleDate: string;
  setSmartSettleDate: (date: string) => void;
  smartSettleNotes: string;
  setSmartSettleNotes: (notes: string) => void;
  smartSettling: boolean;
  onClose: () => void;
  onConfirm: () => void;
  smartSettleCard: CreditCard | undefined;
  smartSettleExpenses: UnsettledExpense[];
  smartSettleAdvancesItems: CCAdvance[];
  smartTotalExpenses: number;
  smartTotalAdvances: number;
  smartGrandTotal: number;
  currencyStyle?: CurrencyStyle;
  isDark: boolean;
}

export const CCSmartSettleModal: React.FC<CCSmartSettleModalProps> = ({
  isOpen,
  cards,
  smartSettleCardId,
  setSmartSettleCardId,
  smartSettleCutoffDate,
  setSmartSettleCutoffDate,
  smartSettleActualBill,
  setSmartSettleActualBill,
  smartSettleDate,
  setSmartSettleDate,
  smartSettleNotes,
  setSmartSettleNotes,
  smartSettling,
  onClose,
  onConfirm,
  smartSettleCard,
  smartSettleExpenses,
  smartSettleAdvancesItems,
  smartTotalExpenses,
  smartTotalAdvances,
  smartGrandTotal,
  currencyStyle,
  isDark,
}) => {
  if (!isOpen) return null;

  const modalBg = isDark ? "bg-slate-800/95 border border-white/10" : "bg-white border border-slate-200";
  const textPrimary = isDark ? "text-white" : "text-slate-800";
  const textSecondary = isDark ? "text-slate-400" : "text-slate-500";
  const textMuted = isDark ? "text-slate-500" : "text-slate-400";
  const divider = isDark ? "border-white/10" : "border-slate-200";
  const inputClass = isDark
    ? "w-full rounded-xl border border-white/10 bg-slate-700/50 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500/40 outline-none"
    : "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500/30 outline-none";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className={`max-w-xl w-full p-6 space-y-5 rounded-2xl shadow-2xl ${modalBg}`}>
        <div className={`flex items-center justify-between border-b pb-3 ${divider}`}>
          <h3 className={`text-lg font-bold flex items-center gap-2 ${textPrimary}`}>
            <FiCalendar className="text-emerald-500" /> Settle by Statement Date
          </h3>
          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors ${
              isDark
                ? "hover:bg-white/10 text-slate-400 hover:text-white"
                : "hover:bg-slate-100 text-slate-400 hover:text-slate-700"
            }`}
          >
            <FiX size={16} />
          </button>
        </div>

        <p className={`text-xs ${textSecondary}`}>
          Select your credit card and the statement cutoff date. CASHAM will auto-calculate all transactions and CC advances up to that date, so you can compare with your actual bill before settling.
        </p>

        {/* Card + Date selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={`block text-xs font-medium mb-1 ${textSecondary}`}>Credit Card *</label>
            <select
              value={smartSettleCardId}
              onChange={(e) => {
                setSmartSettleCardId(e.target.value);
                const sel = cards.find((c) => c.id === e.target.value);
                if (sel) {
                  const today = new Date();
                  const billingDay = sel.billing_cycle_day || today.getDate();
                  const cutoff = new Date(today.getFullYear(), today.getMonth(), billingDay);
                  if (cutoff > today) cutoff.setMonth(cutoff.getMonth() - 1);
                  setSmartSettleCutoffDate(getLocalDateString(cutoff));
                }
              }}
              className={inputClass}
            >
              <option value="">Select a card...</option>
              {cards.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.card_last4 ? ` ••${c.card_last4}` : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={`block text-xs font-medium mb-1 ${textSecondary}`}>
              Statement Cutoff Date
              {smartSettleCard && (
                <span className={`ml-1 ${textMuted}`}>(default: {smartSettleCard.billing_cycle_day}th)</span>
              )}
            </label>
            <input
              type="date"
              value={smartSettleCutoffDate}
              onChange={(e) => setSmartSettleCutoffDate(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        {/* Three-part Totals */}
        {smartSettleCardId && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div
                className={`p-3 rounded-xl text-center ${
                  isDark ? "bg-slate-700/50 border border-white/10" : "bg-slate-50 border border-slate-200"
                }`}
              >
                <p className={`text-[10px] font-semibold uppercase tracking-wider mb-1 ${textSecondary}`}>Your Expenses</p>
                <p className="text-lg font-bold font-heading text-red-500 font-mono">
                  {formatCurrency(smartTotalExpenses, currencyStyle)}
                </p>
                <p className={`text-[10px] mt-0.5 ${textMuted}`}>{smartSettleExpenses.length} txns</p>
              </div>
              <div
                className={`p-3 rounded-xl text-center ${
                  isDark ? "bg-blue-500/10 border border-blue-500/20" : "bg-blue-50 border border-blue-200"
                }`}
              >
                <p className={`text-[10px] font-semibold uppercase tracking-wider mb-1 ${isDark ? "text-blue-300" : "text-blue-600"}`}>
                  CC Advances
                </p>
                <p className="text-lg font-bold font-heading text-blue-500 font-mono">
                  {formatCurrency(smartTotalAdvances, currencyStyle)}
                </p>
                <p className={`text-[10px] mt-0.5 ${textMuted}`}>{smartSettleAdvancesItems.length} advances</p>
              </div>
              <div
                className={`p-3 rounded-xl text-center ${
                  isDark ? "bg-emerald-500/10 border border-emerald-500/30" : "bg-emerald-50 border border-emerald-300"
                }`}
              >
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-1 text-emerald-500">Grand Total</p>
                <p className="text-lg font-bold font-heading text-emerald-500 font-mono">
                  {formatCurrency(smartGrandTotal, currencyStyle)}
                </p>
                <p className={`text-[10px] mt-0.5 ${textMuted}`}>combined</p>
              </div>
            </div>

            {/* Actual bill comparison */}
            <div>
              <label className={`block text-xs font-medium mb-1 ${textSecondary}`}>
                Your Actual Bill Amount (Optional — for comparison)
              </label>
              <input
                type="number"
                min="0"
                placeholder="e.g. 5430"
                value={smartSettleActualBill}
                onChange={(e) => setSmartSettleActualBill(e.target.value)}
                className={`${inputClass} font-mono`}
              />
            </div>

            {smartSettleActualBill && Number(smartSettleActualBill) > 0 && (
              <div
                className={`p-3 rounded-xl flex items-center justify-between text-sm ${
                  Math.abs(Number(smartSettleActualBill) - smartGrandTotal) < 1
                    ? isDark
                      ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
                      : "bg-emerald-50 border border-emerald-300 text-emerald-700"
                    : isDark
                    ? "bg-amber-500/10 border border-amber-500/30 text-amber-400"
                    : "bg-amber-50 border border-amber-300 text-amber-700"
                }`}
              >
                <span className="font-medium">
                  {Math.abs(Number(smartSettleActualBill) - smartGrandTotal) < 1
                    ? "Calculated amount matches your bill!"
                    : Number(smartSettleActualBill) > smartGrandTotal
                    ? `Bill is ₹${(Number(smartSettleActualBill) - smartGrandTotal).toFixed(0)} more than tracked (check for unlogged txns)`
                    : `Tracked is ₹${(smartGrandTotal - Number(smartSettleActualBill)).toFixed(0)} more than bill (check dates)`}
                </span>
                <span className="font-bold font-mono">
                  {formatCurrency(Number(smartSettleActualBill), currencyStyle)}
                </span>
              </div>
            )}

            {smartSettleExpenses.length === 0 && smartSettleAdvancesItems.length === 0 && (
              <p className={`text-xs text-center py-2 ${textMuted}`}>
                No unsettled transactions found for this card up to the selected date.
              </p>
            )}
          </div>
        )}

        {/* Settlement Date + Notes */}
        {smartSettleCardId && (smartSettleExpenses.length > 0 || smartSettleAdvancesItems.length > 0) && (
          <div className={`space-y-3 pt-1 border-t ${divider}`}>
            <p className={`text-xs font-semibold uppercase tracking-wider pt-3 ${textSecondary}`}>Settlement Details</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={`block text-xs font-medium mb-1 ${textSecondary}`}>Bill Payment Date</label>
                <input
                  type="date"
                  value={smartSettleDate}
                  onChange={(e) => setSmartSettleDate(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={`block text-xs font-medium mb-1 ${textSecondary}`}>Notes / Reference (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Paid via Netbanking"
                  value={smartSettleNotes}
                  onChange={(e) => setSmartSettleNotes(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className={`flex-1 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
              isDark ? "border-white/10 text-slate-300 hover:bg-white/5" : "border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={
              !smartSettleCardId ||
              (smartSettleExpenses.length === 0 && smartSettleAdvancesItems.length === 0) ||
              smartSettling
            }
            onClick={onConfirm}
            className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold shadow-lg shadow-emerald-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <FiCheck size={15} />{" "}
            {smartSettling
              ? "Settling..."
              : `Confirm & Settle ${smartGrandTotal > 0 ? formatCurrency(smartGrandTotal, currencyStyle) : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
};
