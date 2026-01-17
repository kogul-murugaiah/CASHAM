import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAccountTypes } from "../hooks/useAccountTypes";
import { useIncomeSources } from "../hooks/useIncomeSources";
import Footer from "../components/Footer";

type Income = {
  id: string;
  amount: number;
  date: string;
  source_id: string;
  account_type: string;
  user_id: string;
  created_at: string;
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
};

const IncomeEditor = () => {
  const { accountTypes } = useAccountTypes();
  const { sources } = useIncomeSources();
  const [income, setIncome] = useState<Income[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<EditingIncome | null>(null);

  const formatter = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  });

  // Fetch income records
  const fetchIncome = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("income")
        .select(`
          *,
          income_sources!inner(name)
        `)
        .eq("user_id", user.id)
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
  }, []);

  return (
    <>
      <div className="min-h-screen bg-slate-900 pb-24 md:pb-0">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <header className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400 bg-clip-text text-transparent transform hover:scale-105 transition-all duration-300">
                Edit Income
              </h1>
              <p className="text-sm text-slate-400">
                View and update your income records with inline editing.
              </p>
            </div>
            <div className="flex gap-2 text-xs text-slate-400">
              <span className="rounded-full bg-slate-700 px-3 py-1">
                {income.length} records
              </span>
            </div>
          </header>

          {/* Messages */}
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

          {/* Loading state */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-slate-400">Loading income records...</div>
            </div>
          ) : income.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <p className="text-slate-400">No income records found.</p>
                <p className="text-sm text-slate-500 mt-2">
                  Add your first income record to get started.
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl bg-slate-800 shadow-sm ring-1 ring-slate-700">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-700/50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wide text-slate-300">
                        Date
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wide text-slate-300">
                        Amount
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wide text-slate-300">
                        Source
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wide text-slate-300">
                        Account Type
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-medium uppercase tracking-wide text-slate-300">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {income.map((record) => (
                      <tr key={record.id} className="hover:bg-slate-700/30 transition-colors">
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
                                className="rounded-lg bg-slate-700 border border-slate-600 px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                                className="rounded-lg bg-slate-700 border border-slate-600 px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                                className="rounded-lg bg-slate-700 border border-slate-600 px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="">Select source</option>
                                {sources.map((source) => (
                                  <option key={source.id} value={source.id}>
                                    {source.name}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-6 py-4">
                              <select
                                value={editingData?.account_type || ""}
                                onChange={(e) =>
                                  setEditingData((prev) =>
                                    prev ? { ...prev, account_type: e.target.value } : null
                                  )
                                }
                                className="rounded-lg bg-slate-700 border border-slate-600 px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="">Select account type</option>
                                {accountTypes.map((type) => (
                                  <option key={type} value={type}>
                                    {type}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button
                                onClick={handleSave}
                                disabled={saving}
                                className="mr-2 rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {saving ? "Saving..." : "Save"}
                              </button>
                              <button
                                onClick={handleCancel}
                                className="rounded-lg bg-slate-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
                              >
                                Cancel
                              </button>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-6 py-4 text-sm text-slate-300">
                              {new Date(record.date).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 text-sm font-medium text-slate-100">
                              {formatter.format(record.amount)}
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-300">
                              {record.income_sources?.name || "Unknown"}
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${
                                  record.account_type === "SBI"
                                    ? "bg-blue-900/50 text-blue-300 border-blue-700/50"
                                    : record.account_type === "CASH"
                                    ? "bg-amber-900/50 text-amber-300 border-amber-700/50"
                                    : record.account_type === "UNION"
                                    ? "bg-purple-900/50 text-purple-300 border-purple-700/50"
                                    : record.account_type === "INDIAN"
                                    ? "bg-teal-900/50 text-teal-300 border-teal-700/50"
                                    : "border-slate-600 text-slate-300"
                                }`}
                              >
                                {record.account_type}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button
                                onClick={() => handleEdit(record)}
                                className="mr-2 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete(record.id)}
                                className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
                              >
                                Delete
                              </button>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
};

export default IncomeEditor;
