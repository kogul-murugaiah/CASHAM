import { useEffect, useState, useCallback } from "react";
import { api } from "../lib/api";
import { useTheme } from "../contexts/ThemeContext";
import { useAccountTypes } from "../hooks/useAccountTypes";
import { FiPlus, FiEdit2, FiTarget, FiCopy } from "react-icons/fi";
import {
  type BudgetItem,
  type BudgetMonth,
  currencyFormatter,
} from "../components/budget/types";
import { BudgetCategoryCard } from "../components/budget/BudgetCategoryCard";
import { CopyMonthModal } from "../components/budget/CopyMonthModal";

export default function BudgetPlanner() {
  const { theme } = useTheme();
  const { accountTypes } = useAccountTypes();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  const [budgetData, setBudgetData] = useState<BudgetMonth>({
    id: null,
    total_income: 0,
    categories: [],
  });

  const [editingIncome, setEditingIncome] = useState(false);
  const [tempIncome, setTempIncome] = useState("");

  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryAmount, setNewCategoryAmount] = useState("");
  const [newCategoryAccount, setNewCategoryAccount] = useState("");
  const [isAddingCategory, setIsAddingCategory] = useState(false);

  // Template copy state
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copyTargetMonth, setCopyTargetMonth] = useState(() => {
    const next = new Date();
    next.setMonth(next.getMonth() + 1);
    return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
  });
  const [isCopying, setIsCopying] = useState(false);

  // Confirm-to-pay state
  const [confirmPayItem, setConfirmPayItem] = useState<{
    id: string;
    categoryId: string;
    amount: string;
  } | null>(null);

  // Helpers
  const [yearStr, monthStr] = selectedMonth.split("-");
  const year = parseInt(yearStr);
  const month = parseInt(monthStr);

  const showSuccess = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 3000);
  };

  const fetchBudget = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get(`/api/budgets/month?month=${month}&year=${year}`);
      setBudgetData(data);
      setTempIncome(String(data.total_income));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load budget tracking data");
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => {
    fetchBudget();
  }, [fetchBudget]);

  // Income Setup
  const handleSaveIncome = async () => {
    try {
      setError(null);
      const data = await api.post(`/api/budgets/month`, {
        month,
        year,
        total_income: Number(tempIncome),
      });
      setBudgetData((prev) => ({ ...prev, id: data.id, total_income: data.total_income }));
      setEditingIncome(false);
      showSuccess("Income updated");

      if (!budgetData.id) fetchBudget();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update income");
    }
  };

  // Categories
  const handleAddCategory = async () => {
    if (!budgetData.id) {
      setError("Please set Total Income first to initialize the budget month.");
      return;
    }
    if (!newCategoryName || !newCategoryAmount) return;

    try {
      setError(null);
      const cat = await api.post(`/api/budgets/categories`, {
        budget_id: budgetData.id,
        name: newCategoryName,
        allocated_amount: Number(newCategoryAmount),
        account_name: newCategoryAccount || null,
      });
      setBudgetData((prev) => ({
        ...prev,
        categories: [...prev.categories, { ...cat, items: [] }],
      }));
      setNewCategoryName("");
      setNewCategoryAmount("");
      setNewCategoryAccount("");
      setIsAddingCategory(false);
      showSuccess("Category created");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create category");
    }
  };

  const handleUpdateCategoryAccount = async (categoryId: string, accountName: string | null) => {
    try {
      await api.put(`/api/budgets/categories`, { id: categoryId, account_name: accountName });
      setBudgetData((prev) => ({
        ...prev,
        categories: prev.categories.map((c) =>
          c.id === categoryId ? { ...c, account_name: accountName } : c
        ),
      }));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update account");
    }
  };

  const handleUpdateCategoryName = async (categoryId: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    try {
      await api.put(`/api/budgets/categories`, { id: categoryId, name: trimmed });
      setBudgetData((prev) => ({
        ...prev,
        categories: prev.categories.map((c) =>
          c.id === categoryId ? { ...c, name: trimmed } : c
        ),
      }));
      showSuccess("Category renamed");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to rename category");
    }
  };

  const handleUpdateCategoryAmount = async (categoryId: string, newAmount: number) => {
    if (!newAmount || newAmount <= 0) return;
    try {
      await api.put(`/api/budgets/categories`, { id: categoryId, allocated_amount: newAmount });
      setBudgetData((prev) => ({
        ...prev,
        categories: prev.categories.map((c) =>
          c.id === categoryId ? { ...c, allocated_amount: newAmount } : c
        ),
      }));
      showSuccess("Budget amount updated");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update budget amount");
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm("Delete this category and all its items?")) return;
    try {
      await api.delete(`/api/budgets/categories?id=${id}`);
      setBudgetData((prev) => ({
        ...prev,
        categories: prev.categories.filter((c) => c.id !== id),
      }));
      showSuccess("Category deleted");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete category");
    }
  };

  // Items
  const handleAddItem = async (categoryId: string, name: string, amount: number) => {
    if (!name || amount <= 0) return;
    try {
      const item = await api.post(`/api/budgets/items`, {
        category_id: categoryId,
        name,
        amount,
        status: "planned",
      });
      setBudgetData((prev) => ({
        ...prev,
        categories: prev.categories.map((c) =>
          c.id === categoryId ? { ...c, items: [...c.items, item] } : c
        ),
      }));
      showSuccess("Item added");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to add item");
    }
  };

  const handleEditItem = async (itemId: string, categoryId: string, name: string, amount: number) => {
    if (!name.trim() || amount <= 0) return;
    try {
      await api.put(`/api/budgets/items`, { id: itemId, name: name.trim(), amount });
      setBudgetData((prev) => ({
        ...prev,
        categories: prev.categories.map((c) =>
          c.id === categoryId
            ? {
                ...c,
                items: c.items.map((i) =>
                  i.id === itemId ? { ...i, name: name.trim(), amount } : i
                ),
              }
            : c
        ),
      }));
      showSuccess("Item updated");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update item");
    }
  };

  const handleRequestMarkPaid = (item: BudgetItem) => {
    setConfirmPayItem({ id: item.id, categoryId: item.category_id, amount: String(item.amount) });
  };

  const handleConfirmPaid = async () => {
    if (!confirmPayItem) return;
    const actualAmount = Number(confirmPayItem.amount);
    try {
      await api.put(`/api/budgets/items`, {
        id: confirmPayItem.id,
        status: "paid",
        paid_amount: actualAmount,
      });
      setBudgetData((prev) => ({
        ...prev,
        categories: prev.categories.map((c) =>
          c.id === confirmPayItem.categoryId
            ? {
                ...c,
                items: c.items.map((i) =>
                  i.id === confirmPayItem.id
                    ? { ...i, status: "paid", paid_amount: actualAmount }
                    : i
                ),
              }
            : c
        ),
      }));
      setConfirmPayItem(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to mark as paid");
    }
  };

  const handleRevertPlanned = async (item: BudgetItem) => {
    try {
      await api.put(`/api/budgets/items`, { id: item.id, status: "planned" });
      setBudgetData((prev) => ({
        ...prev,
        categories: prev.categories.map((c) =>
          c.id === item.category_id
            ? {
                ...c,
                items: c.items.map((i) =>
                  i.id === item.id ? { ...i, status: "planned", paid_amount: null } : i
                ),
              }
            : c
        ),
      }));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to revert item");
    }
  };

  const handleDeleteItem = async (categoryId: string, itemId: string) => {
    if (!confirm("Delete this item?")) return;
    try {
      await api.delete(`/api/budgets/items?id=${itemId}`);
      setBudgetData((prev) => ({
        ...prev,
        categories: prev.categories.map((c) =>
          c.id === categoryId ? { ...c, items: c.items.filter((i) => i.id !== itemId) } : c
        ),
      }));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete item");
    }
  };

  // Template copy handler
  const handleCopyToMonth = async () => {
    if (!budgetData.id) {
      setError("This month has no budget data to copy.");
      return;
    }
    if (!copyTargetMonth) return;

    const [tgtYear, tgtMonth] = copyTargetMonth.split("-").map(Number);

    if (tgtMonth === month && tgtYear === year) {
      setError("Target month must be different from the current month.");
      return;
    }

    setIsCopying(true);
    setError(null);
    try {
      await api.post(`/api/budgets/copy`, {
        source_month: month,
        source_year: year,
        target_month: tgtMonth,
        target_year: tgtYear,
      });
      setShowCopyModal(false);
      showSuccess(
        `Budget template copied to ${new Date(tgtYear, tgtMonth - 1).toLocaleString("default", {
          month: "long",
          year: "numeric",
        })}!`
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to copy budget template");
    } finally {
      setIsCopying(false);
    }
  };

  // Calculations
  const parseNum = (n: unknown) => Number(n) || 0;

  let totalPlannedExpenses = 0;
  let totalPaidExpenses = 0;
  let totalAllocated = 0;

  budgetData.categories.forEach((c) => {
    totalAllocated += parseNum(c.allocated_amount);
    c.items.forEach((i) => {
      if (i.status === "planned") totalPlannedExpenses += parseNum(i.amount);
      if (i.status === "paid")
        totalPaidExpenses += i.paid_amount != null ? parseNum(i.paid_amount) : parseNum(i.amount);
    });
  });

  const currentInHand = parseNum(budgetData.total_income) - totalPaidExpenses;
  const projectedRemaining =
    parseNum(budgetData.total_income) - (totalPaidExpenses + totalPlannedExpenses);

  return (
    <div className="pb-24 pt-8 md:pb-8">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between animate-fade-in">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="p-2 bg-emerald-500/10 rounded-lg">
                <FiTarget className="text-emerald-500 text-xl" strokeWidth={2.5} />
              </span>
              <h1 className="text-3xl font-bold font-heading text-white">Budget Planner</h1>
            </div>
            <p className="text-slate-400">Allocate income to categories and track projected logic.</p>
          </div>

          <div className="flex flex-wrap gap-3 items-center">
            {budgetData.id && (
              <button
                onClick={() => setShowCopyModal(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 hover:text-emerald-200 transition-all shadow-md shadow-emerald-900/20"
                title="Copy this budget as a template to another month"
              >
                <FiCopy size={15} />
                Use as Template
              </button>
            )}

            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              style={{ colorScheme: theme }}
              className="w-full sm:w-auto rounded-xl border border-white/10 bg-slate-700/50 backdrop-blur px-4 py-2 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 cursor-pointer shadow-lg"
            />
          </div>
        </div>

        {/* Copy Template Modal */}
        <CopyMonthModal
          isOpen={showCopyModal}
          isCopying={isCopying}
          sourceYear={year}
          sourceMonth={month}
          copyTargetMonth={copyTargetMonth}
          setCopyTargetMonth={setCopyTargetMonth}
          onClose={() => setShowCopyModal(false)}
          onCopy={handleCopyToMonth}
          theme={theme}
        />

        {error && (
          <div className="mb-6 glass-card border-red-500/20 bg-red-500/10 p-4 text-red-300 text-sm font-medium">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-6 glass-card border-emerald-500/20 bg-emerald-500/10 p-4 text-emerald-300 text-sm font-bold animate-fade-in">
            {success}
          </div>
        )}

        {loading ? (
          <div className="animate-pulse space-y-6">
            <div className="h-32 bg-slate-700/50 rounded-3xl" />
            <div className="h-64 bg-slate-700/50 rounded-3xl" />
          </div>
        ) : (
          <div className="space-y-8 animate-fade-in">
            {/* Summary Dashboard */}
            <div className="glass-card p-8 bg-gradient-to-r from-emerald-600/20 to-teal-600/20 border-emerald-500/30 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/20 rounded-full blur-[100px] -mr-20 -mt-20 pointer-events-none opacity-50" />

              <div className="flex flex-col md:flex-row gap-8 justify-between items-start md:items-center relative z-10">
                {/* Total Income Setup */}
                <div className="w-full md:w-1/3">
                  <p className="text-xs uppercase tracking-widest text-emerald-200 font-bold mb-2">
                    Total Monthly Income
                  </p>
                  {!editingIncome ? (
                    <div className="flex items-center gap-3">
                      <span className="text-4xl font-bold text-white font-heading tracking-tight drop-shadow-md">
                        {currencyFormatter.format(parseNum(budgetData.total_income))}
                      </span>
                      <button
                        onClick={() => setEditingIncome(true)}
                        className="p-1.5 bg-white/10 hover:bg-white/20 rounded border border-white/10 text-white/70 hover:text-white transition-all"
                      >
                        <FiEdit2 size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 mt-1">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">₹</span>
                        <input
                          type="number"
                          autoFocus
                          value={tempIncome}
                          onChange={(e) => setTempIncome(e.target.value)}
                          className="w-full pl-7 pr-3 py-2 bg-slate-700/50 border border-emerald-500/50 rounded-lg text-white font-bold font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                        />
                      </div>
                      <button
                        onClick={handleSaveIncome}
                        className="px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold shadow-lg shadow-emerald-600/20"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setEditingIncome(false);
                          setTempIncome(String(budgetData.total_income));
                        }}
                        className="px-3 py-2 bg-white/10 text-white rounded-lg text-sm font-medium"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>

                {/* Balances */}
                <div className="w-full md:w-2/3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="glass-card p-4 border-emerald-500/20 bg-slate-700/40">
                    <p className="text-xs uppercase tracking-widest text-slate-400 font-bold mb-1">
                      In-Hand Actual Balance
                    </p>
                    <p
                      className={`text-2xl font-bold font-mono tracking-tight ${
                        currentInHand < 0 ? "text-red-400" : "text-emerald-400"
                      }`}
                    >
                      {currencyFormatter.format(currentInHand)}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1">Income - Total Paid</p>
                  </div>
                  <div className="glass-card p-4 border-white/5 bg-slate-700/40">
                    <p className="text-xs uppercase tracking-widest text-slate-400 font-bold mb-1">
                      Projected Forecast
                    </p>
                    <p
                      className={`text-2xl font-bold font-mono tracking-tight ${
                        projectedRemaining < 0 ? "text-orange-400" : "text-amber-400"
                      }`}
                    >
                      {currencyFormatter.format(projectedRemaining)}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1">Income - (Paid + Planned)</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Summary Progress Bar */}
            <div className="px-2">
              <div className="flex justify-between text-xs font-bold text-slate-400 mb-2 font-mono uppercase tracking-wide">
                <span>Allocated: {currencyFormatter.format(totalAllocated)}</span>
                <span>Income: {currencyFormatter.format(parseNum(budgetData.total_income))}</span>
              </div>
              <div className="h-3 w-full bg-slate-700/40 rounded-full overflow-hidden border border-white/5 relative">
                <div
                  className={`h-full absolute left-0 top-0 rounded-full transition-all duration-500 ${
                    totalAllocated > parseNum(budgetData.total_income) ? "bg-red-500" : "bg-emerald-500"
                  }`}
                  style={{
                    width: `${Math.min(
                      100,
                      parseNum(budgetData.total_income) === 0
                        ? 0
                        : (totalAllocated / parseNum(budgetData.total_income)) * 100
                    )}%`,
                  }}
                />
              </div>
            </div>

            {/* Category List */}
            <div className="space-y-2 pt-4">
              <h2 className="text-xl font-bold text-white font-heading px-2">Categories</h2>

              {budgetData.categories.map((cat) => (
                <BudgetCategoryCard
                  key={cat.id}
                  category={cat}
                  accountTypes={accountTypes}
                  confirmPayItem={confirmPayItem}
                  setConfirmPayItem={setConfirmPayItem}
                  handleUpdateCategoryName={handleUpdateCategoryName}
                  handleUpdateCategoryAmount={handleUpdateCategoryAmount}
                  handleDeleteCategory={handleDeleteCategory}
                  handleUpdateCategoryAccount={handleUpdateCategoryAccount}
                  handleAddItem={handleAddItem}
                  handleEditItem={handleEditItem}
                  handleDeleteItem={handleDeleteItem}
                  handleRequestMarkPaid={handleRequestMarkPaid}
                  handleConfirmPaid={handleConfirmPaid}
                  handleRevertPlanned={handleRevertPlanned}
                />
              ))}

              {/* Add Category Trigger */}
              <div className="mt-6">
                {!isAddingCategory ? (
                  <button
                    onClick={() => setIsAddingCategory(true)}
                    className="glass-card w-full p-4 border border-dashed border-white/20 text-slate-400 hover:text-white hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all flex items-center justify-center gap-2 font-medium"
                  >
                    <FiPlus size={18} /> Add New Budget Category
                  </button>
                ) : (
                  <div className="glass-card p-6 border-emerald-500/30 bg-emerald-500/5">
                    <h4 className="text-sm font-bold text-emerald-400 mb-4 uppercase tracking-widest">
                      New Category
                    </h4>
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-col sm:flex-row gap-3">
                        <input
                          type="text"
                          placeholder="Category Name (e.g. Housing)"
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          className="flex-1 bg-slate-900 border border-white/10 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                          autoFocus
                        />
                        <input
                          type="number"
                          placeholder="Allocated Amount"
                          value={newCategoryAmount}
                          onChange={(e) => setNewCategoryAmount(e.target.value)}
                          className="sm:w-48 bg-slate-900 border border-white/10 text-white font-bold rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                        />
                        <select
                          value={newCategoryAccount}
                          onChange={(e) => setNewCategoryAccount(e.target.value)}
                          className="sm:w-48 bg-slate-900 border border-white/10 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 cursor-pointer"
                        >
                          <option value="">Account (optional)</option>
                          {accountTypes.map((acc) => (
                            <option key={acc} value={acc}>
                              {acc}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex gap-2 sm:ml-auto">
                        <button
                          onClick={() => {
                            setIsAddingCategory(false);
                            setNewCategoryAccount("");
                          }}
                          className="px-4 py-2.5 text-sm font-medium text-slate-400 hover:text-white bg-white/5 rounded-xl transition-all"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleAddCategory}
                          className="px-6 py-2.5 text-sm font-bold text-white bg-emerald-600 shadow-lg shadow-emerald-500/20 hover:bg-emerald-500 rounded-xl transition-all disabled:opacity-50"
                          disabled={!newCategoryName || !newCategoryAmount}
                        >
                          Create
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
