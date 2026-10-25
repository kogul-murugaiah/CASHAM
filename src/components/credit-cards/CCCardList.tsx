import React from "react";
import { FiCreditCard, FiPlus, FiArrowRight, FiEdit2, FiTrash2, FiCalendar, FiClock } from "react-icons/fi";
import { formatCurrency } from "../../lib/formatters";
import type { CreditCard, CurrencyStyle } from "./types";

interface CCCardListProps {
  cards: CreditCard[];
  activeCardId: string;
  onSelectCard: (cardId: string) => void;
  onOpenAddCard: () => void;
  onOpenEditCard: (card: CreditCard) => void;
  onDeleteCard: (id: string, name: string) => void;
  totalOutstandingDues: number;
  getCardDues: (card: CreditCard) => number;
  currencyStyle?: CurrencyStyle;
  isDark: boolean;
}

export const CCCardList: React.FC<CCCardListProps> = ({
  cards,
  activeCardId,
  onSelectCard,
  onOpenAddCard,
  onOpenEditCard,
  onDeleteCard,
  totalOutstandingDues,
  getCardDues,
  currencyStyle,
  isDark,
}) => {
  const cardBg = isDark ? "bg-slate-800/80 border-white/10" : "bg-white border-slate-200 shadow-sm";
  const textPrimary = isDark ? "text-white" : "text-slate-800";
  const textSecondary = isDark ? "text-slate-400" : "text-slate-500";
  const textMuted = isDark ? "text-slate-500" : "text-slate-400";
  const divider = isDark ? "border-white/10" : "border-slate-200";
  const cardSelectedBg = isDark
    ? "bg-slate-800 border-emerald-500/50 shadow-xl shadow-emerald-500/10 ring-2 ring-emerald-500/30"
    : "bg-emerald-50 border-emerald-400/60 shadow-lg shadow-emerald-200/50 ring-2 ring-emerald-300/40";
  const cardUnselectedBg = isDark
    ? "glass-card hover:border-white/20 hover:bg-slate-800/60"
    : "bg-white border border-slate-200 hover:border-emerald-300 hover:shadow-md";
  const progressTrack = isDark ? "bg-slate-700/60" : "bg-slate-200";
  const dueBadge = isDark ? "bg-slate-700/60 text-slate-300" : "bg-slate-100 text-slate-600";

  const getDueCountdown = (dueDay: number) => {
    const today = new Date();
    const currentDay = today.getDate();
    let daysLeft = dueDay - currentDay;
    if (daysLeft < 0) {
      const totalDaysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
      daysLeft = totalDaysInMonth - currentDay + dueDay;
    }
    return daysLeft;
  };

  return (
    <div className="space-y-3 animate-fade-in">
      <div className="flex items-center justify-between">
        <h3 className={`text-sm font-bold uppercase tracking-wider flex items-center gap-2 ${textSecondary}`}>
          <FiCreditCard size={14} /> Your Cards
        </h3>
        {cards.length > 0 && <span className={`text-xs ${textMuted}`}>Click a card to filter dues & accounts</span>}
      </div>

      {cards.length === 0 ? (
        <div className={`rounded-2xl border p-8 text-center space-y-3 ${cardBg}`}>
          <div className="inline-flex p-3 rounded-2xl bg-emerald-500/10 text-emerald-500">
            <FiCreditCard size={28} />
          </div>
          <h4 className={`text-base font-bold ${textPrimary}`}>No Credit Cards Added</h4>
          <p className={`text-sm max-w-md mx-auto ${textSecondary}`}>
            Add your credit cards with credit limits and billing cycle dates to start tracking dues and utilization.
          </p>
          <button
            onClick={onOpenAddCard}
            className="btn-primary rounded-xl px-5 py-2.5 text-sm font-bold text-white inline-flex items-center gap-2 mt-2"
          >
            <FiPlus size={16} /> Add Your First Card
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {/* "All Cards" Card */}
          <div
            onClick={() => onSelectCard("all")}
            className={`cursor-pointer rounded-2xl p-5 border transition-all relative overflow-hidden ${
              activeCardId === "all" ? cardSelectedBg : cardUnselectedBg
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className={`text-xs font-bold uppercase tracking-wider ${textSecondary}`}>Combined</span>
              <span className="text-xs font-mono font-bold text-emerald-500">{cards.length} Cards</span>
            </div>
            <h4 className={`text-lg font-bold ${textPrimary}`}>All Cards Overview</h4>
            <p className={`text-xs mt-1 ${textSecondary}`}>Total pending across all cards</p>
            <div className={`mt-4 pt-3 border-t flex items-end justify-between ${divider}`}>
              <div>
                <span className={`text-[10px] uppercase font-semibold ${textSecondary}`}>Total Dues</span>
                <p className="text-xl font-bold font-heading text-emerald-500">
                  {formatCurrency(totalOutstandingDues, currencyStyle)}
                </p>
              </div>
              <span className="text-xs text-emerald-500 font-semibold flex items-center gap-1">
                View All <FiArrowRight size={12} />
              </span>
            </div>
          </div>

          {/* Individual Card Items */}
          {cards.map((card) => {
            const isSelected = activeCardId === card.id;
            const cardDues = getCardDues(card);
            const cardLimit = Number(card.credit_limit || 0);
            const cardUtil = cardLimit > 0 ? (cardDues / cardLimit) * 100 : 0;
            const daysUntilDue = getDueCountdown(card.payment_due_day || 20);

            return (
              <div
                key={card.id}
                onClick={() => onSelectCard(card.id)}
                className={`cursor-pointer rounded-2xl p-5 border transition-all relative overflow-hidden group ${
                  isSelected ? cardSelectedBg : cardUnselectedBg
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-bold uppercase tracking-wider truncate ${textSecondary}`}>
                    {card.bank_name || "Credit Card"}
                  </span>
                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenEditCard(card);
                      }}
                      className={`p-1 rounded-lg transition-colors ${
                        isDark
                          ? "hover:bg-white/10 text-slate-400 hover:text-white"
                          : "hover:bg-slate-100 text-slate-400 hover:text-slate-700"
                      }`}
                      title="Edit Card"
                    >
                      <FiEdit2 size={13} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteCard(card.id, card.name);
                      }}
                      className="p-1 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-500 transition-colors"
                      title="Delete Card"
                    >
                      <FiTrash2 size={13} />
                    </button>
                  </div>
                </div>

                <div className="flex items-baseline gap-2">
                  <h4 className={`text-base font-bold truncate ${textPrimary}`}>{card.name}</h4>
                  {card.card_last4 && <span className={`text-xs font-mono ${textSecondary}`}>••{card.card_last4}</span>}
                </div>

                <div className={`mt-2 flex items-center justify-between text-[11px] ${textSecondary}`}>
                  <span className="flex items-center gap-1">
                    <FiCalendar size={11} /> Bill: {card.billing_cycle_day}th
                  </span>
                  <span
                    className={`font-semibold px-1.5 py-0.5 rounded ${
                      daysUntilDue <= 5 ? "bg-red-500/15 text-red-500" : dueBadge
                    }`}
                  >
                    <FiClock className="inline mr-0.5" size={10} /> Due in {daysUntilDue}d
                  </span>
                </div>

                <div className="mt-3">
                  <div className={`flex justify-between text-[10px] mb-1 ${textSecondary}`}>
                    <span>Utilization</span>
                    <span className={cardUtil > 30 ? "text-amber-500 font-bold" : "text-emerald-500 font-bold"}>
                      {cardUtil.toFixed(1)}%
                    </span>
                  </div>
                  <div className={`w-full h-1.5 rounded-full overflow-hidden ${progressTrack}`}>
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        cardUtil <= 30 ? "bg-emerald-500" : cardUtil <= 50 ? "bg-amber-500" : "bg-red-500"
                      }`}
                      style={{ width: `${Math.min(100, cardUtil)}%` }}
                    />
                  </div>
                </div>

                <div className={`mt-3 pt-2.5 border-t flex items-baseline justify-between ${divider}`}>
                  <span className={`text-[10px] uppercase font-semibold ${textSecondary}`}>Outstanding</span>
                  <span className="text-lg font-bold font-heading text-emerald-500">
                    {formatCurrency(cardDues, currencyStyle)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
