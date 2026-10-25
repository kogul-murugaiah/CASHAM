import React from "react";
import { FiUsers, FiX, FiInfo } from "react-icons/fi";
import type { CreditCard, AdvanceFormState } from "./types";

interface CCAdvanceModalProps {
  isOpen: boolean;
  cards: CreditCard[];
  advanceForm: AdvanceFormState;
  setAdvanceForm: React.Dispatch<React.SetStateAction<AdvanceFormState>>;
  onClose: () => void;
  onSave: (e: React.FormEvent) => void;
  savingAdvance: boolean;
  isDark: boolean;
}

export const CCAdvanceModal: React.FC<CCAdvanceModalProps> = ({
  isOpen,
  cards,
  advanceForm,
  setAdvanceForm,
  onClose,
  onSave,
  savingAdvance,
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
            <FiUsers className="text-blue-500" /> Log CC Advance
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
            <label className={`block text-xs font-medium mb-1 ${textSecondary}`}>Person Name *</label>
            <input
              type="text"
              required
              placeholder="e.g., Rahul, Mom, Friend"
              value={advanceForm.person_name}
              onChange={(e) => setAdvanceForm({ ...advanceForm, person_name: e.target.value })}
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`block text-xs font-medium mb-1 ${textSecondary}`}>Amount (₹) *</label>
              <input
                type="number"
                required
                min="1"
                placeholder="e.g., 2000"
                value={advanceForm.amount}
                onChange={(e) => setAdvanceForm({ ...advanceForm, amount: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={`block text-xs font-medium mb-1 ${textSecondary}`}>Date *</label>
              <input
                type="date"
                required
                value={advanceForm.date}
                onChange={(e) => setAdvanceForm({ ...advanceForm, date: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className={`block text-xs font-medium mb-1 ${textSecondary}`}>Credit Card Used *</label>
            <select
              required
              value={advanceForm.credit_card_id}
              onChange={(e) => {
                const card = cards.find((c) => c.id === e.target.value);
                setAdvanceForm({
                  ...advanceForm,
                  credit_card_id: e.target.value,
                  credit_card_name: card?.name || "",
                });
              }}
              className={inputClass}
            >
              <option value="">Select a card...</option>
              {cards.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.card_last4 ? ` (••${c.card_last4})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={`block text-xs font-medium mb-1 ${textSecondary}`}>Description (Optional)</label>
            <input
              type="text"
              placeholder="e.g., Dinner at restaurant, Movie tickets"
              value={advanceForm.description}
              onChange={(e) => setAdvanceForm({ ...advanceForm, description: e.target.value })}
              className={inputClass}
            />
          </div>

          <div
            className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
              isDark
                ? "bg-blue-500/10 border border-blue-500/20 text-blue-300"
                : "bg-blue-50 border border-blue-200 text-blue-700"
            }`}
          >
            <FiInfo size={13} className="flex-shrink-0 mt-0.5" />
            <span>
              This amount will be tracked under your CC bill but will NOT be deducted from any of your budget accounts since
              it is not your expense.
            </span>
          </div>

          <div className="flex gap-2 pt-1">
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
              disabled={
                savingAdvance ||
                !advanceForm.person_name.trim() ||
                !advanceForm.amount ||
                !advanceForm.credit_card_name
              }
              className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold shadow-lg shadow-blue-500/20 disabled:opacity-50"
            >
              {savingAdvance ? "Logging..." : "Log Advance"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
