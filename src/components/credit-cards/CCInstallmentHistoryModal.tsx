import React from "react";
import { FiClock, FiX, FiCheckCircle, FiDollarSign, FiCalendar } from "react-icons/fi";
import type { CCAdvance, CCRepayment, CurrencyStyle } from "./types";
import { formatCurrency, formatDate } from "../../lib/formatters";

interface CCInstallmentHistoryModalProps {
  isOpen: boolean;
  advance: CCAdvance | null;
  onClose: () => void;
  onRecordMore?: (advance: CCAdvance) => void;
  currencyStyle?: CurrencyStyle;
  isDark: boolean;
}

export const CCInstallmentHistoryModal: React.FC<CCInstallmentHistoryModalProps> = ({
  isOpen,
  advance,
  onClose,
  onRecordMore,
  currencyStyle,
  isDark,
}) => {
  if (!isOpen || !advance) return null;

  const totalAmount = Number(advance.amount || 0);
  const alreadyPaid = Number(
    advance.paid_amount || (advance.cash_received ? totalAmount : 0) || 0
  );
  const remainingDue = Math.max(0, totalAmount - alreadyPaid);
  const percentPaid = Math.min(100, Math.round((alreadyPaid / (totalAmount || 1)) * 100));

  // Extract structured repayments or synthesize from paid_amount / history
  const repayments: CCRepayment[] = (() => {
    if (Array.isArray(advance.repayments) && advance.repayments.length > 0) {
      return [...advance.repayments].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
    }
    if (alreadyPaid > 0) {
      return [
        {
          id: `rep-fallback-${advance.id}`,
          amount: alreadyPaid,
          date: advance.cash_received_date || advance.date,
          note: advance.description || "Recorded installment",
        },
      ];
    }
    return [];
  })();

  const modalBg = isDark ? "bg-slate-900 border border-slate-800" : "bg-white border border-slate-200";
  const textPrimary = isDark ? "text-white" : "text-slate-900";
  const textSecondary = isDark ? "text-slate-400" : "text-slate-500";
  const divider = isDark ? "border-slate-800" : "border-slate-200";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className={`max-w-md w-full p-6 space-y-5 rounded-3xl shadow-2xl my-8 ${modalBg}`}>
        {/* Header */}
        <div className={`flex items-center justify-between border-b pb-3 ${divider}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/15 border border-teal-500/30 text-teal-500 flex items-center justify-center">
              <FiClock size={20} />
            </div>
            <div>
              <h3 className={`text-lg font-bold font-heading ${textPrimary}`}>
                Installment History
              </h3>
              <p className={`text-xs ${textSecondary}`}>
                Repayment timeline for <strong>{advance.person_name}</strong>
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

        {/* Repayment Progress Card */}
        <div
          className={`p-4 rounded-2xl border ${
            isDark ? "bg-slate-800/60 border-slate-700/60" : "bg-slate-50 border-slate-200"
          } space-y-3`}
        >
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <span className={`block text-[11px] font-semibold uppercase ${textSecondary}`}>
                Total Advance
              </span>
              <span className={`text-sm font-bold font-mono ${textPrimary}`}>
                {formatCurrency(totalAmount, currencyStyle)}
              </span>
            </div>
            <div>
              <span className="block text-[11px] font-semibold uppercase text-emerald-500">
                Repaid
              </span>
              <span className="text-sm font-bold font-mono text-emerald-500">
                {formatCurrency(alreadyPaid, currencyStyle)}
              </span>
            </div>
            <div>
              <span className="block text-[11px] font-semibold uppercase text-amber-500">
                Balance Due
              </span>
              <span className="text-sm font-bold font-mono text-amber-500">
                {formatCurrency(remainingDue, currencyStyle)}
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1">
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
              <div
                className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${percentPaid}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-slate-400">
              <span>{percentPaid}% Repaid</span>
              <span>{advance.cash_received ? "Fully Settled ✓" : `${repayments.length} installment${repayments.length === 1 ? "" : "s"}`}</span>
            </div>
          </div>
        </div>

        {/* Timeline Log */}
        <div className="space-y-2">
          <h4 className={`text-xs font-bold uppercase tracking-wider ${textSecondary}`}>
            Repayment Timeline
          </h4>

          {repayments.length === 0 ? (
            <div className={`p-8 text-center rounded-2xl border border-dashed ${divider} space-y-2`}>
              <FiCalendar className="mx-auto text-slate-400 opacity-40" size={24} />
              <p className={`text-xs ${textSecondary}`}>
                No installments recorded yet for this advance.
              </p>
            </div>
          ) : (
            <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-700">
              {repayments.map((rep, idx) => {
                const isLast = idx === repayments.length - 1;
                return (
                  <div key={rep.id} className="relative group animate-fade-in">
                    {/* Timeline Node */}
                    <div
                      className={`absolute -left-6 top-1 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        isLast && advance.cash_received
                          ? "bg-emerald-500 border-white dark:border-slate-900 text-white"
                          : "bg-teal-500 border-white dark:border-slate-900 text-white"
                      }`}
                    >
                      {isLast && advance.cash_received ? (
                        <FiCheckCircle size={10} />
                      ) : (
                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                      )}
                    </div>

                    {/* Entry Details */}
                    <div
                      className={`p-3 rounded-xl border text-xs space-y-1 transition-all ${
                        isDark
                          ? "bg-slate-800/40 border-slate-700/50 hover:bg-slate-800"
                          : "bg-white border-slate-200 hover:bg-slate-50 shadow-sm"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400 font-mono text-sm">
                          +{formatCurrency(rep.amount, currencyStyle)}
                        </span>
                        <span className={`text-[11px] ${textSecondary}`}>
                          {formatDate(rep.date)}
                        </span>
                      </div>
                      {rep.note && (
                        <p className={`text-[11px] pt-0.5 ${textSecondary}`}>
                          {rep.note}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className={`flex-1 px-4 py-2.5 rounded-xl border ${divider} text-xs font-bold transition-colors ${
              isDark
                ? "text-slate-300 hover:bg-slate-800"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            Close
          </button>
          {!advance.cash_received && onRecordMore && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onRecordMore(advance);
              }}
              className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-1.5"
            >
              <FiDollarSign size={14} />
              <span>Record Installment</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
