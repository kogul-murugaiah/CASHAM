import React from "react";
import { FiCheckCircle } from "react-icons/fi";
import { formatCurrency, formatDate } from "../../lib/formatters";
import type { CreditCardSettlement, CurrencyStyle } from "./types";

interface CCSettlementHistoryProps {
  settlements: CreditCardSettlement[];
  onUnsettle: (settlementId: string) => void;
  onUnsettleAdvances: (settlementId: string) => void;
  currencyStyle?: CurrencyStyle;
  isDark: boolean;
}

export const CCSettlementHistory: React.FC<CCSettlementHistoryProps> = ({
  settlements,
  onUnsettle,
  onUnsettleAdvances,
  currencyStyle,
  isDark,
}) => {
  const cardBg = isDark ? "bg-slate-800/80 border-white/10" : "bg-white border-slate-200 shadow-sm";
  const textPrimary = isDark ? "text-white" : "text-slate-800";
  const textSecondary = isDark ? "text-slate-400" : "text-slate-500";
  const divider = isDark ? "border-white/10" : "border-slate-200";
  const settlementCard = isDark
    ? "glass-card p-5 space-y-3 hover:border-white/20 transition-all"
    : "bg-white border border-slate-200 rounded-2xl p-5 space-y-3 hover:border-slate-300 shadow-sm transition-all";
  const breakdownChip = isDark
    ? "bg-slate-700/40 border border-white/10 text-slate-200"
    : "bg-slate-100 border border-slate-200 text-slate-700";

  return (
    <div className="space-y-4 animate-fade-in">
      {settlements.length === 0 ? (
        <div className={`rounded-2xl border p-12 text-center text-sm ${cardBg} ${textSecondary}`}>
          No statement settlements recorded yet. Once you settle a bill, its archived receipt and account breakdown will appear here.
        </div>
      ) : (
        settlements.map((settlement) => {
          const breakdown = settlement.breakdown || {};
          const isAdvanceSettlement = settlement.notes?.startsWith("[ADVANCES]");
          const displayNotes = isAdvanceSettlement
            ? settlement.notes?.replace("[ADVANCES]", "").trim() || null
            : settlement.notes;

          return (
            <div key={settlement.id} className={settlementCard}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`p-1.5 rounded-lg ${
                        isAdvanceSettlement ? "bg-blue-500/20 text-blue-500" : "bg-emerald-500/20 text-emerald-500"
                      }`}
                    >
                      <FiCheckCircle size={16} />
                    </span>
                    <h4 className={`text-base font-bold ${textPrimary}`}>{settlement.credit_card_name}</h4>
                    {isAdvanceSettlement && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-500 border border-blue-500/20">
                        CC ADVANCES
                      </span>
                    )}
                    <span
                      className={`text-xs px-2 py-0.5 rounded font-mono ${
                        isDark ? "bg-slate-700/60 text-slate-300" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {formatDate(settlement.settlement_date)}
                    </span>
                  </div>
                  {displayNotes && <p className={`text-xs mt-1 pl-8 ${textSecondary}`}>Note: {displayNotes}</p>}
                </div>

                <div className="flex items-center gap-4 pl-8 sm:pl-0">
                  <div className="text-right">
                    <span className={`text-[10px] uppercase font-semibold ${textSecondary}`}>Amount</span>
                    <p className="text-xl font-bold font-heading text-emerald-500 font-mono">
                      {formatCurrency(settlement.total_amount, currencyStyle)}
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      isAdvanceSettlement ? onUnsettleAdvances(settlement.id) : onUnsettle(settlement.id)
                    }
                    className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                      isDark
                        ? "text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                        : "text-slate-500 hover:text-red-500 hover:bg-red-50"
                    }`}
                    title="Reopen"
                  >
                    Reopen
                  </button>
                </div>
              </div>

              <div className={`pt-3 border-t flex flex-wrap items-center gap-2 pl-8 ${divider}`}>
                <span className={`text-xs font-medium ${textSecondary}`}>
                  {isAdvanceSettlement ? "Persons:" : "Collected From:"}
                </span>
                {Object.entries(breakdown).map(([acc, amt]) => (
                  <span
                    key={acc}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${breakdownChip}`}
                  >
                    <span className="text-emerald-500">{acc}:</span>
                    <span className={`font-mono ${textPrimary}`}>
                      {formatCurrency(Number(amt), currencyStyle)}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};
