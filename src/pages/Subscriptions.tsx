import React, { useState, useMemo, useCallback } from "react";
import { useSubscriptions, type Subscription, type SubscriptionFormData, type BillingCycle } from "../hooks/useSubscriptions";
import { useCreditCards } from "../hooks/useCreditCards";
import { useAccountTypes } from "../hooks/useAccountTypes";
import { useExpenseCategories } from "../hooks/useExpenseCategories";
import { useTheme } from "../contexts/ThemeContext";
import { formatCurrency, formatDate } from "../lib/formatters";
import { SubscriptionModal } from "../components/subscriptions/SubscriptionModal";
import {
  FiRepeat,
  FiPlus,
  FiRefreshCw,
  FiCalendar,
  FiCreditCard,
  FiDollarSign,
  FiCheck,
  FiEdit2,
  FiTrash2,
  FiSearch,
  FiAlertCircle,
  FiClock,
  FiLayers,
  FiCheckCircle,
} from "react-icons/fi";

type FilterTab = "all" | "credit_card" | "account" | "active" | "paused";
type SortOption = "date_asc" | "amount_desc" | "name_asc";

const Subscriptions: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const {
    subscriptions,
    loading,
    error,
    fetchSubscriptions,
    addSubscription,
    updateSubscription,
    deleteSubscription,
    toggleActive,
    logSubscriptionExpense,
    metrics,
  } = useSubscriptions();

  const { cards } = useCreditCards();
  const { accountTypes } = useAccountTypes();
  const { categories } = useExpenseCategories();

  // State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSub, setEditingSub] = useState<Subscription | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [sortBy, setSortBy] = useState<SortOption>("date_asc");
  const [loggingId, setLoggingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 4000);
  }, []);

  // Filter and sort subscriptions
  const filteredSubscriptions = useMemo(() => {
    return subscriptions
      .filter((sub) => {
        // Tab filter
        if (activeTab === "credit_card" && sub.payment_type !== "credit_card") return false;
        if (activeTab === "account" && sub.payment_type !== "account") return false;
        if (activeTab === "active" && !sub.is_active) return false;
        if (activeTab === "paused" && sub.is_active) return false;

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = sub.name.toLowerCase().includes(q);
          const matchCat = (sub.category_name || "").toLowerCase().includes(q);
          const matchCard = (sub.credit_card_name || "").toLowerCase().includes(q);
          const matchAcc = (sub.account_type || "").toLowerCase().includes(q);
          const matchNotes = (sub.notes || "").toLowerCase().includes(q);
          return matchName || matchCat || matchCard || matchAcc || matchNotes;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "date_asc") {
          return new Date(a.next_billing_date).getTime() - new Date(b.next_billing_date).getTime();
        }
        if (sortBy === "amount_desc") {
          return Number(b.amount) - Number(a.amount);
        }
        if (sortBy === "name_asc") {
          return a.name.localeCompare(b.name);
        }
        return 0;
      });
  }, [subscriptions, activeTab, searchQuery, sortBy]);

  // Counts for tabs
  const tabCounts = useMemo(() => {
    return {
      all: subscriptions.length,
      credit_card: subscriptions.filter((s) => s.payment_type === "credit_card").length,
      account: subscriptions.filter((s) => s.payment_type === "account").length,
      active: subscriptions.filter((s) => s.is_active).length,
      paused: subscriptions.filter((s) => !s.is_active).length,
    };
  }, [subscriptions]);

  const handleOpenAddModal = () => {
    setEditingSub(null);
    setModalOpen(true);
  };

  const handleOpenEditModal = (sub: Subscription) => {
    setEditingSub(sub);
    setModalOpen(true);
  };

  const handleSaveSubscription = async (formData: SubscriptionFormData) => {
    const formattedData = {
      ...formData,
      amount: Number(formData.amount),
    };
    if (editingSub) {
      await updateSubscription(editingSub.id, formattedData);
      showToast(`Updated "${formData.name}" successfully`);
    } else {
      await addSubscription(formattedData);
      showToast(`Added "${formData.name}" to subscriptions`);
    }
    setModalOpen(false);
    setEditingSub(null);
  };

  const handleDelete = async (id: string, name: string) => {
    try {
      await deleteSubscription(id);
      showToast(`Deleted subscription "${name}"`);
      setDeleteConfirmId(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete subscription";
      alert(msg);
    }
  };

  const handleOneClickLogExpense = async (sub: Subscription) => {
    setLoggingId(sub.id);
    try {
      const result = await logSubscriptionExpense(sub.id);
      if (result?.expense) {
        showToast(
          `Logged ${formatCurrency(sub.amount)} to Expenses! Next billing advanced to ${formatDate(
            result.subscription.next_billing_date
          )}.`
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to log expense";
      alert(msg);
    } finally {
      setLoggingId(null);
    }
  };

  const formatCycleLabel = (cycle: BillingCycle) => {
    switch (cycle) {
      case "monthly": return "Monthly";
      case "quarterly": return "Quarterly";
      case "semi_annual": return "Every 6 Months";
      case "yearly": return "Yearly";
      default: return cycle;
    }
  };

  const formatCycleSuffix = (cycle: BillingCycle) => {
    switch (cycle) {
      case "monthly": return "/mo";
      case "quarterly": return "/qtr";
      case "semi_annual": return "/6mo";
      case "yearly": return "/yr";
      default: return "";
    }
  };

  const getDaysDiff = (dateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);
    const diffTime = target.getTime() - today.getTime();
    return Math.round(diffTime / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl bg-slate-900/90 text-white dark:bg-emerald-500/90 dark:text-slate-950 shadow-2xl backdrop-blur-md border border-emerald-500/30 animate-fade-in text-sm font-medium">
          <FiCheckCircle className="text-emerald-400 dark:text-slate-950 text-lg flex-shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Network Error Alert */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-sm">
          <FiAlertCircle className="text-lg flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <FiRepeat className="text-xl" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-slate-900 dark:text-white tracking-tight">
                Subscriptions & Bills
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Track recurring software, utility bills, memberships, and automated renewals
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchSubscriptions()}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-all shadow-sm"
            title="Refresh subscriptions"
          >
            <FiRefreshCw className={`text-lg ${loading ? "animate-spin text-emerald-500" : ""}`} />
          </button>

          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-medium shadow-lg shadow-emerald-500/25 active:scale-95 transition-all text-sm"
          >
            <FiPlus className="text-lg" />
            <span>Add Subscription</span>
          </button>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Monthly Burn Rate */}
        <div className="relative overflow-hidden rounded-2xl p-5 border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-slate-800/60 backdrop-blur-md shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Monthly Burn Rate
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <FiDollarSign className="text-base" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-heading">
              {formatCurrency(metrics.monthlyBurnRate)}
            </h3>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">/month</span>
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Normalized across all active billing cycles
          </p>
        </div>

        {/* Annual Commitment */}
        <div className="relative overflow-hidden rounded-2xl p-5 border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-slate-800/60 backdrop-blur-md shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Annual Commitment
            </span>
            <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-500 flex items-center justify-center">
              <FiLayers className="text-base" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-heading">
              {formatCurrency(metrics.annualCommitment)}
            </h3>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">/year</span>
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Projected 12-month recurring expenditure
          </p>
        </div>

        {/* Active Subscriptions */}
        <div className="relative overflow-hidden rounded-2xl p-5 border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-slate-800/60 backdrop-blur-md shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Active Services
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <FiRepeat className="text-base" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-heading">
              {metrics.activeCount}
            </h3>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              of {metrics.totalCount} total
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            {metrics.totalCount - metrics.activeCount} paused / inactive
          </p>
        </div>

        {/* Next Upcoming Renewal */}
        <div className="relative overflow-hidden rounded-2xl p-5 border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-slate-800/60 backdrop-blur-md shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Next Bill
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <FiCalendar className="text-base" />
            </div>
          </div>
          {metrics.nextUpcoming ? (
            <div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 dark:text-white truncate max-w-[130px]">
                  {metrics.nextUpcoming.name}
                </span>
                <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(metrics.nextUpcoming.amount)}
                </span>
              </div>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <FiClock className="text-amber-500" />
                {(() => {
                  const days = getDaysDiff(metrics.nextUpcoming.next_billing_date);
                  if (days === 0) return "Due today!";
                  if (days === 1) return "Due tomorrow";
                  return `In ${days} days (${formatDate(metrics.nextUpcoming.next_billing_date)})`;
                })()}
              </p>
            </div>
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              No upcoming renewals
            </p>
          )}
        </div>
      </div>

      {/* Due Soon / Action Required Queue Banner */}
      {metrics.dueSoon.length > 0 && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 dark:bg-amber-500/10 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-sm">
              <FiAlertCircle className="text-lg flex-shrink-0" />
              <span>
                Upcoming & Overdue Queue ({metrics.dueSoon.length}{" "}
                {metrics.dueSoon.length === 1 ? "bill requires attention" : "bills require attention"})
              </span>
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:inline">
              1-click to auto-log expense & advance billing cycle
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {metrics.dueSoon.map((sub) => {
              const daysDiff = getDaysDiff(sub.next_billing_date);
              const isOverdue = daysDiff < 0;
              const isDueToday = daysDiff === 0;

              return (
                <div
                  key={sub.id}
                  className="flex items-center justify-between gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800/90 shadow-sm"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900 dark:text-white truncate text-sm">
                        {sub.name}
                      </span>
                      {isOverdue && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20">
                          Overdue {Math.abs(daysDiff)}d
                        </span>
                      )}
                      {isDueToday && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                          Due Today
                        </span>
                      )}
                      {!isOverdue && !isDueToday && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-500">
                          Due in {daysDiff}d
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {formatCurrency(sub.amount)}
                      </span>
                      <span>•</span>
                      <span className="truncate">
                        {sub.payment_type === "credit_card"
                          ? sub.credit_card_name || "Credit Card"
                          : sub.account_type || "Cash"}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleOneClickLogExpense(sub)}
                    disabled={loggingId === sub.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white text-xs font-semibold shadow-md shadow-emerald-500/20 transition-all flex-shrink-0"
                    title="Log as expense and advance renewal date"
                  >
                    {loggingId === sub.id ? (
                      <FiRefreshCw className="animate-spin text-xs" />
                    ) : (
                      <FiCheck className="text-xs" />
                    )}
                    <span>{loggingId === sub.id ? "Logging..." : "Log Paid"}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                activeTab === "all"
                  ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                  : "bg-white/70 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10"
              }`}
            >
              All ({tabCounts.all})
            </button>
            <button
              onClick={() => setActiveTab("active")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                activeTab === "active"
                  ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                  : "bg-white/70 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10"
              }`}
            >
              Active ({tabCounts.active})
            </button>
            <button
              onClick={() => setActiveTab("credit_card")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                activeTab === "credit_card"
                  ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                  : "bg-white/70 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10"
              }`}
            >
              Credit Cards ({tabCounts.credit_card})
            </button>
            <button
              onClick={() => setActiveTab("account")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                activeTab === "account"
                  ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                  : "bg-white/70 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10"
              }`}
            >
              Bank / Cash ({tabCounts.account})
            </button>
            <button
              onClick={() => setActiveTab("paused")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                activeTab === "paused"
                  ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                  : "bg-white/70 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10"
              }`}
            >
              Paused ({tabCounts.paused})
            </button>
          </div>

          {/* Search & Sort Controls */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-60">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
              <input
                type="text"
                placeholder="Search subscriptions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-white/5 text-slate-900 dark:text-white placeholder-slate-400 text-xs focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
              />
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="py-1.5 px-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs focus:outline-none focus:border-emerald-500 transition-all"
            >
              <option value="date_asc">Renewal (Soonest)</option>
              <option value="amount_desc">Amount (High to Low)</option>
              <option value="name_asc">Name (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Subscriptions Grid */}
        {filteredSubscriptions.length === 0 ? (
          <div className="text-center py-16 px-4 rounded-3xl border border-dashed border-slate-200 dark:border-white/10 bg-white/40 dark:bg-white/5">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto mb-4">
              <FiRepeat className="text-2xl" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              {searchQuery ? "No matching subscriptions" : "No subscriptions found"}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-4">
              {searchQuery
                ? "Try adjusting your search terms or filter criteria"
                : "Add your streaming services, cloud hosting, utility bills, or memberships to automate expense tracking."}
            </p>
            {!searchQuery && (
              <button
                onClick={handleOpenAddModal}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold shadow-md shadow-emerald-500/20 transition-all"
              >
                <FiPlus className="text-sm" />
                <span>Add Your First Subscription</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSubscriptions.map((sub) => {
              const daysDiff = getDaysDiff(sub.next_billing_date);
              const isOverdue = sub.is_active && daysDiff < 0;
              const isDueToday = sub.is_active && daysDiff === 0;

              return (
                <div
                  key={sub.id}
                  className={`relative flex flex-col justify-between rounded-2xl border p-5 transition-all shadow-sm group ${
                    !sub.is_active
                      ? "opacity-60 border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-slate-900/40"
                      : "border-slate-200 dark:border-white/10 bg-white/80 dark:bg-slate-800/70 hover:shadow-md hover:border-emerald-500/30"
                  }`}
                >
                  {/* Card Header */}
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-base shadow-sm ${
                            sub.is_active
                              ? "bg-gradient-to-br from-emerald-500/20 to-teal-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                              : "bg-slate-200 dark:bg-white/5 text-slate-400"
                          }`}
                        >
                          {sub.icon || sub.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 dark:text-white text-base leading-snug">
                            {sub.name}
                          </h4>
                          {sub.category_name && (
                            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                              {sub.category_name}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Active Toggle Switch */}
                      <button
                        onClick={() => toggleActive(sub.id, sub.is_active)}
                        className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          sub.is_active ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700"
                        }`}
                        title={sub.is_active ? "Click to pause" : "Click to activate"}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                            sub.is_active ? "translate-x-4" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>

                    {/* Amount & Frequency */}
                    <div className="flex items-baseline gap-1.5 mb-4">
                      <span className="text-2xl font-extrabold text-slate-900 dark:text-white font-heading">
                        {formatCurrency(sub.amount)}
                      </span>
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        {formatCycleSuffix(sub.billing_cycle)}
                      </span>
                      <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 ml-auto">
                        {formatCycleLabel(sub.billing_cycle)}
                      </span>
                    </div>

                    {/* Metadata Specs */}
                    <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-white/5 text-xs">
                      {/* Next Renewal */}
                      <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                        <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                          <FiCalendar className="text-slate-400" />
                          Next Renewal:
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium">{formatDate(sub.next_billing_date)}</span>
                          {sub.is_active && (
                            <>
                              {isOverdue && (
                                <span className="text-[10px] font-bold text-rose-500 bg-rose-500/10 px-1.5 py-0.5 rounded">
                                  {Math.abs(daysDiff)}d overdue
                                </span>
                              )}
                              {isDueToday && (
                                <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">
                                  Today
                                </span>
                              )}
                              {!isOverdue && !isDueToday && (
                                <span className="text-[10px] font-medium text-slate-400">
                                  ({daysDiff}d)
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      {/* Payment Method */}
                      <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                        <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                          {sub.payment_type === "credit_card" ? (
                            <FiCreditCard className="text-slate-400" />
                          ) : (
                            <FiDollarSign className="text-slate-400" />
                          )}
                          Method:
                        </span>
                        <span className="font-medium truncate max-w-[170px]">
                          {sub.payment_type === "credit_card"
                            ? sub.credit_card_name || "Credit Card"
                            : sub.account_type || "Cash / Bank"}
                        </span>
                      </div>

                      {/* Notes snippet if present */}
                      {sub.notes && (
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 italic truncate pt-1">
                          "{sub.notes}"
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Card Footer Actions */}
                  <div className="flex items-center justify-between gap-2 mt-5 pt-3 border-t border-slate-100 dark:border-white/5">
                    <button
                      onClick={() => handleOneClickLogExpense(sub)}
                      disabled={loggingId === sub.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 active:scale-95 text-emerald-600 dark:text-emerald-400 text-xs font-semibold transition-all"
                      title="Log this bill to Expenses and bump renewal date"
                    >
                      {loggingId === sub.id ? (
                        <FiRefreshCw className="animate-spin text-xs" />
                      ) : (
                        <FiCheck className="text-xs" />
                      )}
                      <span>Log Paid</span>
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditModal(sub)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                        title="Edit subscription"
                      >
                        <FiEdit2 className="text-sm" />
                      </button>

                      {deleteConfirmId === sub.id ? (
                        <div className="flex items-center gap-1 animate-fade-in">
                          <button
                            onClick={() => handleDelete(sub.id, sub.name)}
                            className="px-2 py-1 rounded-md bg-rose-500 text-white text-[11px] font-bold"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="p-1 text-slate-400 hover:text-white text-xs"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirmId(sub.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                          title="Delete subscription"
                        >
                          <FiTrash2 className="text-sm" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Subscription Add / Edit Modal */}
      <SubscriptionModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingSub(null);
        }}
        onSave={handleSaveSubscription}
        editingSub={editingSub}
        cards={cards}
        accountTypes={accountTypes}
        categories={categories}
        isDark={isDark}
      />
    </div>
  );
};

export default Subscriptions;
