import { useState, type FormEvent } from "react";
import { supabase } from "../lib/supabaseClient";
import { useExpenseCategories } from "../hooks/useExpenseCategories";
import { useAccountTypes } from "../hooks/useAccountTypes";
import { CustomDropdown } from "../components/CustomDropdown";
import Footer from "../components/Footer";

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
  const [form, setForm] = useState(() => {
    const today = new Date().toISOString().slice(0, 10);
    return {
      ...initialForm,
      date: today,
      accountType: accountTypes[0], // Use first account type from hook
    };
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const { categories, loading: categoriesLoading, addCategory } = useExpenseCategories();

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
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="min-h-screen bg-slate-900 pb-24 md:pb-0">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            New Record
          </p>
          <h1 className="text-3xl font-bold text-slate-100">Enter Expense</h1>
          <p className="text-sm text-slate-400">
            Fill in the details below to record a new expense.
          </p>
        </header>

        {error && (
          <div className="mb-4 rounded-2xl border border-red-600/30 bg-red-900/50 px-4 py-3 text-red-300">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 rounded-2xl border border-green-600/30 bg-green-900/50 px-4 py-3 text-green-300">
            {success}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl bg-slate-800 p-6 shadow-sm ring-1 ring-slate-700 space-y-6"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label
                htmlFor="item"
                className="block text-sm font-medium leading-6 text-slate-200"
              >
                Item Name
              </label>
              <div className="mt-2">
                <input
                  type="text"
                  name="item"
                  id="item"
                  value={form.item}
                  onChange={handleChange}
                  className="block w-full rounded-xl border-0 bg-slate-700/50 px-4 py-3 text-slate-200 shadow-sm ring-1 ring-inset ring-slate-700 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                  placeholder="e.g., Groceries, Dinner, Rent"
                  required
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="amount"
                className="block text-sm font-medium leading-6 text-slate-200"
              >
                Amount
              </label>
              <div className="relative mt-2 rounded-xl shadow-sm">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                  <span className="text-slate-400 sm:text-sm">₹</span>
                </div>
                <input
                  type="number"
                  name="amount"
                  id="amount"
                  value={form.amount}
                  onChange={handleChange}
                  className="block w-full rounded-xl border-0 bg-slate-700/50 py-3 pl-10 text-slate-200 ring-1 ring-inset ring-slate-700 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                  placeholder="0.00"
                  step="0.01"
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 mt-3">
              <div className="space-y-1.5">
                <label
                  htmlFor="date"
                  className="block text-sm font-medium leading-6 text-slate-200"
                >
                  Date
                </label>
                <div className="mt-2">
                  <input
                    type="date"
                    name="date"
                    id="date"
                    value={form.date}
                    onChange={handleChange}
                    className="block w-full rounded-xl border-0 bg-slate-700/50 px-4 py-3 text-slate-200 shadow-sm ring-1 ring-inset ring-slate-700 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                    required
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label
                  htmlFor="accountType"
                  className="block text-sm font-medium leading-6 text-slate-200"
                >
                  Account Type
                </label>
                <div className="mt-2">
                  <CustomDropdown
                    value={form.accountType}
                    onChange={(value) => setForm(prev => ({ ...prev, accountType: value }))}
                    options={accountTypes.map(type => ({ value: type, label: type }))}
                    placeholder="Select account type"
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            <div className="mt-3">
              <div className="space-y-1.5">
                <label
                  htmlFor="category_id"
                  className="block text-sm font-medium leading-6 text-slate-200"
                >
                  Category
                </label>
                <div className="mt-2">
                  <CustomDropdown
                    value={form.category_id}
                    onChange={(value) => setForm(prev => ({ ...prev, category_id: value }))}
                    options={categories.map(cat => ({ value: cat.id, label: cat.name }))}
                    placeholder="Select a category"
                    onAddNew={handleAddCategory}
                    addNewLabel="+ Add new category"
                    disabled={categoriesLoading}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label
                  htmlFor="description"
                  className="block text-sm font-medium leading-6 text-slate-200"
                >
                  Description
                </label>
                <div className="mt-2">
                  <input
                    type="text"
                    name="description"
                    id="description"
                    value={form.description}
                    onChange={handleChange}
                    className="block w-full rounded-xl border-0 bg-slate-700/50 px-4 py-3 text-slate-200 shadow-sm ring-1 ring-inset ring-slate-700 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                    placeholder="Optional details about this expense"
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="mt-3 rounded-lg border border-red-600/30 bg-red-900/50 px-3 py-2 text-sm text-red-300">
                {error}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setForm(initialForm);
                  setError("");
                  setSuccess("");
                }}
                className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-700/50"
              >
                Clear
              </button>
              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Saving..." : "Save Expense"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
    <Footer />
    </>
  );
};

export default AddExpense;
