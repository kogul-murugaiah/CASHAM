import React from "react";
import { FiCopy, FiX, FiAlertCircle, FiArrowRight } from "react-icons/fi";

interface CopyMonthModalProps {
  isOpen: boolean;
  isCopying: boolean;
  sourceYear: number;
  sourceMonth: number;
  copyTargetMonth: string;
  setCopyTargetMonth: (val: string) => void;
  onClose: () => void;
  onCopy: () => void;
  theme: string;
}

export const CopyMonthModal: React.FC<CopyMonthModalProps> = ({
  isOpen,
  isCopying,
  sourceYear,
  sourceMonth,
  copyTargetMonth,
  setCopyTargetMonth,
  onClose,
  onCopy,
  theme,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={() => !isCopying && onClose()}
    >
      {/* Modal Card */}
      <div
        className="relative z-10 w-full max-w-md animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="glass-card p-6 sm:p-7 border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 shadow-2xl rounded-2xl">
          {/* Modal Header */}
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200/80 dark:border-white/10">
            <div className="flex items-center gap-3">
              <span className="p-2.5 bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-500/20">
                <FiCopy size={20} />
              </span>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white font-heading">Copy Budget Template</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Duplicate this month&apos;s plan to a new month</p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={isCopying}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
            >
              <FiX size={18} />
            </button>
          </div>

          {/* Info note */}
          <div className="mb-5 flex gap-3 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
            <FiAlertCircle size={16} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
              All categories and planned items will be copied. Any existing budget in the target month will be{" "}
              <strong className="font-semibold text-amber-950 dark:text-amber-100">replaced</strong>. All items start as{" "}
              <strong className="font-semibold text-amber-950 dark:text-amber-100">Planned</strong>.
            </p>
          </div>

          {/* Source → Target */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 bg-slate-50 dark:bg-slate-700/40 rounded-xl p-3 text-center border border-slate-200 dark:border-white/5">
              <p className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400 font-bold mb-1">Source</p>
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                {new Date(sourceYear, sourceMonth - 1).toLocaleString("default", {
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
            <FiArrowRight size={20} className="text-emerald-500 flex-shrink-0" />
            <div className="flex-1">
              <input
                type="month"
                value={copyTargetMonth}
                onChange={(e) => setCopyTargetMonth(e.target.value)}
                style={{ colorScheme: theme }}
                className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-700/50 backdrop-blur px-3 py-2.5 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 cursor-pointer shadow-sm"
              />
              <p className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400 font-bold mt-1.5 text-center">
                Target
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isCopying}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 transition-all"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onCopy}
              disabled={isCopying || !copyTargetMonth}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-600/25 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
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
  );
};
