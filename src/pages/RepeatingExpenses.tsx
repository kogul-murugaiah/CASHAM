import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import { useExpenseCategories } from "../hooks/useExpenseCategories";
import { useAccountTypes } from "../hooks/useAccountTypes";
import { useCreditCards } from "../hooks/useCreditCards";
import { useUserPreferences } from "../hooks/useUserPreferences";
import { formatCurrency } from "../lib/formatters";
import { CustomDropdown } from "../components/CustomDropdown";
import Subscriptions from "./Subscriptions";
import {
  FiRepeat,
  FiPlus,
  FiSearch,
  FiEdit2,
  FiTrash2,
  FiCheckCircle,
  FiCalendar,
  FiCreditCard,
  FiZap,
  FiRefreshCw,
  FiX,
  FiAlertCircle,
} from "react-icons/fi";

export interface ExpenseTemplate {
  id: string;
  amount: number;
  item: string;
  description: string | null;
  category_id: string | null;
  account_type: string;
  paid_via_credit_card?: boolean;
  credit_card_id?: string | null;
  credit_card_name?: string | null;
  categories: { id: string; name: string } | null;
  created_at?: string;
}

interface TemplateFormState {
  id?: string;
  item: string;
  amount: string;
  description: string;
  category_id: string;
  account_type: string;
  paid_via_credit_card: boolean;
  credit_card_id: string;
  credit_card_name: string;
}

const emptyForm: TemplateFormState = {
  item: "",
  amount: "",
  description: "",
  category_id: "",
  account_type: "",
  paid_via_credit_card: false,
  credit_card_id: "",
  credit_card_name: "",
};

const RepeatingExpenses: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Active Tab: 'presets' | 'subscriptions'
  const activeTab = searchParams.get("tab") === "subscriptions" ? "subscriptions" : "presets";

  const { currencyStyle } = useUserPreferences();
  const { categories, addCategory } = useExpenseCategories();
  const { accountTypes, addAccountType } = useAccountTypes();
  const { cards: creditCards } = useCreditCards();

  // Presets state
  const [templates, setTemplates] = useState<ExpenseTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "card" | "account">("all");

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ExpenseTemplate | null>(null);
  const [formState, setFormState] = useState<TemplateFormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Quick-Add logging states
  const [loggingTemplateId, setLoggingTemplateId] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3500);
  }, []);

  // Fetch templates from API
  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get("/api/expenses?templates=true");
      setTemplates(data || []);
    } catch (err: any) {
      setError(err.message || "Failed to load repeating presets");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // Tab switcher
  const handleTabChange = (tab: "presets" | "subscriptions") => {
    setSearchParams(tab === "subscriptions" ? { tab: "subscriptions" } : {});
  };

  // Filter templates
  const filteredTemplates = useMemo(() => {
    return templates.filter((t) => {
      // Type filter
      if (filterType === "card" && !t.paid_via_credit_card) return false;
      if (filterType === "account" && t.paid_via_credit_card) return false;

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchItem = t.item?.toLowerCase().includes(q);
        const matchCat = t.categories?.name?.toLowerCase().includes(q);
        const matchAcc = t.account_type?.toLowerCase().includes(q);
        const matchCard = t.credit_card_name?.toLowerCase().includes(q);
        const matchDesc = t.description?.toLowerCase().includes(q);
        return matchItem || matchCat || matchAcc || matchCard || matchDesc;
      }
      return true;
    });
  }, [templates, filterType, searchQuery]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const total = templates.length;
    const cardLinked = templates.filter((t) => t.paid_via_credit_card).length;
    const directAccounts = total - cardLinked;
    const totalEstimatedSum = templates.reduce((sum, t) => sum + Number(t.amount || 0), 0);
    return { total, cardLinked, directAccounts, totalEstimatedSum };
  }, [templates]);

  // Open Add Modal
  const handleOpenAdd = () => {
    setEditingTemplate(null);
    setFormState({
      item: "",
      amount: "",
      description: "",
      category_id: categories[0]?.id?.toString() || "",
      account_type: accountTypes[0] || "",
      paid_via_credit_card: false,
      credit_card_id: creditCards[0]?.id || "",
      credit_card_name: creditCards[0]?.name || "",
    });
    setShowModal(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (t: ExpenseTemplate) => {
    setEditingTemplate(t);
    setFormState({
      id: t.id,
      item: t.item,
      amount: t.amount.toString(),
      description: t.description || "",
      category_id: t.category_id ? t.category_id.toString() : categories[0]?.id?.toString() || "",
      account_type: t.account_type || accountTypes[0] || "",
      paid_via_credit_card: Boolean(t.paid_via_credit_card),
      credit_card_id: t.credit_card_id || creditCards[0]?.id || "",
      credit_card_name: t.credit_card_name || creditCards[0]?.name || "",
    });
    setShowModal(true);
  };

  // Save (Create or Update)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.item.trim() || !formState.amount || !formState.account_type) {
      showToast("Please fill in item name, amount, and budget account");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        item: formState.item.trim(),
        amount: Number(formState.amount),
        description: formState.description.trim() || null,
        category_id: formState.category_id || null,
        account_type: formState.account_type,
        paid_via_credit_card: formState.paid_via_credit_card,
        credit_card_id: formState.paid_via_credit_card ? formState.credit_card_id || null : null,
        credit_card_name: formState.paid_via_credit_card ? formState.credit_card_name || null : null,
      };

      if (editingTemplate) {
        await api.put("/api/expenses?template=true", { id: editingTemplate.id, ...payload });
        showToast(`Preset "${formState.item}" updated successfully!`);
      } else {
        await api.post("/api/expenses?template=true", payload);
        showToast(`Preset "${formState.item}" created successfully!`);
      }

      setShowModal(false);
      await fetchTemplates();
    } catch (err: any) {
      showToast(err.message || "Failed to save preset");
    } finally {
      setSaving(false);
    }
  };

  // Delete Template
  const handleDelete = async (id: string, name: string) => {
    try {
      await api.delete(`/api/expenses?template=true&id=${id}`);
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      setDeleteConfirmId(null);
      showToast(`Deleted preset "${name}"`);
    } catch (err: any) {
      showToast(err.message || "Failed to delete preset");
    }
  };

  // 1-Click Quick-Add for Today
  const handleQuickAdd = async (t: ExpenseTemplate) => {
    setLoggingTemplateId(t.id);
    try {
      await api.post(`/api/expenses?quickadd=true&id=${t.id}`);
      showToast(`Logged "${t.item}" (${formatCurrency(t.amount, currencyStyle)}) for today!`);
    } catch (err: any) {
      showToast(err.message || "Failed to log expense");
    } finally {
      setLoggingTemplateId(null);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8 animate-fade-in">
      {/* Error Alert */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-sm">
          <FiAlertCircle className="text-lg flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-slate-900/95 text-white dark:bg-emerald-500/95 dark:text-slate-950 shadow-2xl backdrop-blur-md border border-emerald-500/30 animate-fade-in text-sm font-semibold">
          <FiCheckCircle className="text-emerald-400 dark:text-slate-950 text-lg flex-shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/10">
              <FiRepeat className="text-2xl" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-slate-900 dark:text-white tracking-tight">
                Repeating Expenses Hub
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Manage one-tap quick presets and recurring subscription bills in one place
              </p>
            </div>
          </div>
        </div>

        {/* Top Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchTemplates()}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition-all shadow-sm"
            title="Refresh presets"
          >
            <FiRefreshCw className={`text-lg ${loading ? "animate-spin text-emerald-500" : ""}`} />
          </button>

          {activeTab === "presets" && (
            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-500/20 active:scale-95 transition-all text-sm"
            >
              <FiPlus className="text-lg" />
              <span>Add New Preset</span>
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tabs: Presets vs Subscriptions */}
      <div className="flex border-b border-slate-200 dark:border-white/10 gap-2">
        <button
          onClick={() => handleTabChange("presets")}
          className={`flex items-center gap-2 pb-3 px-4 font-bold text-sm transition-all border-b-2 -mb-[1px] ${
            activeTab === "presets"
              ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
        >
          <FiZap size={16} />
          <span>Quick Presets</span>
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            {templates.length}
          </span>
        </button>

        <button
          onClick={() => handleTabChange("subscriptions")}
          className={`flex items-center gap-2 pb-3 px-4 font-bold text-sm transition-all border-b-2 -mb-[1px] ${
            activeTab === "subscriptions"
              ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
        >
          <FiCalendar size={16} />
          <span>Subscriptions & Recurring Bills</span>
        </button>
      </div>

      {/* ─── TAB 1: QUICK PRESETS ─── */}
      {activeTab === "presets" && (
        <div className="space-y-6 animate-fade-in">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="glass-card p-5 border border-slate-200 dark:border-white/5 bg-white/70 dark:bg-slate-800/40 rounded-2xl shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                Total Presets
              </p>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl sm:text-3xl font-extrabold font-heading text-slate-900 dark:text-white">
                  {metrics.total}
                </span>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  Ready to log
                </span>
              </div>
            </div>

            <div className="glass-card p-5 border border-slate-200 dark:border-white/5 bg-white/70 dark:bg-slate-800/40 rounded-2xl shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                Credit Card Linked
              </p>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl sm:text-3xl font-extrabold font-heading text-blue-600 dark:text-blue-400">
                  {metrics.cardLinked}
                </span>
                <span className="text-xs font-medium text-slate-500">
                  Auto-tracks dues
                </span>
              </div>
            </div>

            <div className="glass-card p-5 border border-slate-200 dark:border-white/5 bg-white/70 dark:bg-slate-800/40 rounded-2xl shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                Direct Account Presets
              </p>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl sm:text-3xl font-extrabold font-heading text-emerald-600 dark:text-emerald-400">
                  {metrics.directAccounts}
                </span>
                <span className="text-xs font-medium text-slate-500">
                  Direct debit
                </span>
              </div>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-base" />
              <input
                type="text"
                placeholder="Search presets by name, category, or card..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/5 self-start sm:self-auto text-xs font-semibold">
              <button
                onClick={() => setFilterType("all")}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  filterType === "all"
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                All ({templates.length})
              </button>
              <button
                onClick={() => setFilterType("card")}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  filterType === "card"
                    ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm"
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                <FiCreditCard size={13} /> Cards ({metrics.cardLinked})
              </button>
              <button
                onClick={() => setFilterType("account")}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  filterType === "account"
                    ? "bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm"
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                Direct ({metrics.directAccounts})
              </button>
            </div>
          </div>

          {/* Presets Grid */}
          {loading && templates.length === 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-44 rounded-2xl bg-slate-100 dark:bg-slate-800/50 animate-pulse" />
              ))}
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="glass-card p-12 text-center rounded-2xl border border-slate-200 dark:border-white/5">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
                <FiRepeat size={24} />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                {searchQuery ? "No matching presets found" : "No repeating presets yet"}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-5">
                {searchQuery
                  ? "Try adjusting your search query or clear filters."
                  : "Create your frequent expenses (like Petrol, Coffee, Groceries) as presets for 1-click logging."}
              </p>
              {!searchQuery && (
                <button
                  onClick={handleOpenAdd}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-500/20"
                >
                  + Add Your First Preset
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTemplates.map((t) => {
                const isLogging = loggingTemplateId === t.id;
                return (
                  <div
                    key={t.id}
                    className="glass-card p-5 rounded-2xl border border-slate-200 dark:border-white/5 bg-white/80 dark:bg-slate-800/50 hover:border-slate-300 dark:hover:border-white/10 transition-all shadow-sm hover:shadow-md flex flex-col justify-between group"
                  >
                    <div>
                      {/* Top Header of Card */}
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <h4 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                            {t.item}
                          </h4>
                          {t.categories?.name && (
                            <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/5">
                              {t.categories.name}
                            </span>
                          )}
                        </div>

                        {/* Amount */}
                        <div className="text-right font-mono font-extrabold text-lg sm:text-xl text-rose-600 dark:text-red-400">
                          {formatCurrency(t.amount, currencyStyle)}
                        </div>
                      </div>

                      {/* Payment Account / Credit Card Badge */}
                      <div className="mt-3 space-y-1">
                        {t.paid_via_credit_card ? (
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400">
                            <FiCreditCard size={14} className="flex-shrink-0" />
                            <span className="truncate">{t.credit_card_name || "Credit Card"}</span>
                            <span className="text-[10px] text-slate-400">
                              (Deducts {t.account_type})
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            <span>Direct Debit: <strong className="text-slate-900 dark:text-slate-200">{t.account_type}</strong></span>
                          </div>
                        )}

                        {t.description && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 italic line-clamp-1 mt-1">
                            "{t.description}"
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Card Actions Footer */}
                    <div className="mt-5 pt-3.5 border-t border-slate-100 dark:border-white/5 flex items-center justify-between gap-2">
                      <button
                        onClick={() => handleQuickAdd(t)}
                        disabled={isLogging}
                        className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500 text-emerald-700 dark:text-emerald-400 hover:text-white font-bold text-xs border border-emerald-500/20 hover:border-emerald-500 transition-all shadow-sm disabled:opacity-50"
                        title="Record this expense for today"
                      >
                        <FiZap className={`text-sm ${isLogging ? "animate-spin" : ""}`} />
                        <span>{isLogging ? "Logging..." : "Log for Today"}</span>
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEdit(t)}
                          className="p-2 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
                          title="Edit preset"
                        >
                          <FiEdit2 size={14} />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(t.id)}
                          className="p-2 rounded-xl text-slate-400 hover:text-rose-600 dark:hover:text-red-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all"
                          title="Delete preset"
                        >
                          <FiTrash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 2: SUBSCRIPTIONS ─── */}
      {activeTab === "subscriptions" && (
        <div className="animate-fade-in">
          <Subscriptions embedded={true} />
        </div>
      )}

      {/* ─── ADD / EDIT PRESET MODAL ─── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="glass-card max-w-lg w-full p-6 space-y-5 border border-slate-200 dark:border-white/10 shadow-2xl rounded-2xl bg-white dark:bg-slate-800">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FiRepeat className="text-emerald-500" />
                {editingTemplate ? "Edit Repeating Preset" : "Add Repeating Preset"}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
              >
                <FiX size={16} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Item Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Petrol, Office Tea, Weekly Groceries"
                  value={formState.item}
                  onChange={(e) => setFormState({ ...formState, item: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-700/50 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500/30 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Preset Amount (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    min="1"
                    placeholder="100.00"
                    value={formState.amount}
                    onChange={(e) => setFormState({ ...formState, amount: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-700/50 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500/30 outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Budget Account *
                  </label>
                  <CustomDropdown
                    value={formState.account_type}
                    onChange={(val) => setFormState({ ...formState, account_type: val })}
                    options={accountTypes.map((a) => ({ value: a, label: a }))}
                    placeholder="Select account"
                    onAddNew={async (name) => {
                      await addAccountType(name);
                      setFormState((prev) => ({ ...prev, account_type: name }));
                    }}
                    addNewLabel="+ Add new account"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Category
                </label>
                <CustomDropdown
                  value={formState.category_id}
                  onChange={(val) => setFormState({ ...formState, category_id: val })}
                  options={categories.map((c) => ({ value: c.id.toString(), label: c.name }))}
                  placeholder="Select category"
                  onAddNew={async (name) => {
                    await addCategory(name);
                  }}
                  addNewLabel="+ Add new category"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Description / Note (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g., Morning commute, Daily evening snack"
                  value={formState.description}
                  onChange={(e) => setFormState({ ...formState, description: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-700/50 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500/30 outline-none"
                />
              </div>

              {/* ── Credit Card Storage Option ── */}
              <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-700/30 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <FiCreditCard className="text-blue-500 text-lg" />
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">
                        Paid via Credit Card?
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Link this preset to a credit card for automatic statement tracking
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formState.paid_via_credit_card}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setFormState((prev) => ({
                          ...prev,
                          paid_via_credit_card: checked,
                          credit_card_id: checked ? prev.credit_card_id || creditCards[0]?.id || "" : "",
                          credit_card_name: checked ? prev.credit_card_name || creditCards[0]?.name || "" : "",
                        }));
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-300 dark:bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {formState.paid_via_credit_card && (
                  <div className="pt-2 border-t border-slate-200 dark:border-white/5 space-y-2 animate-fade-in">
                    <label className="block text-[11px] font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider">
                      Select Linked Credit Card
                    </label>
                    <CustomDropdown
                      value={formState.credit_card_id || formState.credit_card_name}
                      onChange={(val) => {
                        const matched = creditCards.find((c) => c.id === val || c.name === val);
                        setFormState((prev) => ({
                          ...prev,
                          credit_card_id: matched ? matched.id : "",
                          credit_card_name: matched ? matched.name : val,
                        }));
                      }}
                      options={creditCards.map((c) => ({
                        value: c.id,
                        label: `${c.name} ${c.card_last4 ? `(••${c.card_last4})` : ""}`,
                      }))}
                      placeholder="Select a credit card"
                    />
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      💡 When logged, this preset will deduct from your budget account and record an unsettled due for this card.
                    </p>
                  </div>
                )}
              </div>

              {/* Form Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !formState.item.trim() || !formState.amount || !formState.account_type}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition-all"
                >
                  {saving ? "Saving..." : editingTemplate ? "Update Preset" : "Create Preset"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── DELETE CONFIRMATION MODAL ─── */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="glass-card max-w-sm w-full p-6 space-y-4 border border-rose-500/20 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl">
            <div className="w-10 h-10 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
              <FiAlertCircle size={22} />
            </div>
            <div className="text-center">
              <h4 className="text-base font-bold text-slate-900 dark:text-white">Delete Repeating Preset?</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                This will remove the preset from your quick-entry list. Any existing expenses you already logged will not be deleted.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                Keep Preset
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = templates.find((t) => t.id === deleteConfirmId);
                  if (target) handleDelete(target.id, target.item);
                }}
                className="flex-1 px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-500/20"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RepeatingExpenses;
