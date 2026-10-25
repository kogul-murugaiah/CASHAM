import React, { useState } from "react";
import { FiPlus, FiTrash2, FiEdit2, FiCheck, FiX, FiCreditCard } from "react-icons/fi";
import { type BudgetCategory, type BudgetItem, currencyFormatter } from "./types";
import { BudgetItemRow } from "./BudgetItemRow";

interface BudgetCategoryCardProps {
  category: BudgetCategory;
  accountTypes: string[];
  confirmPayItem: { id: string; categoryId: string; amount: string } | null;
  setConfirmPayItem: React.Dispatch<React.SetStateAction<{ id: string; categoryId: string; amount: string } | null>>;
  handleUpdateCategoryName: (categoryId: string, newName: string) => Promise<void>;
  handleUpdateCategoryAmount: (categoryId: string, newAmount: number) => Promise<void>;
  handleDeleteCategory: (id: string) => Promise<void>;
  handleUpdateCategoryAccount: (categoryId: string, accountName: string | null) => Promise<void>;
  handleAddItem: (categoryId: string, name: string, amount: number) => Promise<void>;
  handleEditItem: (itemId: string, categoryId: string, name: string, amount: number) => Promise<void>;
  handleDeleteItem: (categoryId: string, itemId: string) => Promise<void>;
  handleRequestMarkPaid: (item: BudgetItem) => void;
  handleConfirmPaid: () => Promise<void>;
  handleRevertPlanned: (item: BudgetItem) => Promise<void>;
}

export const BudgetCategoryCard: React.FC<BudgetCategoryCardProps> = ({
  category,
  accountTypes,
  confirmPayItem,
  setConfirmPayItem,
  handleUpdateCategoryName,
  handleUpdateCategoryAmount,
  handleDeleteCategory,
  handleUpdateCategoryAccount,
  handleAddItem,
  handleEditItem,
  handleDeleteItem,
  handleRequestMarkPaid,
  handleConfirmPaid,
  handleRevertPlanned,
}) => {
  const [newItemName, setNewItemName] = useState("");
  const [newItemAmount, setNewItemAmount] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editCategoryName, setEditCategoryName] = useState(category.name);
  const [isEditingAmount, setIsEditingAmount] = useState(false);
  const [editCategoryAmount, setEditCategoryAmount] = useState(String(category.allocated_amount));

  const parseNum = (n: unknown) => Number(n) || 0;
  const catAllocated = parseNum(category.allocated_amount);
  const catPaid = category.items
    .filter((i) => i.status === "paid")
    .reduce((s, i) => s + (i.paid_amount != null ? parseNum(i.paid_amount) : parseNum(i.amount)), 0);
  const catPlanned = category.items
    .filter((i) => i.status === "planned")
    .reduce((s, i) => s + parseNum(i.amount), 0);

  const actualBalance = catAllocated - catPaid;
  const projBalance = catAllocated - (catPaid + catPlanned);

  const submitAddItem = () => {
    handleAddItem(category.id, newItemName, Number(newItemAmount));
    setNewItemName("");
    setNewItemAmount("");
    setIsAdding(false);
  };

  const submitNameEdit = async () => {
    await handleUpdateCategoryName(category.id, editCategoryName);
    setIsEditingName(false);
  };

  const cancelNameEdit = () => {
    setEditCategoryName(category.name);
    setIsEditingName(false);
  };

  const submitAmountEdit = async () => {
    const parsed = Number(editCategoryAmount);
    if (parsed > 0) await handleUpdateCategoryAmount(category.id, parsed);
    setIsEditingAmount(false);
  };

  const cancelAmountEdit = () => {
    setEditCategoryAmount(String(category.allocated_amount));
    setIsEditingAmount(false);
  };

  return (
    <div className="glass-card mb-6 border border-slate-200 dark:border-white/5 bg-white dark:bg-slate-800/40 overflow-hidden shadow-sm">
      {/* Category header */}
      <div className="bg-slate-50 dark:bg-slate-700/30 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-white/5">
        <div className="group/name">
          {isEditingName ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                type="text"
                value={editCategoryName}
                onChange={(e) => setEditCategoryName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submitNameEdit();
                  if (e.key === "Escape") cancelNameEdit();
                }}
                className="text-xl font-bold bg-white dark:bg-slate-800/80 border border-sky-500/40 text-slate-900 dark:text-white font-heading rounded-lg px-3 py-1 focus:outline-none focus:ring-2 focus:ring-sky-500/40 w-full max-w-xs shadow-sm"
              />
              <button
                onClick={submitNameEdit}
                className="p-1.5 bg-sky-500/20 text-sky-400 hover:bg-sky-500 hover:text-white rounded-md transition-colors flex-shrink-0"
                title="Save name"
              >
                <FiCheck size={15} />
              </button>
              <button
                onClick={cancelNameEdit}
                className="p-1.5 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white rounded-md transition-colors flex-shrink-0"
                title="Cancel"
              >
                <FiX size={15} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h3
                className="text-xl font-bold text-slate-900 dark:text-white font-heading cursor-pointer hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                onDoubleClick={() => {
                  setIsEditingName(true);
                  setEditCategoryName(category.name);
                }}
                title="Double-click to rename"
              >
                {category.name}
              </h3>
              <button
                onClick={() => {
                  setIsEditingName(true);
                  setEditCategoryName(category.name);
                }}
                className="p-1 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 opacity-0 group-hover/name:opacity-100 transition-all rounded"
                title="Rename category"
              >
                <FiEdit2 size={13} />
              </button>
            </div>
          )}
          <div className="flex items-center gap-2 mt-1 group/amount">
            {isEditingAmount ? (
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 text-sm font-bold">₹</span>
                <input
                  autoFocus
                  type="number"
                  value={editCategoryAmount}
                  onChange={(e) => setEditCategoryAmount(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") submitAmountEdit();
                    if (e.key === "Escape") cancelAmountEdit();
                  }}
                  className="w-28 bg-white dark:bg-slate-800/80 border border-sky-500/40 text-slate-900 dark:text-white font-mono font-bold text-sm rounded-lg px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-sky-500/40 shadow-sm"
                />
                <button
                  onClick={submitAmountEdit}
                  className="p-1 bg-sky-500/20 text-sky-400 hover:bg-sky-500 hover:text-white rounded transition-colors"
                  title="Save"
                >
                  <FiCheck size={13} />
                </button>
                <button
                  onClick={cancelAmountEdit}
                  className="p-1 bg-slate-100 dark:bg-white/5 text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10 hover:text-slate-700 dark:hover:text-white rounded transition-colors"
                  title="Cancel"
                >
                  <FiX size={13} />
                </button>
              </div>
            ) : (
              <>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Budget: <strong className="text-emerald-600 dark:text-emerald-400">{currencyFormatter.format(catAllocated)}</strong>
                </p>
                <button
                  onClick={() => {
                    setIsEditingAmount(true);
                    setEditCategoryAmount(String(category.allocated_amount));
                  }}
                  className="p-0.5 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 opacity-0 group-hover/amount:opacity-100 transition-all rounded"
                  title="Edit budget amount"
                >
                  <FiEdit2 size={12} />
                </button>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-3 text-xs font-medium">
          <div className="glass-card px-4 py-2.5 border border-slate-200 dark:border-white/5 bg-white dark:bg-slate-700/40 !rounded-xl !shadow-none hover:!shadow-none">
            <span className="text-slate-400 dark:text-slate-500 block mb-0.5 text-[10px] uppercase tracking-widest font-semibold">Actual Balance</span>
            <span className={`text-sm font-bold font-mono ${actualBalance < 0 ? "text-red-500 dark:text-red-400" : "text-slate-900 dark:text-white"}`}>
              {currencyFormatter.format(actualBalance)}
            </span>
          </div>
          <div className="glass-card px-4 py-2.5 border border-slate-200 dark:border-white/5 bg-white dark:bg-slate-700/40 !rounded-xl !shadow-none hover:!shadow-none">
            <span className="text-slate-400 dark:text-slate-500 block mb-0.5 text-[10px] uppercase tracking-widest font-semibold">Projected</span>
            <span className={`text-sm font-bold font-mono ${projBalance < 0 ? "text-orange-500 dark:text-orange-400" : "text-slate-900 dark:text-white"}`}>
              {currencyFormatter.format(projBalance)}
            </span>
          </div>
          <button
            onClick={() => handleDeleteCategory(category.id)}
            className="p-2 text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 transition-colors bg-slate-100 dark:bg-white/5 rounded-lg flex self-center"
            title="Delete category"
          >
            <FiTrash2 size={16} />
          </button>
        </div>
      </div>

      {/* Account assignment row */}
      <div className="px-5 py-2.5 border-b border-slate-200 dark:border-white/5 flex items-center gap-3 bg-slate-50/70 dark:bg-slate-800/20">
        <FiCreditCard size={13} className="text-slate-400 dark:text-slate-500 flex-shrink-0" />
        <span className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400 font-bold">Account</span>
        <select
          value={category.account_name || ""}
          onChange={(e) => handleUpdateCategoryAccount(category.id, e.target.value || null)}
          className="ml-auto text-xs font-semibold bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 cursor-pointer shadow-sm"
        >
          <option value="">— Unassigned —</option>
          {accountTypes.map((acc) => (
            <option key={acc} value={acc}>
              {acc}
            </option>
          ))}
        </select>
      </div>

      {/* Items */}
      <div className="p-5">
        {category.items.length > 0 ? (
          <div className="space-y-3 mb-4">
            {category.items.map((item) => {
              const isConfirming = confirmPayItem?.id === item.id;
              return (
                <BudgetItemRow
                  key={item.id}
                  item={item}
                  isConfirming={isConfirming}
                  confirmAmount={confirmPayItem?.amount || ""}
                  setConfirmAmount={(val) =>
                    setConfirmPayItem((prev) => (prev ? { ...prev, amount: val } : null))
                  }
                  onConfirmPaid={handleConfirmPaid}
                  onCancelConfirm={() => setConfirmPayItem(null)}
                  onRequestMarkPaid={handleRequestMarkPaid}
                  onRevertPlanned={handleRevertPlanned}
                  onEditItem={handleEditItem}
                  onDeleteItem={handleDeleteItem}
                  categoryId={category.id}
                />
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-slate-400 dark:text-slate-500 mb-4 px-2">No planned expenses in this category yet.</p>
        )}

        {!isAdding ? (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium px-2 py-1 transition-colors"
          >
            <FiPlus size={16} /> Add Expense Item
          </button>
        ) : (
          <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-emerald-500/20 shadow-sm">
            <input
              type="text"
              placeholder="Item Name (e.g. Rent)"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              className="flex-1 bg-transparent border-none text-sm text-slate-900 dark:text-white focus:outline-none placeholder-slate-400"
              autoFocus
            />
            <div className="flex items-center gap-2 border-l border-slate-200 dark:border-white/10 pl-3">
              <span className="text-slate-400 text-sm font-bold">₹</span>
              <input
                type="number"
                placeholder="0"
                value={newItemAmount}
                onChange={(e) => setNewItemAmount(e.target.value)}
                className="w-20 bg-transparent border-none text-sm font-mono font-bold text-slate-900 dark:text-white focus:outline-none placeholder-slate-400"
              />
            </div>
            <div className="flex gap-1 ml-2">
              <button
                onClick={submitAddItem}
                className="p-1.5 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white rounded-md transition-colors"
                title="Save"
              >
                <FiCheck size={16} />
              </button>
              <button
                onClick={() => setIsAdding(false)}
                className="p-1.5 bg-slate-200/60 dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-md transition-colors"
                title="Cancel"
              >
                <FiX size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
