import { useState, useEffect, useMemo } from "react";
import { useCreditCards, type CreditCard, type CreditCardSettlement } from "../hooks/useCreditCards";
import { useUserPreferences } from "../hooks/useUserPreferences";
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
  FiLayers
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
  } = useCreditCards();

  const { currencyStyle } = useUserPreferences();

  // State
  const [activeCardId, setActiveCardId] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<"dues" | "history">("dues");
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

  // Expanded settlement in history
  const [expandedSettlementId, _setExpandedSettlementId] = useState<string | null>(null);

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

  // Sync selected checkboxes when filtered expenses change
  useEffect(() => {
    // By default select all visible expenses for quick one-click bill settlement
    setSelectedExpenseIds(filteredExpenses.map((e) => e.id));
  }, [filteredExpenses]);

  // Aggregate stats across all cards
  const totalOutstandingDues = useMemo(() => {
    return unsettledExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  }, [unsettledExpenses]);

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
    setCardForm({
      name: "",
      bank_name: "",
      card_last4: "",
      credit_limit: "100000",
      billing_cycle_day: "1",
      payment_due_day: "20",
      color: "#8b5cf6",
    });
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
        await updateCard({
          id: editingCard.id,
          name: cardForm.name.trim(),
          bank_name: cardForm.bank_name.trim() || undefined,
          card_last4: cardForm.card_last4.trim() || undefined,
          credit_limit: Number(cardForm.credit_limit) || 0,
          billing_cycle_day: Number(cardForm.billing_cycle_day) || 1,
          payment_due_day: Number(cardForm.payment_due_day) || 20,
          color: cardForm.color,
        });
        setSuccess("Card updated successfully");
      } else {
        const created = await addCard({
          name: cardForm.name.trim(),
          bank_name: cardForm.bank_name.trim() || undefined,
          card_last4: cardForm.card_last4.trim() || undefined,
          credit_limit: Number(cardForm.credit_limit) || 0,
          billing_cycle_day: Number(cardForm.billing_cycle_day) || 1,
          payment_due_day: Number(cardForm.payment_due_day) || 20,
          color: cardForm.color,
        });
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
      await settleBill({
        credit_card_id: currentCard ? currentCard.id : null,
        credit_card_name: cardName,
        expense_ids: selectedExpenseIds,
        settlement_date: settleDate,
        notes: settleNotes.trim() || undefined,
      });

      setShowSettleModal(false);
      setSettleNotes("");
      setSuccess(
        `Statement settled! ${formatCurrency(selectedTotal, currencyStyle)} cleared across ${
          Object.keys(selectedBreakdown).length
        } budget accounts.`
      );
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

  // Helper for due date calculation
  const getDueCountdown = (dueDay: number) => {
    const today = new Date();
    const currentDay = today.getDate();
    let daysLeft = dueDay - currentDay;
    if (daysLeft < 0) {
      // Due next month
      const totalDaysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
      daysLeft = totalDaysInMonth - currentDay + dueDay;
    }
    return daysLeft;
  };

  return (
    <div className="pb-24 pt-8 md:pb-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in">
          <div>
            <div className="flex items-center gap-2 text-purple-400 text-sm font-semibold uppercase tracking-wider mb-1">
              <FiCreditCard size={18} />
              Credit Cards Hub
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold font-heading text-white tracking-tight">
              Cards & Statement Settlement
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Track dues per card, collect exact amounts from budget accounts, and reconcile bills.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                loadDues();
                loadSettlements();
              }}
              className="p-3 rounded-2xl bg-slate-800/80 border border-white/10 text-slate-300 hover:text-white hover:bg-slate-700/80 transition-all"
              title="Refresh"
            >
              <FiRefreshCw size={16} className={loadingDues || loadingHistory ? "animate-spin" : ""} />
            </button>
            <button
              onClick={handleOpenAddCard}
              className="btn-primary flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold text-white shadow-lg shadow-purple-500/20"
            >
              <FiPlus size={18} />
              Add Credit Card
            </button>
          </div>
        </div>

        {error && (
          <div className="glass-card border-red-500/20 bg-red-500/10 p-4 text-red-300 text-sm text-center animate-fade-in">
            {error}
          </div>
        )}

        {success && (
          <div className="glass-card border-green-500/20 bg-green-500/10 p-4 text-green-300 text-sm text-center animate-fade-in">
            {success}
          </div>
        )}

        {/* Top Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
          {/* Total Pending Dues */}
          <div className="glass-card p-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none"></div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Total Outstanding Dues
            </p>
            <p className="text-2xl sm:text-3xl font-bold font-heading text-purple-400">
              {formatCurrency(totalOutstandingDues, currencyStyle)}
            </p>
            <p className="text-xs text-slate-400 mt-2 flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-purple-400 animate-pulse"></span>
              Across {cards.length} registered cards
            </p>
          </div>

          {/* 30% Credit Utilization Monitor */}
          <div className="glass-card p-5 relative overflow-hidden">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Credit Utilization
              </p>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  totalUtilizationPercent <= 30
                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                    : totalUtilizationPercent <= 50
                    ? "bg-amber-500/15 text-amber-400 border border-amber-500/20"
                    : "bg-red-500/15 text-red-400 border border-red-500/20"
                }`}
              >
                {totalUtilizationPercent <= 30 ? "Optimal (<30%)" : totalUtilizationPercent <= 50 ? "Moderate" : "High Alert"}
              </span>
            </div>
            <p className="text-2xl sm:text-3xl font-bold font-heading text-white">
              {totalUtilizationPercent}%
            </p>
            {/* Progress Bar */}
            <div className="w-full bg-slate-700/60 h-2 rounded-full mt-2.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  totalUtilizationPercent <= 30
                    ? "bg-emerald-500"
                    : totalUtilizationPercent <= 50
                    ? "bg-amber-500"
                    : "bg-red-500"
                }`}
                style={{ width: `${Math.min(100, totalUtilizationPercent)}%` }}
              ></div>
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">
              Limit: {formatCurrency(totalCreditLimit, currencyStyle)}
            </p>
          </div>

          {/* Under Collection Metric */}
          <div className="glass-card p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Active Budget Envelopes
            </p>
            <p className="text-2xl sm:text-3xl font-bold font-heading text-white">
              {Object.keys(accountBreakdown).length} Accounts
            </p>
            <p className="text-xs text-slate-400 mt-2">
              Ready to collect on bill generation
            </p>
          </div>

          {/* Settled History Metric */}
          <div className="glass-card p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Statements Settled
            </p>
            <p className="text-2xl sm:text-3xl font-bold font-heading text-emerald-400">
              {settlements.length} Bills
            </p>
            <p className="text-xs text-slate-400 mt-2">
              All reconciled without double deduction
            </p>
          </div>
        </div>

        {/* Cards Carousel / Selector */}
        <div className="space-y-3 animate-fade-in">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <FiCreditCard size={14} />
              Your Cards
            </h3>
            {cards.length > 0 && (
              <span className="text-xs text-slate-400">
                Click a card to filter dues & accounts
              </span>
            )}
          </div>

          {cards.length === 0 ? (
            <div className="glass-card p-8 text-center space-y-3">
              <div className="inline-flex p-3 rounded-2xl bg-purple-500/10 text-purple-400">
                <FiCreditCard size={28} />
              </div>
              <h4 className="text-base font-bold text-white">No Credit Cards Added</h4>
              <p className="text-slate-400 text-sm max-w-md mx-auto">
                Add your credit cards with credit limits and billing cycle dates to start tracking dues and utilization.
              </p>
              <button
                onClick={handleOpenAddCard}
                className="btn-primary rounded-xl px-5 py-2.5 text-sm font-bold text-white inline-flex items-center gap-2 mt-2"
              >
                <FiPlus size={16} /> Add Your First Card
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {/* "All Cards" Card */}
              <div
                onClick={() => setActiveCardId("all")}
                className={`cursor-pointer rounded-2xl p-5 border transition-all relative overflow-hidden ${
                  activeCardId === "all"
                    ? "bg-slate-800 border-purple-500/50 shadow-xl shadow-purple-500/10 ring-2 ring-purple-500/30"
                    : "glass-card hover:border-white/20 hover:bg-slate-800/60"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Combined</span>
                  <span className="text-xs font-mono font-bold text-purple-400">
                    {cards.length} Cards
                  </span>
                </div>
                <h4 className="text-lg font-bold text-white">All Cards Overview</h4>
                <p className="text-xs text-slate-400 mt-1">Total pending across all cards</p>
                <div className="mt-4 pt-3 border-t border-white/5 flex items-end justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Total Dues</span>
                    <p className="text-xl font-bold font-heading text-purple-400">
                      {formatCurrency(totalOutstandingDues, currencyStyle)}
                    </p>
                  </div>
                  <span className="text-xs text-purple-400 font-semibold flex items-center gap-1">
                    View All <FiArrowRight size={12} />
                  </span>
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
                    className={`cursor-pointer rounded-2xl p-5 border transition-all relative overflow-hidden group ${
                      isSelected
                        ? "bg-slate-800 border-purple-500/50 shadow-xl shadow-purple-500/10 ring-2 ring-purple-500/30"
                        : "glass-card hover:border-white/20 hover:bg-slate-800/60"
                    }`}
                  >
                    {/* Top row: Bank + Edit/Delete */}
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400 truncate">
                        {card.bank_name || "Credit Card"}
                      </span>
                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditCard(card);
                          }}
                          className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                          title="Edit Card"
                        >
                          <FiEdit2 size={13} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCard(card.id, card.name);
                          }}
                          className="p-1 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
                          title="Delete Card"
                        >
                          <FiTrash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Card Title & Last4 */}
                    <div className="flex items-baseline gap-2">
                      <h4 className="text-base font-bold text-white truncate">{card.name}</h4>
                      {card.card_last4 && (
                        <span className="text-xs text-slate-400 font-mono">••{card.card_last4}</span>
                      )}
                    </div>

                    {/* Cycle and Due alert */}
                    <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <FiCalendar size={11} /> Bill: {card.billing_cycle_day}th
                      </span>
                      <span
                        className={`font-semibold px-1.5 py-0.5 rounded ${
                          daysUntilDue <= 5
                            ? "bg-red-500/15 text-red-400"
                            : "bg-slate-700/60 text-slate-300"
                        }`}
                      >
                        <FiClock className="inline mr-0.5" size={10} /> Due in {daysUntilDue}d
                      </span>
                    </div>

                    {/* Utilization Bar */}
                    <div className="mt-3">
                      <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                        <span>Utilization</span>
                        <span className={cardUtil > 30 ? "text-amber-400 font-bold" : "text-emerald-400 font-bold"}>
                          {cardUtil.toFixed(1)}% {cardUtil > 30 && "⚠️"}
                        </span>
                      </div>
                      <div className="w-full bg-slate-700/60 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            cardUtil <= 30 ? "bg-emerald-500" : cardUtil <= 50 ? "bg-amber-500" : "bg-red-500"
                          }`}
                          style={{ width: `${Math.min(100, cardUtil)}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Bottom: Card Dues */}
                    <div className="mt-3 pt-2.5 border-t border-white/5 flex items-baseline justify-between">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Outstanding</span>
                      <span className="text-lg font-bold font-heading text-purple-400">
                        {formatCurrency(cardDues, currencyStyle)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Navigation Tabs: Dues & Settlement vs History */}
        <div className="flex border-b border-white/10 gap-6">
          <button
            onClick={() => setActiveTab("dues")}
            className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === "dues"
                ? "border-purple-500 text-purple-400"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            <FiLayers size={16} />
            Active Dues & Settlement
            {unsettledExpenses.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-purple-500/20 text-purple-300">
                {filteredExpenses.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === "history"
                ? "border-purple-500 text-purple-400"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            <FiArchive size={16} />
            Settlement History
            {settlements.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-slate-700 text-slate-300">
                {settlements.length}
              </span>
            )}
          </button>
        </div>

        {activeTab === "dues" ? (
          <div className="space-y-8 animate-fade-in">
            {/* ── Underlying Budget Account Collection Summary (The User's Feature!) ── */}
            <div className="glass-card p-6 relative overflow-hidden border border-purple-500/20">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <div>
                  <h3 className="text-lg font-bold font-heading text-white flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-purple-500/20 text-purple-400">
                      <FiCheckCircle size={18} />
                    </span>
                    Money to Collect from Budget Accounts
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    These amounts were already deducted from each account when you swiped your card. Collect them to pay your bill.
                  </p>
                </div>
                {Object.keys(accountBreakdown).length > 0 && (
                  <div className="text-right">
                    <span className="text-[11px] text-slate-400 uppercase font-semibold">Total to Pay</span>
                    <p className="text-xl font-bold font-heading text-purple-400">
                      {formatCurrency(
                        Object.values(accountBreakdown).reduce((sum, a) => sum + a.total, 0),
                        currencyStyle
                      )}
                    </p>
                  </div>
                )}
              </div>

              {Object.keys(accountBreakdown).length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-sm">
                  🎉 No pending credit card charges! All charges are settled.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
                  {Object.entries(accountBreakdown).map(([accountName, data]) => (
                    <div
                      key={accountName}
                      className="rounded-xl border border-white/10 bg-slate-700/30 p-4 space-y-2 hover:border-purple-500/30 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-300 uppercase tracking-wide">
                          {accountName}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 font-mono">
                          {data.count} {data.count === 1 ? 'item' : 'items'}
                        </span>
                      </div>
                      <p className="text-2xl font-bold font-heading text-white">
                        {formatCurrency(data.total, currencyStyle)}
                      </p>
                      <p className="text-[11px] text-purple-300 flex items-center gap-1">
                        <FiArrowRight size={10} /> Collect for credit card bill
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Itemized Selectable Transactions Table ── */}
            <div className="glass-card overflow-hidden">
              <div className="p-4 sm:p-6 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    Unsettled Statement Transactions
                    <span className="text-xs font-mono font-normal text-slate-400">
                      ({selectedExpenseIds.length} of {filteredExpenses.length} selected)
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Select transactions that appear on your generated statement to settle them together.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleToggleSelectAll}
                    className="px-3.5 py-2 rounded-xl border border-white/10 text-xs font-semibold text-slate-300 hover:bg-white/5 transition-colors"
                  >
                    {selectedExpenseIds.length === filteredExpenses.length
                      ? "Deselect All"
                      : "Select All"}
                  </button>

                  <button
                    type="button"
                    disabled={selectedExpenseIds.length === 0}
                    onClick={() => setShowSettleModal(true)}
                    className="btn-primary rounded-xl px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-purple-500/20 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <FiCheck size={14} />
                    Settle Bill ({formatCurrency(selectedTotal, currencyStyle)})
                  </button>
                </div>
              </div>

              {filteredExpenses.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-sm">
                  No unsettled expenses found for this selection.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/5 bg-slate-700/40 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                        <th className="px-6 py-4 w-12 text-center">
                          <input
                            type="checkbox"
                            checked={
                              filteredExpenses.length > 0 &&
                              selectedExpenseIds.length === filteredExpenses.length
                            }
                            onChange={handleToggleSelectAll}
                            className="w-4 h-4 rounded border-white/20 bg-slate-700/50 text-purple-500 focus:ring-purple-500/30 cursor-pointer"
                          />
                        </th>
                        <th className="px-6 py-4">Date</th>
                        <th className="px-6 py-4">Item & Notes</th>
                        <th className="px-6 py-4">Budget Account</th>
                        <th className="px-6 py-4">Card Used</th>
                        <th className="px-6 py-4">Category</th>
                        <th className="px-6 py-4 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredExpenses.map((expense) => {
                        const isSelected = selectedExpenseIds.includes(expense.id);
                        return (
                          <tr
                            key={expense.id}
                            onClick={() => handleToggleSelectExpense(expense.id)}
                            className={`cursor-pointer transition-colors ${
                              isSelected ? "bg-purple-500/10 hover:bg-purple-500/15" : "hover:bg-white/5"
                            }`}
                          >
                            <td
                              className="px-6 py-4 text-center"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleSelectExpense(expense.id)}
                                className="w-4 h-4 rounded border-white/20 bg-slate-700/50 text-purple-500 focus:ring-purple-500/30 cursor-pointer"
                              />
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-400 whitespace-nowrap">
                              {formatDate(expense.date)}
                            </td>
                            <td className="px-6 py-4 text-sm font-medium text-white">
                              <div>{expense.item}</div>
                              {expense.description && (
                                <div className="text-xs text-slate-400 font-normal">
                                  {expense.description}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 text-sm">
                              <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
                                {expense.account_type}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-purple-500/10 border border-purple-500/20 text-purple-300">
                                <FiCreditCard size={12} />
                                {expense.credit_card_name || "Credit Card"}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-400">
                              {expense.categories ? (
                                <span className="text-xs px-2 py-0.5 rounded bg-slate-700/50 text-slate-300">
                                  {expense.categories.name}
                                </span>
                              ) : (
                                "-"
                              )}
                            </td>
                            <td className="px-6 py-4 text-sm font-bold text-right text-red-400 font-mono whitespace-nowrap">
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
        ) : (
          /* ── Settlement History Tab ── */
          <div className="space-y-4 animate-fade-in">
            {settlements.length === 0 ? (
              <div className="glass-card p-12 text-center text-slate-400 text-sm">
                No statement settlements recorded yet. Once you settle a bill, its archived receipt and account breakdown will appear here.
              </div>
            ) : (
              settlements.map((settlement) => {
                const _isExpanded = expandedSettlementId === settlement.id;
                const breakdown = settlement.breakdown || {};

                return (
                  <div
                    key={settlement.id}
                    className="glass-card p-5 space-y-3 hover:border-white/20 transition-all"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                            <FiCheckCircle size={16} />
                          </span>
                          <h4 className="text-base font-bold text-white">
                            {settlement.credit_card_name}
                          </h4>
                          <span className="text-xs px-2 py-0.5 rounded bg-slate-700/60 text-slate-300 font-mono">
                            {formatDate(settlement.settlement_date)}
                          </span>
                        </div>
                        {settlement.notes && (
                          <p className="text-xs text-slate-400 mt-1 pl-8">
                            Note: {settlement.notes}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-4 pl-8 sm:pl-0">
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 uppercase font-semibold">Bill Amount</span>
                          <p className="text-xl font-bold font-heading text-emerald-400 font-mono">
                            {formatCurrency(settlement.total_amount, currencyStyle)}
                          </p>
                        </div>

                        <button
                          onClick={() => handleUnsettle(settlement.id)}
                          className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                          title="Reopen Statement"
                        >
                          Reopen
                        </button>
                      </div>
                    </div>

                    {/* Account Contributions Breakdown */}
                    <div className="pt-3 border-t border-white/5 flex flex-wrap items-center gap-2 pl-8">
                      <span className="text-xs text-slate-400 font-medium">Collected From:</span>
                      {Object.entries(breakdown).map(([acc, amt]) => (
                        <span
                          key={acc}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-700/40 border border-white/10 text-slate-200"
                        >
                          <span className="text-purple-400">{acc}:</span>
                          <span className="font-mono text-white">
                            {formatCurrency(Number(amt), currencyStyle)}
                          </span>
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
            <div className="glass-card max-w-lg w-full p-6 space-y-5 border border-white/10 shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <FiCheckCircle className="text-emerald-400" />
                  Settle Credit Card Statement
                </h3>
                <button
                  type="button"
                  onClick={() => setShowSettleModal(false)}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white"
                >
                  <FiX size={16} />
                </button>
              </div>

              <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 space-y-1">
                <div className="flex justify-between items-baseline">
                  <span className="text-xs text-purple-300 font-semibold uppercase">Total Statement Bill</span>
                  <span className="text-2xl font-bold font-heading text-white">
                    {formatCurrency(selectedTotal, currencyStyle)}
                  </span>
                </div>
                <p className="text-xs text-purple-300/80">
                  {selectedExpenseIds.length} transactions included for {currentCard ? currentCard.name : "All Cards"}.
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Amounts Collected from Budget Accounts:
                </p>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                  {Object.entries(selectedBreakdown).map(([acc, amt]) => (
                    <div
                      key={acc}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-slate-700/40 border border-white/5 text-xs"
                    >
                      <span className="text-slate-300 font-medium truncate">{acc}</span>
                      <span className="font-bold text-white font-mono">
                        {formatCurrency(amt, currencyStyle)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Bill Payment Date
                  </label>
                  <input
                    type="date"
                    value={settleDate}
                    onChange={(e) => setSettleDate(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-slate-700/50 px-3.5 py-2.5 text-sm text-white focus:ring-2 focus:ring-purple-500/40 outline-none cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Notes / Payment Reference (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Paid in full via Netbanking ref #1234"
                    value={settleNotes}
                    onChange={(e) => setSettleNotes(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-slate-700/50 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-purple-500/40 outline-none"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-700/40 border border-white/5 text-xs text-slate-400 flex items-start gap-2">
                <FiInfo className="text-emerald-400 flex-shrink-0 mt-0.5" size={14} />
                <span>
                  <strong>No double deduction:</strong> Because these expenses were already deducted from your account balances when created, settling simply clears the credit card bill and archives the statement.
                </span>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSettleModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 text-slate-300 text-sm font-medium hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={settling}
                  onClick={handleConfirmSettle}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                >
                  {settling ? "Settling..." : "Confirm & Settle"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Add / Edit Card Modal ── */}
        {showCardModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="glass-card max-w-md w-full p-6 space-y-5 border border-white/10 shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <FiCreditCard className="text-purple-400" />
                  {editingCard ? "Edit Credit Card" : "Add Credit Card"}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowCardModal(false)}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white"
                >
                  <FiX size={16} />
                </button>
              </div>

              <form onSubmit={handleSaveCard} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Card Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., HDFC Millennia, Slice Card"
                    value={cardForm.name}
                    onChange={(e) => setCardForm({ ...cardForm, name: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-slate-700/50 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-purple-500/40 outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Bank Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., HDFC, ICICI"
                      value={cardForm.bank_name}
                      onChange={(e) => setCardForm({ ...cardForm, bank_name: e.target.value })}
                      className="w-full rounded-xl border border-white/10 bg-slate-700/50 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-purple-500/40 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Last 4 Digits
                    </label>
                    <input
                      type="text"
                      maxLength={4}
                      placeholder="e.g., 4242"
                      value={cardForm.card_last4}
                      onChange={(e) => setCardForm({ ...cardForm, card_last4: e.target.value })}
                      className="w-full rounded-xl border border-white/10 bg-slate-700/50 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-purple-500/40 outline-none font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Credit Limit (₹)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g., 100000"
                    value={cardForm.credit_limit}
                    onChange={(e) => setCardForm({ ...cardForm, credit_limit: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-slate-700/50 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-purple-500/40 outline-none font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Statement Day (1-31)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      value={cardForm.billing_cycle_day}
                      onChange={(e) => setCardForm({ ...cardForm, billing_cycle_day: e.target.value })}
                      className="w-full rounded-xl border border-white/10 bg-slate-700/50 px-3.5 py-2.5 text-sm text-white focus:ring-2 focus:ring-purple-500/40 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Payment Due Day (1-31)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      value={cardForm.payment_due_day}
                      onChange={(e) => setCardForm({ ...cardForm, payment_due_day: e.target.value })}
                      className="w-full rounded-xl border border-white/10 bg-slate-700/50 px-3.5 py-2.5 text-sm text-white focus:ring-2 focus:ring-purple-500/40 outline-none"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCardModal(false)}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 text-slate-300 text-sm font-medium hover:bg-white/5"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingCard || !cardForm.name.trim()}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold shadow-lg shadow-purple-500/20 disabled:opacity-50"
                  >
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
