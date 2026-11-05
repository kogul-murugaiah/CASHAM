import React, { useState, useEffect } from "react";
import { FiX, FiCheck, FiDollarSign, FiCalendar, FiFileText } from "react-icons/fi";
import type { CCAdvance, CurrencyStyle } from "./types";
import { formatCurrency, getLocalDateString } from "../../lib/formatters";

interface CCRecordPaymentModalProps {
  isOpen: boolean;
  advance: CCAdvance | null;
  onClose: () => void;
  onRecord: (id: string, amount: number, date: string, note?: string) => Promise<void>;
  currencyStyle?: CurrencyStyle;
  isDark: boolean;
}

export const CCRecordPaymentModal: React.FC<CCRecordPaymentModalProps> = ({
  isOpen,
  advance,
  onClose,
  onRecord,
  currencyStyle,
  isDark,
}) => {
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(getLocalDateString());
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const totalAmount = Number(advance?.amount || 0);
  const alreadyPaid = Number(
    advance?.paid_amount || (advance?.cash_received ? totalAmount : 0) || 0
  );
  const remainingDue = Math.max(0, totalAmount - alreadyPaid);

  useEffect(() => {
    if (advance && isOpen) {
      const remaining = Math.max(
        0,
        Number(advance.amount || 0) -
          Number(advance.paid_amount || (advance.cash_received ? advance.amount : 0) || 0)
      );
      setAmount(remaining > 0 ? remaining.toString() : "");
      setPaymentDate(getLocalDateString());
      setNote("");
      setError("");
    }
  }, [advance, isOpen]);

  if (!isOpen || !advance) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const payVal = Number(amount);
    if (!payVal || isNaN(payVal) || payVal <= 0) {
      setError("Please enter a valid payment amount");
      return;
    }
    if (payVal > remainingDue + 0.01) {
      setError(`Payment cannot exceed the remaining due amount of ${formatCurrency(remainingDue, currencyStyle)}`);
      return;
    }
    if (!paymentDate) {
      setError("Payment date is required");
      return;
    }

    setSubmitting(true);
    try {
      await onRecord(advance.id, payVal, paymentDate, note.trim() || undefined);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to record payment");
    } finally {
      setSubmitting(false);
    }
  };

  const setPercentage = (pct: number) => {
    const val = Math.round((remainingDue * pct) / 100);
    setAmount(val > 0 ? val.toString() : "");
  };

  const modalBg = isDark ? "bg-slate-900 border border-slate-800" : "bg-white border border-slate-200";
  const textPrimary = isDark ? "text-white" : "text-slate-900";
  const textSecondary = isDark ? "text-slate-400" : "text-slate-500";
  const divider = isDark ? "border-slate-800" : "border-slate-200";
  const inputClass = isDark
    ? "w-full rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 outline-none"
    : "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 outline-none";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className={`max-w-md w-full p-6 space-y-5 rounded-3xl shadow-2xl my-8 ${modalBg}`}>
        {/* Header */}
        <div className={`flex items-center justify-between border-b pb-3 ${divider}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 flex items-center justify-center">
              <FiDollarSign size={20} />
            </div>
            <div>
              <h3 className={`text-lg font-bold font-heading ${textPrimary}`}>
                Record Partial Payment
              </h3>
              <p className={`text-xs ${textSecondary}`}>
                Log installment received from {advance.person_name}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:${textPrimary} transition-colors`}
          >
            <FiX size={18} />
          </button>
        </div>

        {/* Due Breakdown Card */}
        <div className={`p-4 rounded-2xl border ${isDark ? "bg-slate-800/60 border-slate-700/60" : "bg-slate-50 border-slate-200"} space-y-2.5`}>
          <div className="flex justify-between items-center text-xs">
            <span className={textSecondary}>Advance Total:</span>
            <span className={`font-semibold ${textPrimary}`}>
              {formatCurrency(totalAmount, currencyStyle)}
            </span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className={textSecondary}>Already Repaid:</span>
            <span className="font-semibold text-emerald-500">
              {formatCurrency(alreadyPaid, currencyStyle)}
            </span>
          </div>
          <div className={`pt-2 border-t flex justify-between items-center ${divider}`}>
            <span className={`text-xs font-bold uppercase tracking-wider ${textSecondary}`}>
              Current Balance Due:
            </span>
            <span className="text-base font-bold font-mono text-amber-500">
              {formatCurrency(remainingDue, currencyStyle)}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="pt-1">
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
              <div
                className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(100, Math.round((alreadyPaid / (totalAmount || 1)) * 100))}%`,
                }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-slate-400 mt-1">
              <span>{Math.round((alreadyPaid / (totalAmount || 1)) * 100)}% Repaid</span>
              <span>{formatCurrency(remainingDue, currencyStyle)} remaining</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className={`block text-xs font-semibold uppercase tracking-wider ${textSecondary}`}>
                Payment Amount (₹) *
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPercentage(25)}
                  className="px-2 py-0.5 text-[11px] rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-emerald-500/15 hover:text-emerald-500 transition-colors"
                >
                  25%
                </button>
                <button
                  type="button"
                  onClick={() => setPercentage(50)}
                  className="px-2 py-0.5 text-[11px] rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-emerald-500/15 hover:text-emerald-500 transition-colors"
                >
                  50%
                </button>
                <button
                  type="button"
                  onClick={() => setAmount(remainingDue.toString())}
                  className="px-2 py-0.5 text-[11px] rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold hover:bg-emerald-500/20 transition-colors"
                >
                  Full Due
                </button>
              </div>
            </div>
            <input
              type="number"
              step="any"
              min="0.01"
              max={remainingDue}
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 500"
              className={`${inputClass} font-mono font-bold text-base`}
            />
          </div>

          <div>
            <label className={`block text-xs font-semibold uppercase tracking-wider mb-1 flex items-center gap-1.5 ${textSecondary}`}>
              <FiCalendar size={13} /> Payment Received Date *
            </label>
            <input
              type="date"
              required
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className={`block text-xs font-semibold uppercase tracking-wider mb-1 flex items-center gap-1.5 ${textSecondary}`}>
              <FiFileText size={13} /> Notes / Installment Memo (Optional)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. UPI installment 1, Cash at cafe"
              className={inputClass}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className={`flex-1 px-4 py-2.5 rounded-xl border ${divider} text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${textSecondary}`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !amount || Number(amount) <= 0}
              className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold shadow-lg shadow-emerald-600/25 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {submitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <FiCheck size={16} /> Record Payment
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
