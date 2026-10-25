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
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={() => !isCopying && onClose()}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" />

      {/* Modal Card */}
      <div
        className="relative z-10 w-full max-w-md animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="glass-card p-8 border-emerald-500/20 bg-gradient-to-br from-slate-800/90 to-slate-900/90 shadow-2xl shadow-emerald-900/30">
          {/* Modal Header */}
          <div className="flex items-center gap-3 mb-2">
            <span className="p-2.5 bg-emerald-500/15 rounded-xl">
              <FiCopy className="text-emerald-400" size={20} />
            </span>
            <div>
              <h3 className="text-xl font-bold text-white font-heading">Copy Budget Template</h3>
              <p className="text-xs text-slate-400 mt-0.5">Duplicate this month&apos;s plan to a new month</p>
            </div>
            <button
              onClick={onClose}
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
              All categories and planned items will be copied. Any existing budget in the target month will be{" "}
              <strong className="text-amber-300">replaced</strong>. All items start as{" "}
              <strong className="text-amber-300">Planned</strong>.
            </p>
          </div>

          {/* Source → Target */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 bg-slate-700/50 rounded-xl p-3 text-center border border-white/5">
              <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1">Source</p>
              <p className="text-sm font-bold text-white">
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
                className="w-full rounded-xl border border-emerald-500/40 bg-slate-700/50 backdrop-blur px-3 py-3 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 cursor-pointer"
              />
              <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mt-1.5 text-center">
                Target
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isCopying}
              className="flex-1 px-4 py-3 rounded-xl text-sm font-medium text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/5 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={onCopy}
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
  );
};
