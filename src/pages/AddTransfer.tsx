import { useState, useEffect, type FormEvent } from "react";
import { api } from "../lib/api";
import { useAccountTypes } from "../hooks/useAccountTypes";
import { CustomDropdown } from "../components/CustomDropdown";
import { FiArrowRight, FiTrash2 } from "react-icons/fi";

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const initialForm = {
  from_account: "",
  to_account: "",
  amount: "",
  date: new Date().toISOString().slice(0, 10),
  note: "",
};

const AddTransfer = () => {
  const { accountTypes } = useAccountTypes();
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [recentTransfers, setRecentTransfers] = useState<any[]>([]);

  const fetchTransfers = async () => {
    try {
      const data = await api.get("/api/transfers");
      setRecentTransfers((data || []).slice(0, 8));
    } catch (err) {
      console.error("Failed to fetch transfers:", err);
    }
  };

  useEffect(() => { fetchTransfers(); }, []);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!form.from_account || !form.to_account) {
      setError("Please select both accounts");
      return;
    }
    if (form.from_account === form.to_account) {
      setError("From and To accounts must be different");
      return;
    }
    if (!form.amount || Number(form.amount) <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    setLoading(true);
    try {
      await api.post("/api/transfers", {
        from_account: form.from_account,
        to_account: form.to_account,
        amount: Number(form.amount),
        date: form.date,
        note: form.note || null,
      });
      setSuccess(`Transferred ${currencyFormatter.format(Number(form.amount))} from ${form.from_account} → ${form.to_account}`);
      setForm({ ...initialForm, date: new Date().toISOString().slice(0, 10) });
      fetchTransfers();
    } catch (err: any) {
      setError(err.message || "Transfer failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this transfer?")) return;
    try {
      await api.delete(`/api/transfers?id=${id}`);
      setRecentTransfers(prev => prev.filter(t => t.id !== id));
    } catch (err: any) {
      setError(err.message || "Failed to delete");
    }
  };

  const accountOptions = accountTypes.map(t => ({ value: t, label: t }));

  return (
    <div className="pb-24 pt-8 md:pb-8">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <header className="mb-8 animate-fade-in text-center">
          <div className="inline-flex items-center justify-center p-3 bg-blue-500/10 rounded-2xl mb-4">
            <FiArrowRight className="text-blue-400" size={24} strokeWidth={2.5} />
          </div>
          <h1 className="text-3xl font-bold font-heading text-white mb-2">Transfer Funds</h1>
          <p className="text-slate-400">Move money between your accounts without affecting income or expenses.</p>
        </header>

        {error && (
          <div className="mb-6 glass-card border-red-500/20 bg-red-500/10 p-4 text-red-300 text-sm text-center">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-6 glass-card border-emerald-500/20 bg-emerald-500/10 p-4 text-emerald-300 text-sm text-center font-medium">
            ✓ {success}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="glass-card p-6 sm:p-8 space-y-6 animate-fade-in relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

          {/* From → To Accounts */}
          <div className="grid gap-4 sm:grid-cols-[1fr_auto_1fr] items-end relative z-10">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-300">From Account</label>
              <CustomDropdown
                value={form.from_account}
                onChange={(value) => setForm(prev => ({ ...prev, from_account: value }))}
                options={accountOptions}
                placeholder="Select account"
                disabled={loading}
              />
            </div>

            <div className="flex items-center justify-center pb-1">
              <div className="flex items-center gap-1 px-3 py-2 bg-blue-500/10 rounded-xl border border-blue-500/20">
                <FiArrowRight className="text-blue-400" size={18} />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-300">To Account</label>
              <CustomDropdown
                value={form.to_account}
                onChange={(value) => setForm(prev => ({ ...prev, to_account: value }))}
                options={accountOptions.filter(o => o.value !== form.from_account)}
                placeholder="Select account"
                disabled={loading}
              />
            </div>
          </div>

          {/* Amount & Date */}
          <div className="grid gap-6 sm:grid-cols-2 relative z-10">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-300">Amount</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                  <span className="text-slate-400">₹</span>
                </div>
                <input
                  type="number"
                  value={form.amount}
                  onChange={e => setForm(prev => ({ ...prev, amount: e.target.value }))}
                  className="block w-full rounded-xl border border-white/10 bg-slate-700/50 backdrop-blur pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                  placeholder="0"
                  step="1"
                  min="1"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-300">Date</label>
              <input
                type="date"
                value={form.date}
                onChange={e => setForm(prev => ({ ...prev, date: e.target.value }))}
                className="block w-full rounded-xl border border-white/10 bg-slate-700/50 backdrop-blur px-4 py-3 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none cursor-pointer"
                required
              />
            </div>
          </div>

          {/* Note */}
          <div className="space-y-2 relative z-10">
            <label className="block text-sm font-medium text-slate-300">Note (Optional)</label>
            <input
              type="text"
              value={form.note}
              onChange={e => setForm(prev => ({ ...prev, note: e.target.value }))}
              className="block w-full rounded-xl border border-white/10 bg-slate-700/50 backdrop-blur px-4 py-3 text-white placeholder-slate-500 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
              placeholder="e.g., Wallet top-up, EMI payment from savings..."
            />
          </div>

          {/* Actions */}
          <div className="pt-4 flex justify-end gap-3 relative z-10">
            <button
              type="button"
              onClick={() => { setForm(initialForm); setError(""); setSuccess(""); }}
              className="rounded-xl px-6 py-2.5 text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-all"
            >
              Clear
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 rounded-xl px-8 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-blue-500 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Transferring..." : (
                <><FiArrowRight size={16} /> Transfer Funds</>
              )}
            </button>
          </div>
        </form>

        {/* Transfer History */}
        {recentTransfers.length > 0 && (
          <div className="mt-12 animate-fade-in">
            <h2 className="text-xl font-bold font-heading text-white mb-6 px-2">Transfer History</h2>
            <div className="glass-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/5 bg-slate-700/40 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                      <th className="px-6 py-4">Date</th>
                      <th className="px-6 py-4">From</th>
                      <th className="px-6 py-4"></th>
                      <th className="px-6 py-4">To</th>
                      <th className="px-6 py-4">Note</th>
                      <th className="px-6 py-4 text-right">Amount</th>
                      <th className="px-6 py-4"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {recentTransfers.map((t) => (
                      <tr key={t.id} className="hover:bg-white/5 transition-colors group">
                        <td className="px-6 py-4 text-sm text-slate-400 whitespace-nowrap">
                          {new Date(t.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-medium text-slate-200 bg-slate-700/50 px-2.5 py-1 rounded-lg border border-white/5">
                            {t.from_account}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-blue-400">
                          <FiArrowRight size={16} />
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-medium text-slate-200 bg-blue-500/10 px-2.5 py-1 rounded-lg border border-blue-500/20">
                            {t.to_account}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500 truncate max-w-[150px]">
                          {t.note || "—"}
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-right text-blue-400 font-mono">
                          {currencyFormatter.format(t.amount)}
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleDelete(t.id)}
                            className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all p-1"
                          >
                            <FiTrash2 size={14} />
                          </button>
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

export default AddTransfer;
