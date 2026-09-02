import { useState, useEffect, useRef, type FormEvent } from "react";
import { api } from "../lib/api";
import { useExpenseCategories } from "../hooks/useExpenseCategories";
import { useAccountTypes } from "../hooks/useAccountTypes";
import { useCreditCards } from "../hooks/useCreditCards";
import { useUserPreferences } from "../hooks/useUserPreferences";
import { formatCurrency, formatDate } from "../lib/formatters";
import { CustomDropdown } from "../components/CustomDropdown";
import { FiRepeat, FiTrash2, FiX, FiCreditCard, FiPlus } from "react-icons/fi";

type ExpenseTemplate = {
  id: string;
  amount: number;
  item: string;
  description: string | null;
  category_id: string | null;
  account_type: string;
  paid_via_credit_card?: boolean;
  credit_card_id?: string | null;
  credit_card_name?: string | null;
  categories: { id: string; name: string } | null;
};

// Helper for local YYYY-MM-DD date without UTC shift
const getLocalDateString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const initialForm = {
  amount: "",
  date: "",
  item: "",
  description: "",
  category_id: "",
  accountType: "",
  paidViaCreditCard: false,
  creditCardId: "",
  creditCardName: "",
};

const AddExpense = () => {
  const { accountTypes, addAccountType } = useAccountTypes();
  const { categories, loading: categoriesLoading, addCategory } = useExpenseCategories();
  const { cards: creditCards, addCard: addCreditCard } = useCreditCards();
  const { currencyStyle } = useUserPreferences();

  const [form, setForm] = useState(() => ({
    ...initialForm,
    date: getLocalDateString(),
    accountType: accountTypes[0] || "",
    category_id: categories.length > 0 ? categories[0].id.toString() : "",
  }));

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [recentExpenses, setRecentExpenses] = useState<any[]>([]);
  const [todayExpenses, setTodayExpenses] = useState(0);

  // Template state
  const [templates, setTemplates] = useState<ExpenseTemplate[]>([]);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [manageMode, setManageMode] = useState(false);
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const templatePickerRef = useRef<HTMLDivElement>(null);

  // New Card Modal State
  const [showNewCardModal, setShowNewCardModal] = useState(false);
  const [newCardForm, setNewCardForm] = useState({
    name: "",
    bank_name: "",
    card_last4: "",
    credit_limit: "",
    billing_cycle_day: "1",
    payment_due_day: "20",
  });
  const [cardSaving, setCardSaving] = useState(false);

  // Auto-populate default account when loaded
  useEffect(() => {
    if (accountTypes.length > 0 && !form.accountType) {
      setForm((prev) => ({ ...prev, accountType: accountTypes[0] }));
    }
  }, [accountTypes]);

  // Auto-populate default category when loaded
  useEffect(() => {
    if (categories.length > 0 && !form.category_id) {
      setForm((prev) => ({ ...prev, category_id: categories[0].id.toString() }));
    }
  }, [categories]);

  // Auto-populate credit card when cards load and CC is toggled
  useEffect(() => {
    if (creditCards.length > 0 && !form.creditCardId && !form.creditCardName) {
      setForm((prev) => ({
        ...prev,
        creditCardId: creditCards[0].id,
        creditCardName: creditCards[0].name,
      }));
    }
  }, [creditCards]);

  // Fetch recent expenses & today's spend
  const fetchRecentExpenses = async () => {
    try {
      const data = await api.get("/api/expenses");
      const todayStr = getLocalDateString();
      const todayTotal = (data || [])
        .filter((exp: any) => exp.date.startsWith(todayStr))
        .reduce((sum: number, exp: any) => sum + Number(exp.amount || 0), 0);
      setTodayExpenses(todayTotal);
      setRecentExpenses(data?.slice(0, 5) || []);
    } catch (err: any) {
      console.error("Error fetching recent expenses:", err);
    }
  };

  const fetchTemplates = async () => {
    try {
      const data = await api.get("/api/expenses?templates=true");
      setTemplates(data || []);
    } catch (err: any) {
      console.error("Error fetching templates:", err);
    }
  };

  useEffect(() => {
    fetchRecentExpenses();
    fetchTemplates();
  }, []);

  // Close template picker on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (templatePickerRef.current && !templatePickerRef.current.contains(e.target as Node)) {
        setShowTemplatePicker(false);
        setManageMode(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleFillFromTemplate = (t: ExpenseTemplate) => {
    setForm({
      amount: t.amount.toString(),
      date: getLocalDateString(),
      item: t.item,
      description: t.description || "",
      category_id: t.category_id ? t.category_id.toString() : "",
      accountType: t.account_type,
      paidViaCreditCard: Boolean(t.paid_via_credit_card),
      creditCardId: t.credit_card_id || "",
      creditCardName: t.credit_card_name || "",
    });
    setShowTemplatePicker(false);
    setManageMode(false);
    setError("");
    setSuccess("Template loaded — edit and submit!");
    setTimeout(() => setSuccess(""), 2500);
  };

  const handleDeleteTemplate = async (id: string) => {
    try {
      await api.delete(`/api/expenses?template=true&id=${id}`);
      setTemplates((prev) => prev.filter((t) => t.id !== id));
    } catch (err: any) {
      setError(err.message || "Failed to delete template");
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddCategory = async (name: string) => {
    await addCategory(name);
  };

  const handleAddAccountType = async (name: string) => {
    await addAccountType(name);
  };

  const handleCreateNewCard = async (e: FormEvent) => {
    e.preventDefault();
    if (!newCardForm.name.trim()) return;

    setCardSaving(true);
    try {
      const created = await addCreditCard({
        name: newCardForm.name.trim(),
        bank_name: newCardForm.bank_name.trim() || undefined,
        card_last4: newCardForm.card_last4.trim() || undefined,
        credit_limit: Number(newCardForm.credit_limit) || 50000,
        billing_cycle_day: Number(newCardForm.billing_cycle_day) || 1,
        payment_due_day: Number(newCardForm.payment_due_day) || 20,
      });

      if (created) {
        setForm((prev) => ({
          ...prev,
          creditCardId: created.id,
          creditCardName: created.name,
          paidViaCreditCard: true,
        }));
        setShowNewCardModal(false);
        setNewCardForm({
          name: "",
          bank_name: "",
          card_last4: "",
          credit_limit: "",
          billing_cycle_day: "1",
          payment_due_day: "20",
        });
      }
    } catch (err: any) {
      setError(err.message || "Failed to create card");
    } finally {
      setCardSaving(false);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!form.amount || !form.date) {
      setError("Amount and Date are required");
      return;
    }

    if (!form.accountType) {
      setError("Please select a budget account to deduct from");
      return;
    }

    if (!form.category_id) {
      setError("Please select a category");
      return;
    }

    if (form.paidViaCreditCard && !form.creditCardId && !form.creditCardName) {
      setError("Please select or add a credit card");
      return;
    }

    setLoading(true);

    try {
      await api.post("/api/expenses", {
        amount: Number(form.amount),
        date: form.date,
        item: form.item.trim() || "Expense",
        description: form.description.trim() || null,
        category_id: form.category_id,
        account_type: form.accountType,
        paid_via_credit_card: form.paidViaCreditCard,
        credit_card_id: form.paidViaCreditCard ? form.creditCardId || null : null,
        credit_card_name: form.paidViaCreditCard ? form.creditCardName || null : null,
      });

      // Save as template if checkbox is checked
      if (saveAsTemplate) {
        try {
          await api.post("/api/expenses?template=true", {
            amount: Number(form.amount),
            item: form.item.trim() || "Expense",
            description: form.description.trim() || null,
            category_id: form.category_id || null,
            account_type: form.accountType,
            paid_via_credit_card: form.paidViaCreditCard,
            credit_card_id: form.paidViaCreditCard ? form.creditCardId || null : null,
            credit_card_name: form.paidViaCreditCard ? form.creditCardName || null : null,
          });
          fetchTemplates();
        } catch {
          // Template save is best-effort
        }
      }

      setSuccess(
        saveAsTemplate
          ? "Expense added & saved as template!"
          : form.paidViaCreditCard
          ? `Expense added! Deducted from ${form.accountType} & recorded for ${form.creditCardName || 'Credit Card'}.`
          : "Expense added successfully"
      );

      // Keep user's preferred account & card for quick consecutive entries
      setForm((prev) => ({
        ...initialForm,
        date: getLocalDateString(),
        accountType: prev.accountType,
        category_id: prev.category_id,
        paidViaCreditCard: prev.paidViaCreditCard,
        creditCardId: prev.creditCardId,
        creditCardName: prev.creditCardName,
      }));

      setSaveAsTemplate(false);
      fetchRecentExpenses();
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pb-24 pt-8 md:pb-8">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <header className="mb-8 animate-fade-in text-center">
          <div className="inline-flex items-center justify-center p-3 bg-red-500/10 rounded-2xl mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-red-500"><rect width="20" height="14" x="2" y="5" rx="2" /><line x1="2" x2="22" y1="10" y2="10" /></svg>
          </div>
          <h1 className="text-3xl font-bold font-heading text-white mb-2">
            Add Expense
          </h1>
          <p className="text-slate-400 mb-6">
            Record spending against your budget accounts or paid with credit cards.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <div className="bg-red-500/10 border border-red-500/20 px-6 py-3 rounded-2xl backdrop-blur-sm shadow-xl shadow-red-500/5 animate-fade-in" style={{ animationDelay: '0.1s' }}>
              <p className="text-xs font-semibold text-red-500 uppercase tracking-wider mb-1">Today's Spend</p>
              <p className="text-3xl font-bold text-red-400 font-heading">
                {formatCurrency(todayExpenses, currencyStyle)}
              </p>
            </div>

            {/* Repeating Expense Button */}
            <div className="relative" ref={templatePickerRef}>
              <button
                type="button"
                onClick={() => { setShowTemplatePicker(!showTemplatePicker); setManageMode(false); }}
                className={`flex items-center gap-2 px-5 py-3 rounded-2xl border text-sm font-bold transition-all ${
                  showTemplatePicker
                    ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
                    : 'bg-slate-700/50 border-white/10 text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <FiRepeat size={16} />
                Repeating Expense
                {templates.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-[10px] font-black bg-emerald-500/20 text-emerald-400 rounded-full border border-emerald-500/20">
                    {templates.length}
                  </span>
                )}
              </button>

              {/* Template Picker Dropdown */}
              {showTemplatePicker && (
                <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-80 sm:w-96 glass-card border border-white/10 rounded-2xl shadow-2xl shadow-black/40 z-50 overflow-hidden animate-fade-in">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-slate-700/40">
                    <h4 className="text-sm font-bold text-white">
                      {manageMode ? 'Manage Templates' : 'Your Templates'}
                    </h4>
                    <div className="flex items-center gap-2">
                      {!manageMode && templates.length > 0 && (
                        <button
                          onClick={() => setManageMode(true)}
                          className="text-[10px] font-bold text-slate-400 hover:text-white transition-colors uppercase tracking-wider"
                        >
                          Manage
                        </button>
                      )}
                      <button onClick={() => { setShowTemplatePicker(false); setManageMode(false); }} className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-all">
                        <FiX size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="max-h-64 overflow-y-auto">
                    {templates.length === 0 ? (
                      <div className="p-6 text-center">
                        <p className="text-slate-500 text-sm mb-1">No templates yet</p>
                        <p className="text-slate-600 text-xs">Add an expense and check "Save as template" to create one.</p>
                      </div>
                    ) : (
                      templates.map((t) => (
                        <div
                          key={t.id}
                          className={`flex items-center justify-between px-4 py-3 border-b border-white/5 last:border-0 transition-colors ${
                            manageMode ? 'bg-transparent' : 'hover:bg-white/5 cursor-pointer'
                          }`}
                          onClick={() => !manageMode && handleFillFromTemplate(t)}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white truncate flex items-center gap-1.5">
                              {t.item}
                              {t.paid_via_credit_card && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-normal">
                                  💳 {t.credit_card_name || 'CC'}
                                </span>
                              )}
                            </p>
                            <p className="text-[11px] text-slate-500">
                              {t.categories?.name || 'Uncategorized'} · {t.account_type}
                            </p>
                          </div>
                          <div className="flex items-center gap-3 ml-3">
                            <span className="text-sm font-bold text-red-400 font-mono whitespace-nowrap">
                              {formatCurrency(t.amount, currencyStyle)}
                            </span>
                            {manageMode && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDeleteTemplate(t.id); }}
                                className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-600 hover:text-white transition-all"
                              >
                                <FiTrash2 size={12} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {error && (
          <div className="mb-6 glass-card border-red-500/20 bg-red-500/10 p-4 text-red-300 text-sm text-center">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 glass-card border-green-500/20 bg-green-500/10 p-4 text-green-300 text-sm text-center">
            {success}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="glass-card p-6 sm:p-8 space-y-6 animate-fade-in relative overflow-hidden"
        >
          {/* Subtle glow effect */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

          <div className="grid gap-6 sm:grid-cols-2 relative z-10">
            <div className="space-y-2">
              <label htmlFor="item" className="block text-sm font-medium text-slate-300">
                Item Name
              </label>
              <input
                type="text"
                name="item"
                id="item"
                value={form.item}
                onChange={handleChange}
                className="block w-full rounded-xl border border-white/10 bg-slate-700/50 backdrop-blur px-4 py-3 text-white placeholder-slate-500 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none"
                placeholder="e.g., Petrol, Tea, Groceries"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="amount" className="block text-sm font-medium text-slate-300">
                Amount
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                  <span className="text-slate-400 font-bold text-xs">{currencyStyle === 'symbol' ? '₹' : 'Rs.'}</span>
                </div>
                <input
                  type="number"
                  name="amount"
                  id="amount"
                  value={form.amount}
                  onChange={handleChange}
                  className={`block w-full rounded-xl border border-white/10 bg-slate-700/50 backdrop-blur ${currencyStyle === 'symbol' ? 'pl-10' : 'pl-12'} pr-4 py-3 text-white placeholder-slate-500 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none`}
                  placeholder="0.00"
                  step="0.01"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="date" className="block text-sm font-medium text-slate-300">
                Date
              </label>
              <input
                type="date"
                name="date"
                id="date"
                value={form.date}
                onChange={handleChange}
                className="block w-full rounded-xl border border-white/10 bg-slate-700/50 backdrop-blur px-4 py-3 text-white focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none cursor-pointer"
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="accountType" className="block text-sm font-medium text-slate-300">
                  Budget Account (To Deduct From)
                </label>
                <span className="text-[11px] text-slate-400 font-normal">
                  Reduces immediately
                </span>
              </div>
              <CustomDropdown
                value={form.accountType}
                onChange={(value) => setForm((prev) => ({ ...prev, accountType: value }))}
                options={accountTypes.map((type) => ({ value: type, label: type }))}
                placeholder="Select budget account (e.g. Slice, HDFC)"
                onAddNew={handleAddAccountType}
                addNewLabel="+ Add new account"
                disabled={loading}
              />
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 relative z-10">
            <div className="space-y-2">
              <label htmlFor="category_id" className="block text-sm font-medium text-slate-300">
                Category
              </label>
              <CustomDropdown
                value={form.category_id}
                onChange={(value) => setForm((prev) => ({ ...prev, category_id: value }))}
                options={categories.map((cat) => ({ value: cat.id.toString(), label: cat.name }))}
                placeholder="Select category"
                onAddNew={handleAddCategory}
                addNewLabel="+ Add new category"
                disabled={categoriesLoading}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="description" className="block text-sm font-medium text-slate-300">
                Description (Optional)
              </label>
              <input
                type="text"
                name="description"
                id="description"
                value={form.description}
                onChange={handleChange}
                className="block w-full rounded-xl border border-white/10 bg-slate-700/50 backdrop-blur px-4 py-3 text-white placeholder-slate-500 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none"
                placeholder="Details or notes..."
              />
            </div>
          </div>

          {/* ── Credit Card Payment Option ── */}
          <div className="rounded-2xl border border-white/10 bg-slate-800/40 p-5 space-y-4 relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl transition-all ${form.paidViaCreditCard ? 'bg-purple-500/20 text-purple-400 ring-1 ring-purple-500/40' : 'bg-slate-700/50 text-slate-400'}`}>
                  <FiCreditCard size={20} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white flex items-center gap-2">
                    Paid via Credit Card?
                    {form.paidViaCreditCard && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        ACTIVE
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-slate-400">
                    Reduces {form.accountType ? <strong className="text-slate-300">{form.accountType}</strong> : 'account'} immediately and tracks bill dues for settlement.
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.paidViaCreditCard}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setForm((prev) => ({
                      ...prev,
                      paidViaCreditCard: checked,
                      creditCardId: checked ? prev.creditCardId || creditCards[0]?.id || "" : "",
                      creditCardName: checked ? prev.creditCardName || creditCards[0]?.name || "" : "",
                    }));
                  }}
                  className="sr-only peer"
                />
                <div className="w-12 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>

            {form.paidViaCreditCard && (
              <div className="pt-3 border-t border-white/5 grid gap-4 sm:grid-cols-2 animate-fade-in">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-purple-300 uppercase tracking-wider">
                      Select Credit Card
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowNewCardModal(true)}
                      className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors"
                    >
                      <FiPlus size={12} /> Add Card
                    </button>
                  </div>

                  {creditCards.length === 0 ? (
                    <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-300 flex items-center justify-between">
                      <span>No credit cards added yet.</span>
                      <button
                        type="button"
                        onClick={() => setShowNewCardModal(true)}
                        className="px-2 py-1 rounded-lg bg-purple-600 text-white font-medium hover:bg-purple-500"
                      >
                        + Add Card
                      </button>
                    </div>
                  ) : (
                    <CustomDropdown
                      value={form.creditCardId || form.creditCardName}
                      onChange={(val) => {
                        const matched = creditCards.find((c) => c.id === val || c.name === val);
                        setForm((prev) => ({
                          ...prev,
                          creditCardId: matched ? matched.id : "",
                          creditCardName: matched ? matched.name : val,
                        }));
                      }}
                      options={creditCards.map((c) => ({
                        value: c.id,
                        label: `${c.name} ${c.card_last4 ? `(••${c.card_last4})` : ''} ${c.credit_limit ? `· Limit ₹${c.credit_limit.toLocaleString('en-IN')}` : ''}`,
                      }))}
                      placeholder="Select a credit card"
                      onAddNew={() => setShowNewCardModal(true)}
                      addNewLabel="+ Add new credit card"
                    />
                  )}
                </div>

                <div className="flex flex-col justify-center p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-200">
                  <p className="font-semibold text-white mb-0.5">
                    💡 Smart Envelope Budgeting
                  </p>
                  <p className="text-purple-300/90 leading-relaxed">
                    This ₹{form.amount || '0'} will immediately deduct from <span className="font-bold text-white">{form.accountType || 'selected account'}</span> balance. When your credit card bill arrives, you can collect this amount from {form.accountType || 'this account'} and mark the bill settled.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
            <label className="flex items-center gap-2 cursor-pointer group select-none">
              <input
                type="checkbox"
                checked={saveAsTemplate}
                onChange={(e) => setSaveAsTemplate(e.target.checked)}
                className="w-4 h-4 rounded border-white/20 bg-slate-700/50 text-emerald-500 focus:ring-emerald-500/30 focus:ring-offset-0 cursor-pointer"
              />
              <span className="text-xs font-medium text-slate-400 group-hover:text-slate-300 transition-colors">
                <FiRepeat className="inline mr-1" size={12} />
                Save as repeating template
              </span>
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setForm(initialForm);
                  setError("");
                  setSuccess("");
                  setSaveAsTemplate(false);
                }}
                className="rounded-xl px-6 py-2.5 text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-all"
              >
                Clear
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary rounded-xl px-8 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Adding..." : "Add Expense"}
              </button>
            </div>
          </div>
        </form>

        {/* Recent Expenses List */}
        {recentExpenses.length > 0 && (
          <div className="mt-12 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <h2 className="text-xl font-bold font-heading text-white mb-6 px-2">
              Recent Activity
            </h2>
            <div className="glass-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/5 bg-slate-700/40 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                      <th className="px-6 py-4">Date</th>
                      <th className="px-6 py-4">Item</th>
                      <th className="px-6 py-4">Category</th>
                      <th className="px-6 py-4">Account</th>
                      <th className="px-6 py-4">Payment</th>
                      <th className="px-6 py-4 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {recentExpenses.map((expense) => (
                      <tr key={expense.id} className="hover:bg-white/5 transition-colors group">
                        <td className="px-6 py-4 text-sm text-slate-400 whitespace-nowrap">
                          {formatDate(expense.date)}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-white">
                          {expense.item || "Expense"}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {expense.categories ? (
                            <span className="inline-flex items-center rounded-lg bg-slate-700 px-2.5 py-1 text-xs font-medium text-slate-300 border border-white/5 group-hover:border-white/10 transition-colors">
                              {expense.categories.name}
                            </span>
                          ) : (
                            <span className="text-slate-600">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-300">
                          {expense.account_type}
                        </td>
                        <td className="px-6 py-4 text-sm whitespace-nowrap">
                          {expense.paid_via_credit_card ? (
                            <span className="inline-flex items-center gap-1.5 rounded-lg bg-purple-500/15 border border-purple-500/30 px-2.5 py-1 text-xs font-semibold text-purple-300">
                              <FiCreditCard size={12} />
                              {expense.credit_card_name || "Credit Card"}
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-lg bg-slate-700/50 px-2 py-0.5 text-xs text-slate-400">
                              Direct
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-right text-red-400 font-mono">
                          {formatCurrency(expense.amount, currencyStyle)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* New Card Modal */}
        {showNewCardModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="glass-card max-w-md w-full p-6 space-y-5 border border-white/10 shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <FiCreditCard className="text-purple-400" />
                  Add New Credit Card
                </h3>
                <button
                  type="button"
                  onClick={() => setShowNewCardModal(false)}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white"
                >
                  <FiX size={16} />
                </button>
              </div>

              <form onSubmit={handleCreateNewCard} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Card Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., HDFC Millennia, Slice Card"
                    value={newCardForm.name}
                    onChange={(e) => setNewCardForm({ ...newCardForm, name: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-slate-700/50 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-purple-500/40 outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Bank Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., HDFC, ICICI"
                      value={newCardForm.bank_name}
                      onChange={(e) => setNewCardForm({ ...newCardForm, bank_name: e.target.value })}
                      className="w-full rounded-xl border border-white/10 bg-slate-700/50 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-purple-500/40 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Last 4 Digits
                    </label>
                    <input
                      type="text"
                      maxLength={4}
                      placeholder="e.g., 4242"
                      value={newCardForm.card_last4}
                      onChange={(e) => setNewCardForm({ ...newCardForm, card_last4: e.target.value })}
                      className="w-full rounded-xl border border-white/10 bg-slate-700/50 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-purple-500/40 outline-none font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Credit Limit (₹)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g., 100000"
                    value={newCardForm.credit_limit}
                    onChange={(e) => setNewCardForm({ ...newCardForm, credit_limit: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-slate-700/50 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-purple-500/40 outline-none font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Statement Day (1-31)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      value={newCardForm.billing_cycle_day}
                      onChange={(e) => setNewCardForm({ ...newCardForm, billing_cycle_day: e.target.value })}
                      className="w-full rounded-xl border border-white/10 bg-slate-700/50 px-3.5 py-2.5 text-sm text-white focus:ring-2 focus:ring-purple-500/40 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Due Day (1-31)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      value={newCardForm.payment_due_day}
                      onChange={(e) => setNewCardForm({ ...newCardForm, payment_due_day: e.target.value })}
                      className="w-full rounded-xl border border-white/10 bg-slate-700/50 px-3.5 py-2.5 text-sm text-white focus:ring-2 focus:ring-purple-500/40 outline-none"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowNewCardModal(false)}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 text-slate-300 text-sm font-medium hover:bg-white/5"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={cardSaving || !newCardForm.name.trim()}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold shadow-lg shadow-purple-500/20 disabled:opacity-50"
                  >
                    {cardSaving ? "Adding..." : "Save Card"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AddExpense;
