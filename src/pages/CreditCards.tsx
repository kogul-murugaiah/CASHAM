import { useState, useEffect, useMemo, useCallback } from "react";
import { useCreditCards } from "../hooks/useCreditCards";
import { useCCAdvances, type CCAdvance } from "../hooks/useCCAdvances";
import { useUserPreferences } from "../hooks/useUserPreferences";
import { useTheme } from "../contexts/ThemeContext";
import { formatCurrency, getLocalDateString } from "../lib/formatters";
import {
  FiCreditCard,
  FiPlus,
  FiCalendar,
  FiRefreshCw,
  FiArchive,
  FiLayers,
  FiUsers,
} from "react-icons/fi";

import type {
  CreditCard,
  CreditCardSettlement,
  UnsettledExpense,
  UnifiedMasterTransaction,
  CardFormState,
  AdvanceFormState,
} from "../components/credit-cards/types";

import { CCCardList } from "../components/credit-cards/CCCardList";
import { CCDuesTable } from "../components/credit-cards/CCDuesTable";
import { CCAdvancesLedger } from "../components/credit-cards/CCAdvancesLedger";
import { CCMasterHistory } from "../components/credit-cards/CCMasterHistory";
import { CCSettlementHistory } from "../components/credit-cards/CCSettlementHistory";
import { CCCardModal } from "../components/credit-cards/CCCardModal";
import { CCAdvanceModal } from "../components/credit-cards/CCAdvanceModal";
import { CCSmartSettleModal } from "../components/credit-cards/CCSmartSettleModal";

const CreditCards = () => {
  const {
    cards,
    fetchCards,
    addCard,
    updateCard,
    deleteCard,
    fetchDues,
    fetchMasterExpenses,
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
  const [activeTab, setActiveTab] = useState<"dues" | "advances" | "master" | "history">("dues");
  const [unsettledExpenses, setUnsettledExpenses] = useState<UnsettledExpense[]>([]);
  const [masterExpenses, setMasterExpenses] = useState<UnsettledExpense[]>([]);
  const [loadingMaster, setLoadingMaster] = useState(false);
  const [masterSearch, setMasterSearch] = useState("");
  const [masterFilterCard, setMasterFilterCard] = useState("all");
  const [masterFilterType, setMasterFilterType] = useState<"all" | "expense" | "advance">("all");
  const [masterFilterStatus, setMasterFilterStatus] = useState<"all" | "unsettled" | "settled">("all");
  const [settlements, setSettlements] = useState<CreditCardSettlement[]>([]);
  const [loadingDues, setLoadingDues] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Add / Edit Card Modal State
  const [showCardModal, setShowCardModal] = useState(false);
  const [editingCard, setEditingCard] = useState<CreditCard | null>(null);
  const [cardForm, setCardForm] = useState<CardFormState>({
    name: "",
    bank_name: "",
    card_last4: "",
    credit_limit: "100000",
    billing_cycle_day: "1",
    payment_due_day: "20",
    color: "#10b981",
  });
  const [savingCard, setSavingCard] = useState(false);

  // CC Advance Modal State
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [advanceForm, setAdvanceForm] = useState<AdvanceFormState>({
    person_name: "",
    amount: "",
    credit_card_id: "",
    credit_card_name: "",
    date: getLocalDateString(),
    description: "",
  });
  const [savingAdvance, setSavingAdvance] = useState(false);

  // Search & Filter State
  const [duesSearch, setDuesSearch] = useState("");
  const [duesFilterCard, setDuesFilterCard] = useState("all");
  const [duesFilterFundsStatus, setDuesFilterFundsStatus] = useState<"all" | "moved" | "pending">("all");
  const [advancesSearch, setAdvancesSearch] = useState("");
  const [advancesFilterCard, setAdvancesFilterCard] = useState("all");
  const [advancesFilterCashStatus, setAdvancesFilterCashStatus] = useState<"all" | "received" | "pending">("all");

  // Smart "Settle by Date" State
  const [showSmartSettleModal, setShowSmartSettleModal] = useState(false);
  const [smartSettleCardId, setSmartSettleCardId] = useState("");
  const [smartSettleCutoffDate, setSmartSettleCutoffDate] = useState(() => getLocalDateString());
  const [smartSettleActualBill, setSmartSettleActualBill] = useState("");
  const [smartSettleDate, setSmartSettleDate] = useState(() => getLocalDateString());
  const [smartSettleNotes, setSmartSettleNotes] = useState("");
  const [smartSettling, setSmartSettling] = useState(false);

  // Fetch dues
  const loadDues = useCallback(async () => {
    setLoadingDues(true);
    setError("");
    try {
      const res = await fetchDues();
      setUnsettledExpenses((res?.expenses as UnsettledExpense[]) || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load dues");
    } finally {
      setLoadingDues(false);
    }
  }, [fetchDues]);

  // Fetch settlement history
  const loadSettlements = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const data = await fetchSettlements();
      setSettlements(data || []);
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  }, [fetchSettlements]);

  // Fetch full card expenses history for Master Statement
  const loadMasterExpenses = useCallback(async () => {
    setLoadingMaster(true);
    try {
      const data = await fetchMasterExpenses();
      setMasterExpenses((data as UnsettledExpense[]) || []);
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setLoadingMaster(false);
    }
  }, [fetchMasterExpenses]);

  useEffect(() => {
    loadDues();
    loadSettlements();
    loadMasterExpenses();
  }, [loadDues, loadSettlements, loadMasterExpenses]);

  // Filtered expenses based on activeCardId
  const currentCard = useMemo(() => cards.find((c) => c.id === activeCardId), [cards, activeCardId]);

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

  // Search + filter on top of filteredExpenses (combines card selection + funds moved status)
  const displayedExpenses = useMemo(() => {
    let list = unsettledExpenses;
    const effectiveCardId = duesFilterCard !== "all" ? duesFilterCard : activeCardId;
    if (effectiveCardId !== "all") {
      const fc = cards.find((c) => c.id === effectiveCardId);
      list = list.filter((e) => e.credit_card_id === effectiveCardId || e.credit_card_name === fc?.name);
    }
    if (duesFilterFundsStatus === "moved") {
      list = list.filter((e) => e.cc_funds_set_aside);
    } else if (duesFilterFundsStatus === "pending") {
      list = list.filter((e) => !e.cc_funds_set_aside);
    }
    if (duesSearch.trim()) {
      const q = duesSearch.toLowerCase();
      list = list.filter(
        (e) =>
          e.item?.toLowerCase().includes(q) ||
          e.description?.toLowerCase().includes(q) ||
          e.account_type?.toLowerCase().includes(q) ||
          e.credit_card_name?.toLowerCase().includes(q) ||
          e.categories?.name?.toLowerCase().includes(q) ||
          e.date?.includes(q)
      );
    }
    return list;
  }, [unsettledExpenses, activeCardId, duesFilterCard, duesFilterFundsStatus, duesSearch, cards]);

  // Search + filter on top of filteredAdvances (combines card selection + cash received status)
  const displayedAdvances = useMemo(() => {
    let list = advances.filter((a) => !(a as { cc_bill_settled?: boolean }).cc_bill_settled);
    const effectiveCardId = advancesFilterCard !== "all" ? advancesFilterCard : activeCardId;
    if (effectiveCardId !== "all") {
      const fc = cards.find((c) => c.id === effectiveCardId);
      list = list.filter((a) => a.credit_card_id === effectiveCardId || a.credit_card_name === fc?.name);
    }
    if (advancesFilterCashStatus === "received") {
      list = list.filter((a) => a.cash_received);
    } else if (advancesFilterCashStatus === "pending") {
      list = list.filter((a) => !a.cash_received);
    }
    if (advancesSearch.trim()) {
      const q = advancesSearch.toLowerCase();
      list = list.filter(
        (a) =>
          a.person_name?.toLowerCase().includes(q) ||
          a.description?.toLowerCase().includes(q) ||
          a.credit_card_name?.toLowerCase().includes(q) ||
          a.date?.includes(q)
      );
    }
    return list;
  }, [advances, activeCardId, advancesFilterCard, advancesFilterCashStatus, advancesSearch, cards]);

  // ── Unified Master Transactions (Expenses + CC Advances) ─────────────────
  const unifiedMasterTransactions: UnifiedMasterTransaction[] = useMemo(() => {
    const expenseItems: UnifiedMasterTransaction[] = masterExpenses.map((e) => ({
      id: `exp-${e.id}`,
      rawId: e.id,
      type: "expense" as const,
      date: e.date,
      title: e.item || "Credit Card Purchase",
      description: e.description,
      account_type: e.account_type,
      credit_card_id: e.credit_card_id,
      credit_card_name: e.credit_card_name,
      category: e.categories?.name,
      amount: Number(e.amount || 0),
      settled: !!e.cc_bill_settled,
      funds_set_aside: !!e.cc_funds_set_aside,
      rawExpense: e,
    }));

    const advanceItems: UnifiedMasterTransaction[] = advances.map((a) => ({
      id: `adv-${a.id}`,
      rawId: a.id,
      type: "advance" as const,
      date: a.date,
      title: a.person_name,
      description: a.description,
      account_type: a.credit_card_name,
      credit_card_id: a.credit_card_id,
      credit_card_name: a.credit_card_name,
      category: "CC Advance",
      amount: Number(a.amount || 0),
      settled: !!(a as { cc_bill_settled?: boolean }).cc_bill_settled,
      cash_received: !!a.cash_received,
      rawAdvance: a,
    }));

    return [...expenseItems, ...advanceItems].sort((a, b) => {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }, [masterExpenses, advances]);

  const displayedMasterTransactions = useMemo(() => {
    let list = unifiedMasterTransactions;

    const effectiveCardId = masterFilterCard !== "all" ? masterFilterCard : activeCardId;
    if (effectiveCardId !== "all") {
      const fc = cards.find((c) => c.id === effectiveCardId);
      list = list.filter(
        (t) => t.credit_card_id === effectiveCardId || t.credit_card_name === fc?.name
      );
    }

    if (masterFilterType !== "all") {
      list = list.filter((t) => t.type === masterFilterType);
    }

    if (masterFilterStatus === "unsettled") {
      list = list.filter((t) => !t.settled);
    } else if (masterFilterStatus === "settled") {
      list = list.filter((t) => t.settled);
    }

    if (masterSearch.trim()) {
      const q = masterSearch.toLowerCase();
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.description?.toLowerCase().includes(q) ||
          t.credit_card_name?.toLowerCase().includes(q) ||
          t.account_type?.toLowerCase().includes(q) ||
          t.category?.toLowerCase().includes(q) ||
          t.date.includes(q)
      );
    }

    return list;
  }, [unifiedMasterTransactions, masterFilterCard, activeCardId, masterFilterType, masterFilterStatus, masterSearch, cards]);

  // Export current filtered master statement as CSV
  const handleExportCSV = () => {
    if (displayedMasterTransactions.length === 0) return;

    const headers = [
      "Date",
      "Type",
      "Title / Item",
      "Description",
      "Card Used",
      "Budget Account",
      "Category",
      "Amount (INR)",
      "Settlement Status",
      "Funds / Cash Status",
    ];

    const rows = displayedMasterTransactions.map((t) => [
      t.date,
      t.type === "expense" ? "Card Purchase" : "CC Advance",
      t.title || "",
      t.description || "",
      t.credit_card_name || "Credit Card",
      t.account_type || "",
      t.category || "",
      t.amount,
      t.settled ? "Settled" : "Active Due",
      t.type === "expense"
        ? t.funds_set_aside
          ? "Funds Moved"
          : "Funds Pending"
        : t.cash_received
        ? "Cash Received"
        : "Cash Pending",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")),
    ].join("\r\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const cardSlug =
      masterFilterCard !== "all"
        ? (cards.find((c) => c.id === masterFilterCard)?.name || "Card").replace(/[^a-zA-Z0-9]/g, "_")
        : "All_Cards";
    link.download = `CC_Statement_${cardSlug}_${getLocalDateString()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const masterStats = useMemo(() => {
    const totalAmount = displayedMasterTransactions.reduce((s, t) => s + t.amount, 0);
    const expenseTotal = displayedMasterTransactions
      .filter((t) => t.type === "expense")
      .reduce((s, t) => s + t.amount, 0);
    const advanceTotal = displayedMasterTransactions
      .filter((t) => t.type === "advance")
      .reduce((s, t) => s + t.amount, 0);
    const unsettledTotal = displayedMasterTransactions
      .filter((t) => !t.settled)
      .reduce((s, t) => s + t.amount, 0);
    return { totalAmount, expenseTotal, advanceTotal, unsettledTotal };
  }, [displayedMasterTransactions]);

  // Smart settle computed values
  const smartSettleCard = useMemo(() => cards.find((c) => c.id === smartSettleCardId), [cards, smartSettleCardId]);

  const smartSettleExpenses = useMemo(() => {
    if (!smartSettleCardId || !smartSettleCutoffDate) return [];
    return unsettledExpenses.filter((e) => {
      const matchCard = e.credit_card_id === smartSettleCardId || e.credit_card_name === smartSettleCard?.name;
      return matchCard && e.date <= smartSettleCutoffDate;
    });
  }, [unsettledExpenses, smartSettleCardId, smartSettleCutoffDate, smartSettleCard]);

  const smartSettleAdvancesItems = useMemo(() => {
    if (!smartSettleCardId || !smartSettleCutoffDate) return [];
    return advances.filter((a) => {
      const matchCard = a.credit_card_id === smartSettleCardId || a.credit_card_name === smartSettleCard?.name;
      return matchCard && !(a as { cc_bill_settled?: boolean }).cc_bill_settled && a.date <= smartSettleCutoffDate;
    });
  }, [advances, smartSettleCardId, smartSettleCutoffDate, smartSettleCard]);

  const smartTotalExpenses = useMemo(
    () => smartSettleExpenses.reduce((s, e) => s + Number(e.amount || 0), 0),
    [smartSettleExpenses]
  );
  const smartTotalAdvances = useMemo(
    () => smartSettleAdvancesItems.reduce((s, a) => s + Number(a.amount || 0), 0),
    [smartSettleAdvancesItems]
  );
  const smartGrandTotal = smartTotalExpenses + smartTotalAdvances;

  const handleOpenSmartSettle = () => {
    const defaultCard = activeCardId !== "all" ? activeCardId : cards[0]?.id || "";
    setSmartSettleCardId(defaultCard);
    const sel = cards.find((c) => c.id === defaultCard);
    const today = new Date();
    const billingDay = sel?.billing_cycle_day || today.getDate();
    const cutoff = new Date(today.getFullYear(), today.getMonth(), billingDay);
    if (cutoff > today) cutoff.setMonth(cutoff.getMonth() - 1);
    setSmartSettleCutoffDate(getLocalDateString(cutoff));
    setSmartSettleActualBill("");
    setSmartSettleDate(getLocalDateString());
    setSmartSettleNotes("");
    setShowSmartSettleModal(true);
  };

  const handleSmartSettleConfirm = async () => {
    if (!smartSettleCardId) return;
    setSmartSettling(true);
    setError("");
    try {
      const cardName = smartSettleCard?.name || "Credit Card";
      // Settle expenses
      if (smartSettleExpenses.length > 0) {
        await settleBill({
          credit_card_id: smartSettleCardId,
          credit_card_name: cardName,
          expense_ids: smartSettleExpenses.map((e) => e.id),
          settlement_date: smartSettleDate,
          notes: smartSettleNotes.trim() || undefined,
        });
      }
      // Settle advances
      if (smartSettleAdvancesItems.length > 0) {
        await settleAdvances({
          credit_card_id: smartSettleCardId,
          credit_card_name: cardName,
          advance_ids: smartSettleAdvancesItems.map((a) => a.id),
          settlement_date: smartSettleDate,
          notes: smartSettleNotes.trim() || undefined,
        });
      }
      setShowSmartSettleModal(false);
      setSuccess(`Statement settled! ${formatCurrency(smartGrandTotal, currencyStyle)} cleared for ${cardName}.`);
      setTimeout(() => setSuccess(""), 4000);
      loadDues();
      loadSettlements();
      loadMasterExpenses();
      fetchAdvances();
      fetchCards();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to settle");
    } finally {
      setSmartSettling(false);
    }
  };

  // Active (unsettled) advances across all cards
  const unsettledAdvances = useMemo(() => {
    return advances.filter((a) => !(a as { cc_bill_settled?: boolean }).cc_bill_settled);
  }, [advances]);

  const totalUnsettledAdvancesAmount = useMemo(() => {
    return unsettledAdvances.reduce((sum, a) => sum + Number(a.amount || 0), 0);
  }, [unsettledAdvances]);

  // Reactive dues per card combining unsettled expenses + unsettled advances
  const cardDuesMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const c of cards) {
      map[c.id] = 0;
    }

    for (const exp of unsettledExpenses) {
      const matchCard = cards.find(
        (c) =>
          (exp.credit_card_id && c.id === exp.credit_card_id) ||
          (exp.credit_card_name && c.name === exp.credit_card_name)
      );
      if (matchCard) {
        map[matchCard.id] = (map[matchCard.id] || 0) + Number(exp.amount || 0);
      }
    }

    for (const adv of advances) {
      if (!(adv as { cc_bill_settled?: boolean }).cc_bill_settled) {
        const matchCard = cards.find(
          (c) =>
            (adv.credit_card_id && c.id === adv.credit_card_id) ||
            (adv.credit_card_name && c.name === adv.credit_card_name)
        );
        if (matchCard) {
          map[matchCard.id] = (map[matchCard.id] || 0) + Number(adv.amount || 0);
        }
      }
    }

    return map;
  }, [cards, unsettledExpenses, advances]);

  const getCardDues = (card: CreditCard): number => {
    if (!loadingDues) {
      return cardDuesMap[card.id] ?? 0;
    }
    return card.total_dues ?? (cardDuesMap[card.id] || 0);
  };

  // Aggregate stats across all cards
  const totalOutstandingDues = useMemo(() => {
    return cards.reduce((sum, c) => sum + getCardDues(c), 0);
  }, [cards, cardDuesMap, loadingDues]);

  const totalCreditLimit = useMemo(() => {
    return cards.reduce((sum, c) => sum + Number(c.credit_limit || 0), 0);
  }, [cards]);

  const totalUtilizationPercent = useMemo(() => {
    if (totalCreditLimit <= 0) return 0;
    return Number(((totalOutstandingDues / totalCreditLimit) * 100).toFixed(1));
  }, [totalOutstandingDues, totalCreditLimit]);

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
      color: "#10b981",
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
      color: card.color || "#10b981",
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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save card");
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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete card");
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
      loadMasterExpenses();
      fetchCards();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to reopen statement");
    }
  };

  const handleUnsettleAdvances = async (settlementId: string) => {
    if (!window.confirm("Reopen this advance settlement? The advances will become unsettled again.")) return;
    try {
      await unsettleAdvances(settlementId);
      setSuccess("Advance settlement reopened");
      setTimeout(() => setSuccess(""), 3000);
      fetchAdvances();
      loadSettlements();
      loadMasterExpenses();
      fetchCards();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to reopen advance settlement");
    }
  };

  const handleToggleExpenseFundsSetAside = async (expense: UnsettledExpense) => {
    try {
      const newValue = !expense.cc_funds_set_aside;
      await toggleFundsSetAside(expense.id, newValue);
      setUnsettledExpenses((prev) =>
        prev.map((e) => (e.id === expense.id ? { ...e, cc_funds_set_aside: newValue } : e))
      );
      setMasterExpenses((prev) =>
        prev.map((e) => (e.id === expense.id ? { ...e, cc_funds_set_aside: newValue } : e))
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update funds status");
    }
  };

  // CC Advance Handlers
  const handleOpenAdvanceModal = () => {
    const defaultCard = cards.find((c) => c.id === activeCardId) || cards[0];
    setAdvanceForm({
      person_name: "",
      amount: "",
      credit_card_id: defaultCard?.id || "",
      credit_card_name: defaultCard?.name || "",
      date: getLocalDateString(),
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
      fetchCards();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to log advance");
    } finally {
      setSavingAdvance(false);
    }
  };

  const handleToggleReceived = async (advance: CCAdvance) => {
    try {
      await markReceived(advance.id, !advance.cash_received);
      setSuccess(advance.cash_received ? "Marked as pending" : "Marked as cash received ✓");
      setTimeout(() => setSuccess(""), 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update");
    }
  };

  const handleDeleteAdvance = async (id: string, personName: string) => {
    if (!window.confirm(`Delete advance for "${personName}"?`)) return;
    try {
      await deleteAdvance(id);
      setSuccess("Advance removed");
      setTimeout(() => setSuccess(""), 2000);
      fetchCards();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  const pendingAdvances = useMemo(
    () => filteredAdvances.filter((a) => !(a as { cc_bill_settled?: boolean }).cc_bill_settled),
    [filteredAdvances]
  );

  // Theme-aware class helpers
  const cardBg = isDark ? "bg-slate-800/80 border-white/10" : "bg-white border-slate-200 shadow-sm";
  const textPrimary = isDark ? "text-white" : "text-slate-800";
  const textSecondary = isDark ? "text-slate-400" : "text-slate-500";
  const tabBorder = isDark ? "border-white/10" : "border-slate-200";
  const progressTrack = isDark ? "bg-slate-700/60" : "bg-slate-200";

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
              Track dues per card, manage CC advances, and reconcile statements seamlessly.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                fetchCards();
                loadDues();
                loadSettlements();
                loadMasterExpenses();
                fetchAdvances();
              }}
              className={`p-3 rounded-2xl border ${
                isDark
                  ? "bg-slate-800/80 border-white/10 text-slate-300 hover:text-white hover:bg-slate-700/80"
                  : "bg-white border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50"
              } transition-all`}
              title="Refresh"
            >
              <FiRefreshCw
                size={16}
                className={loadingDues || loadingHistory || advancesLoading || loadingMaster ? "animate-spin" : ""}
              />
            </button>
            {cards.length > 0 && (
              <button
                onClick={handleOpenSmartSettle}
                className={`flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold border transition-all ${
                  isDark
                    ? "border-white/10 bg-slate-800/80 text-slate-200 hover:bg-slate-700/80 hover:border-white/20"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-sm"
                }`}
              >
                <FiCalendar size={15} />
                Settle Statement
              </button>
            )}
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
            <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${textSecondary}`}>
              Total Outstanding Dues
            </p>
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
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  totalUtilizationPercent <= 30
                    ? "bg-emerald-500/15 text-emerald-500 border border-emerald-500/20"
                    : totalUtilizationPercent <= 50
                    ? "bg-amber-500/15 text-amber-500 border border-amber-500/20"
                    : "bg-red-500/15 text-red-500 border border-red-500/20"
                }`}
              >
                {totalUtilizationPercent <= 30
                  ? "Optimal (<30%)"
                  : totalUtilizationPercent <= 50
                  ? "Moderate"
                  : "High Alert"}
              </span>
            </div>
            <p className={`text-2xl sm:text-3xl font-bold font-heading ${textPrimary}`}>{totalUtilizationPercent}%</p>
            <div className={`w-full h-2 rounded-full mt-2.5 overflow-hidden ${progressTrack}`}>
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  totalUtilizationPercent <= 30
                    ? "bg-emerald-500"
                    : totalUtilizationPercent <= 50
                    ? "bg-amber-500"
                    : "bg-red-500"
                }`}
                style={{ width: `${Math.min(100, totalUtilizationPercent)}%` }}
              />
            </div>
            <p className={`text-[11px] mt-1.5 ${textSecondary}`}>
              Limit: {formatCurrency(totalCreditLimit, currencyStyle)}
            </p>
          </div>

          <div className={`rounded-2xl border p-5 ${cardBg}`}>
            <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${textSecondary}`}>Active CC Advances</p>
            <p className="text-2xl sm:text-3xl font-bold font-heading text-amber-500">
              {formatCurrency(totalUnsettledAdvancesAmount, currencyStyle)}
            </p>
            <p className={`text-xs mt-2 ${textSecondary}`}>
              {unsettledAdvances.length} {unsettledAdvances.length === 1 ? "advance" : "advances"} across cards
            </p>
          </div>

          <div className={`rounded-2xl border p-5 ${cardBg}`}>
            <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${textSecondary}`}>Statements Settled</p>
            <p className="text-2xl sm:text-3xl font-bold font-heading text-emerald-500">{settlements.length} Bills</p>
            <p className={`text-xs mt-2 ${textSecondary}`}>All reconciled without double deduction</p>
          </div>
        </div>

        {/* Cards Carousel / Selector */}
        <CCCardList
          cards={cards}
          activeCardId={activeCardId}
          onSelectCard={(id) => {
            setActiveCardId(id);
            setDuesFilterCard(id);
            setAdvancesFilterCard(id);
            setMasterFilterCard(id);
          }}
          onOpenAddCard={handleOpenAddCard}
          onOpenEditCard={handleOpenEditCard}
          onDeleteCard={handleDeleteCard}
          totalOutstandingDues={totalOutstandingDues}
          getCardDues={getCardDues}
          currencyStyle={currencyStyle}
          isDark={isDark}
        />

        {/* Navigation Tabs */}
        <div className={`flex border-b gap-6 ${tabBorder}`}>
          <button
            onClick={() => setActiveTab("dues")}
            className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === "dues"
                ? "border-emerald-500 text-emerald-500"
                : `border-transparent ${textSecondary} hover:${textPrimary}`
            }`}
          >
            <FiLayers size={16} />
            Active Dues & Settlement
            {unsettledExpenses.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-emerald-500/20 text-emerald-500">
                {filteredExpenses.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("advances")}
            className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === "advances"
                ? "border-blue-500 text-blue-500"
                : `border-transparent ${textSecondary} hover:${textPrimary}`
            }`}
          >
            <FiUsers size={16} />
            CC Advances
            {pendingAdvances.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-blue-500/20 text-blue-500">
                {pendingAdvances.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("master")}
            className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === "master"
                ? "border-emerald-500 text-emerald-500"
                : `border-transparent ${textSecondary} hover:${textPrimary}`
            }`}
          >
            <FiCreditCard size={16} />
            Master History
            {unifiedMasterTransactions.length > 0 && (
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-mono ${
                  isDark ? "bg-slate-700 text-slate-300" : "bg-slate-100 text-slate-600"
                }`}
              >
                {unifiedMasterTransactions.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === "history"
                ? "border-emerald-500 text-emerald-500"
                : `border-transparent ${textSecondary} hover:${textPrimary}`
            }`}
          >
            <FiArchive size={16} />
            Settlement History
            {settlements.length > 0 && (
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-mono ${
                  isDark ? "bg-slate-700 text-slate-300" : "bg-slate-100 text-slate-600"
                }`}
              >
                {settlements.length}
              </span>
            )}
          </button>
        </div>

        {/* Tab 1: Dues */}
        {activeTab === "dues" && (
          <CCDuesTable
            cards={cards}
            displayedExpenses={displayedExpenses}
            duesSearch={duesSearch}
            setDuesSearch={setDuesSearch}
            duesFilterCard={duesFilterCard}
            onFilterCardChange={(val) => {
              setDuesFilterCard(val);
              setActiveCardId(val);
            }}
            duesFilterFundsStatus={duesFilterFundsStatus}
            setDuesFilterFundsStatus={setDuesFilterFundsStatus}
            onToggleExpenseFundsSetAside={handleToggleExpenseFundsSetAside}
            currencyStyle={currencyStyle}
            isDark={isDark}
          />
        )}

        {/* Tab 2: Advances */}
        {activeTab === "advances" && (
          <CCAdvancesLedger
            cards={cards}
            filteredAdvances={filteredAdvances}
            displayedAdvances={displayedAdvances}
            advancesSearch={advancesSearch}
            setAdvancesSearch={setAdvancesSearch}
            advancesFilterCard={advancesFilterCard}
            onFilterCardChange={(val) => {
              setAdvancesFilterCard(val);
              setActiveCardId(val);
            }}
            advancesFilterCashStatus={advancesFilterCashStatus}
            setAdvancesFilterCashStatus={setAdvancesFilterCashStatus}
            onOpenAdvanceModal={handleOpenAdvanceModal}
            onToggleReceived={handleToggleReceived}
            onDeleteAdvance={handleDeleteAdvance}
            currencyStyle={currencyStyle}
            isDark={isDark}
          />
        )}

        {/* Tab 3: Master History */}
        {activeTab === "master" && (
          <CCMasterHistory
            cards={cards}
            displayedMasterTransactions={displayedMasterTransactions}
            masterStats={masterStats}
            loadingMaster={loadingMaster}
            masterSearch={masterSearch}
            setMasterSearch={setMasterSearch}
            masterFilterCard={masterFilterCard}
            onFilterCardChange={(val) => {
              setMasterFilterCard(val);
              setActiveCardId(val);
              setDuesFilterCard(val);
              setAdvancesFilterCard(val);
            }}
            masterFilterType={masterFilterType}
            setMasterFilterType={setMasterFilterType}
            masterFilterStatus={masterFilterStatus}
            setMasterFilterStatus={setMasterFilterStatus}
            onExportCSV={handleExportCSV}
            currencyStyle={currencyStyle}
            isDark={isDark}
          />
        )}

        {/* Tab 4: Settlement History */}
        {activeTab === "history" && (
          <CCSettlementHistory
            settlements={settlements}
            onUnsettle={handleUnsettle}
            onUnsettleAdvances={handleUnsettleAdvances}
            currencyStyle={currencyStyle}
            isDark={isDark}
          />
        )}

        {/* Modals */}
        <CCAdvanceModal
          isOpen={showAdvanceModal}
          cards={cards}
          advanceForm={advanceForm}
          setAdvanceForm={setAdvanceForm}
          onClose={() => setShowAdvanceModal(false)}
          onSave={handleSaveAdvance}
          savingAdvance={savingAdvance}
          isDark={isDark}
        />

        <CCCardModal
          isOpen={showCardModal}
          editingCard={editingCard}
          cardForm={cardForm}
          setCardForm={setCardForm}
          onClose={() => setShowCardModal(false)}
          onSave={handleSaveCard}
          savingCard={savingCard}
          isDark={isDark}
        />

        <CCSmartSettleModal
          isOpen={showSmartSettleModal}
          cards={cards}
          smartSettleCardId={smartSettleCardId}
          setSmartSettleCardId={setSmartSettleCardId}
          smartSettleCutoffDate={smartSettleCutoffDate}
          setSmartSettleCutoffDate={setSmartSettleCutoffDate}
          smartSettleActualBill={smartSettleActualBill}
          setSmartSettleActualBill={setSmartSettleActualBill}
          smartSettleDate={smartSettleDate}
          setSmartSettleDate={setSmartSettleDate}
          smartSettleNotes={smartSettleNotes}
          setSmartSettleNotes={setSmartSettleNotes}
          smartSettling={smartSettling}
          onClose={() => setShowSmartSettleModal(false)}
          onConfirm={handleSmartSettleConfirm}
          smartSettleCard={smartSettleCard}
          smartSettleExpenses={smartSettleExpenses}
          smartSettleAdvancesItems={smartSettleAdvancesItems}
          smartTotalExpenses={smartTotalExpenses}
          smartTotalAdvances={smartTotalAdvances}
          smartGrandTotal={smartGrandTotal}
          currencyStyle={currencyStyle}
          isDark={isDark}
        />
      </div>
    </div>
  );
};

export default CreditCards;
