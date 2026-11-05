import React, { useState, useEffect, type FormEvent } from "react";
import { FiX, FiCreditCard, FiEdit2, FiCheck, FiAlertCircle } from "react-icons/fi";
import { api } from "../lib/api";

interface EditExpenseModalProps {
  isOpen: boolean;
  expense: any | null;
  categories: any[];
  accountTypes: string[];
  creditCards: any[];
  onClose: () => void;
  onSaved: () => void;
}

export const EditExpenseModal: React.FC<EditExpenseModalProps> = ({
  isOpen,
  expense,
  categories,
  accountTypes,
  creditCards,
  onClose,
  onSaved,
}) => {
  const [item, setItem] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [accountType, setAccountType] = useState("");
  const [description, setDescription] = useState("");
  const [paidViaCreditCard, setPaidViaCreditCard] = useState(false);
  const [creditCardId, setCreditCardId] = useState("");
  const [creditCardName, setCreditCardName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (expense && isOpen) {
      setItem(expense.item || "Expense");
      setAmount(expense.amount ? expense.amount.toString() : "");
      setDate(expense.date ? expense.date.split("T")[0] : "");
      setCategoryId(expense.category_id ? expense.category_id.toString() : "");
      setAccountType(expense.account_type || accountTypes[0] || "");
      setDescription(expense.description || "");
      setPaidViaCreditCard(Boolean(expense.paid_via_credit_card));
      setCreditCardId(expense.credit_card_id || "");
      setCreditCardName(expense.credit_card_name || "");
      setError("");
    }
  }, [expense, isOpen, accountTypes]);

  if (!isOpen || !expense) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!item.trim()) {
      setError("Item name is required");
      return;
    }
    if (!amount || Number(amount) <= 0) {
      setError("Please provide a valid amount");
      return;
    }
    if (!date) {
      setError("Date is required");
      return;
    }

    setSaving(true);
    setError("");

    try {
      await api.put("/api/expenses", {
        id: expense.id,
        item: item.trim(),
        amount: Number(amount),
        date,
        category_id: categoryId ? Number(categoryId) : null,
        account_type: accountType,
        description: description.trim() || null,
        paid_via_credit_card: paidViaCreditCard,
        credit_card_id: paidViaCreditCard ? creditCardId || null : null,
        credit_card_name: paidViaCreditCard ? creditCardName || null : null,
      });

      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to update expense");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="glass-card max-w-lg w-full p-6 sm:p-7 space-y-5 border border-slate-200 dark:border-white/10 shadow-2xl my-8 bg-white dark:bg-slate-900 rounded-3xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <FiEdit2 size={18} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white font-heading">
                Edit Expense
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Update transaction details without navigating away
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
          >
            <FiX size={18} />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center gap-2">
            <FiAlertCircle size={15} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Item / Expense Name *
            </label>
            <input
              type="text"
              required
              value={item}
              onChange={(e) => setItem(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Amount (₹) *
              </label>
              <input
                type="number"
                required
                min="0.01"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Date *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Category
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Uncategorized</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Budget Account *
              </label>
              <select
                required
                value={accountType}
                onChange={(e) => setAccountType(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {accountTypes.map((acc) => (
                  <option key={acc} value={acc}>
                    {acc}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Description / Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
              placeholder="Optional notes or details"
            />
          </div>

          {/* Credit Card Section */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <FiCreditCard className="text-emerald-500" />
                Paid via Credit Card?
              </span>
              <input
                type="checkbox"
                checked={paidViaCreditCard}
                onChange={(e) => {
                  const checked = e.target.checked;
                  const defaultCard = creditCards[0];
                  setPaidViaCreditCard(checked);
                  if (checked) {
                    setCreditCardId(creditCardId || defaultCard?.id || "");
                    setCreditCardName(creditCardName || defaultCard?.name || "");
                  }
                }}
                className="w-4 h-4 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500"
              />
            </label>

            {paidViaCreditCard && (
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Choose Credit Card
                </label>
                <select
                  value={creditCardId}
                  onChange={(e) => {
                    const card = creditCards.find((c) => c.id === e.target.value);
                    setCreditCardId(e.target.value);
                    setCreditCardName(card?.name || "");
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">— Select a Card —</option>
                  {creditCards.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.card_last4 ? `(••${c.card_last4})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
            >
              {saving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <FiCheck size={14} />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
