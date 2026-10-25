import React from "react";
import { FiCreditCard, FiX } from "react-icons/fi";
import type { CreditCard, CardFormState } from "./types";

interface CCCardModalProps {
  isOpen: boolean;
  editingCard: CreditCard | null;
  cardForm: CardFormState;
  setCardForm: React.Dispatch<React.SetStateAction<CardFormState>>;
  onClose: () => void;
  onSave: (e: React.FormEvent) => void;
  savingCard: boolean;
  isDark: boolean;
}

export const CCCardModal: React.FC<CCCardModalProps> = ({
  isOpen,
  editingCard,
  cardForm,
  setCardForm,
  onClose,
  onSave,
  savingCard,
  isDark,
}) => {
  if (!isOpen) return null;

  const modalBg = isDark ? "bg-slate-800/95 border border-white/10" : "bg-white border border-slate-200";
  const textPrimary = isDark ? "text-white" : "text-slate-800";
  const textSecondary = isDark ? "text-slate-400" : "text-slate-500";
  const divider = isDark ? "border-white/10" : "border-slate-200";
  const inputClass = isDark
    ? "w-full rounded-xl border border-white/10 bg-slate-700/50 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500/40 outline-none"
    : "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500/30 outline-none";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className={`max-w-md w-full p-6 space-y-5 rounded-2xl shadow-2xl ${modalBg}`}>
        <div className={`flex items-center justify-between border-b pb-3 ${divider}`}>
          <h3 className={`text-lg font-bold flex items-center gap-2 ${textPrimary}`}>
            <FiCreditCard className="text-emerald-500" /> {editingCard ? "Edit Credit Card" : "Add Credit Card"}
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

        <form onSubmit={onSave} className="space-y-4">
          <div>
            <label className={`block text-xs font-medium mb-1 ${textSecondary}`}>Card Name *</label>
            <input
              type="text"
              required
              placeholder="e.g., HDFC Millennia, Slice Card"
              value={cardForm.name}
              onChange={(e) => setCardForm({ ...cardForm, name: e.target.value })}
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`block text-xs font-medium mb-1 ${textSecondary}`}>Bank Name</label>
              <input
                type="text"
                placeholder="e.g., HDFC, ICICI"
                value={cardForm.bank_name}
                onChange={(e) => setCardForm({ ...cardForm, bank_name: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={`block text-xs font-medium mb-1 ${textSecondary}`}>Last 4 Digits</label>
              <input
                type="text"
                maxLength={4}
                placeholder="e.g., 4242"
                value={cardForm.card_last4}
                onChange={(e) => setCardForm({ ...cardForm, card_last4: e.target.value })}
                className={`${inputClass} font-mono`}
              />
            </div>
          </div>

          <div>
            <label className={`block text-xs font-medium mb-1 ${textSecondary}`}>Credit Limit (₹)</label>
            <input
              type="number"
              placeholder="e.g., 100000"
              value={cardForm.credit_limit}
              onChange={(e) => setCardForm({ ...cardForm, credit_limit: e.target.value })}
              className={`${inputClass} font-mono`}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`block text-xs font-medium mb-1 ${textSecondary}`}>Statement Day (1-31)</label>
              <input
                type="number"
                min={1}
                max={31}
                value={cardForm.billing_cycle_day}
                onChange={(e) => setCardForm({ ...cardForm, billing_cycle_day: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={`block text-xs font-medium mb-1 ${textSecondary}`}>Payment Due Day (1-31)</label>
              <input
                type="number"
                min={1}
                max={31}
                value={cardForm.payment_due_day}
                onChange={(e) => setCardForm({ ...cardForm, payment_due_day: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>

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
              type="submit"
              disabled={savingCard || !cardForm.name.trim()}
              className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold shadow-lg shadow-emerald-500/20 disabled:opacity-50"
            >
              {savingCard ? "Saving..." : editingCard ? "Update Card" : "Add Card"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
