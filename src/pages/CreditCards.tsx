import { useState, useEffect, useMemo } from "react";
import { useCreditCards, type CreditCard, type CreditCardSettlement } from "../hooks/useCreditCards";
import { useCCAdvances, type CCAdvance } from "../hooks/useCCAdvances";
import { useUserPreferences } from "../hooks/useUserPreferences";
import { useTheme } from "../contexts/ThemeContext";
import { formatCurrency, formatDate } from "../lib/formatters";
import {
  FiCreditCard,
  FiPlus,
  FiCheckCircle,
  FiCalendar,
  FiClock,
  FiRefreshCw,
  FiArrowRight,
  FiEdit2,
  FiTrash2,
  FiX,
  FiCheck,
  FiArchive,
  FiInfo,
  FiLayers,
  FiUsers,
} from "react-icons/fi";

type UnsettledExpense = {
  id: string;
  amount: number;
  date: string;
  item: string;
  description: string | null;
  category_id: number | null;
  account_type: string;
  paid_via_credit_card: boolean;
  credit_card_id: string | null;
  credit_card_name: string | null;
  cc_bill_settled: boolean;
  cc_funds_set_aside?: boolean;
  categories: { id: number; name: string } | null;
};

const CreditCards = () => {
  const {
    cards,
    addCard,
    updateCard,
    deleteCard,
    fetchDues,
    fetchSettlements,
    settleBill,
    unsettleBill,
    toggleFundsSetAside,
    settleAdvances,
    unsettleAdvances,
  } = useCreditCards();

  const {
    advances,
    loading: advancesLoading,
    fetchAdvances,
    addAdvance,
    markReceived,
    deleteAdvance,
  } = useCCAdvances();

  const { currencyStyle } = useUserPreferences();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // State
  const [activeCardId, setActiveCardId] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<"dues" | "advances" | "history">("dues");
  const [unsettledExpenses, setUnsettledExpenses] = useState<UnsettledExpense[]>([]);
  const [settlements, setSettlements] = useState<CreditCardSettlement[]>([]);
  const [loadingDues, setLoadingDues] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Checkbox selection for partial bill settlement
  const [selectedExpenseIds, setSelectedExpenseIds] = useState<string[]>([]);

  // Settle Modal State
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [settleDate, setSettleDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [settleNotes, setSettleNotes] = useState("");
  const [settling, setSettling] = useState(false);

  // Add / Edit Card Modal State
  const [showCardModal, setShowCardModal] = useState(false);
  const [editingCard, setEditingCard] = useState<CreditCard | null>(null);
  const [cardForm, setCardForm] = useState({
    name: "",
    bank_name: "",
    card_last4: "",
    credit_limit: "100000",
    billing_cycle_day: "1",
    payment_due_day: "20",
    color: "#8b5cf6",
  });
  const [savingCard, setSavingCard] = useState(false);

  // CC Advance Modal State
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [advanceForm, setAdvanceForm] = useState({
    person_name: "",
    amount: "",
    credit_card_id: "",
    credit_card_name: "",
    date: new Date().toISOString().slice(0, 10),
    description: "",
  });
  const [savingAdvance, setSavingAdvance] = useState(false);

  // CC Advances Settle State
  const [selectedAdvanceIds, setSelectedAdvanceIds] = useState<string[]>([]);
  const [showAdvanceSettleModal, setShowAdvanceSettleModal] = useState(false);
  const [advanceSettleDate, setAdvanceSettleDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [advanceSettleNotes, setAdvanceSettleNotes] = useState("");
  const [settlingAdvances, setSettlingAdvances] = useState(false);

  // Fetch dues
  const loadDues = async () => {
    setLoadingDues(true);
    setError("");
    try {
      const res = await fetchDues();
      setUnsettledExpenses(res?.expenses || []);
    } catch (err: any) {
      setError(err.message || "Failed to load dues");
    } finally {
      setLoadingDues(false);
    }
  };

  // Fetch settlement history
  const loadSettlements = async () => {
    setLoadingHistory(true);
    try {
      const data = await fetchSettlements();
      setSettlements(data || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadDues();
    loadSettlements();
  }, []);

  // Filtered expenses based on activeCardId
  const currentCard = cards.find((c) => c.id === activeCardId);

  const filteredExpenses = useMemo(() => {
    if (activeCardId === "all") return unsettledExpenses;
    return unsettledExpenses.filter(
      (e) => e.credit_card_id === activeCardId || e.credit_card_name === currentCard?.name
    );
  }, [unsettledExpenses, activeCardId, currentCard]);

  // Filtered advances based on activeCardId
  const filteredAdvances = useMemo(() => {
    if (activeCardId === "all") return advances;
    return advances.filter(
      (a) => a.credit_card_id === activeCardId || a.credit_card_name === currentCard?.name
    );
  }, [advances, activeCardId, currentCard]);


  // Sync selected checkboxes when filtered expenses change
  useEffect(() => {
    setSelectedExpenseIds(filteredExpenses.map((e) => e.id));
  }, [filteredExpenses]);

  // Aggregate stats across all cards
  const totalOutstandingDues = useMemo(() => {
    return cards.reduce((sum, c) => sum + Number(c.total_dues || 0), 0);
  }, [cards]);

  const totalCreditLimit = useMemo(() => {
    return cards.reduce((sum, c) => sum + Number(c.credit_limit || 0), 0);
  }, [cards]);

  const totalUtilizationPercent = useMemo(() => {
    if (totalCreditLimit <= 0) return 0;
    return Number(((totalOutstandingDues / totalCreditLimit) * 100).toFixed(1));
  }, [totalOutstandingDues, totalCreditLimit]);

  // Underlying Account Breakdown for the currently selected card / view
  const accountBreakdown = useMemo(() => {
    const map: Record<string, { total: number; count: number }> = {};
    for (const exp of filteredExpenses) {
      const acc = exp.account_type || "Unspecified";
      if (!map[acc]) map[acc] = { total: 0, count: 0 };
      map[acc].total += Number(exp.amount || 0);
      map[acc].count += 1;
    }
    return map;
  }, [filteredExpenses]);

  // Selected expenses total & breakdown
  const selectedExpenses = useMemo(() => {
    return filteredExpenses.filter((e) => selectedExpenseIds.includes(e.id));
  }, [filteredExpenses, selectedExpenseIds]);

  const selectedTotal = useMemo(() => {
    return selectedExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  }, [selectedExpenses]);

  const selectedBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    for (const exp of selectedExpenses) {
      const acc = exp.account_type || "Unspecified";
      map[acc] = (map[acc] || 0) + Number(exp.amount || 0);
    }
    return map;
  }, [selectedExpenses]);

  // Checkbox toggle helpers
  const handleToggleSelectAll = () => {
    if (selectedExpenseIds.length === filteredExpenses.length) {
      setSelectedExpenseIds([]);
    } else {
      setSelectedExpenseIds(filteredExpenses.map((e) => e.id));
    }
  };

  const handleToggleSelectExpense = (id: string) => {
    setSelectedExpenseIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Card Modal Handlers
  const handleOpenAddCard = () => {
    setEditingCard(null);
    setCardForm({ name: "", bank_name: "", card_last4: "", credit_limit: "100000", billing_cycle_day: "1", payment_due_day: "20", color: "#8b5cf6" });
    setShowCardModal(true);
  };

  const handleOpenEditCard = (card: CreditCard) => {
    setEditingCard(card);
    setCardForm({
      name: card.name,
      bank_name: card.bank_name || "",
      card_last4: card.card_last4 || "",
      credit_limit: String(card.credit_limit || 100000),
      billing_cycle_day: String(card.billing_cycle_day || 1),
      payment_due_day: String(card.payment_due_day || 20),
      color: card.color || "#8b5cf6",
    });
    setShowCardModal(true);
  };

  const handleSaveCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardForm.name.trim()) return;
    setSavingCard(true);
    setError("");
    try {
      if (editingCard) {
        await updateCard({ id: editingCard.id, name: cardForm.name.trim(), bank_name: cardForm.bank_name.trim() || undefined, card_last4: cardForm.card_last4.trim() || undefined, credit_limit: Number(cardForm.credit_limit) || 0, billing_cycle_day: Number(cardForm.billing_cycle_day) || 1, payment_due_day: Number(cardForm.payment_due_day) || 20, color: cardForm.color });
        setSuccess("Card updated successfully");
      } else {
        const created = await addCard({ name: cardForm.name.trim(), bank_name: cardForm.bank_name.trim() || undefined, card_last4: cardForm.card_last4.trim() || undefined, credit_limit: Number(cardForm.credit_limit) || 0, billing_cycle_day: Number(cardForm.billing_cycle_day) || 1, payment_due_day: Number(cardForm.payment_due_day) || 20, color: cardForm.color });
        if (created) setActiveCardId(created.id);
        setSuccess("Card added successfully");
      }
      setShowCardModal(false);
      setTimeout(() => setSuccess(""), 3000);
      loadDues();
    } catch (err: any) {
      setError(err.message || "Failed to save card");
    } finally {
      setSavingCard(false);
    }
  };

  const handleDeleteCard = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete card "${name}"?`)) return;
    try {
      await deleteCard(id);
      if (activeCardId === id) setActiveCardId("all");
      setSuccess("Card removed");
      setTimeout(() => setSuccess(""), 3000);
      loadDues();
    } catch (err: any) {
      setError(err.message || "Failed to delete card");
    }
  };

  // Settle Bill Handler
  const handleConfirmSettle = async () => {
    if (selectedExpenseIds.length === 0) return;
    const cardName = currentCard ? currentCard.name : "All Cards Combined";
    setSettling(true);
    setError("");
    try {
      await settleBill({ credit_card_id: currentCard ? currentCard.id : null, credit_card_name: cardName, expense_ids: selectedExpenseIds, settlement_date: settleDate, notes: settleNotes.trim() || undefined });
      setShowSettleModal(false);
      setSettleNotes("");
      setSuccess(`Statement settled! ${formatCurrency(selectedTotal, currencyStyle)} cleared across ${Object.keys(selectedBreakdown).length} budget accounts.`);
      setTimeout(() => setSuccess(""), 4000);
      loadDues();
      loadSettlements();
    } catch (err: any) {
      setError(err.message || "Failed to settle bill");
    } finally {
      setSettling(false);
    }
  };

  // Unsettle Bill Handler
  const handleUnsettle = async (settlementId: string) => {
    if (!window.confirm("Reopen this settled statement? The transactions will become unsettled again.")) return;
    try {
      await unsettleBill(settlementId);
      setSuccess("Statement reopened successfully");
      setTimeout(() => setSuccess(""), 3000);
      loadDues();
      loadSettlements();
    } catch (err: any) {
      setError(err.message || "Failed to reopen statement");
    }
  };

  const handleToggleExpenseFundsSetAside = async (expense: UnsettledExpense) => {
    try {
      const newValue = !expense.cc_funds_set_aside;
      await toggleFundsSetAside(expense.id, newValue);
      // Update local state for immediate UI response
      setUnsettledExpenses(prev => 
        prev.map(e => e.id === expense.id ? { ...e, cc_funds_set_aside: newValue } : e)
      );
    } catch (err: any) {
      setError(err.message || "Failed to update funds status");
    }
  };

  // CC Advance Handlers
  const handleOpenAdvanceModal = () => {
    const defaultCard = cards.find(c => c.id === activeCardId) || cards[0];
    setAdvanceForm({
      person_name: "",
      amount: "",
      credit_card_id: defaultCard?.id || "",
      credit_card_name: defaultCard?.name || "",
      date: new Date().toISOString().slice(0, 10),
      description: "",
    });
    setShowAdvanceModal(true);
  };

  const handleSaveAdvance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!advanceForm.person_name.trim() || !advanceForm.amount || !advanceForm.credit_card_name) return;
    setSavingAdvance(true);
    try {
      await addAdvance({
        person_name: advanceForm.person_name.trim(),
        amount: Number(advanceForm.amount),
        credit_card_id: advanceForm.credit_card_id || null,
        credit_card_name: advanceForm.credit_card_name,
        date: advanceForm.date,
        description: advanceForm.description.trim() || undefined,
      });
      setShowAdvanceModal(false);
      setSuccess("Advance logged successfully");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to log advance");
    } finally {
      setSavingAdvance(false);
    }
  };

  const handleToggleReceived = async (advance: CCAdvance) => {
    try {
      await markReceived(advance.id, !advance.cash_received);
      setSuccess(advance.cash_received ? "Marked as pending" : "Marked as cash received ✓");
      setTimeout(() => setSuccess(""), 2000);
    } catch (err: any) {
      setError(err.message || "Failed to update");
    }
  };

  const handleDeleteAdvance = async (id: string, personName: string) => {
    if (!window.confirm(`Delete advance for "${personName}"?`)) return;
    try {
      await deleteAdvance(id);
      setSuccess("Advance removed");
      setTimeout(() => setSuccess(""), 2000);
    } catch (err: any) {
      setError(err.message || "Failed to delete");
    }
  };

  // Advance selection handlers
  const pendingAdvances = filteredAdvances.filter(a => !(a as any).cc_bill_settled);

  const handleToggleSelectAdvance = (id: string) => {
    setSelectedAdvanceIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAllAdvances = () => {
    if (selectedAdvanceIds.length === pendingAdvances.length) {
      setSelectedAdvanceIds([]);
    } else {
      setSelectedAdvanceIds(pendingAdvances.map(a => a.id));
    }
  };

  const selectedAdvancesTotal = advances
    .filter(a => selectedAdvanceIds.includes(a.id))
    .reduce((sum, a) => sum + Number(a.amount || 0), 0);

  const handleConfirmSettleAdvances = async () => {
    if (selectedAdvanceIds.length === 0) return;
    setSettlingAdvances(true);
    try {
      const activeCard = cards.find(c => c.id === activeCardId);
      const cardName = activeCard?.name || cards[0]?.name || "Credit Card";
      const cardId = activeCard?.id || cards[0]?.id || null;
      await settleAdvances({
        credit_card_id: cardId,
        credit_card_name: cardName,
        advance_ids: selectedAdvanceIds,
        settlement_date: advanceSettleDate,
        notes: advanceSettleNotes,
      });
      setShowAdvanceSettleModal(false);
      setSelectedAdvanceIds([]);
      setAdvanceSettleNotes("");
      setSuccess(`Advances settled! ₹${selectedAdvancesTotal.toFixed(0)} cleared.`);
      setTimeout(() => setSuccess(""), 4000);
      fetchAdvances();
      loadSettlements();
    } catch (err: any) {
      setError(err.message || "Failed to settle advances");
    } finally {
      setSettlingAdvances(false);
    }
  };

  // Helper for due date calculation
  const getDueCountdown = (dueDay: number) => {
    const today = new Date();
    const currentDay = today.getDate();
    let daysLeft = dueDay - currentDay;
    if (daysLeft < 0) {
      const totalDaysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
      daysLeft = totalDaysInMonth - currentDay + dueDay;
    }
    return daysLeft;
  };

  // ── Theme-aware class helpers ──
  const cardBg = isDark ? "bg-slate-800/80 border-white/10" : "bg-white border-slate-200 shadow-sm";
  const textPrimary = isDark ? "text-white" : "text-slate-800";
  const textSecondary = isDark ? "text-slate-400" : "text-slate-500";
  const textMuted = isDark ? "text-slate-500" : "text-slate-400";
  const divider = isDark ? "border-white/10" : "border-slate-200";
  const rowHover = isDark ? "hover:bg-white/5" : "hover:bg-slate-50";
  const rowSelected = isDark ? "bg-emerald-500/10 hover:bg-emerald-500/15" : "bg-emerald-50 hover:bg-emerald-100/60";
  const theadBg = isDark ? "bg-slate-700/40" : "bg-slate-50";
  const inputClass = isDark
    ? "w-full rounded-xl border border-white/10 bg-slate-700/50 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500/40 outline-none"
    : "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500/30 outline-none";
  const modalBg = isDark ? "bg-slate-800/95 border border-white/10" : "bg-white border border-slate-200";
  const accountChip = isDark
    ? "rounded-xl border border-white/10 bg-slate-700/30 p-4 space-y-2 hover:border-emerald-500/30 transition-all"
    : "rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2 hover:border-emerald-400/50 transition-all";
  const tabBorder = isDark ? "border-white/10" : "border-slate-200";
  const cardSelectedBg = isDark
    ? "bg-slate-800 border-emerald-500/50 shadow-xl shadow-emerald-500/10 ring-2 ring-emerald-500/30"
    : "bg-emerald-50 border-emerald-400/60 shadow-lg shadow-emerald-200/50 ring-2 ring-emerald-300/40";
  const cardUnselectedBg = isDark
    ? "glass-card hover:border-white/20 hover:bg-slate-800/60"
    : "bg-white border border-slate-200 hover:border-emerald-300 hover:shadow-md";
  const progressTrack = isDark ? "bg-slate-700/60" : "bg-slate-200";
  const dueBadge = isDark ? "bg-slate-700/60 text-slate-300" : "bg-slate-100 text-slate-600";
  const categoryChip = isDark ? "bg-slate-700/50 text-slate-300" : "bg-slate-100 text-slate-600";
  const settlementCard = isDark ? "glass-card p-5 space-y-3 hover:border-white/20 transition-all" : "bg-white border border-slate-200 rounded-2xl p-5 space-y-3 hover:border-slate-300 shadow-sm transition-all";
  const breakdownChip = isDark ? "bg-slate-700/40 border border-white/10 text-slate-200" : "bg-slate-100 border border-slate-200 text-slate-700";

  return (
    <div className="pb-24 pt-8 md:pb-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in">
          <div>
            <div className="flex items-center gap-2 text-emerald-500 text-sm font-semibold uppercase tracking-wider mb-1">
              <FiCreditCard size={18} />
              Credit Cards Hub
            </div>
            <h1 className={`text-3xl sm:text-4xl font-bold font-heading tracking-tight ${textPrimary}`}>
              Cards & Statement Settlement
            </h1>
            <p className={`text-sm mt-1 ${textSecondary}`}>
              Track dues per card, collect exact amounts from budget accounts, and reconcile bills.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => { loadDues(); loadSettlements(); fetchAdvances(); }}
              className={`p-3 rounded-2xl border ${isDark ? "bg-slate-800/80 border-white/10 text-slate-300 hover:text-white hover:bg-slate-700/80" : "bg-white border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50"} transition-all`}
              title="Refresh"
            >
              <FiRefreshCw size={16} className={loadingDues || loadingHistory || advancesLoading ? "animate-spin" : ""} />
            </button>
            <button
              onClick={handleOpenAddCard}
              className="btn-primary flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-500/20"
            >
              <FiPlus size={18} />
              Add Credit Card
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-red-500 text-sm text-center animate-fade-in">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-2xl border border-green-500/20 bg-green-500/10 p-4 text-green-600 text-sm text-center animate-fade-in">
            {success}
          </div>
        )}

        {/* Top Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
          <div className={`rounded-2xl border p-5 relative overflow-hidden ${cardBg}`}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none" />
            <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${textSecondary}`}>Total Outstanding Dues</p>
            <p className="text-2xl sm:text-3xl font-bold font-heading text-emerald-500">
              {formatCurrency(totalOutstandingDues, currencyStyle)}
            </p>
            <p className={`text-xs mt-2 flex items-center gap-1.5 ${textSecondary}`}>
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Across {cards.length} registered cards
            </p>
          </div>

          <div className={`rounded-2xl border p-5 relative overflow-hidden ${cardBg}`}>
            <div className="flex items-center justify-between mb-1">
              <p className={`text-xs font-semibold uppercase tracking-wider ${textSecondary}`}>Credit Utilization</p>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                totalUtilizationPercent <= 30
                  ? "bg-emerald-500/15 text-emerald-500 border border-emerald-500/20"
                  : totalUtilizationPercent <= 50
                  ? "bg-amber-500/15 text-amber-500 border border-amber-500/20"
                  : "bg-red-500/15 text-red-500 border border-red-500/20"
              }`}>
                {totalUtilizationPercent <= 30 ? "Optimal (<30%)" : totalUtilizationPercent <= 50 ? "Moderate" : "High Alert"}
              </span>
            </div>
            <p className={`text-2xl sm:text-3xl font-bold font-heading ${textPrimary}`}>{totalUtilizationPercent}%</p>
            <div className={`w-full h-2 rounded-full mt-2.5 overflow-hidden ${progressTrack}`}>
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  totalUtilizationPercent <= 30 ? "bg-emerald-500" : totalUtilizationPercent <= 50 ? "bg-amber-500" : "bg-red-500"
                }`}
                style={{ width: `${Math.min(100, totalUtilizationPercent)}%` }}
              />
            </div>
            <p className={`text-[11px] mt-1.5 ${textSecondary}`}>Limit: {formatCurrency(totalCreditLimit, currencyStyle)}</p>
          </div>

          <div className={`rounded-2xl border p-5 ${cardBg}`}>
            <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${textSecondary}`}>Active Budget Envelopes</p>
            <p className={`text-2xl sm:text-3xl font-bold font-heading ${textPrimary}`}>{Object.keys(accountBreakdown).length} Accounts</p>
            <p className={`text-xs mt-2 ${textSecondary}`}>Ready to collect on bill generation</p>
          </div>

          <div className={`rounded-2xl border p-5 ${cardBg}`}>
            <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${textSecondary}`}>Statements Settled</p>
            <p className="text-2xl sm:text-3xl font-bold font-heading text-emerald-500">{settlements.length} Bills</p>
            <p className={`text-xs mt-2 ${textSecondary}`}>All reconciled without double deduction</p>
          </div>
        </div>

        {/* Cards Carousel / Selector */}
        <div className="space-y-3 animate-fade-in">
          <div className="flex items-center justify-between">
            <h3 className={`text-sm font-bold uppercase tracking-wider flex items-center gap-2 ${textSecondary}`}>
              <FiCreditCard size={14} /> Your Cards
            </h3>
            {cards.length > 0 && <span className={`text-xs ${textMuted}`}>Click a card to filter dues & accounts</span>}
          </div>

          {cards.length === 0 ? (
            <div className={`rounded-2xl border p-8 text-center space-y-3 ${cardBg}`}>
              <div className="inline-flex p-3 rounded-2xl bg-emerald-500/10 text-emerald-500">
                <FiCreditCard size={28} />
              </div>
              <h4 className={`text-base font-bold ${textPrimary}`}>No Credit Cards Added</h4>
              <p className={`text-sm max-w-md mx-auto ${textSecondary}`}>
                Add your credit cards with credit limits and billing cycle dates to start tracking dues and utilization.
              </p>
              <button onClick={handleOpenAddCard} className="btn-primary rounded-xl px-5 py-2.5 text-sm font-bold text-white inline-flex items-center gap-2 mt-2">
                <FiPlus size={16} /> Add Your First Card
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {/* "All Cards" Card */}
              <div
                onClick={() => setActiveCardId("all")}
                className={`cursor-pointer rounded-2xl p-5 border transition-all relative overflow-hidden ${activeCardId === "all" ? cardSelectedBg : cardUnselectedBg}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-xs font-bold uppercase tracking-wider ${textSecondary}`}>Combined</span>
                  <span className="text-xs font-mono font-bold text-emerald-500">{cards.length} Cards</span>
                </div>
                <h4 className={`text-lg font-bold ${textPrimary}`}>All Cards Overview</h4>
                <p className={`text-xs mt-1 ${textSecondary}`}>Total pending across all cards</p>
                <div className={`mt-4 pt-3 border-t flex items-end justify-between ${divider}`}>
                  <div>
                    <span className={`text-[10px] uppercase font-semibold ${textSecondary}`}>Total Dues</span>
                    <p className="text-xl font-bold font-heading text-emerald-500">{formatCurrency(totalOutstandingDues, currencyStyle)}</p>
                  </div>
                  <span className="text-xs text-emerald-500 font-semibold flex items-center gap-1">View All <FiArrowRight size={12} /></span>
                </div>
              </div>

              {/* Individual Card Items */}
              {cards.map((card) => {
                const isSelected = activeCardId === card.id;
                const cardDues = card.total_dues || 0;
                const cardLimit = Number(card.credit_limit || 0);
                const cardUtil = cardLimit > 0 ? (cardDues / cardLimit) * 100 : 0;
                const daysUntilDue = getDueCountdown(card.payment_due_day || 20);

                return (
                  <div
                    key={card.id}
                    onClick={() => setActiveCardId(card.id)}
                    className={`cursor-pointer rounded-2xl p-5 border transition-all relative overflow-hidden group ${isSelected ? cardSelectedBg : cardUnselectedBg}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-xs font-bold uppercase tracking-wider truncate ${textSecondary}`}>{card.bank_name || "Credit Card"}</span>
                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleOpenEditCard(card); }}
                          className={`p-1 rounded-lg transition-colors ${isDark ? "hover:bg-white/10 text-slate-400 hover:text-white" : "hover:bg-slate-100 text-slate-400 hover:text-slate-700"}`}
                          title="Edit Card"
                        >
                          <FiEdit2 size={13} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteCard(card.id, card.name); }}
                          className="p-1 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-500 transition-colors"
                          title="Delete Card"
                        >
                          <FiTrash2 size={13} />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-baseline gap-2">
                      <h4 className={`text-base font-bold truncate ${textPrimary}`}>{card.name}</h4>
                      {card.card_last4 && <span className={`text-xs font-mono ${textSecondary}`}>••{card.card_last4}</span>}
                    </div>

                    <div className={`mt-2 flex items-center justify-between text-[11px] ${textSecondary}`}>
                      <span className="flex items-center gap-1"><FiCalendar size={11} /> Bill: {card.billing_cycle_day}th</span>
                      <span className={`font-semibold px-1.5 py-0.5 rounded ${daysUntilDue <= 5 ? "bg-red-500/15 text-red-500" : dueBadge}`}>
                        <FiClock className="inline mr-0.5" size={10} /> Due in {daysUntilDue}d
                      </span>
                    </div>

                    <div className="mt-3">
                      <div className={`flex justify-between text-[10px] mb-1 ${textSecondary}`}>
                        <span>Utilization</span>
                        <span className={cardUtil > 30 ? "text-amber-500 font-bold" : "text-emerald-500 font-bold"}>
                          {cardUtil.toFixed(1)}% {cardUtil > 30 && "⚠️"}
                        </span>
                      </div>
                      <div className={`w-full h-1.5 rounded-full overflow-hidden ${progressTrack}`}>
                        <div className={`h-full rounded-full transition-all duration-300 ${cardUtil <= 30 ? "bg-emerald-500" : cardUtil <= 50 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${Math.min(100, cardUtil)}%` }} />
                      </div>
                    </div>

                    <div className={`mt-3 pt-2.5 border-t flex items-baseline justify-between ${divider}`}>
                      <span className={`text-[10px] uppercase font-semibold ${textSecondary}`}>Outstanding</span>
                      <span className="text-lg font-bold font-heading text-emerald-500">{formatCurrency(cardDues, currencyStyle)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Navigation Tabs */}
        <div className={`flex border-b gap-6 ${tabBorder}`}>
          <button
            onClick={() => setActiveTab("dues")}
            className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${activeTab === "dues" ? "border-emerald-500 text-emerald-500" : `border-transparent ${textSecondary} hover:${textPrimary}`}`}
          >
            <FiLayers size={16} />
            Active Dues & Settlement
            {unsettledExpenses.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-emerald-500/20 text-emerald-500">{filteredExpenses.length}</span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("advances")}
            className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${activeTab === "advances" ? "border-blue-500 text-blue-500" : `border-transparent ${textSecondary} hover:${textPrimary}`}`}
          >
            <FiUsers size={16} />
            CC Advances
            {pendingAdvances.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-blue-500/20 text-blue-500">{pendingAdvances.length}</span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${activeTab === "history" ? "border-emerald-500 text-emerald-500" : `border-transparent ${textSecondary} hover:${textPrimary}`}`}
          >
            <FiArchive size={16} />
            Settlement History
            {settlements.length > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-mono ${isDark ? "bg-slate-700 text-slate-300" : "bg-slate-100 text-slate-600"}`}>{settlements.length}</span>
            )}
          </button>
        </div>

        {/* ── DUES TAB ── */}
        {activeTab === "dues" && (
          <div className="space-y-8 animate-fade-in">
            {/* Account Collection Summary */}
            <div className={`rounded-2xl border border-emerald-500/20 p-6 relative overflow-hidden ${isDark ? "bg-emerald-500/5" : "bg-emerald-50"}`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <div>
                  <h3 className={`text-lg font-bold font-heading flex items-center gap-2 ${textPrimary}`}>
                    <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-500"><FiCheckCircle size={18} /></span>
                    Money to Collect from Budget Accounts
                  </h3>
                  <p className={`text-xs mt-1 ${textSecondary}`}>
                    These amounts were already deducted from each account when you swiped your card. Collect them to pay your bill.
                  </p>
                </div>
                {Object.keys(accountBreakdown).length > 0 && (
                  <div className="text-right">
                    <span className={`text-[11px] uppercase font-semibold ${textSecondary}`}>Total to Pay</span>
                    <p className="text-xl font-bold font-heading text-emerald-500">
                      {formatCurrency(Object.values(accountBreakdown).reduce((sum, a) => sum + a.total, 0), currencyStyle)}
                    </p>
                  </div>
                )}
              </div>

              {Object.keys(accountBreakdown).length === 0 ? (
                <div className={`p-6 text-center text-sm ${textSecondary}`}>🎉 No pending credit card charges! All charges are settled.</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
                  {Object.entries(accountBreakdown).map(([accountName, data]) => (
                    <div key={accountName} className={accountChip}>
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold uppercase tracking-wide ${textPrimary}`}>{accountName}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${isDark ? "bg-slate-700 text-slate-300" : "bg-white border border-slate-200 text-slate-600"}`}>
                          {data.count} {data.count === 1 ? "item" : "items"}
                        </span>
                      </div>
                      <p className={`text-2xl font-bold font-heading ${textPrimary}`}>{formatCurrency(data.total, currencyStyle)}</p>
                      <p className="text-[11px] text-emerald-500 flex items-center gap-1"><FiArrowRight size={10} /> Collect for credit card bill</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Selectable Transactions Table */}
            <div className={`rounded-2xl border overflow-hidden ${cardBg}`}>
              <div className={`p-4 sm:p-6 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${divider}`}>
                <div>
                  <h3 className={`text-base font-bold flex items-center gap-2 ${textPrimary}`}>
                    Unsettled Statement Transactions
                    <span className={`text-xs font-mono font-normal ${textSecondary}`}>({selectedExpenseIds.length} of {filteredExpenses.length} selected)</span>
                  </h3>
                  <p className={`text-xs mt-0.5 ${textSecondary}`}>Select transactions that appear on your generated statement to settle them together.</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleToggleSelectAll}
                    className={`px-3.5 py-2 rounded-xl border text-xs font-semibold transition-colors ${isDark ? "border-white/10 text-slate-300 hover:bg-white/5" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                  >
                    {selectedExpenseIds.length === filteredExpenses.length ? "Deselect All" : "Select All"}
                  </button>
                  <button
                    type="button"
                    disabled={selectedExpenseIds.length === 0}
                    onClick={() => setShowSettleModal(true)}
                    className="btn-primary rounded-xl px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-500/20 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <FiCheck size={14} /> Settle Bill ({formatCurrency(selectedTotal, currencyStyle)})
                  </button>
                </div>
              </div>

              {filteredExpenses.length === 0 ? (
                <div className={`p-12 text-center text-sm ${textSecondary}`}>No unsettled expenses found for this selection.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className={`border-b text-left text-xs font-semibold uppercase tracking-wider ${textSecondary} ${theadBg} ${divider}`}>
                        <th className="px-6 py-4 w-12 text-center">
                          <input
                            type="checkbox"
                            checked={filteredExpenses.length > 0 && selectedExpenseIds.length === filteredExpenses.length}
                            onChange={handleToggleSelectAll}
                            className="w-4 h-4 rounded cursor-pointer accent-emerald-500"
                          />
                        </th>
                        <th className="px-6 py-4">Date</th>
                        <th className="px-6 py-4">Item & Notes</th>
                        <th className="px-6 py-4">Budget Account</th>
                        <th className="px-6 py-4">Card Used</th>
                        <th className="px-6 py-4">Category</th>
                        <th className="px-6 py-4 text-center">Funds Moved?</th>
                        <th className="px-6 py-4 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${divider}`}>
                      {filteredExpenses.map((expense) => {
                        const isSelected = selectedExpenseIds.includes(expense.id);
                        return (
                          <tr
                            key={expense.id}
                            onClick={() => handleToggleSelectExpense(expense.id)}
                            className={`cursor-pointer transition-colors ${isSelected ? rowSelected : rowHover}`}
                          >
                            <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleSelectExpense(expense.id)}
                                className="w-4 h-4 rounded cursor-pointer accent-emerald-500"
                              />
                            </td>
                            <td className={`px-6 py-4 text-sm whitespace-nowrap ${textSecondary}`}>{formatDate(expense.date)}</td>
                            <td className={`px-6 py-4 text-sm font-medium ${textPrimary}`}>
                              <div>{expense.item}</div>
                              {expense.description && <div className={`text-xs font-normal ${textSecondary}`}>{expense.description}</div>}
                            </td>
                            <td className="px-6 py-4 text-sm">
                              <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-600">
                                {expense.account_type}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-500/10 border border-emerald-500/20 text-emerald-600">
                                <FiCreditCard size={12} /> {expense.credit_card_name || "Credit Card"}
                              </span>
                            </td>
                            <td className={`px-6 py-4 text-sm ${textSecondary}`}>
                              {expense.categories ? (
                                <span className={`text-xs px-2 py-0.5 rounded ${categoryChip}`}>{expense.categories.name}</span>
                              ) : "-"}
                            </td>
                            <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => handleToggleExpenseFundsSetAside(expense)}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                  expense.cc_funds_set_aside
                                    ? "bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 hover:bg-emerald-500/25"
                                    : `${isDark ? "bg-slate-700/60 text-slate-400 border border-white/10 hover:bg-slate-700" : "bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100"}`
                                }`}
                              >
                                {expense.cc_funds_set_aside ? <><FiCheckCircle size={12} /> Moved</> : "⏳ Pending"}
                              </button>
                            </td>
                            <td className="px-6 py-4 text-sm font-bold text-right text-red-500 font-mono whitespace-nowrap">
                              {formatCurrency(expense.amount, currencyStyle)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── CC ADVANCES TAB ── */}
        {activeTab === "advances" && (
          <div className="space-y-6 animate-fade-in">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className={`rounded-2xl border p-5 ${cardBg}`}>
                <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${textSecondary}`}>Pending Collection</p>
                <p className={`text-2xl font-bold font-heading text-amber-500`}>{formatCurrency(filteredAdvances.filter(a => !a.cash_received && !(a as any).cc_bill_settled).reduce((s,a) => s + Number(a.amount), 0), currencyStyle)}</p>
                <p className={`text-xs mt-1 ${textSecondary}`}>{filteredAdvances.filter(a => !a.cash_received && !(a as any).cc_bill_settled).length} awaiting cash</p>
              </div>
              <div className={`rounded-2xl border p-5 ${cardBg}`}>
                <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${textSecondary}`}>Cash Collected</p>
                <p className="text-2xl font-bold font-heading text-emerald-500">{formatCurrency(filteredAdvances.filter(a => a.cash_received && !(a as any).cc_bill_settled).reduce((s,a) => s + Number(a.amount), 0), currencyStyle)}</p>
                <p className={`text-xs mt-1 ${textSecondary}`}>{filteredAdvances.filter(a => a.cash_received && !(a as any).cc_bill_settled).length} received — ready to settle</p>
              </div>
              <div className={`rounded-2xl border p-5 ${cardBg}`}>
                <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${textSecondary}`}>Bill Settled</p>
                <p className="text-2xl font-bold font-heading text-slate-400">{formatCurrency(filteredAdvances.filter(a => (a as any).cc_bill_settled).reduce((s,a) => s + Number(a.amount), 0), currencyStyle)}</p>
                <p className={`text-xs mt-1 ${textSecondary}`}>{filteredAdvances.filter(a => (a as any).cc_bill_settled).length} settled with bill</p>
              </div>
            </div>

            {/* Info Banner */}
            <div className={`rounded-2xl border border-blue-500/20 p-4 flex items-start gap-3 ${isDark ? "bg-blue-500/5" : "bg-blue-50"}`}>
              <FiInfo className="text-blue-500 flex-shrink-0 mt-0.5" size={16} />
              <div>
                <p className={`text-sm font-semibold ${isDark ? "text-blue-300" : "text-blue-700"}`}>How CC Advances Work</p>
                <p className={`text-xs mt-0.5 ${isDark ? "text-blue-300/70" : "text-blue-600/80"}`}>
                  When you pay for someone using your credit card, log it here. Once they pay you back, mark "Cash Received". 
                  After you pay your CC bill, select the advances and click "Settle Advances" — they'll be archived in Settlement History.
                </p>
              </div>
            </div>

            {/* Advances Table */}
            <div className={`rounded-2xl border overflow-hidden ${cardBg}`}>
              <div className={`p-4 sm:p-6 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${divider}`}>
                <div>
                  <h3 className={`text-base font-bold flex items-center gap-2 ${textPrimary}`}>
                    Unsettled Advances
                    <span className={`text-xs font-mono font-normal ${textSecondary}`}>({selectedAdvanceIds.length} of {pendingAdvances.length} selected)</span>
                  </h3>
                  <p className={`text-xs mt-0.5 ${textSecondary}`}>Select advances included in your paid bill and mark them as settled.</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleOpenAdvanceModal}
                    disabled={cards.length === 0}
                    className={`px-4 py-2.5 rounded-xl border text-xs font-semibold transition-colors flex items-center gap-2 ${isDark ? "border-white/10 text-slate-300 hover:bg-white/5" : "border-slate-200 text-slate-600 hover:bg-slate-50"} disabled:opacity-40 disabled:cursor-not-allowed`}
                  >
                    <FiPlus size={14} /> Log Advance
                  </button>
                  <button
                    type="button"
                    disabled={selectedAdvanceIds.length === 0}
                    onClick={() => setShowAdvanceSettleModal(true)}
                    className="btn-primary rounded-xl px-5 py-2.5 text-xs font-bold text-white shadow-lg disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <FiCheck size={14} /> Settle Advances ({formatCurrency(selectedAdvancesTotal, currencyStyle)})
                  </button>
                </div>
              </div>

              {pendingAdvances.length === 0 ? (
                <div className={`p-12 text-center space-y-2 ${textSecondary}`}>
                  <FiUsers size={32} className="mx-auto opacity-30" />
                  <p className="text-sm">No unsettled advances. All cleared!</p>
                  <p className="text-xs opacity-70">Settled advances are archived in Settlement History.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className={`border-b text-left text-xs font-semibold uppercase tracking-wider ${textSecondary} ${theadBg} ${divider}`}>
                        <th className="px-6 py-4 w-12 text-center">
                          <input
                            type="checkbox"
                            checked={pendingAdvances.length > 0 && selectedAdvanceIds.length === pendingAdvances.length}
                            onChange={handleToggleSelectAllAdvances}
                            className="w-4 h-4 rounded cursor-pointer accent-emerald-500"
                          />
                        </th>
                        <th className="px-6 py-4">Person</th>
                        <th className="px-6 py-4">Description</th>
                        <th className="px-6 py-4">Card Used</th>
                        <th className="px-6 py-4">Date</th>
                        <th className="px-6 py-4">Amount</th>
                        <th className="px-6 py-4 text-center">Cash Received?</th>
                        <th className="px-6 py-4 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${divider}`}>
                      {pendingAdvances.map((advance) => {
                        const isSelected = selectedAdvanceIds.includes(advance.id);
                        return (
                          <tr key={advance.id} onClick={() => handleToggleSelectAdvance(advance.id)} className={`cursor-pointer transition-colors ${isSelected ? rowSelected : rowHover}`}>
                            <td className="px-6 py-4 text-center" onClick={e => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleSelectAdvance(advance.id)}
                                className="w-4 h-4 rounded cursor-pointer accent-emerald-500"
                              />
                            </td>
                            <td className={`px-6 py-4 text-sm font-semibold ${textPrimary}`}>
                              <div className="flex items-center gap-2">
                                <span className="w-7 h-7 rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center text-xs font-bold">
                                  {advance.person_name[0].toUpperCase()}
                                </span>
                                {advance.person_name}
                              </div>
                            </td>
                            <td className={`px-6 py-4 text-sm ${textSecondary}`}>{advance.description || "—"}</td>
                            <td className="px-6 py-4 text-sm">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-500/10 border border-emerald-500/20 text-emerald-600">
                                <FiCreditCard size={12} /> {advance.credit_card_name}
                              </span>
                            </td>
                            <td className={`px-6 py-4 text-sm whitespace-nowrap ${textSecondary}`}>{formatDate(advance.date)}</td>
                            <td className="px-6 py-4 text-sm font-bold text-blue-500 font-mono">{formatCurrency(advance.amount, currencyStyle)}</td>
                            <td className="px-6 py-4 text-center" onClick={e => e.stopPropagation()}>
                              <button
                                onClick={() => handleToggleReceived(advance)}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                  advance.cash_received
                                    ? "bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 hover:bg-emerald-500/25"
                                    : `${isDark ? "bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20" : "bg-amber-50 text-amber-600 border border-amber-300 hover:bg-amber-100"}`
                                }`}
                              >
                                {advance.cash_received ? <><FiCheckCircle size={12} /> Received</> : "⏳ Pending"}
                              </button>
                            </td>
                            <td className="px-6 py-4 text-center" onClick={e => e.stopPropagation()}>
                              <button
                                onClick={() => handleDeleteAdvance(advance.id, advance.person_name)}
                                className="p-1.5 rounded-lg hover:bg-red-500/15 text-slate-400 hover:text-red-500 transition-colors"
                              >
                                <FiTrash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── SETTLEMENT HISTORY TAB ── */}
        {activeTab === "history" && (
          <div className="space-y-4 animate-fade-in">
            {settlements.length === 0 ? (
              <div className={`rounded-2xl border p-12 text-center text-sm ${cardBg} ${textSecondary}`}>
                No statement settlements recorded yet. Once you settle a bill, its archived receipt and account breakdown will appear here.
              </div>
            ) : (
              settlements.map((settlement) => {
                const breakdown = settlement.breakdown || {};
                const isAdvanceSettlement = settlement.notes?.startsWith('[ADVANCES]');
                const displayNotes = isAdvanceSettlement
                  ? (settlement.notes?.replace('[ADVANCES]', '').trim() || null)
                  : settlement.notes;
                return (
                  <div key={settlement.id} className={settlementCard}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`p-1.5 rounded-lg ${isAdvanceSettlement ? "bg-blue-500/20 text-blue-500" : "bg-emerald-500/20 text-emerald-500"}`}><FiCheckCircle size={16} /></span>
                          <h4 className={`text-base font-bold ${textPrimary}`}>{settlement.credit_card_name}</h4>
                          {isAdvanceSettlement && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-500 border border-blue-500/20">CC ADVANCES</span>
                          )}
                          <span className={`text-xs px-2 py-0.5 rounded font-mono ${isDark ? "bg-slate-700/60 text-slate-300" : "bg-slate-100 text-slate-600"}`}>
                            {formatDate(settlement.settlement_date)}
                          </span>
                        </div>
                        {displayNotes && <p className={`text-xs mt-1 pl-8 ${textSecondary}`}>Note: {displayNotes}</p>}
                      </div>

                      <div className="flex items-center gap-4 pl-8 sm:pl-0">
                        <div className="text-right">
                          <span className={`text-[10px] uppercase font-semibold ${textSecondary}`}>Amount</span>
                          <p className="text-xl font-bold font-heading text-emerald-500 font-mono">{formatCurrency(settlement.total_amount, currencyStyle)}</p>
                        </div>
                        <button
                          onClick={() => isAdvanceSettlement ? unsettleAdvances(settlement.id) : handleUnsettle(settlement.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs transition-all ${isDark ? "text-slate-400 hover:text-red-400 hover:bg-red-500/10" : "text-slate-500 hover:text-red-500 hover:bg-red-50"}`}
                          title="Reopen"
                        >
                          Reopen
                        </button>
                      </div>
                    </div>

                    <div className={`pt-3 border-t flex flex-wrap items-center gap-2 pl-8 ${divider}`}>
                      <span className={`text-xs font-medium ${textSecondary}`}>{isAdvanceSettlement ? "Persons:" : "Collected From:"}</span>
                      {Object.entries(breakdown).map(([acc, amt]) => (
                        <span key={acc} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${breakdownChip}`}>
                          <span className="text-emerald-500">{acc}:</span>
                          <span className={`font-mono ${textPrimary}`}>{formatCurrency(Number(amt), currencyStyle)}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ── Settle Bill Modal ── */}
        {showSettleModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className={`max-w-lg w-full p-6 space-y-5 rounded-2xl shadow-2xl ${modalBg}`}>
              <div className={`flex items-center justify-between border-b pb-3 ${divider}`}>
                <h3 className={`text-lg font-bold flex items-center gap-2 ${textPrimary}`}>
                  <FiCheckCircle className="text-emerald-500" /> Settle Credit Card Statement
                </h3>
                <button type="button" onClick={() => setShowSettleModal(false)} className={`p-1.5 rounded-lg transition-colors ${isDark ? "hover:bg-white/10 text-slate-400 hover:text-white" : "hover:bg-slate-100 text-slate-400 hover:text-slate-700"}`}>
                  <FiX size={16} />
                </button>
              </div>

              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-1">
                <div className="flex justify-between items-baseline">
                  <span className="text-xs text-emerald-500 font-semibold uppercase">Total Statement Bill</span>
                  <span className={`text-2xl font-bold font-heading ${textPrimary}`}>{formatCurrency(selectedTotal, currencyStyle)}</span>
                </div>
                <p className={`text-xs ${isDark ? "text-emerald-300/80" : "text-emerald-600/80"}`}>
                  {selectedExpenseIds.length} transactions included for {currentCard ? currentCard.name : "All Cards"}.
                </p>
              </div>

              <div className="space-y-2">
                <p className={`text-xs font-semibold uppercase tracking-wider ${textSecondary}`}>Amounts Collected from Budget Accounts:</p>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                  {Object.entries(selectedBreakdown).map(([acc, amt]) => (
                    <div key={acc} className={`flex items-center justify-between p-2.5 rounded-lg text-xs ${isDark ? "bg-slate-700/40 border border-white/5" : "bg-slate-50 border border-slate-200"}`}>
                      <span className={`font-medium truncate ${textSecondary}`}>{acc}</span>
                      <span className={`font-bold font-mono ${textPrimary}`}>{formatCurrency(amt, currencyStyle)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className={`block text-xs font-medium mb-1 ${textSecondary}`}>Bill Payment Date</label>
                  <input type="date" value={settleDate} onChange={(e) => setSettleDate(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={`block text-xs font-medium mb-1 ${textSecondary}`}>Notes / Payment Reference (Optional)</label>
                  <input type="text" placeholder="e.g. Paid in full via Netbanking ref #1234" value={settleNotes} onChange={(e) => setSettleNotes(e.target.value)} className={inputClass} />
                </div>
              </div>

              <div className={`p-3 rounded-xl text-xs flex items-start gap-2 ${isDark ? "bg-slate-700/40 border border-white/5 text-slate-400" : "bg-slate-50 border border-slate-200 text-slate-500"}`}>
                <FiInfo className="text-emerald-500 flex-shrink-0 mt-0.5" size={14} />
                <span><strong>No double deduction:</strong> Because these expenses were already deducted from your account balances when created, settling simply clears the credit card bill and archives the statement.</span>
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowSettleModal(false)} className={`flex-1 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${isDark ? "border-white/10 text-slate-300 hover:bg-white/5" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>Cancel</button>
                <button type="button" disabled={settling} onClick={handleConfirmSettle} className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold shadow-lg shadow-emerald-500/20 disabled:opacity-50">
                  {settling ? "Settling..." : "Confirm & Settle"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Settle Advances Modal ── */}
        {showAdvanceSettleModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className={`max-w-lg w-full p-6 space-y-5 rounded-2xl shadow-2xl ${modalBg}`}>
              <div className={`flex items-center justify-between border-b pb-3 ${divider}`}>
                <h3 className={`text-lg font-bold flex items-center gap-2 ${textPrimary}`}>
                  <FiCheckCircle className="text-emerald-500" /> Settle CC Advances
                </h3>
                <button type="button" onClick={() => setShowAdvanceSettleModal(false)} className={`p-1.5 rounded-lg transition-colors ${isDark ? "hover:bg-white/10 text-slate-400 hover:text-white" : "hover:bg-slate-100 text-slate-400 hover:text-slate-700"}`}>
                  <FiX size={16} />
                </button>
              </div>

              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-1">
                <div className="flex justify-between items-baseline">
                  <span className="text-xs text-emerald-600 font-semibold uppercase">Total Advances Being Settled</span>
                  <span className={`text-2xl font-bold font-heading ${textPrimary}`}>{formatCurrency(selectedAdvancesTotal, currencyStyle)}</span>
                </div>
                <p className={`text-xs ${isDark ? "text-emerald-300/80" : "text-emerald-600/80"}`}>
                  {selectedAdvanceIds.length} advance{selectedAdvanceIds.length !== 1 ? "s" : ""} — these will be archived in Settlement History.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className={`block text-xs font-medium mb-1 ${textSecondary}`}>Bill Payment Date</label>
                  <input type="date" value={advanceSettleDate} onChange={(e) => setAdvanceSettleDate(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={`block text-xs font-medium mb-1 ${textSecondary}`}>Notes (Optional)</label>
                  <input type="text" placeholder="e.g. Paid via Netbanking" value={advanceSettleNotes} onChange={(e) => setAdvanceSettleNotes(e.target.value)} className={inputClass} />
                </div>
              </div>

              <div className={`p-3 rounded-xl text-xs flex items-start gap-2 ${isDark ? "bg-slate-700/40 border border-white/5 text-slate-400" : "bg-slate-50 border border-slate-200 text-slate-500"}`}>
                <FiInfo className="text-emerald-500 flex-shrink-0 mt-0.5" size={14} />
                <span>These advances will move to <strong>Settlement History</strong> and will no longer count towards your outstanding dues.</span>
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowAdvanceSettleModal(false)} className={`flex-1 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${isDark ? "border-white/10 text-slate-300 hover:bg-white/5" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>Cancel</button>
                <button type="button" disabled={settlingAdvances} onClick={handleConfirmSettleAdvances} className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold shadow-lg shadow-emerald-500/20 disabled:opacity-50">
                  {settlingAdvances ? "Settling..." : "Confirm & Settle"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Add Advance Modal ── */}
        {showAdvanceModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className={`max-w-md w-full p-6 space-y-5 rounded-2xl shadow-2xl ${modalBg}`}>
              <div className={`flex items-center justify-between border-b pb-3 ${divider}`}>
                <h3 className={`text-lg font-bold flex items-center gap-2 ${textPrimary}`}>
                  <FiUsers className="text-blue-500" /> Log CC Advance
                </h3>
                <button type="button" onClick={() => setShowAdvanceModal(false)} className={`p-1.5 rounded-lg transition-colors ${isDark ? "hover:bg-white/10 text-slate-400 hover:text-white" : "hover:bg-slate-100 text-slate-400 hover:text-slate-700"}`}>
                  <FiX size={16} />
                </button>
              </div>

              <form onSubmit={handleSaveAdvance} className="space-y-4">
                <div>
                  <label className={`block text-xs font-medium mb-1 ${textSecondary}`}>Person Name *</label>
                  <input type="text" required placeholder="e.g., Rahul, Mom, Friend" value={advanceForm.person_name} onChange={(e) => setAdvanceForm({ ...advanceForm, person_name: e.target.value })} className={inputClass} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={`block text-xs font-medium mb-1 ${textSecondary}`}>Amount (₹) *</label>
                    <input type="number" required min="1" placeholder="e.g., 2000" value={advanceForm.amount} onChange={(e) => setAdvanceForm({ ...advanceForm, amount: e.target.value })} className={inputClass} />
                  </div>
                  <div>
                    <label className={`block text-xs font-medium mb-1 ${textSecondary}`}>Date *</label>
                    <input type="date" required value={advanceForm.date} onChange={(e) => setAdvanceForm({ ...advanceForm, date: e.target.value })} className={inputClass} />
                  </div>
                </div>

                <div>
                  <label className={`block text-xs font-medium mb-1 ${textSecondary}`}>Credit Card Used *</label>
                  <select
                    required
                    value={advanceForm.credit_card_id}
                    onChange={(e) => {
                      const card = cards.find(c => c.id === e.target.value);
                      setAdvanceForm({ ...advanceForm, credit_card_id: e.target.value, credit_card_name: card?.name || "" });
                    }}
                    className={inputClass}
                  >
                    <option value="">Select a card...</option>
                    {cards.map(c => <option key={c.id} value={c.id}>{c.name}{c.card_last4 ? ` (••${c.card_last4})` : ""}</option>)}
                  </select>
                </div>

                <div>
                  <label className={`block text-xs font-medium mb-1 ${textSecondary}`}>Description (Optional)</label>
                  <input type="text" placeholder="e.g., Dinner at restaurant, Movie tickets" value={advanceForm.description} onChange={(e) => setAdvanceForm({ ...advanceForm, description: e.target.value })} className={inputClass} />
                </div>

                <div className={`p-3 rounded-xl text-xs flex items-start gap-2 ${isDark ? "bg-blue-500/10 border border-blue-500/20 text-blue-300" : "bg-blue-50 border border-blue-200 text-blue-700"}`}>
                  <FiInfo size={13} className="flex-shrink-0 mt-0.5" />
                  <span>This amount will be tracked under your CC bill but will NOT be deducted from any of your budget accounts since it is not your expense.</span>
                </div>

                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={() => setShowAdvanceModal(false)} className={`flex-1 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${isDark ? "border-white/10 text-slate-300 hover:bg-white/5" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>Cancel</button>
                  <button type="submit" disabled={savingAdvance || !advanceForm.person_name.trim() || !advanceForm.amount || !advanceForm.credit_card_name} className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold shadow-lg shadow-blue-500/20 disabled:opacity-50">
                    {savingAdvance ? "Logging..." : "Log Advance"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── Add / Edit Card Modal ── */}
        {showCardModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className={`max-w-md w-full p-6 space-y-5 rounded-2xl shadow-2xl ${modalBg}`}>
              <div className={`flex items-center justify-between border-b pb-3 ${divider}`}>
                <h3 className={`text-lg font-bold flex items-center gap-2 ${textPrimary}`}>
                  <FiCreditCard className="text-emerald-500" /> {editingCard ? "Edit Credit Card" : "Add Credit Card"}
                </h3>
                <button type="button" onClick={() => setShowCardModal(false)} className={`p-1.5 rounded-lg transition-colors ${isDark ? "hover:bg-white/10 text-slate-400 hover:text-white" : "hover:bg-slate-100 text-slate-400 hover:text-slate-700"}`}>
                  <FiX size={16} />
                </button>
              </div>

              <form onSubmit={handleSaveCard} className="space-y-4">
                <div>
                  <label className={`block text-xs font-medium mb-1 ${textSecondary}`}>Card Name *</label>
                  <input type="text" required placeholder="e.g., HDFC Millennia, Slice Card" value={cardForm.name} onChange={(e) => setCardForm({ ...cardForm, name: e.target.value })} className={inputClass} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={`block text-xs font-medium mb-1 ${textSecondary}`}>Bank Name</label>
                    <input type="text" placeholder="e.g., HDFC, ICICI" value={cardForm.bank_name} onChange={(e) => setCardForm({ ...cardForm, bank_name: e.target.value })} className={inputClass} />
                  </div>
                  <div>
                    <label className={`block text-xs font-medium mb-1 ${textSecondary}`}>Last 4 Digits</label>
                    <input type="text" maxLength={4} placeholder="e.g., 4242" value={cardForm.card_last4} onChange={(e) => setCardForm({ ...cardForm, card_last4: e.target.value })} className={`${inputClass} font-mono`} />
                  </div>
                </div>

                <div>
                  <label className={`block text-xs font-medium mb-1 ${textSecondary}`}>Credit Limit (₹)</label>
                  <input type="number" placeholder="e.g., 100000" value={cardForm.credit_limit} onChange={(e) => setCardForm({ ...cardForm, credit_limit: e.target.value })} className={`${inputClass} font-mono`} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={`block text-xs font-medium mb-1 ${textSecondary}`}>Statement Day (1-31)</label>
                    <input type="number" min={1} max={31} value={cardForm.billing_cycle_day} onChange={(e) => setCardForm({ ...cardForm, billing_cycle_day: e.target.value })} className={inputClass} />
                  </div>
                  <div>
                    <label className={`block text-xs font-medium mb-1 ${textSecondary}`}>Payment Due Day (1-31)</label>
                    <input type="number" min={1} max={31} value={cardForm.payment_due_day} onChange={(e) => setCardForm({ ...cardForm, payment_due_day: e.target.value })} className={inputClass} />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={() => setShowCardModal(false)} className={`flex-1 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${isDark ? "border-white/10 text-slate-300 hover:bg-white/5" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>Cancel</button>
                  <button type="submit" disabled={savingCard || !cardForm.name.trim()} className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold shadow-lg shadow-emerald-500/20 disabled:opacity-50">
                    {savingCard ? "Saving..." : editingCard ? "Update Card" : "Add Card"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreditCards;

