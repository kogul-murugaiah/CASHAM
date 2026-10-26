import React, { useState, useEffect } from "react";
import { FiX, FiRepeat, FiCreditCard, FiDollarSign } from "react-icons/fi";
import type { CreditCard } from "../credit-cards/types";
import type { Subscription, SubscriptionFormData, BillingCycle, PaymentType } from "../../hooks/useSubscriptions";
import type { Category } from "../../hooks/useExpenseCategories";
import { getLocalDateString } from "../../lib/formatters";

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: SubscriptionFormData) => Promise<void>;
  editingSub: Subscription | null;
  cards: CreditCard[];
  accountTypes: string[];
  categories: Category[];
  isDark: boolean;
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingSub,
  cards,
  accountTypes,
  categories,
  isDark,
}) => {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [startDate, setStartDate] = useState(() => getLocalDateString());
  const [nextBillingDate, setNextBillingDate] = useState(() => getLocalDateString());
  const [categoryId, setCategoryId] = useState("");
  const [paymentType, setPaymentType] = useState<PaymentType>("credit_card");
  const [creditCardId, setCreditCardId] = useState("");
  const [accountType, setAccountType] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (editingSub) {
      setName(editingSub.name);
      setAmount(String(editingSub.amount));
      setBillingCycle(editingSub.billing_cycle);
      setStartDate(editingSub.start_date);
      setNextBillingDate(editingSub.next_billing_date);
      setCategoryId(editingSub.category_id ? String(editingSub.category_id) : "");
      setPaymentType(editingSub.payment_type);
      setCreditCardId(editingSub.credit_card_id || "");
      setAccountType(editingSub.account_type || "");
      setNotes(editingSub.notes || "");
    } else {
      setName("");
      setAmount("");
      setBillingCycle("monthly");
      const today = getLocalDateString();
      setStartDate(today);
      setNextBillingDate(today);
      setCategoryId("");
      setPaymentType(cards.length > 0 ? "credit_card" : "account");
      setCreditCardId(cards[0]?.id || "");
      setAccountType(accountTypes[0] || "Cash");
      setNotes("");
    }
    setError("");
  }, [editingSub, isOpen, cards, accountTypes]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !amount || Number(amount) <= 0) {
      setError("Please enter a valid service name and amount");
      return;
    }

    if (paymentType === "credit_card" && !creditCardId && cards.length > 0) {
      setError("Please select a credit card");
      return;
    }

    if (paymentType === "account" && !accountType && accountTypes.length > 0) {
      setError("Please select an account");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const selectedCat = categories.find((c) => String(c.id) === categoryId);
      const selectedCC = cards.find((c) => c.id === creditCardId);

      await onSave({
        name: name.trim(),
        amount: Number(amount),
        billing_cycle: billingCycle,
        start_date: startDate,
        next_billing_date: nextBillingDate || startDate,
        category_id: categoryId ? Number(categoryId) : null,
        category_name: selectedCat?.name || null,
        payment_type: paymentType,
        credit_card_id: paymentType === "credit_card" ? (selectedCC?.id || null) : null,
        credit_card_name: paymentType === "credit_card" ? (selectedCC?.name || null) : null,
        account_type: paymentType === "account" ? (accountType || null) : null,
        notes: notes.trim() || null,
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save subscription");
    } finally {
      setSaving(false);
    }
  };

  // Helper calculation for monthly burn equivalent
  const numAmt = Number(amount) || 0;
  const monthlyEq =
    billingCycle === "monthly"
      ? numAmt
      : billingCycle === "quarterly"
      ? Math.round(numAmt / 3)
      : billingCycle === "semi_annual"
      ? Math.round(numAmt / 6)
      : Math.round(numAmt / 12);

  const modalBg = isDark ? "bg-slate-900 border border-white/10" : "bg-white border border-slate-200 shadow-2xl";
  const textPrimary = isDark ? "text-white" : "text-slate-900";
  const textSecondary = isDark ? "text-slate-400" : "text-slate-500";
  const inputClass = isDark
    ? "w-full rounded-xl border border-white/10 bg-slate-800/60 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500/40 outline-none"
    : "w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500/30 outline-none";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className={`max-w-lg w-full p-6 space-y-5 rounded-3xl ${modalBg}`}>
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-white/10">
          <h3 className={`text-xl font-bold font-heading flex items-center gap-2 ${textPrimary}`}>
            <FiRepeat className="text-emerald-500" />
            {editingSub ? "Edit Subscription" : "Add Recurring Subscription"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
          >
            <FiX size={18} />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name & Amount */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={`block text-xs font-semibold mb-1 ${textSecondary}`}>Service / Commitment *</label>
              <input
                type="text"
                required
                placeholder="e.g., Netflix, Gym, AWS, WiFi"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={`block text-xs font-semibold mb-1 ${textSecondary}`}>Amount (₹) *</label>
              <input
                type="number"
                required
                min="1"
                step="any"
                placeholder="e.g., 499"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          {/* Billing Cycle */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className={`text-xs font-semibold ${textSecondary}`}>Billing Frequency *</label>
              {numAmt > 0 && billingCycle !== "monthly" && (
                <span className="text-[11px] font-mono text-emerald-500 font-semibold">
                  ≈ ₹{monthlyEq.toLocaleString()}/month
                </span>
              )}
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[
                { key: "monthly", label: "Monthly" },
                { key: "quarterly", label: "Quarterly" },
                { key: "semi_annual", label: "6 Months" },
                { key: "yearly", label: "Yearly" },
              ].map((cycle) => (
                <button
                  key={cycle.key}
                  type="button"
                  onClick={() => setBillingCycle(cycle.key as BillingCycle)}
                  className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all text-center ${
                    billingCycle === cycle.key
                      ? "bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/20"
                      : isDark
                      ? "bg-slate-800/80 border-white/10 text-slate-300 hover:bg-slate-700/60"
                      : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {cycle.label}
                </button>
              ))}
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`block text-xs font-semibold mb-1 ${textSecondary}`}>Subscription Start Date</label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  if (!editingSub) setNextBillingDate(e.target.value);
                }}
                className={inputClass}
              />
            </div>
            <div>
              <label className={`block text-xs font-semibold mb-1 ${textSecondary}`}>Next Renewal Date *</label>
              <input
                type="date"
                required
                value={nextBillingDate}
                onChange={(e) => setNextBillingDate(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          {/* Payment Linkage Selector */}
          <div>
            <label className={`block text-xs font-semibold mb-1.5 ${textSecondary}`}>Payment Method Linkage *</label>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <button
                type="button"
                onClick={() => setPaymentType("credit_card")}
                className={`py-2 px-3 rounded-xl text-xs font-bold border flex items-center justify-center gap-2 transition-all ${
                  paymentType === "credit_card"
                    ? "bg-emerald-500/15 border-emerald-500 text-emerald-500 dark:text-emerald-400"
                    : isDark
                    ? "bg-slate-800/60 border-white/10 text-slate-400"
                    : "bg-slate-100 border-slate-200 text-slate-600"
                }`}
              >
                <FiCreditCard size={14} /> Credit Card
              </button>
              <button
                type="button"
                onClick={() => setPaymentType("account")}
                className={`py-2 px-3 rounded-xl text-xs font-bold border flex items-center justify-center gap-2 transition-all ${
                  paymentType === "account"
                    ? "bg-emerald-500/15 border-emerald-500 text-emerald-500 dark:text-emerald-400"
                    : isDark
                    ? "bg-slate-800/60 border-white/10 text-slate-400"
                    : "bg-slate-100 border-slate-200 text-slate-600"
                }`}
              >
                <FiDollarSign size={14} /> Bank Account / Cash
              </button>
            </div>

            {paymentType === "credit_card" ? (
              <select
                value={creditCardId}
                onChange={(e) => setCreditCardId(e.target.value)}
                className={inputClass}
                required
              >
                <option value="">Select Credit Card...</option>
                {cards.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.card_last4 ? `(••${c.card_last4})` : ""}
                  </option>
                ))}
              </select>
            ) : (
              <select
                value={accountType}
                onChange={(e) => setAccountType(e.target.value)}
                className={inputClass}
                required
              >
                <option value="">Select Account...</option>
                {accountTypes.map((acc) => (
                  <option key={acc} value={acc}>
                    {acc}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Category */}
          {categories.length > 0 && (
            <div>
              <label className={`block text-xs font-semibold mb-1 ${textSecondary}`}>Category (Optional)</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className={inputClass}
              >
                <option value="">No category assigned</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className={`block text-xs font-semibold mb-1 ${textSecondary}`}>Notes (Optional)</label>
            <input
              type="text"
              placeholder="e.g., Annual family plan shared with brother"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={inputClass}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-white/10">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className={`px-4 py-2.5 rounded-xl text-sm font-semibold border ${
                isDark
                  ? "border-white/10 text-slate-300 hover:bg-white/5"
                  : "border-slate-300 text-slate-600 hover:bg-slate-100"
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary px-6 py-2.5 rounded-xl text-sm font-bold text-white shadow-lg shadow-emerald-500/25"
            >
              {saving ? "Saving..." : editingSub ? "Update Subscription" : "Add Subscription"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
