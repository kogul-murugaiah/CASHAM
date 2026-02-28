import { useState, useEffect, type FormEvent } from "react";
import { api } from "../lib/api";
import { useAccountTypes } from "../hooks/useAccountTypes";

const INVESTMENT_TYPES = ["Stock", "Mutual Fund", "Crypto", "Gold", "FD", "Other"];

const initialForm = {
    name: "",
    type: "Stock",
    action: "buy" as "buy" | "sell",
    units: "",
    price_per_unit: "",
    amount: "",
    date: new Date().toISOString().slice(0, 10),
    accountType: "",
    description: "",
};



const AddInvestment = () => {
    const { accountTypes } = useAccountTypes();
    const [form, setForm] = useState(initialForm);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [recentInvestments, setRecentInvestments] = useState<any[]>([]);

    const fetchRecent = async () => {
        try {
            const data = await api.get("/api/investments");
            setRecentInvestments((data || []).slice(0, 5));
        } catch (err) {
            console.error("Failed to fetch recent investments", err);
        }
    };

    useEffect(() => {
        fetchRecent();
    }, []);

    // Auto-calculate amount when units × price change
    useEffect(() => {
        const u = parseFloat(form.units);
        const p = parseFloat(form.price_per_unit);
        if (!isNaN(u) && !isNaN(p) && u > 0 && p > 0) {
            setForm((prev) => ({ ...prev, amount: (u * p).toFixed(2) }));
        }
    }, [form.units, form.price_per_unit]);

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        if (!form.name || !form.amount || !form.date) {
            setError("Name, Amount, and Date are required");
            return;
        }
        if (Number(form.amount) <= 0) {
            setError("Amount must be greater than 0");
            return;
        }

        setLoading(true);
        try {
            await api.post("/api/investments", {
                name: form.name,
                type: form.type,
                action: form.action,
                units: form.units ? Number(form.units) : null,
                price_per_unit: form.price_per_unit ? Number(form.price_per_unit) : null,
                amount: Number(form.amount),
                account_type: form.accountType || null,
                date: form.date,
                description: form.description || null,
            });

            setSuccess(`Investment ${form.action === "buy" ? "bought" : "sold"} successfully!`);
            setForm({ ...initialForm, date: new Date().toISOString().slice(0, 10) });
            fetchRecent();
        } catch (err: any) {
            setError(err.message || "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="pb-24 pt-8 md:pb-8">
            <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <header className="mb-8 animate-fade-in text-center">
                    <div className="inline-flex items-center justify-center p-3 bg-amber-500/10 rounded-2xl mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500">
                            <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                            <polyline points="16 7 22 7 22 13" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold font-heading text-white mb-2">Log Investment</h1>
                    <p className="text-slate-400">Track your buy and sell transactions.</p>
                </header>

                {error && (
                    <div className="mb-6 glass-card border-red-500/20 bg-red-500/10 p-4 text-red-300 text-sm text-center">{error}</div>
                )}
                {success && (
                    <div className="mb-6 glass-card border-green-500/20 bg-green-500/10 p-4 text-green-300 text-sm text-center font-semibold">{success}</div>
                )}

                <form onSubmit={handleSubmit} className="glass-card p-6 sm:p-8 space-y-6 animate-fade-in relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />

                    {/* Action Toggle */}
                    <div className="flex p-1 bg-slate-900/50 rounded-xl border border-white/5 max-w-xs relative z-10">
                        <button
                            type="button"
                            onClick={() => setForm((p) => ({ ...p, action: "buy" }))}
                            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${form.action === "buy" ? "bg-amber-500 text-white shadow-lg shadow-amber-500/25" : "text-slate-400 hover:text-white"}`}
                        >
                            📈 Buy
                        </button>
                        <button
                            type="button"
                            onClick={() => setForm((p) => ({ ...p, action: "sell" }))}
                            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${form.action === "sell" ? "bg-blue-500 text-white shadow-lg shadow-blue-500/25" : "text-slate-400 hover:text-white"}`}
                        >
                            📉 Sell
                        </button>
                    </div>

                    <div className="grid gap-6 sm:grid-cols-2 relative z-10">
                        {/* Name */}
                        <div className="space-y-2">
                            <label htmlFor="name" className="block text-sm font-medium text-slate-300">Investment Name</label>
                            <input
                                type="text" name="name" id="name" value={form.name} onChange={handleChange}
                                className="block w-full rounded-xl border border-white/10 bg-slate-900/50 backdrop-blur px-4 py-3 text-white placeholder-slate-500 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 transition-all outline-none"
                                placeholder="e.g., HDFC Bank, Bitcoin" required
                            />
                        </div>

                        {/* Type */}
                        <div className="space-y-2">
                            <label htmlFor="type" className="block text-sm font-medium text-slate-300">Type</label>
                            <select
                                name="type" id="type" value={form.type} onChange={handleChange}
                                className="block w-full rounded-xl border border-white/10 bg-slate-900/50 backdrop-blur px-4 py-3 text-white focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 transition-all outline-none appearance-none cursor-pointer"
                            >
                                {INVESTMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>

                        {/* Units */}
                        <div className="space-y-2">
                            <label htmlFor="units" className="block text-sm font-medium text-slate-300">Units (Optional)</label>
                            <input
                                type="number" name="units" id="units" value={form.units} onChange={handleChange}
                                className="block w-full rounded-xl border border-white/10 bg-slate-900/50 backdrop-blur px-4 py-3 text-white placeholder-slate-500 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 transition-all outline-none"
                                placeholder="e.g., 10" step="any" min="0"
                            />
                        </div>

                        {/* Price Per Unit */}
                        <div className="space-y-2">
                            <label htmlFor="price_per_unit" className="block text-sm font-medium text-slate-300">Price / Unit (Optional)</label>
                            <div className="relative">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                                    <span className="text-slate-400">₹</span>
                                </div>
                                <input
                                    type="number" name="price_per_unit" id="price_per_unit" value={form.price_per_unit} onChange={handleChange}
                                    className="block w-full rounded-xl border border-white/10 bg-slate-900/50 backdrop-blur pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 transition-all outline-none"
                                    placeholder="0.00" step="any" min="0"
                                />
                            </div>
                        </div>

                        {/* Total Amount */}
                        <div className="space-y-2">
                            <label htmlFor="amount" className="block text-sm font-medium text-slate-300">
                                Total Amount {form.units && form.price_per_unit && <span className="text-amber-400 text-xs ml-1">(auto-calculated)</span>}
                            </label>
                            <div className="relative">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                                    <span className="text-slate-400">₹</span>
                                </div>
                                <input
                                    type="number" name="amount" id="amount" value={form.amount} onChange={handleChange}
                                    className="block w-full rounded-xl border border-white/10 bg-slate-900/50 backdrop-blur pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 transition-all outline-none font-mono font-bold"
                                    placeholder="0.00" step="0.01" min="0" required
                                />
                            </div>
                        </div>

                        {/* Date */}
                        <div className="space-y-2">
                            <label htmlFor="date" className="block text-sm font-medium text-slate-300">Date</label>
                            <input
                                type="date" name="date" id="date" value={form.date} onChange={handleChange}
                                className="block w-full rounded-xl border border-white/10 bg-slate-900/50 backdrop-blur px-4 py-3 text-white focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 transition-all outline-none cursor-pointer"
                                required
                            />
                        </div>

                        {/* Account Type */}
                        <div className="space-y-2">
                            <label htmlFor="accountType" className="block text-sm font-medium text-slate-300">Account (Optional)</label>
                            <select
                                name="accountType" id="accountType" value={form.accountType} onChange={handleChange}
                                className="block w-full rounded-xl border border-white/10 bg-slate-900/50 backdrop-blur px-4 py-3 text-white focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 transition-all outline-none appearance-none cursor-pointer"
                            >
                                <option value="">No account</option>
                                {accountTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>

                        {/* Description */}
                        <div className="space-y-2">
                            <label htmlFor="description" className="block text-sm font-medium text-slate-300">Description (Optional)</label>
                            <input
                                type="text" name="description" id="description" value={form.description} onChange={handleChange}
                                className="block w-full rounded-xl border border-white/10 bg-slate-900/50 backdrop-blur px-4 py-3 text-white placeholder-slate-500 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 transition-all outline-none"
                                placeholder="Notes..."
                            />
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end gap-3 relative z-10">
                        <button
                            type="button"
                            onClick={() => { setForm(initialForm); setError(""); setSuccess(""); }}
                            className="rounded-xl px-6 py-2.5 text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-all"
                        >
                            Clear
                        </button>
                        <button
                            type="submit" disabled={loading}
                            className="rounded-xl px-8 py-2.5 text-sm font-bold text-white shadow-lg shadow-amber-500/25 bg-amber-500 hover:bg-amber-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? "Saving..." : form.action === "buy" ? "Log Buy" : "Log Sell"}
                        </button>
                    </div>
                </form>

                {/* Recent Investments */}
                {recentInvestments.length > 0 && (
                    <div className="mt-12 animate-fade-in">
                        <h2 className="text-xl font-bold font-heading text-white mb-6 px-2">Recent Activity</h2>
                        <div className="glass-card overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-white/5 bg-slate-900/40 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                                            <th className="px-6 py-4">Date</th>
                                            <th className="px-6 py-4">Name</th>
                                            <th className="px-6 py-4">Type</th>
                                            <th className="px-6 py-4">Action</th>
                                            <th className="px-6 py-4 text-right">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {recentInvestments.map((inv) => (
                                            <tr key={inv.id} className="hover:bg-white/5 transition-colors">
                                                <td className="px-6 py-4 text-sm text-slate-400 whitespace-nowrap">{new Date(inv.date).toLocaleDateString()}</td>
                                                <td className="px-6 py-4 text-sm font-medium text-white">{inv.name}</td>
                                                <td className="px-6 py-4 text-sm">
                                                    <span className="inline-flex items-center rounded-lg bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-300 border border-white/5">{inv.type}</span>
                                                </td>
                                                <td className="px-6 py-4 text-sm">
                                                    <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-bold border ${inv.action === "buy" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-blue-500/10 text-blue-400 border-blue-500/20"}`}>
                                                        {inv.action === "buy" ? "↑ Buy" : "↓ Sell"}
                                                    </span>
                                                </td>
                                                <td className={`px-6 py-4 text-sm font-bold text-right font-mono ${inv.action === "buy" ? "text-amber-400" : "text-blue-400"}`}>
                                                    {inv.action === "buy" ? "-" : "+"}₹{Number(inv.amount).toFixed(2)}
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

export default AddInvestment;
