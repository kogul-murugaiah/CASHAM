import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useTheme } from "../contexts/ThemeContext";
import { useAccountTypes } from "../hooks/useAccountTypes";
import { FiPlus, FiTrash2, FiEdit2, FiCheck, FiX, FiTarget, FiCopy, FiArrowRight, FiAlertCircle, FiCreditCard } from "react-icons/fi";

const currencyFormatter = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
});

type BudgetItem = {
    id: string;
    category_id: string;
    name: string;
    amount: number;        // planned amount
    paid_amount: number | null; // actual amount spent (set when marking paid)
    status: 'planned' | 'paid';
};

type BudgetCategory = {
    id: string;
    budget_id: string;
    name: string;
    allocated_amount: number;
    account_name: string | null;
    items: BudgetItem[];
};

type BudgetMonth = {
    id: string | null;
    total_income: number;
    categories: BudgetCategory[];
};

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
        categories: []
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

    // Helpers
    const [yearStr, monthStr] = selectedMonth.split("-");
    const year = parseInt(yearStr);
    const month = parseInt(monthStr);

    const fetchBudget = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await api.get(`/api/budgets/month?month=${month}&year=${year}`);
            setBudgetData(data);
            setTempIncome(String(data.total_income));
        } catch (err: any) {
            setError(err.message || "Failed to load budget tracking data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBudget();
    }, [selectedMonth]);

    const showSuccess = (msg: string) => {
        setSuccess(msg);
        setTimeout(() => setSuccess(null), 3000);
    };

    // Income Setup
    const handleSaveIncome = async () => {
        try {
            setError(null);
            const data = await api.post(`/api/budgets/month`, {
                month,
                year,
                total_income: Number(tempIncome)
            });
            setBudgetData(prev => ({ ...prev, id: data.id, total_income: data.total_income }));
            setEditingIncome(false);
            showSuccess("Income updated");
            
            // If the budget didn't exist before, refetch to get everything properly linked
            if (!budgetData.id) fetchBudget();
        } catch (err: any) {
            setError(err.message || "Failed to update income");
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
                account_name: newCategoryAccount || null
            });
            setBudgetData(prev => ({
                ...prev,
                categories: [...prev.categories, { ...cat, items: [] }]
            }));
            setNewCategoryName("");
            setNewCategoryAmount("");
            setNewCategoryAccount("");
            setIsAddingCategory(false);
            showSuccess("Category created");
            trackBudgetEvent('category_created', { category: cat.name });
            trackBudgetEvent('budget_allocated', { amount: cat.allocated_amount });
        } catch (err: any) {
            setError(err.message || "Failed to create category");
        }
    };

    const handleUpdateCategoryAccount = async (categoryId: string, accountName: string | null) => {
        try {
            await api.put(`/api/budgets/categories`, { id: categoryId, account_name: accountName });
            setBudgetData(prev => ({
                ...prev,
                categories: prev.categories.map(c =>
                    c.id === categoryId ? { ...c, account_name: accountName } : c
                )
            }));
        } catch (err: any) {
            setError(err.message || "Failed to update account");
        }
    };

    const handleDeleteCategory = async (id: string) => {
        if (!confirm("Delete this category and all its items?")) return;
        try {
            await api.delete(`/api/budgets/categories?id=${id}`);
            setBudgetData(prev => ({
                ...prev,
                categories: prev.categories.filter(c => c.id !== id)
            }));
            showSuccess("Category deleted");
        } catch (err: any) {
            setError(err.message || "Failed to delete category");
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
                status: 'planned'
            });
            setBudgetData(prev => ({
                ...prev,
                categories: prev.categories.map(c => 
                    c.id === categoryId ? { ...c, items: [...c.items, item] } : c
                )
            }));
            showSuccess("Item added");
            trackBudgetEvent('expense_added', { item: item.name });
        } catch (err: any) {
            setError(err.message || "Failed to add item");
        }
    };

    const handleEditItem = async (itemId: string, categoryId: string, name: string, amount: number) => {
        if (!name.trim() || amount <= 0) return;
        try {
            await api.put(`/api/budgets/items`, { id: itemId, name: name.trim(), amount });
            setBudgetData(prev => ({
                ...prev,
                categories: prev.categories.map(c =>
                    c.id === categoryId
                        ? { ...c, items: c.items.map(i => i.id === itemId ? { ...i, name: name.trim(), amount } : i) }
                        : c
                )
            }));
            showSuccess("Item updated");
        } catch (err: any) {
            setError(err.message || "Failed to update item");
        }
    };

    // Confirm-to-pay state: tracks which item is being confirmed with its actual amount
    const [confirmPayItem, setConfirmPayItem] = useState<{ id: string; categoryId: string; amount: string } | null>(null);

    const handleRequestMarkPaid = (item: BudgetItem) => {
        // Open confirmation with planned amount pre-filled
        setConfirmPayItem({ id: item.id, categoryId: item.category_id, amount: String(item.amount) });
    };

    const handleConfirmPaid = async () => {
        if (!confirmPayItem) return;
        const actualAmount = Number(confirmPayItem.amount);
        try {
            await api.put(`/api/budgets/items`, {
                id: confirmPayItem.id,
                status: 'paid',
                paid_amount: actualAmount
            });
            setBudgetData(prev => ({
                ...prev,
                categories: prev.categories.map(c =>
                    c.id === confirmPayItem.categoryId
                        ? { ...c, items: c.items.map(i => i.id === confirmPayItem.id ? { ...i, status: 'paid', paid_amount: actualAmount } : i) }
                        : c
                )
            }));
            trackBudgetEvent('status_changed', { from: 'planned', to: 'paid', paid_amount: actualAmount });
            setConfirmPayItem(null);
        } catch (err: any) {
            setError(err.message || "Failed to mark as paid");
        }
    };

    const handleRevertPlanned = async (item: BudgetItem) => {
        try {
            await api.put(`/api/budgets/items`, { id: item.id, status: 'planned' });
            setBudgetData(prev => ({
                ...prev,
                categories: prev.categories.map(c =>
                    c.id === item.category_id
                        ? { ...c, items: c.items.map(i => i.id === item.id ? { ...i, status: 'planned', paid_amount: null } : i) }
                        : c
                )
            }));
        } catch (err: any) {
            setError(err.message || "Failed to revert item");
        }
    };

    const handleDeleteItem = async (categoryId: string, itemId: string) => {
        if (!confirm("Delete this item?")) return;
        try {
            await api.delete(`/api/budgets/items?id=${itemId}`);
            setBudgetData(prev => ({
                ...prev,
                categories: prev.categories.map(c => 
                    c.id === categoryId 
                        ? { ...c, items: c.items.filter(i => i.id !== itemId) }
                        : c
                )
            }));
        } catch (err: any) {
            setError(err.message || "Failed to delete item");
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

        // Prevent copying onto itself
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
                target_year: tgtYear
            });
            setShowCopyModal(false);
            showSuccess(`✅ Budget template copied to ${new Date(tgtYear, tgtMonth - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}!`);
        } catch (err: any) {
            setError(err.message || "Failed to copy budget template");
        } finally {
            setIsCopying(false);
        }
    };

    // Analytics Wrapper
    const trackBudgetEvent = (eventName: string, payload: any) => {
        console.log(`[Budget Analytics] ${eventName}:`, payload);
        // Hook up GA or other tracking here
    };

    // Calculations — use paid_amount (actual) for paid items where available
    const parseNum = (n: any) => Number(n) || 0;
    
    let totalPlannedExpenses = 0;
    let totalPaidExpenses = 0;
    let totalAllocated = 0;

    budgetData.categories.forEach(c => {
        totalAllocated += parseNum(c.allocated_amount);
        c.items.forEach(i => {
            if (i.status === 'planned') totalPlannedExpenses += parseNum(i.amount);
            // Actual balance uses paid_amount if set, falls back to planned amount
            if (i.status === 'paid') totalPaidExpenses += i.paid_amount != null ? parseNum(i.paid_amount) : parseNum(i.amount);
        });
    });

    const currentInHand = parseNum(budgetData.total_income) - totalPaidExpenses;
    const projectedRemaining = parseNum(budgetData.total_income) - (totalPaidExpenses + totalPlannedExpenses);


    // Item row with inline edit — defined before CategoryCard so it's in scope
    const ItemRow = ({ item, isConfirming, effectiveAmount, amountDiffers, categoryId }: {
        item: BudgetItem;
        isConfirming: boolean;
        effectiveAmount: number;
        amountDiffers: boolean;
        categoryId: string;
    }) => {
        const [isEditing, setIsEditing] = useState(false);
        const [editName, setEditName] = useState(item.name);
        const [editAmount, setEditAmount] = useState(String(item.amount));

        const submitEdit = async () => {
            await handleEditItem(item.id, categoryId, editName, Number(editAmount));
            setIsEditing(false);
        };
        const cancelEdit = () => {
            setEditName(item.name);
            setEditAmount(String(item.amount));
            setIsEditing(false);
        };

        return (
            <div className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                isEditing
                    ? 'border-sky-500/40 shadow-lg shadow-sky-500/10'
                    : isConfirming
                    ? 'border-emerald-500/40 shadow-lg shadow-emerald-500/10'
                    : item.status === 'paid'
                    ? 'border-emerald-500/15 bg-emerald-500/5'
                    : 'border-white/8 bg-slate-700/40 hover:bg-slate-700/60'
            } group`}>

                {isEditing ? (
                    <div className="flex items-center gap-3 px-4 py-3 bg-sky-500/5">
                        <input
                            autoFocus
                            type="text"
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') submitEdit(); if (e.key === 'Escape') cancelEdit(); }}
                            className="flex-1 bg-slate-800/80 border border-sky-500/30 text-white text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-500/40 font-medium"
                            placeholder="Item name"
                        />
                        <div className="flex items-center gap-1.5 bg-slate-800/80 border border-sky-500/30 rounded-lg px-3 py-1.5">
                            <span className="text-slate-400 text-sm font-bold">₹</span>
                            <input
                                type="number"
                                value={editAmount}
                                onChange={e => setEditAmount(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') submitEdit(); if (e.key === 'Escape') cancelEdit(); }}
                                className="w-24 bg-transparent text-white font-mono text-sm font-bold focus:outline-none"
                            />
                        </div>
                        <div className="flex gap-1.5">
                            <button onClick={submitEdit} className="p-1.5 bg-sky-500/20 text-sky-400 hover:bg-sky-500 hover:text-white rounded-md transition-colors" title="Save"><FiCheck size={15} /></button>
                            <button onClick={cancelEdit} className="p-1.5 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white rounded-md transition-colors" title="Cancel"><FiX size={15} /></button>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-between px-4 py-3">
                        <div className="flex items-center gap-3 min-w-0">
                            {item.status === 'planned' ? (
                                <button onClick={() => handleRequestMarkPaid(item)} className="flex-shrink-0 w-5 h-5 rounded border-2 border-slate-400 hover:border-emerald-500 hover:bg-emerald-500/10 transition-all flex items-center justify-center text-transparent hover:text-emerald-500" title="Mark as Paid">
                                    <FiCheck size={12} strokeWidth={3} />
                                </button>
                            ) : (
                                <button onClick={() => handleRevertPlanned(item)} className="flex-shrink-0 w-5 h-5 rounded border-2 border-emerald-500 bg-emerald-500 hover:bg-red-400 hover:border-red-400 transition-all flex items-center justify-center text-white" title="Undo">
                                    <FiCheck size={12} strokeWidth={3} />
                                </button>
                            )}
                            <span className={`text-sm font-medium truncate ${item.status === 'paid' ? 'text-slate-400 line-through decoration-slate-400' : 'text-slate-100'}`}>
                                {item.name}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                            <div className="text-right">
                                {amountDiffers ? (
                                    <>
                                        <span className="text-[10px] text-slate-500 line-through font-mono block leading-none">{currencyFormatter.format(parseNum(item.amount))}</span>
                                        <span className="text-sm font-bold font-mono text-emerald-400">{currencyFormatter.format(parseNum(item.paid_amount!))}</span>
                                    </>
                                ) : (
                                    <span className={`text-sm font-bold font-mono ${item.status === 'paid' ? 'text-emerald-400' : 'text-slate-200'}`}>
                                        {currencyFormatter.format(effectiveAmount)}
                                    </span>
                                )}
                            </div>
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                                item.status === 'paid' ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                            }`}>{item.status}</span>
                            {item.status === 'planned' && (
                                <button onClick={() => { setIsEditing(true); setEditName(item.name); setEditAmount(String(item.amount)); }} className="text-slate-500 hover:text-sky-400 opacity-0 group-hover:opacity-100 transition-all p-1 flex-shrink-0" title="Edit item">
                                    <FiEdit2 size={13} />
                                </button>
                            )}
                            <button onClick={() => handleDeleteItem(categoryId, item.id)} className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all p-1 flex-shrink-0">
                                <FiTrash2 size={14} />
                            </button>
                        </div>
                    </div>
                )}

                {isConfirming && (
                    <div className="border-t border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                            <div className="flex-1">
                                <p className="text-xs font-bold text-emerald-400 mb-2 uppercase tracking-widest">How much did you actually spend?</p>
                                <div className="flex items-center gap-2">
                                    <span className="text-slate-400 font-bold text-sm">₹</span>
                                    <input type="number" value={confirmPayItem!.amount} onChange={e => setConfirmPayItem(prev => prev ? { ...prev, amount: e.target.value } : null)} className="bg-slate-700/50 border border-emerald-500/30 text-white font-mono font-bold rounded-lg px-3 py-1.5 text-sm w-36 focus:outline-none focus:ring-2 focus:ring-emerald-500/40" autoFocus />
                                    <span className="text-[11px] text-slate-400">Planned: {currencyFormatter.format(item.amount)}</span>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={handleConfirmPaid} className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors shadow-lg shadow-emerald-600/20"><FiCheck size={13} /> Confirm Paid</button>
                                <button onClick={() => setConfirmPayItem(null)} className="px-3 py-2 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-xs font-medium rounded-lg transition-colors border border-white/5">Cancel</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    // Renderers
    const CategoryCard = ({ category }: { category: BudgetCategory }) => {
        const [newItemName, setNewItemName] = useState("");
        const [newItemAmount, setNewItemAmount] = useState("");
        const [isAdding, setIsAdding] = useState(false);

        const catAllocated = parseNum(category.allocated_amount);
        // Use actual paid_amount for paid items
        const catPaid = category.items.filter(i => i.status === 'paid').reduce((s, i) => s + (i.paid_amount != null ? parseNum(i.paid_amount) : parseNum(i.amount)), 0);
        const catPlanned = category.items.filter(i => i.status === 'planned').reduce((s, i) => s + parseNum(i.amount), 0);
        
        const actualBalance = catAllocated - catPaid;
        const projBalance = catAllocated - (catPaid + catPlanned);

        const submitAddItem = () => {
            handleAddItem(category.id, newItemName, Number(newItemAmount));
            setNewItemName("");
            setNewItemAmount("");
            setIsAdding(false);
        };

        return (
            <div className="glass-card mb-6 border-white/5 overflow-hidden">
                {/* Category header */}
                <div className="bg-slate-700/30 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5">
                    <div>
                        <h3 className="text-xl font-bold text-white font-heading">{category.name}</h3>
                        <p className="text-sm text-slate-400 mt-1">Budget: <strong className="text-emerald-400">{currencyFormatter.format(catAllocated)}</strong></p>
                    </div>
                    
                    <div className="flex flex-wrap gap-3 text-xs font-medium">
                        <div className="glass-card px-4 py-2.5 border-white/5 bg-slate-700/40 !rounded-xl !shadow-none hover:!shadow-none">
                            <span className="text-slate-500 block mb-0.5 text-[10px] uppercase tracking-widest">Actual Balance</span>
                            <span className={`text-sm font-bold font-mono ${actualBalance < 0 ? 'text-red-400' : 'text-white'}`}>{currencyFormatter.format(actualBalance)}</span>
                        </div>
                        <div className="glass-card px-4 py-2.5 border-white/5 bg-slate-700/40 !rounded-xl !shadow-none hover:!shadow-none">
                            <span className="text-slate-500 block mb-0.5 text-[10px] uppercase tracking-widest">Projected</span>
                            <span className={`text-sm font-bold font-mono ${projBalance < 0 ? 'text-orange-400' : 'text-white'}`}>{currencyFormatter.format(projBalance)}</span>
                        </div>
                        <button onClick={() => handleDeleteCategory(category.id)} className="p-2 text-slate-500 hover:text-red-400 transition-colors bg-white/5 rounded-lg flex self-center">
                            <FiTrash2 size={16} />
                        </button>
                    </div>
                </div>

                {/* Account assignment row */}
                <div className="px-5 py-2.5 border-b border-white/5 flex items-center gap-3 bg-slate-800/20">
                    <FiCreditCard size={13} className="text-slate-500 flex-shrink-0" />
                    <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Account</span>
                    <select
                        value={category.account_name || ""}
                        onChange={e => handleUpdateCategoryAccount(category.id, e.target.value || null)}
                        className="ml-auto text-xs font-semibold bg-slate-800/60 border border-white/10 text-white rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 cursor-pointer"
                    >
                        <option value="">— Unassigned —</option>
                        {accountTypes.map(acc => (
                            <option key={acc} value={acc}>{acc}</option>
                        ))}
                    </select>
                </div>

                {/* Items */}
                <div className="p-5">
                    {category.items.length > 0 ? (
                        <div className="space-y-3 mb-4">
                            {category.items.map(item => {
                                const isConfirming = confirmPayItem?.id === item.id;
                                const effectiveAmount = item.status === 'paid' && item.paid_amount != null
                                    ? parseNum(item.paid_amount) : parseNum(item.amount);
                                const amountDiffers = item.status === 'paid' && item.paid_amount != null && item.paid_amount !== item.amount;
                                return (
                                    <ItemRow
                                        key={item.id}
                                        item={item}
                                        isConfirming={isConfirming}
                                        effectiveAmount={effectiveAmount}
                                        amountDiffers={amountDiffers}
                                        categoryId={category.id}
                                    />
                                );
                            })}
                        </div>
                    ) : (
                        <p className="text-sm text-slate-500 mb-4 px-2">No planned expenses in this category yet.</p>
                    )}

                    {!isAdding ? (
                        <button onClick={() => setIsAdding(true)} className="flex items-center gap-2 text-sm text-emerald-400 hover:text-emerald-300 font-medium px-2 py-1 transition-colors">
                            <FiPlus size={16} /> Add Expense Item
                        </button>
                    ) : (
                        <div className="flex items-center gap-3 bg-slate-800/80 p-3 rounded-xl border border-emerald-500/20">
                            <input 
                                type="text" placeholder="Item Name (e.g. Rent)" 
                                value={newItemName} onChange={e => setNewItemName(e.target.value)}
                                className="flex-1 bg-transparent border-none text-sm text-white focus:outline-none placeholder-slate-500" autoFocus
                            />
                            <div className="flex items-center gap-2 border-l border-white/10 pl-3">
                                <span className="text-slate-500 text-sm">₹</span>
                                <input 
                                    type="number" placeholder="0" 
                                    value={newItemAmount} onChange={e => setNewItemAmount(e.target.value)}
                                    className="w-20 bg-transparent border-none text-sm font-mono text-white focus:outline-none placeholder-slate-500"
                                />
                            </div>
                            <div className="flex gap-1 ml-2">
                                <button onClick={submitAddItem} className="p-1.5 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white rounded-md transition-colors"><FiCheck size={16} /></button>
                                <button onClick={() => setIsAdding(false)} className="p-1.5 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white rounded-md transition-colors"><FiX size={16} /></button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

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
                        {/* Copy Template button — only shown when current month has budget data */}
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
                {showCopyModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => !isCopying && setShowCopyModal(false)}>
                        {/* Backdrop */}
                        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" />

                        {/* Modal Card */}
                        <div
                            className="relative z-10 w-full max-w-md animate-fade-in"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="glass-card p-8 border-emerald-500/20 bg-gradient-to-br from-slate-800/90 to-slate-900/90 shadow-2xl shadow-emerald-900/30">
                                {/* Modal Header */}
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="p-2.5 bg-emerald-500/15 rounded-xl">
                                        <FiCopy className="text-emerald-400" size={20} />
                                    </span>
                                    <div>
                                        <h3 className="text-xl font-bold text-white font-heading">Copy Budget Template</h3>
                                        <p className="text-xs text-slate-400 mt-0.5">Duplicate this month's plan to a new month</p>
                                    </div>
                                    <button
                                        onClick={() => setShowCopyModal(false)}
                                        disabled={isCopying}
                                        className="ml-auto p-1.5 text-slate-500 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-all"
                                    >
                                        <FiX size={16} />
                                    </button>
                                </div>

                                {/* Info note */}
                                <div className="mt-5 mb-6 flex gap-3 p-4 rounded-xl bg-amber-500/8 border border-amber-500/20">
                                    <FiAlertCircle size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
                                    <p className="text-xs text-amber-200/80 leading-relaxed">
                                        All categories and planned items will be copied. Any existing budget in the target month will be <strong className="text-amber-300">replaced</strong>. All items start as <strong className="text-amber-300">Planned</strong>.
                                    </p>
                                </div>

                                {/* Source → Target */}
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="flex-1 bg-slate-700/50 rounded-xl p-3 text-center border border-white/5">
                                        <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1">Source</p>
                                        <p className="text-sm font-bold text-white">
                                            {new Date(year, month - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
                                        </p>
                                    </div>
                                    <FiArrowRight size={20} className="text-emerald-500 flex-shrink-0" />
                                    <div className="flex-1">
                                        <input
                                            type="month"
                                            value={copyTargetMonth}
                                            onChange={e => setCopyTargetMonth(e.target.value)}
                                            style={{ colorScheme: theme }}
                                            className="w-full rounded-xl border border-emerald-500/40 bg-slate-700/50 backdrop-blur px-3 py-3 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 cursor-pointer"
                                        />
                                        <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mt-1.5 text-center">Target</p>
                                    </div>
                                </div>

                                {/* Action buttons */}
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setShowCopyModal(false)}
                                        disabled={isCopying}
                                        className="flex-1 px-4 py-3 rounded-xl text-sm font-medium text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/5 transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleCopyToMonth}
                                        disabled={isCopying || !copyTargetMonth}
                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-600/25 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                                    >
                                        {isCopying ? (
                                            <>
                                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                Copying…
                                            </>
                                        ) : (
                                            <>
                                                <FiCopy size={15} />
                                                Copy Template
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {error && <div className="mb-6 glass-card border-red-500/20 bg-red-500/10 p-4 text-red-300 text-sm font-medium">{error}</div>}
                {success && <div className="mb-6 glass-card border-emerald-500/20 bg-emerald-500/10 p-4 text-emerald-300 text-sm font-bold animate-fade-in">{success}</div>}

                {loading ? (
                    <div className="animate-pulse space-y-6">
                        <div className="h-32 bg-slate-700/50 rounded-3xl"></div>
                        <div className="h-64 bg-slate-700/50 rounded-3xl"></div>
                    </div>
                ) : (
                    <div className="space-y-8 animate-fade-in">
                        {/* Summary Dashboard - same pattern as IncomeTracking hero banner */}
                        <div className="glass-card p-8 bg-gradient-to-r from-emerald-600/20 to-teal-600/20 border-emerald-500/30 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/20 rounded-full blur-[100px] -mr-20 -mt-20 pointer-events-none opacity-50"></div>
                            
                            <div className="flex flex-col md:flex-row gap-8 justify-between items-start md:items-center relative z-10">
                                
                                {/* Total Income Setup */}
                                <div className="w-full md:w-1/3">
                                    <p className="text-xs uppercase tracking-widest text-emerald-200 font-bold mb-2">Total Monthly Income</p>
                                    {!editingIncome ? (
                                        <div className="flex items-center gap-3">
                                            <span className="text-4xl font-bold text-white font-heading tracking-tight drop-shadow-md">
                                                {currencyFormatter.format(parseNum(budgetData.total_income))}
                                            </span>
                                            <button onClick={() => setEditingIncome(true)} className="p-1.5 bg-white/10 hover:bg-white/20 rounded border border-white/10 text-white/70 hover:text-white transition-all">
                                                <FiEdit2 size={14} />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 mt-1">
                                            <div className="relative flex-1">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">₹</span>
                                                <input 
                                                    type="number" autoFocus
                                                    value={tempIncome} onChange={e => setTempIncome(e.target.value)}
                                                    className="w-full pl-7 pr-3 py-2 bg-slate-700/50 border border-emerald-500/50 rounded-lg text-white font-bold font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                                                />
                                            </div>
                                            <button onClick={handleSaveIncome} className="px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold shadow-lg shadow-emerald-600/20">Save</button>
                                            <button onClick={() => { setEditingIncome(false); setTempIncome(String(budgetData.total_income)); }} className="px-3 py-2 bg-white/10 text-white rounded-lg text-sm font-medium">Cancel</button>
                                        </div>
                                    )}
                                </div>

                                {/* Balances */}
                                <div className="w-full md:w-2/3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="glass-card p-4 border-emerald-500/20 bg-slate-700/40">
                                        <p className="text-xs uppercase tracking-widest text-slate-400 font-bold mb-1">In-Hand Actual Balance</p>
                                        <p className={`text-2xl font-bold font-mono tracking-tight ${currentInHand < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                                            {currencyFormatter.format(currentInHand)}
                                        </p>
                                        <p className="text-[10px] text-slate-500 mt-1">Income - Total Paid</p>
                                    </div>
                                    <div className="glass-card p-4 border-white/5 bg-slate-700/40">
                                        <p className="text-xs uppercase tracking-widest text-slate-400 font-bold mb-1">Projected Forecast</p>
                                        <p className={`text-2xl font-bold font-mono tracking-tight ${projectedRemaining < 0 ? 'text-orange-400' : 'text-amber-400'}`}>
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
                                    className={`h-full absolute left-0 top-0 rounded-full transition-all duration-500 ${totalAllocated > parseNum(budgetData.total_income) ? 'bg-red-500' : 'bg-emerald-500'}`}
                                    style={{ width: `${Math.min(100, parseNum(budgetData.total_income) === 0 ? 0 : (totalAllocated / parseNum(budgetData.total_income)) * 100)}%` }}
                                ></div>
                            </div>
                        </div>

                        {/* Category List */}
                        <div className="space-y-2 pt-4">
                            <h2 className="text-xl font-bold text-white font-heading px-2">Categories</h2>
                            
                            {budgetData.categories.map(cat => <CategoryCard key={cat.id} category={cat} />)}

                            {/* Add Category Trigger */}
                            <div className="mt-6">
                                {!isAddingCategory ? (
                                    <button onClick={() => setIsAddingCategory(true)} className="glass-card w-full p-4 border border-dashed border-white/20 text-slate-400 hover:text-white hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all flex items-center justify-center gap-2 font-medium">
                                        <FiPlus size={18} /> Add New Budget Category
                                    </button>
                                ) : (
                                    <div className="glass-card p-6 border-emerald-500/30 bg-emerald-500/5">
                                        <h4 className="text-sm font-bold text-emerald-400 mb-4 uppercase tracking-widest">New Category</h4>
                                        <div className="flex flex-col gap-3">
                                            <div className="flex flex-col sm:flex-row gap-3">
                                                <input
                                                    type="text" placeholder="Category Name (e.g. Housing)"
                                                    value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)}
                                                    className="flex-1 bg-slate-900 border border-white/10 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/50" autoFocus
                                                />
                                                <input
                                                    type="number" placeholder="Allocated Amount"
                                                    value={newCategoryAmount} onChange={e => setNewCategoryAmount(e.target.value)}
                                                    className="sm:w-48 bg-slate-900 border border-white/10 text-white font-bold rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                                                />
                                                <select
                                                    value={newCategoryAccount}
                                                    onChange={e => setNewCategoryAccount(e.target.value)}
                                                    className="sm:w-48 bg-slate-900 border border-white/10 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 cursor-pointer"
                                                >
                                                    <option value="">Account (optional)</option>
                                                    {accountTypes.map(acc => <option key={acc} value={acc}>{acc}</option>)}
                                                </select>
                                            </div>
                                            <div className="flex gap-2 sm:ml-auto">
                                                <button onClick={() => { setIsAddingCategory(false); setNewCategoryAccount(""); }} className="px-4 py-2.5 text-sm font-medium text-slate-400 hover:text-white bg-white/5 rounded-xl transition-all">Cancel</button>
                                                <button onClick={handleAddCategory} className="px-6 py-2.5 text-sm font-bold text-white bg-emerald-600 shadow-lg shadow-emerald-500/20 hover:bg-emerald-500 rounded-xl transition-all disabled:opacity-50" disabled={!newCategoryName || !newCategoryAmount}>Create</button>
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
