import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAccountTypes } from "../hooks/useAccountTypes";
import { useIncomeSources } from "../hooks/useIncomeSources";

type Income = {
  id: string;
  amount: number;
  date: string;
  source_id: string;
  account_type: string;
  user_id: string;
  created_at: string;
  description: string | null;
  income_sources?: {
    name: string;
  };
};

type EditingIncome = {
  id: string;
  date: string;
  amount: string;
  source_id: string;
  account_type: string;
  description: string;
};

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const IncomeEditor = () => {
  const { accountTypes } = useAccountTypes();
  const { sources } = useIncomeSources();
  const [income, setIncome] = useState<Income[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<EditingIncome | null>(null);

  // Fetch income records
  const fetchIncome = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Calculate date range for selected month
      const [year, month] = selectedMonth.split('-');
      const firstDay = `${selectedMonth}-01`;
      const lastDay = new Date(parseInt(year), parseInt(month), 0).toISOString().slice(0, 10);

      const { data, error } = await supabase
        .from("income")
        .select(`
          *,
          income_sources!inner(name)
        `)
        .eq("user_id", user.id)
        .gte("date", firstDay)
        .lte("date", lastDay)
        .order("date", { ascending: false });

      if (error) throw error;
      setIncome(data || []);
    } catch (err: any) {
      setError(err.message || "Failed to fetch income records");
    } finally {
      setLoading(false);
    }
  };

  // Start editing
  const handleEdit = (record: Income) => {
    setEditingId(record.id);
    setEditingData({
      id: record.id,
      date: record.date,
      amount: record.amount.toString(),
      source_id: record.source_id,
      account_type: record.account_type,
      description: record.description || "",
    });
    setSuccess(null);
    setError(null);
  };

  // Cancel editing
  const handleCancel = () => {
    setEditingId(null);
    setEditingData(null);
    setSuccess(null);
    setError(null);
  };

  // Save changes
  const handleSave = async () => {
    if (!editingData) return;

    try {
      setSaving(true);
      setError(null);

      const { error } = await supabase
        .from("income")
        .update({
          date: editingData.date,
          amount: parseFloat(editingData.amount),
          source_id: editingData.source_id,
          account_type: editingData.account_type,
          description: editingData.description.trim() || null,
        })
        .eq("id", editingData.id);

      if (error) throw error;

      setSuccess("Income record updated successfully");
      setEditingId(null);
      setEditingData(null);
      await fetchIncome();
    } catch (err: any) {
      setError(err.message || "Failed to update income record");
    } finally {
      setSaving(false);
    }
  };

  // Delete income record
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this income record?")) {
      return;
    }

    try {
      setError(null);

      const { error } = await supabase
        .from("income")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setSuccess("Income record deleted successfully");
      await fetchIncome();
    } catch (err: any) {
      setError(err.message || "Failed to delete income record");
    }
  };

  useEffect(() => {
    fetchIncome();
  }, [selectedMonth]);

  return (
    <div className="pb-24 pt-8 md:pb-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between animate-fade-in">
          <div>
            <h1 className="text-3xl font-bold font-heading text-white mb-2">
              Edit Income
            </h1>
            <p className="text-slate-400">
              Manage and update your earnings log.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full sm:w-auto rounded-xl border border-white/10 bg-slate-900/50 backdrop-blur px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 cursor-pointer"
            />
            <span className="rounded-xl bg-white/5 px-4 py-2 text-sm font-medium text-slate-300 border border-white/10">
              {income.length} records
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
          <div className="mb-6 glass-card border-emerald-500/20 bg-emerald-500/10 p-4 text-emerald-300 text-sm">
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
                    <th className="px-6 py-4">Amount</th>
                    <th className="px-6 py-4">Source</th>
                    <th className="px-6 py-4">Description</th>
                    <th className="px-6 py-4">Account</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {income.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-12 text-center text-slate-500"
                      >
                        No income records found for this month.
                      </td>
                    </tr>
                  ) : (
                    income.map((record) => (
                      <tr key={record.id} className="hover:bg-white/5 transition-colors group">
                        {editingId === record.id ? (
                          <>
                            <td className="px-6 py-4">
                              <input
                                type="date"
                                value={editingData?.date || ""}
                                onChange={(e) =>
                                  setEditingData((prev) =>
                                    prev ? { ...prev, date: e.target.value } : null
                                  )
                                }
                                className="w-full min-w-[120px] rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              />
                            </td>
                            <td className="px-6 py-4">
                              <input
                                type="number"
                                value={editingData?.amount || ""}
                                onChange={(e) =>
                                  setEditingData((prev) =>
                                    prev ? { ...prev, amount: e.target.value } : null
                                  )
                                }
                                className="w-full min-w-[100px] rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                step="0.01"
                                min="0"
                              />
                            </td>
                            <td className="px-6 py-4">
                              <select
                                value={editingData?.source_id || ""}
                                onChange={(e) =>
                                  setEditingData((prev) =>
                                    prev ? { ...prev, source_id: e.target.value } : null
                                  )
                                }
                                className="w-full min-w-[140px] rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 appearance-none"
                              >
                                {sources.map((source) => (
                                  <option key={source.id} value={source.id} className="bg-slate-900">
                                    {source.name}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-6 py-4">
                              <input
                                type="text"
                                value={editingData?.description || ""}
                                onChange={(e) =>
                                  setEditingData((prev) =>
                                    prev ? { ...prev, description: e.target.value } : null
                                  )
                                }
                                maxLength={300}
                                className="w-full min-w-[200px] rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              />
                            </td>
                            <td className="px-6 py-4">
                              <select
                                value={editingData?.account_type || ""}
                                onChange={(e) =>
                                  setEditingData((prev) =>
                                    prev ? { ...prev, account_type: e.target.value } : null
                                  )
                                }
                                className="w-full min-w-[120px] rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 appearance-none"
                              >
                                {accountTypes.map((type) => (
                                  <option key={type} value={type} className="bg-slate-900">
                                    {type}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-6 py-4 text-right whitespace-nowrap">
                              <button
                                onClick={handleSave}
                                disabled={saving}
                                className="mr-2 inline-flex items-center rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all disabled:opacity-50"
                              >
                                Save
                              </button>
                              <button
                                onClick={handleCancel}
                                className="inline-flex items-center rounded-lg bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-400 hover:bg-white/10 hover:text-white transition-all"
                              >
                                Cancel
                              </button>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-6 py-4 text-sm text-slate-400 whitespace-nowrap">
                              {new Date(record.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                            </td>
                            <td className="px-6 py-4 text-sm font-bold text-emerald-400 font-mono">
                              {currencyFormatter.format(record.amount)}
                            </td>
                            <td className="px-6 py-4 text-sm text-white">
                              {record.income_sources?.name || "Unknown"}
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-500 max-w-xs truncate">
                              {record.description || "-"}
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-semibold bg-opacity-10 ${record.account_type === "SBI"
                                    ? "bg-blue-500 text-blue-300 border-blue-500/20"
                                    : record.account_type === "CASH"
                                      ? "bg-amber-500 text-amber-300 border-amber-500/20"
                                      : record.account_type === "UNION"
                                        ? "bg-purple-500 text-purple-300 border-purple-500/20"
                                        : record.account_type === "INDIAN"
                                          ? "bg-teal-500 text-teal-300 border-teal-500/20"
                                          : "bg-slate-500 text-slate-300 border-slate-500/20"
                                  }`}
                              >
                                {record.account_type}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => handleEdit(record)}
                                  className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white transition-all"
                                  title="Edit"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                                </button>
                                <button
                                  onClick={() => handleDelete(record.id)}
                                  className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all"
                                  title="Delete"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                                </button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default IncomeEditor;
