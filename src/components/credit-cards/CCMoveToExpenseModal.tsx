import React, { useState, useEffect } from "react";
import { FiArrowUpRight, FiX, FiInfo, FiCheck, FiPieChart } from "react-icons/fi";
import { api } from "../../lib/api";
import { useExpenseCategories } from "../../hooks/useExpenseCategories";
import { useAccountTypes } from "../../hooks/useAccountTypes";
import type { CreditCard, CCAdvance, CurrencyStyle } from "./types";
import { formatCurrency } from "../../lib/formatters";

interface CCMoveToExpenseModalProps {
  isOpen: boolean;
  advance: CCAdvance | null;
  cards: CreditCard[];
  onClose: () => void;
  onSuccess: (message: string) => void;
  currencyStyle?: CurrencyStyle;
  isDark: boolean;
}

export const CCMoveToExpenseModal: React.FC<CCMoveToExpenseModalProps> = ({
  isOpen,
  advance,
  cards,
  onClose,
  onSuccess,
  currencyStyle,
  isDark,
}) => {
  const { categories, loading: loadingCategories } = useExpenseCategories();
  const { accountTypes, loading: loadingAccounts } = useAccountTypes();

  const [item, setItem] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [accountType, setAccountType] = useState("");
  const [creditCardId, setCreditCardId] = useState("");
  const [creditCardName, setCreditCardName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const totalAdvance = Number(advance?.amount || 0);
  const alreadyPaid = Number(
    advance?.paid_amount || (advance?.cash_received ? totalAdvance : 0) || 0
  );
  const maxMoveable = Math.max(0, totalAdvance - alreadyPaid);
  const moveVal = Number(amount) || 0;
  const isPartial = moveVal > 0 && moveVal < totalAdvance;
  const remainingAdvance = Math.max(0, totalAdvance - moveVal);

  // Initialize form state when advance opens
  useEffect(() => {
    if (advance && isOpen) {
      const suggestedItem = advance.description
        ? advance.description
        : `Advance - ${advance.person_name}`;
      setItem(suggestedItem);
      setAmount(advance.amount.toString());
      setDate(advance.date);
      setCreditCardId(advance.credit_card_id || "");
      setCreditCardName(advance.credit_card_name || "");
      setDescription(
        advance.description
          ? `Converted from CC advance for ${advance.person_name} (${advance.description})`
          : `Converted from CC advance for ${advance.person_name}`
      );
      setError("");
    }
  }, [advance, isOpen]);

  // Set default category and account type when loaded
  useEffect(() => {
    if (categories.length > 0 && !categoryId) {
      setCategoryId(categories[0].id.toString());
    }
  }, [categories, categoryId]);

  useEffect(() => {
    if (accountTypes.length > 0 && !accountType) {
      const ccAcc = accountTypes.find((a) => a.toLowerCase().includes("credit card"));
      setAccountType(ccAcc || accountTypes[0]);
    }
  }, [accountTypes, accountType]);

  if (!isOpen || !advance) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!item.trim()) {
      setError("Item name is required");
      return;
    }
    if (!amount || moveVal <= 0) {
      setError("Please enter a valid amount");
      return;
    }
    if (moveVal > totalAdvance) {
      setError(`Amount to move cannot exceed the total advance amount of ${formatCurrency(totalAdvance, currencyStyle)}`);
      return;
    }
    if (alreadyPaid > 0 && moveVal > maxMoveable + 0.01) {
      setError(
        `Cannot move more than unpaid balance (${formatCurrency(maxMoveable, currencyStyle)}) because ${advance.person_name} has already repaid ${formatCurrency(alreadyPaid, currencyStyle)}.`
      );
      return;
    }
    if (!date) {
      setError("Date is required");
      return;
    }
    if (!categoryId) {
      setError("Please select a spending category");
      return;
    }
    if (!accountType) {
      setError("Please select an account type");
      return;
    }

    setSubmitting(true);
    try {
      // 1. Create the personal expense
      await api.post("/api/expenses", {
        amount: moveVal,
        date,
        item: item.trim(),
        description: description.trim() || null,
        category_id: categoryId,
        account_type: accountType,
        paid_via_credit_card: true,
        credit_card_id: creditCardId || null,
        credit_card_name: creditCardName || null,
        cc_bill_settled: false,
      });

      // 2. Either delete or partially update the CC advance
      if (moveVal >= totalAdvance) {
        // Full move: delete advance
        await api.delete(`/api/cc-advances?id=${advance.id}`);
        onSuccess(`Advance for "${advance.person_name}" moved to transactions!`);
      } else {
        // Partial move: update advance to the remaining amount
        const newTotal = totalAdvance - moveVal;
        const newPaid = Math.min(alreadyPaid, newTotal);
        await api.put("/api/cc-advances", {
          id: advance.id,
          amount: newTotal,
          paid_amount: newPaid,
          cash_received: newPaid >= newTotal,
        });
        onSuccess(
          `Moved ${formatCurrency(moveVal, currencyStyle)} to personal transactions! ${formatCurrency(
            newTotal,
            currencyStyle
          )} remains in advances for ${advance.person_name}.`
        );
      }

      onClose();
    } catch (err: unknown) {
      console.error("Failed to move advance to expenses", err);
      setError(err instanceof Error ? err.message : "Failed to move advance to transactions");
    } finally {
      setSubmitting(false);
    }
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
      <div className={`max-w-lg w-full p-6 space-y-5 rounded-3xl shadow-2xl my-8 ${modalBg}`}>
        {/* Header */}
        <div className={`flex items-center justify-between border-b pb-3 ${divider}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 flex items-center justify-center">
              <FiArrowUpRight size={20} />
            </div>
            <div>
              <h3 className={`text-lg font-bold font-heading ${textPrimary}`}>
                Move / Split to Personal Expense
              </h3>
              <p className={`text-xs ${textSecondary}`}>
                Convert full or partial advance into your personal expense
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

        {/* Advance Quick Summary Banner */}
        <div
          className={`p-3 rounded-2xl border text-xs flex items-center justify-between ${
            isDark ? "bg-slate-800/60 border-slate-700" : "bg-slate-50 border-slate-200"
          }`}
        >
          <div>
            <span className={`block font-medium ${textSecondary}`}>Advance For</span>
            <span className={`text-sm font-bold ${textPrimary}`}>{advance.person_name}</span>
          </div>
          <div className="text-right">
            <span className={`block font-medium ${textSecondary}`}>Current Advance Total</span>
            <span className="text-sm font-bold text-emerald-500 font-mono">
              {formatCurrency(totalAdvance, currencyStyle)}
            </span>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={`block text-xs font-semibold mb-1 ${textSecondary}`}>
              Expense Item Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. My Share of Team Dinner, Flight Ticket"
              value={item}
              onChange={(e) => setItem(e.target.value)}
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className={`block text-xs font-semibold ${textSecondary}`}>
                  Amount to Move (₹) *
                </label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setAmount(Math.round(totalAdvance / 2).toString())}
                    className="px-1.5 py-0.5 text-[10px] rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-emerald-500/15 hover:text-emerald-500"
                  >
                    50%
                  </button>
                  <button
                    type="button"
                    onClick={() => setAmount(totalAdvance.toString())}
                    className="px-1.5 py-0.5 text-[10px] rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold hover:bg-emerald-500/20"
                  >
                    100%
                  </button>
                </div>
              </div>
              <input
                type="number"
                required
                min="0.01"
                max={totalAdvance}
                step="any"
                placeholder="Amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={`${inputClass} font-mono font-bold`}
              />
            </div>
            <div>
              <label className={`block text-xs font-semibold mb-1 ${textSecondary}`}>
                Transaction Date *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          {/* Split Preview Banner (when amount < total) */}
          {isPartial && (
            <div
              className={`p-3.5 rounded-2xl border text-xs space-y-2 animate-fade-in ${
                isDark ? "bg-slate-800/80 border-slate-700/80" : "bg-slate-50 border-slate-200"
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-300">
                <FiPieChart className="text-emerald-500" size={14} />
                <span>Split Breakdown</span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200 dark:border-slate-700">
                <div>
                  <span className="text-[11px] text-slate-400 block">Personal Expense</span>
                  <span className="text-sm font-bold text-emerald-500 font-mono">
                    {formatCurrency(moveVal, currencyStyle)}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">
                    Remains for {advance.person_name}
                  </span>
                  <span className="text-sm font-bold text-blue-500 font-mono">
                    {formatCurrency(remainingAdvance, currencyStyle)}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={`block text-xs font-semibold mb-1 ${textSecondary}`}>
                Spending Category *
              </label>
              <select
                required
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className={inputClass}
                disabled={loadingCategories}
              >
                <option value="">Select Category...</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={`block text-xs font-semibold mb-1 ${textSecondary}`}>
                Account to Deduct From *
              </label>
              <select
                required
                value={accountType}
                onChange={(e) => setAccountType(e.target.value)}
                className={inputClass}
                disabled={loadingAccounts}
              >
                <option value="">Select Account...</option>
                {accountTypes.map((acc) => (
                  <option key={acc} value={acc}>
                    {acc}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={`block text-xs font-semibold mb-1 ${textSecondary}`}>
              Credit Card Used *
            </label>
            <select
              required
              value={creditCardId}
              onChange={(e) => {
                const sel = cards.find((c) => c.id === e.target.value);
                setCreditCardId(e.target.value);
                setCreditCardName(sel?.name || "");
              }}
              className={inputClass}
            >
              <option value="">Select Credit Card...</option>
              {cards.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.card_last4 ? ` (••${c.card_last4})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={`block text-xs font-semibold mb-1 ${textSecondary}`}>
              Description / Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Covered on behalf of friend, now personal"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={inputClass}
            />
          </div>

          {/* Info Banner */}
          <div
            className={`p-3 rounded-2xl text-xs flex items-start gap-2.5 ${
              isDark
                ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                : "bg-emerald-50 border border-emerald-200 text-emerald-800"
            }`}
          >
            <FiInfo size={15} className="shrink-0 mt-0.5 text-emerald-500" />
            <span>
              {isPartial ? (
                <>
                  Moving <strong>{formatCurrency(moveVal, currencyStyle)}</strong> creates an expense transaction, while the remaining <strong>{formatCurrency(remainingAdvance, currencyStyle)}</strong> stays active in CC Advances for <strong>{advance.person_name}</strong>.
                </>
              ) : (
                <>
                  Moving the full amount will create a transaction in <strong>Expense Tracker</strong> and close this advance record.
                </>
              )}
            </span>
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className={`flex-1 px-4 py-2.5 rounded-xl border text-xs font-bold transition-colors ${
                isDark
                  ? "border-slate-700 text-slate-300 hover:bg-slate-800"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-1.5 disabled:opacity-50 transition-all"
            >
              {submitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <FiCheck size={14} />
                  <span>{isPartial ? "Split & Move to Expense" : "Convert to Expense"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
