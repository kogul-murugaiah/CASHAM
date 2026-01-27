import { useState, useEffect, type FormEvent } from "react";
import { supabase } from "../lib/supabaseClient";
import { useExpenseCategories } from "../hooks/useExpenseCategories";
import { useAccountTypes } from "../hooks/useAccountTypes";
import { CustomDropdown } from "../components/CustomDropdown";
// import Footer from "../components/Footer"; // Removed Footer to match app-like layout

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

  // Fetch recent expenses
  const fetchRecentExpenses = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("expenses")
        .select(`
          id,
          created_at,
          date,
          item,
          amount,
          categories (
            id,
            name
          )
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      setRecentExpenses(data || []);
    } catch (err: any) {
      console.error("Error fetching recent expenses:", err);
    }
  };

  useEffect(() => {
    fetchRecentExpenses();
  }, []);

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
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("You must be logged in to add expenses");
      }

      // Insert expense with user_id
      const { error } = await supabase.from("expenses").insert({
        amount: Number(form.amount),
        date: form.date,
        item: form.item || null,
        description: form.description || null,
        category_id: form.category_id,
        account_type: form.accountType,
        user_id: user.id,
      });

      if (error) throw error;

      setSuccess("Expense added successfully");
      setForm({
        ...initialForm,
        date: new Date().toISOString().slice(0, 10), // Reset to today's date
      });
      fetchRecentExpenses(); // Refresh recent list
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
            <span className="text-2xl">💸</span>
          </div>
          <h1 className="text-3xl font-bold font-heading text-white mb-2">
            Add Expense
          </h1>
          <p className="text-slate-400">
            Record a new spending to track your budget.
          </p>
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
                className="block w-full rounded-xl border border-white/10 bg-slate-900/50 backdrop-blur px-4 py-3 text-white placeholder-slate-500 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
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
                  <span className="text-slate-400">₹</span>
                </div>
                <input
                  type="number"
                  name="amount"
                  id="amount"
                  value={form.amount}
                  onChange={handleChange}
                  className="block w-full rounded-xl border border-white/10 bg-slate-900/50 backdrop-blur pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
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
                className="block w-full rounded-xl border border-white/10 bg-slate-900/50 backdrop-blur px-4 py-3 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none cursor-pointer"
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
                className="block w-full rounded-xl border border-white/10 bg-slate-900/50 backdrop-blur px-4 py-3 text-white placeholder-slate-500 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                placeholder="Details..."
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3 relative z-10">
            <button
              type="button"
              onClick={() => {
                setForm(initialForm);
                setError("");
                setSuccess("");
              }}
              className="rounded-xl px-6 py-2.5 text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-all"
            >
              Clear
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary rounded-xl px-8 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Adding..." : "Add Expense"}
            </button>
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
                    <tr className="border-b border-white/5 bg-slate-900/40 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                      <th className="px-6 py-4">Date</th>
                      <th className="px-6 py-4">Item</th>
                      <th className="px-6 py-4">Category</th>
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
                            <span className="inline-flex items-center rounded-lg bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-300 border border-white/5 group-hover:border-white/10 transition-colors">
                              {expense.categories.name}
                            </span>
                          ) : (
                            <span className="text-slate-600">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-right text-red-400 font-mono">
                          -₹{expense.amount.toFixed(2)}
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
