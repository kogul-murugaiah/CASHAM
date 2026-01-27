import { useState, type FormEvent } from "react";
import { supabase } from "../lib/supabaseClient";
import { useIncomeSources } from "../hooks/useIncomeSources";
import { useAccountTypes } from "../hooks/useAccountTypes";
import { CustomDropdown } from "../components/CustomDropdown";
// import Footer from "../components/Footer";

const initialForm = {
  amount: "",
  date: "",
  source: "",
  accountType: "",
  description: "",
};

const AddIncome = () => {
  const { accountTypes, addAccountType } = useAccountTypes();
  const { sources, addSource } = useIncomeSources();
  const [form, setForm] = useState(() => {
    const today = new Date().toISOString().slice(0, 10);
    return {
      ...initialForm,
      date: today,
      accountType: accountTypes[0] || "", // Use first account type from hook
      source: sources.length > 0 ? sources[0].id : "", // Use first source ID if available
    };
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddSource = async (name: string) => {
    try {
      await addSource(name);
    } catch (err: any) {
      throw err;
    }
  };

  const handleAddAccountType = async (name: string) => {
    try {
      await addAccountType(name);
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

    if (!form.source) {
      setError("Please select a source");
      return;
    }

    setLoading(true);

    try {
      // Validate account_type exists in user's account types
      if (!accountTypes.includes(form.accountType)) {
        setError(`Invalid account type. Please select from: ${accountTypes.join(', ')}`);
        return;
      }

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("You must be logged in to add income");
      }

      // Insert income with user_id
      const { error } = await supabase.from("income").insert({
        amount: Number(form.amount),
        date: form.date,
        source: sources.find(s => s.id === form.source)?.name || "Unknown",
        source_id: form.source,
        account_type: form.accountType,
        description: form.description.trim() || null,
        user_id: user.id,
      });

      if (error) throw error;

      setSuccess("Income added successfully");
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
    <div className="pb-24 pt-8 md:pb-8">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <header className="mb-8 animate-fade-in text-center">
          <div className="inline-flex items-center justify-center p-3 bg-emerald-500/10 rounded-2xl mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500"><rect width="20" height="12" x="2" y="6" rx="2" /><circle cx="12" cy="12" r="2" /><path d="M6 12h.01M18 12h.01" /></svg>
          </div>
          <h1 className="text-3xl font-bold font-heading text-white mb-2">
            Record Income
          </h1>
          <p className="text-slate-400">
            Log your earnings to keep your balance updated.
          </p>
        </header>

        {error && (
          <div className="mb-6 glass-card border-red-500/20 bg-red-500/10 p-4 text-red-300 text-sm text-center">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 glass-card border-emerald-500/20 bg-emerald-500/10 p-4 text-emerald-300 text-sm text-center">
            {success}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="glass-card p-6 sm:p-8 space-y-6 animate-fade-in relative overflow-hidden"
        >
          {/* Subtle glow effect */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

          <div className="grid gap-6 sm:grid-cols-2 relative z-10">
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
                  className="block w-full rounded-xl border border-white/10 bg-slate-900/50 backdrop-blur pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none"
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
                className="block w-full rounded-xl border border-white/10 bg-slate-900/50 backdrop-blur px-4 py-3 text-white focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none cursor-pointer"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="source" className="block text-sm font-medium text-slate-300">
                Source
              </label>
              <CustomDropdown
                value={form.source}
                onChange={(value) => setForm(prev => ({ ...prev, source: value }))}
                options={sources.map(source => ({ value: source.id, label: source.name }))}
                placeholder="Select source"
                onAddNew={handleAddSource}
                addNewLabel="+ Add new source"
                disabled={loading}
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
                onAddNew={handleAddAccountType}
                addNewLabel="+ Add new account type"
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-2 relative z-10">
            <label htmlFor="description" className="block text-sm font-medium text-slate-300">
              Description (Optional)
            </label>
            <textarea
              name="description"
              id="description"
              value={form.description}
              onChange={handleChange}
              maxLength={300}
              rows={3}
              className="block w-full rounded-xl border border-white/10 bg-slate-900/50 backdrop-blur px-4 py-3 text-white placeholder-slate-500 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none resize-none"
              placeholder="Details..."
            />
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
              className="btn-primary rounded-xl px-8 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/25 disabled:opacity-50 disabled:cursor-not-allowed bg-emerald-600 hover:bg-emerald-500"
            >
              {loading ? "Adding..." : "Add Income"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddIncome;
