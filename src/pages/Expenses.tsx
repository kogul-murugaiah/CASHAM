import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAccountTypes } from "../hooks/useAccountTypes";
// import Footer from "../components/Footer";

type Category = {
  id: number;
  name: string;
};

type Expense = {
  id: string;
  date: string;
  item: string;
  description: string | null;
  category_id: number | null;
  amount: number;
  account_type: string;
  categories: Category | null;
};

type EditingExpense = {
  id: string;
  date: string;
  item: string;
  description: string;
  category_id: string;
  account_type: string;
  amount: string;
};

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const Expenses = () => {
  const { accountTypes } = useAccountTypes();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<EditingExpense | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  // Fetch expenses and categories
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch categories
        const { data: categoriesData, error: categoriesError } = await supabase
          .from("categories")
          .select("*")
          .order("name");

        if (categoriesError) throw categoriesError;
        setCategories(categoriesData || []);

        // Calculate date range for selected month
        const [year, month] = selectedMonth.split('-');
        const firstDay = `${selectedMonth}-01`;
        const lastDay = new Date(parseInt(year), parseInt(month), 0).toISOString().slice(0, 10);

        // Fetch expenses with category join and month filter
        const { data: expensesData, error: expensesError } = await supabase
          .from("expenses")
          .select(
            `
            id,
            date,
            item,
            description,
            category_id,
            amount,
            account_type,
            categories (
              id,
              name
            )
          `
          )
          .gte("date", firstDay)
          .lte("date", lastDay)
          .order("date", { ascending: false });

        if (expensesError) throw expensesError;

        const typedData = (expensesData || []).map((exp: any) => ({
          ...exp,
          categories: Array.isArray(exp.categories)
            ? exp.categories[0] || null
            : exp.categories || null,
        })) as Expense[];

        setExpenses(typedData);
      } catch (err: any) {
        setError(err.message || "Failed to fetch data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedMonth]);

  const handleEdit = (expense: Expense) => {
    setEditingId(expense.id);
    setEditingData({
      id: expense.id,
      date: expense.date,
      item: expense.item,
      description: expense.description || "",
      category_id: expense.category_id?.toString() || "",
      account_type: expense.account_type,
      amount: expense.amount.toString(),
    });
    setSuccess(null);
    setError(null);
    setIsModalOpen(true);
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditingData(null);
    setIsModalOpen(false);
    setError(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this expense?")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("expenses")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setSuccess("Expense deleted successfully");

      // Refresh expenses list
      // For simplicity, just refetching or filtering locally could work, but let's just refetch to be safe/consistent with previous implementation
      // Or cleaner: filter out the deleted ID locally
      setExpenses(prev => prev.filter(e => e.id !== id));

    } catch (err: any) {
      setError(err.message || "Failed to delete expense");
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    if (!editingData) return;

    const { name, value } = e.target;
    setEditingData((prev) => (prev ? { ...prev, [name]: value } : null));
  };

  const handleSave = async (id: string) => {
    if (!editingData) return;

    // Validation
    if (!editingData.item.trim()) {
      setError("Item is required");
      return;
    }

    if (!editingData.amount || Number(editingData.amount) <= 0) {
      setError("Amount must be greater than 0");
      return;
    }

    if (!editingData.date) {
      setError("Date is required");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const updateData: any = {
        date: editingData.date,
        item: editingData.item.trim(),
        description: editingData.description.trim() || null,
        amount: Number(editingData.amount),
        account_type: editingData.account_type,
      };

      if (editingData.category_id) {
        updateData.category_id = Number(editingData.category_id);
      } else {
        updateData.category_id = null;
      }

      const { error } = await supabase
        .from("expenses")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;

      // Refresh expenses list - full fetch to get category names properly
      const [year, month] = selectedMonth.split('-');
      const firstDay = `${selectedMonth}-01`;
      const lastDay = new Date(parseInt(year), parseInt(month), 0).toISOString().slice(0, 10);

      const { data: expensesData, error: expensesError } = await supabase
        .from("expenses")
        .select(
          `
          id,
          date,
          item,
          description,
          category_id,
          amount,
          account_type,
          categories (
            name
          )
        `
        )
        .gte("date", firstDay)
        .lte("date", lastDay)
        .order("date", { ascending: false });

      if (expensesError) throw expensesError;

      const typedData = (expensesData || []).map((exp: any) => ({
        ...exp,
        categories: Array.isArray(exp.categories)
          ? exp.categories[0] || null
          : exp.categories || null,
      })) as Expense[];

      setExpenses(typedData);
      setSuccess("Expense updated successfully");
      setEditingId(null);
      setEditingData(null);
      setIsModalOpen(false);
    } catch (err: any) {
      setError(err.message || "Failed to update expense");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pb-24 pt-8 md:pb-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between animate-fade-in">
          <div>
            <h1 className="text-3xl font-bold font-heading text-white mb-2">
              Edit Expenses
            </h1>
            <p className="text-slate-400">
              Manage and update your spending history.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full sm:w-auto rounded-xl border border-white/10 bg-slate-900/50 backdrop-blur px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer"
            />
            <span className="rounded-xl bg-white/5 px-4 py-2 text-sm font-medium text-slate-300 border border-white/10">
              {expenses.length} records
            </span>
          </div>
        </header>

        {loading && (
          <div className="grid gap-3 animate-pulse">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="h-16 rounded-xl bg-slate-800/50"
              />
            ))}
          </div>
        )}

        {error && !saving && (
          <div className="mb-6 glass-card border-red-500/20 bg-red-500/10 p-4 text-red-300 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 glass-card border-green-500/20 bg-green-500/10 p-4 text-green-300 text-sm">
            {success}
          </div>
        )}

        {!loading && (
          <div className="glass-card overflow-hidden animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5 bg-slate-900/40 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Item</th>
                    <th className="px-6 py-4">Description</th>
                    <th className="px-6 py-4">Category</th>
                    <th className="px-6 py-4">Account</th>
                    <th className="px-6 py-4 text-right">Amount</th>
                    <th className="px-6 py-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {expenses.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-6 py-12 text-center text-slate-500"
                      >
                        No expenses found for this month.
                      </td>
                    </tr>
                  ) : (
                    expenses.map((expense) => (
                      <tr key={expense.id} className="hover:bg-white/5 transition-colors group">
                        <td className="px-6 py-4 text-sm text-slate-400 whitespace-nowrap">
                          {new Date(expense.date).toLocaleDateString("en-IN", { day: '2-digit', month: 'short' })}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-white">
                          {expense.item}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500 max-w-xs truncate">
                          {expense.description || "-"}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {expense.categories ? (
                            <span className="inline-flex items-center rounded-lg bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-300 border border-white/5 group-hover:border-white/10 transition-colors">
                              {expense.categories.name}
                            </span>
                          ) : (
                            <span className="text-slate-600">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span
                            className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-semibold bg-opacity-10 ${expense.account_type === "INDIAN"
                                ? "bg-teal-500 text-teal-300 border-teal-500/20"
                                : expense.account_type === "SBI"
                                  ? "bg-blue-500 text-blue-300 border-blue-500/20"
                                  : expense.account_type === "UNION"
                                    ? "bg-purple-500 text-purple-300 border-purple-500/20"
                                    : expense.account_type === "CASH"
                                      ? "bg-amber-500 text-amber-300 border-amber-500/20"
                                      : "bg-slate-500 text-slate-300 border-slate-500/20"
                              }`}
                          >
                            {expense.account_type}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-bold text-red-400 font-mono">
                          {currencyFormatter.format(expense.amount)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleEdit(expense)}
                              className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white transition-all"
                              title="Edit"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                            </button>
                            <button
                              onClick={() => handleDelete(expense.id)}
                              className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all"
                              title="Delete"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal - Glass UI */}
      {isModalOpen && editingData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm px-4 animate-fade-in">
          <div className="w-full max-w-2xl glass-card p-6 sm:p-8 animate-float-slow transform transition-all shadow-2xl shadow-black/50">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-widest text-blue-400 mb-1 font-bold">
                  Editing Record
                </p>
                <h3 className="text-2xl font-bold text-white font-heading">
                  {editingData.item || "Update expense"}
                </h3>
              </div>
              <button
                onClick={handleCancel}
                className="rounded-full p-2 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Date</label>
                  <input
                    type="date"
                    name="date"
                    value={editingData.date}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-white/10 bg-slate-900/50 backdrop-blur px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Amount (₹)</label>
                  <input
                    type="number"
                    name="amount"
                    value={editingData.amount}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-white/10 bg-slate-900/50 backdrop-blur px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Item</label>
                  <input
                    type="text"
                    name="item"
                    value={editingData.item}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-white/10 bg-slate-900/50 backdrop-blur px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Description</label>
                  <input
                    type="text"
                    name="description"
                    value={editingData.description}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-white/10 bg-slate-900/50 backdrop-blur px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Category</label>
                  <select
                    name="category_id"
                    value={editingData.category_id}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-white/10 bg-slate-900/50 backdrop-blur px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none cursor-pointer"
                  >
                    <option value="" className="bg-slate-900 text-slate-400">No Category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id} className="bg-slate-900">
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Account Type</label>
                  <select
                    name="account_type"
                    value={editingData.account_type}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-white/10 bg-slate-900/50 backdrop-blur px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none cursor-pointer"
                  >
                    {accountTypes.map((accountType) => (
                      <option key={accountType} value={accountType} className="bg-slate-900">
                        {accountType}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {error && (
                <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-300">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                <button
                  onClick={handleCancel}
                  disabled={saving}
                  className="rounded-xl px-6 py-2.5 text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleSave(editingId!)}
                  disabled={saving}
                  className="btn-primary rounded-xl px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-500/20 disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Expenses;
