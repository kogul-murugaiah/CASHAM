import React, { useState } from "react";
import { FiCheck, FiX, FiEdit2, FiTrash2 } from "react-icons/fi";
import { type BudgetItem, currencyFormatter } from "./types";

interface BudgetItemRowProps {
  item: BudgetItem;
  isConfirming: boolean;
  confirmAmount: string;
  setConfirmAmount: (val: string) => void;
  onConfirmPaid: () => void;
  onCancelConfirm: () => void;
  onRequestMarkPaid: (item: BudgetItem) => void;
  onRevertPlanned: (item: BudgetItem) => void;
  onEditItem: (itemId: string, categoryId: string, name: string, amount: number) => Promise<void>;
  onDeleteItem: (categoryId: string, itemId: string) => void;
  categoryId: string;
}

export const BudgetItemRow: React.FC<BudgetItemRowProps> = ({
  item,
  isConfirming,
  confirmAmount,
  setConfirmAmount,
  onConfirmPaid,
  onCancelConfirm,
  onRequestMarkPaid,
  onRevertPlanned,
  onEditItem,
  onDeleteItem,
  categoryId,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(item.name);
  const [editAmount, setEditAmount] = useState(String(item.amount));

  const parseNum = (n: unknown) => Number(n) || 0;
  const effectiveAmount =
    item.status === "paid" && item.paid_amount != null
      ? parseNum(item.paid_amount)
      : parseNum(item.amount);
  const amountDiffers =
    item.status === "paid" && item.paid_amount != null && item.paid_amount !== item.amount;

  const submitEdit = async () => {
    await onEditItem(item.id, categoryId, editName, Number(editAmount));
    setIsEditing(false);
  };

  const cancelEdit = () => {
    setEditName(item.name);
    setEditAmount(String(item.amount));
    setIsEditing(false);
  };

  return (
    <div
      className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
        isEditing
          ? "border-sky-500/40 shadow-lg shadow-sky-500/10"
          : isConfirming
          ? "border-emerald-500/40 shadow-lg shadow-emerald-500/10"
          : item.status === "paid"
          ? "border-emerald-500/20 bg-emerald-500/10 dark:bg-emerald-500/5"
          : "border-slate-200 dark:border-white/8 bg-white dark:bg-slate-700/40 hover:bg-slate-50 dark:hover:bg-slate-700/60 shadow-sm"
      } group`}
    >
      {isEditing ? (
        <div className="flex items-center gap-3 px-4 py-3 bg-sky-500/5">
          <input
            autoFocus
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitEdit();
              if (e.key === "Escape") cancelEdit();
            }}
            className="flex-1 bg-white dark:bg-slate-800/80 border border-sky-500/30 text-slate-900 dark:text-white text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-500/40 font-medium shadow-sm"
            placeholder="Item name"
          />
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800/80 border border-sky-500/30 rounded-lg px-3 py-1.5 shadow-sm">
            <span className="text-slate-400 text-sm font-bold">₹</span>
            <input
              type="number"
              value={editAmount}
              onChange={(e) => setEditAmount(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitEdit();
                if (e.key === "Escape") cancelEdit();
              }}
              className="w-24 bg-transparent text-slate-900 dark:text-white font-mono text-sm font-bold focus:outline-none"
            />
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={submitEdit}
              className="p-1.5 bg-sky-500/20 text-sky-400 hover:bg-sky-500 hover:text-white rounded-md transition-colors"
              title="Save"
            >
              <FiCheck size={15} />
            </button>
            <button
              onClick={cancelEdit}
              className="p-1.5 bg-slate-100 dark:bg-white/5 text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10 hover:text-slate-700 dark:hover:text-white rounded-md transition-colors"
              title="Cancel"
            >
              <FiX size={15} />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3 min-w-0">
            {item.status === "planned" ? (
              <button
                onClick={() => onRequestMarkPaid(item)}
                className="flex-shrink-0 w-5 h-5 rounded border-2 border-slate-300 dark:border-slate-400 hover:border-emerald-500 hover:bg-emerald-500/10 transition-all flex items-center justify-center text-transparent hover:text-emerald-500"
                title="Mark as Paid"
              >
                <FiCheck size={12} strokeWidth={3} />
              </button>
            ) : (
              <button
                onClick={() => onRevertPlanned(item)}
                className="flex-shrink-0 w-5 h-5 rounded border-2 border-emerald-500 bg-emerald-500 hover:bg-red-400 hover:border-red-400 transition-all flex items-center justify-center text-white"
                title="Undo"
              >
                <FiCheck size={12} strokeWidth={3} />
              </button>
            )}
            <span
              className={`text-sm font-medium truncate ${
                item.status === "paid" ? "text-slate-400 line-through decoration-slate-400" : "text-slate-900 dark:text-slate-100"
              }`}
            >
              {item.name}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-3">
            <div className="text-right">
              {amountDiffers ? (
                <>
                  <span className="text-[10px] text-slate-400 line-through font-mono block leading-none">
                    {currencyFormatter.format(parseNum(item.amount))}
                  </span>
                  <span className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400">
                    {currencyFormatter.format(parseNum(item.paid_amount))}
                  </span>
                </>
              ) : (
                <span
                  className={`text-sm font-bold font-mono ${
                    item.status === "paid" ? "text-emerald-600 dark:text-emerald-400" : "text-slate-900 dark:text-slate-200"
                  }`}
                >
                  {currencyFormatter.format(effectiveAmount)}
                </span>
              )}
            </div>
            <span
              className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                item.status === "paid"
                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
              }`}
            >
              {item.status}
            </span>
            {item.status === "planned" && (
              <button
                onClick={() => {
                  setIsEditing(true);
                  setEditName(item.name);
                  setEditAmount(String(item.amount));
                }}
                className="text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 opacity-0 group-hover:opacity-100 transition-all p-1 flex-shrink-0"
                title="Edit item"
              >
                <FiEdit2 size={13} />
              </button>
            )}
            <button
              onClick={() => onDeleteItem(categoryId, item.id)}
              className="text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all p-1 flex-shrink-0"
              title="Delete item"
            >
              <FiTrash2 size={14} />
            </button>
          </div>
        </div>
      )}

      {isConfirming && (
        <div className="border-t border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1">
              <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 mb-2 uppercase tracking-widest">
                How much did you actually spend?
              </p>
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-bold text-sm">₹</span>
                <input
                  type="number"
                  value={confirmAmount}
                  onChange={(e) => setConfirmAmount(e.target.value)}
                  className="bg-white dark:bg-slate-700/50 border border-emerald-500/30 text-slate-900 dark:text-white font-mono font-bold rounded-lg px-3 py-1.5 text-sm w-36 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 shadow-sm"
                  autoFocus
                />
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Planned: {currencyFormatter.format(item.amount)}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={onConfirmPaid}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors shadow-lg shadow-emerald-600/25"
              >
                <FiCheck size={13} /> Confirm Paid
              </button>
              <button
                onClick={onCancelConfirm}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white text-xs font-medium rounded-lg transition-colors border border-slate-200 dark:border-white/5"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
