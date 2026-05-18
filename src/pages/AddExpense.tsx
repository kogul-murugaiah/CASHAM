import { useState, useEffect, useRef, type FormEvent } from "react";
import { api } from "../lib/api";
import { useExpenseCategories } from "../hooks/useExpenseCategories";
import { useAccountTypes } from "../hooks/useAccountTypes";
import { useUserPreferences } from "../hooks/useUserPreferences";
import { formatCurrency } from "../lib/formatters";
import { CustomDropdown } from "../components/CustomDropdown";
import { FiRepeat, FiTrash2, FiX } from "react-icons/fi";

type ExpenseTemplate = {
  id: string;
  amount: number;
  item: string;
  description: string | null;
  category_id: string | null;
  account_type: string;
  categories: { id: string; name: string } | null;
};



const initialForm = {
  amount: "",
  date: "",
  item: "",
  description: "",
  category_id: "",
  accountType: "",
};

const AddExpense = () => {
  const { accountTypes } = useAccountTypes();
  const { categories, loading: categoriesLoading, addCategory } = useExpenseCategories();
  const { currencyStyle } = useUserPreferences();
  const [form, setForm] = useState(() => {
    const today = new Date().toISOString().slice(0, 10);
    return {
      ...initialForm,
      date: today,
      accountType: accountTypes[0] || "", // Use first account type from hook
      category_id: categories.length > 0 ? categories[0].id.toString() : "", // Use first category ID if available
    };
  });
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

  // Fetch recent expenses
  const fetchRecentExpenses = async () => {
    try {
      const data = await api.get('/api/expenses');
      const todayStr = new Date().toISOString().slice(0, 10);
      const todayTotal = (data || []).filter((exp: any) => exp.date.startsWith(todayStr)).reduce((sum: number, exp: any) => sum + exp.amount, 0);
      setTodayExpenses(todayTotal);
      setRecentExpenses(data?.slice(0, 5) || []);
    } catch (err: any) {
      console.error("Error fetching recent expenses:", err);
    }
  };

  const fetchTemplates = async () => {
    try {
      const data = await api.get('/api/expenses?templates=true');
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
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFillFromTemplate = (t: ExpenseTemplate) => {
    setForm({
      amount: t.amount.toString(),
      date: new Date().toISOString().slice(0, 10),
      item: t.item,
      description: t.description || "",
      category_id: t.category_id || "",
      accountType: t.account_type,
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
      setTemplates(prev => prev.filter(t => t.id !== id));
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
    try {
      await addCategory(name);
    } catch (err: any) {
      throw err;
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

    if (!form.category_id) {
      setError("Please select a category");
      return;
    }

    setLoading(true);

    try {
      await api.post('/api/expenses', {
        amount: Number(form.amount),
        date: form.date,
        item: form.item || null,
        description: form.description || null,
        category_id: form.category_id,
        account_type: form.accountType,
      });

      // Save as template if checkbox is checked
      if (saveAsTemplate) {
        try {
          await api.post('/api/expenses?template=true', {
            amount: Number(form.amount),
            item: form.item,
            description: form.description || null,
            category_id: form.category_id || null,
            account_type: form.accountType,
          });
          fetchTemplates();
        } catch { /* template save is best-effort */ }
      }

      setSuccess(saveAsTemplate ? "Expense added & saved as template!" : "Expense added successfully");
      setSaveAsTemplate(false);
      setForm({
        ...initialForm,
        date: new Date().toISOString().slice(0, 10),
      });
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
            Record a new spending to track your budget.
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
                            <p className="text-sm font-semibold text-white truncate">{t.item}</p>
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
                placeholder="e.g., Groceries"
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
              <label htmlFor="accountType" className="block text-sm font-medium text-slate-300">
                Account Type
              </label>
              <CustomDropdown
                value={form.accountType}
                onChange={(value) => setForm(prev => ({ ...prev, accountType: value }))}
                options={accountTypes.map(type => ({ value: type, label: type }))}
                placeholder="Select account"
                disabled={loading}
              // Need to pass darker style props if CustomDropdown supports or styling CustomDropdown separately
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
                onChange={(value) => setForm(prev => ({ ...prev, category_id: value }))}
                options={categories.map(cat => ({ value: cat.id.toString(), label: cat.name }))}
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
                placeholder="Details..."
              />
            </div>
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
                Save as template
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
                      <th className="px-6 py-4">Description</th>
                      <th className="px-6 py-4 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {recentExpenses.map((expense) => (
                      <tr key={expense.id} className="hover:bg-white/5 transition-colors group">
                        <td className="px-6 py-4 text-sm text-slate-400 whitespace-nowrap">
                          {new Date(expense.date).toLocaleDateString()}
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
                        <td className="px-6 py-4 text-sm text-slate-500 truncate max-w-[150px]" title={expense.description || ""}>
                          {expense.description || "-"}
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
      </div>
    </div>
  );
};

export default AddExpense;
