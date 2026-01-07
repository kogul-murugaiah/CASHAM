import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

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

const ACCOUNT_TYPES = [
  { label: "INDIAN", value: "INDIAN" },
  { label: "SBI", value: "SBI" },
  { label: "UNION", value: "UNION" },
  { label: "CASH", value: "CASH" },
];

const formatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

const accountBadge: Record<string, string> = {
  INDIAN: "bg-teal-50 text-teal-700 border-teal-200",
  SBI: "bg-blue-50 text-blue-700 border-blue-200",
  UNION: "bg-purple-50 text-purple-700 border-purple-200",
  CASH: "bg-amber-50 text-amber-700 border-amber-200",
};

const Expenses = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<EditingExpense | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

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

        // Fetch expenses with category join
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
  }, []);

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

      // Refresh expenses list
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
    <div className="min-h-screen bg-slate-50 pb-24 md:pb-0">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Records
            </p>
            <h1 className="text-3xl font-bold text-slate-900">Manage Expenses</h1>
            <p className="text-sm text-slate-500">
              View and update your expenses with inline editing.
            </p>
          </div>
          <div className="flex gap-2 text-xs text-slate-500">
            <span className="rounded-full bg-slate-100 px-3 py-1">
              {expenses.length} records
            </span>
          </div>
        </header>

        {loading && (
          <div className="grid gap-3">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-xl bg-white shadow-sm ring-1 ring-slate-200"
              />
            ))}
          </div>
        )}

        {error && !saving && (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-green-700">
            {success}
          </div>
        )}

        {!loading && (
          <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3">Item</th>
                    <th className="px-6 py-3">Description</th>
                    <th className="px-6 py-3">Category</th>
                    <th className="px-6 py-3">Account</th>
                    <th className="px-6 py-3 text-right">Amount</th>
                    <th className="px-6 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {expenses.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-6 py-10 text-center text-sm text-slate-500"
                      >
                        No expenses found. Add your first expense to get started.
                      </td>
                    </tr>
                  ) : (
                    expenses.map((expense) => (
                      <tr key={expense.id} className="hover:bg-slate-50 transition">
                        <td className="px-6 py-4 text-sm text-slate-700">
                          {new Date(expense.date).toLocaleDateString("en-IN")}
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                          {expense.item}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {expense.description || "-"}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-700">
                          {expense.categories ? (
                            <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                              {expense.categories.name}
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span
                            className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${
                              accountBadge[expense.account_type] ||
                              "border-slate-200 text-slate-700"
                            }`}
                          >
                            {expense.account_type}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-semibold text-red-600">
                          {formatter.format(expense.amount)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => handleEdit(expense)}
                            disabled={editingId !== null}
                            className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Edit
                          </button>
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

      {/* Edit Modal */}
      {isModalOpen && editingData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Edit Expense
                </p>
                <h3 className="text-xl font-semibold text-slate-900">
                  {editingData.item || "Update expense"}
                </h3>
              </div>
              <button
                onClick={handleCancel}
                className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-200"
              >
                Close
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Date</label>
                <input
                  type="date"
                  name="date"
                  value={editingData.date}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Amount (₹)</label>
                <input
                  type="number"
                  name="amount"
                  value={editingData.amount}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  min="0"
                  step="0.01"
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 mt-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Item</label>
                <input
                  type="text"
                  name="item"
                  value={editingData.item}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Description</label>
                <input
                  type="text"
                  name="description"
                  value={editingData.description}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 mt-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Category</label>
                <select
                  name="category_id"
                  value={editingData.category_id}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  <option value="">No Category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Account Type</label>
                <select
                  name="account_type"
                  value={editingData.account_type}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  {ACCOUNT_TYPES.map((acc) => (
                    <option key={acc.value} value={acc.value}>
                      {acc.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {error && (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={handleCancel}
                disabled={saving}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSave(editingId!)}
                disabled={saving}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Expenses;
