import { useState } from "react";
import { type Fund, type FundTransaction } from "../../hooks/useFunds";
import { getLocalDateString } from "../../lib/formatters";
import { FiBriefcase, FiX, FiCheckCircle, FiClock, FiTrendingUp, FiTrendingDown } from "react-icons/fi";

interface FundFormModalProps {
    isDark: boolean;
    editingFund?: Fund | null;
    isSaving: boolean;
    onClose: () => void;
    onSubmit: (name: string, description: string) => Promise<void>;
}

/** Shared modal for creating or editing an independent fund. */
export function FundFormModal({
    isDark,
    editingFund,
    isSaving,
    onClose,
    onSubmit,
}: FundFormModalProps) {
    const [name, setName] = useState(editingFund?.name || "");
    const [description, setDescription] = useState(editingFund?.description || "");

    const modalBg = isDark ? "bg-slate-800 border-white/10" : "bg-white border-slate-200";
    const textPrimary = isDark ? "text-slate-50" : "text-slate-900";
    const textSecondary = isDark ? "text-slate-400" : "text-slate-500";
    const borderCol = isDark ? "border-white/10" : "border-slate-200";
    const inputClass = `w-full px-4 py-2.5 rounded-xl border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/40 ${
        isDark
            ? "bg-slate-900/60 border-white/10 text-white placeholder:text-slate-500"
            : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400"
    }`;

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        await onSubmit(name.trim(), description.trim());
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className={`max-w-md w-full p-6 space-y-5 rounded-2xl shadow-2xl border ${modalBg}`}>
                <div className={`flex items-center justify-between border-b pb-3.5 ${borderCol}`}>
                    <h3 className={`text-lg font-bold font-heading flex items-center gap-2.5 ${textPrimary}`}>
                        <span className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-500 flex items-center justify-center">
                            <FiBriefcase size={16} />
                        </span>
                        {editingFund ? "Edit Fund" : "New Independent Fund"}
                    </h3>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close modal"
                        className={`p-2 rounded-lg transition-colors ${
                            isDark ? "hover:bg-white/10 text-slate-400" : "hover:bg-slate-100 text-slate-500"
                        }`}
                    >
                        <FiX size={16} />
                    </button>
                </div>

                <form onSubmit={handleFormSubmit} className="space-y-4">
                    <div>
                        <label className={`block text-xs font-semibold mb-1.5 ${textSecondary}`}>Fund Name *</label>
                        <input
                            type="text"
                            autoFocus
                            placeholder="e.g. Family Trip to Bali"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className={inputClass}
                            required
                        />
                    </div>
                    <div>
                        <label className={`block text-xs font-semibold mb-1.5 ${textSecondary}`}>Description (optional)</label>
                        <input
                            type="text"
                            placeholder="Saving up for our summer vacation"
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            className={inputClass}
                        />
                    </div>
                    <div className="flex gap-2.5 pt-1">
                        <button
                            type="button"
                            onClick={onClose}
                            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
                                isDark
                                    ? "border-white/10 text-slate-300 hover:bg-white/5"
                                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                            }`}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving || !name.trim()}
                            className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-bold shadow-lg shadow-emerald-600/20 transition-all"
                        >
                            {isSaving ? "Saving..." : editingFund ? "Save Changes" : "Create Fund"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export interface FundTxFormValues {
    type: "income" | "expense";
    amount: number;
    date: string;
    description: string;
    status: "planned" | "completed";
}

interface FundTxModalProps {
    isDark: boolean;
    initialType: "income" | "expense";
    initialStatus?: "planned" | "completed";
    editingTx?: FundTransaction | null;
    isSaving: boolean;
    onClose: () => void;
    onSubmit: (values: FundTxFormValues) => Promise<void>;
}

/** Shared modal for adding or editing a fund deposit or expense entry. */
export function FundTxModal({
    isDark,
    initialType,
    initialStatus = "completed",
    editingTx,
    isSaving,
    onClose,
    onSubmit,
}: FundTxModalProps) {
    const [type, setType] = useState<"income" | "expense">(editingTx?.type ?? initialType);
    const [description, setDescription] = useState(editingTx?.description ?? "");
    const [amount, setAmount] = useState(editingTx ? String(editingTx.amount) : "");
    const [date, setDate] = useState(editingTx?.date ?? getLocalDateString());
    const [status, setStatus] = useState<"planned" | "completed">(
        editingTx?.status ?? (initialType === "income" ? "completed" : initialStatus)
    );

    const modalBg = isDark ? "bg-slate-800 border-white/10" : "bg-white border-slate-200";
    const textPrimary = isDark ? "text-slate-50" : "text-slate-900";
    const textSecondary = isDark ? "text-slate-400" : "text-slate-500";
    const borderCol = isDark ? "border-white/10" : "border-slate-200";
    const inactiveChip = isDark
        ? "bg-transparent border-white/10 text-slate-400 hover:bg-white/5"
        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100";
    const inputClass = `w-full px-4 py-2.5 rounded-xl border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/40 ${
        isDark
            ? "bg-slate-900/60 border-white/10 text-white placeholder:text-slate-500"
            : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400"
    }`;

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const numAmount = Number(amount);
        if (!description.trim() || !date || Number.isNaN(numAmount) || numAmount < 0) return;

        await onSubmit({
            type,
            amount: numAmount,
            date,
            description: description.trim(),
            status: type === "income" ? "completed" : status,
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className={`max-w-md w-full p-6 space-y-5 rounded-2xl shadow-2xl border ${modalBg}`}>
                <div className={`flex items-center justify-between border-b pb-3.5 ${borderCol}`}>
                    <h3 className={`text-lg font-bold font-heading flex items-center gap-2 ${textPrimary}`}>
                        {editingTx
                            ? "Edit Entry"
                            : type === "income"
                                ? "Add Funds In (+)"
                                : "Log Fund Expense (-)"}
                    </h3>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close modal"
                        className={`p-2 rounded-lg transition-colors ${
                            isDark ? "hover:bg-white/10 text-slate-400" : "hover:bg-slate-100 text-slate-500"
                        }`}
                    >
                        <FiX size={16} />
                    </button>
                </div>

                <form onSubmit={handleFormSubmit} className="space-y-4">
                    {/* Type Switcher */}
                    <div className="grid grid-cols-2 gap-2.5">
                        <button
                            type="button"
                            onClick={() => setType("income")}
                            className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 ${
                                type === "income"
                                    ? "bg-emerald-500/15 border-emerald-500/50 text-emerald-600 dark:text-emerald-400"
                                    : inactiveChip
                            }`}
                        >
                            <FiTrendingUp size={14} />
                            Fund In (+)
                        </button>
                        <button
                            type="button"
                            onClick={() => setType("expense")}
                            className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 ${
                                type === "expense"
                                    ? "bg-rose-500/15 border-rose-500/50 text-rose-600 dark:text-rose-400"
                                    : inactiveChip
                            }`}
                        >
                            <FiTrendingDown size={14} />
                            Expense Out (-)
                        </button>
                    </div>

                    <div>
                        <label className={`block text-xs font-semibold mb-1.5 ${textSecondary}`}>Description *</label>
                        <input
                            type="text"
                            autoFocus
                            placeholder={type === "income" ? "e.g. Monthly Trip Savings Transfer" : "e.g. Flight Tickets"}
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            className={inputClass}
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3.5">
                        <div>
                            <label className={`block text-xs font-semibold mb-1.5 ${textSecondary}`}>Amount *</label>
                            <input
                                type="number"
                                min="0"
                                step="any"
                                placeholder="0"
                                value={amount}
                                onChange={e => setAmount(e.target.value)}
                                className={inputClass}
                                required
                            />
                        </div>
                        <div>
                            <label className={`block text-xs font-semibold mb-1.5 ${textSecondary}`}>Date *</label>
                            <input
                                type="date"
                                value={date}
                                onChange={e => setDate(e.target.value)}
                                className={inputClass}
                                required
                            />
                        </div>
                    </div>

                    {type === "expense" && (
                        <div>
                            <label className={`block text-xs font-semibold mb-1.5 ${textSecondary}`}>Payment Status</label>
                            <div className="grid grid-cols-2 gap-2.5">
                                <button
                                    type="button"
                                    onClick={() => setStatus("planned")}
                                    className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 ${
                                        status === "planned"
                                            ? "bg-amber-500/15 border-amber-500/50 text-amber-600 dark:text-amber-400"
                                            : inactiveChip
                                    }`}
                                >
                                    <FiClock size={13} />
                                    Planned (Upcoming)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setStatus("completed")}
                                    className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 ${
                                        status === "completed"
                                            ? "bg-emerald-500/15 border-emerald-500/50 text-emerald-600 dark:text-emerald-400"
                                            : inactiveChip
                                    }`}
                                >
                                    <FiCheckCircle size={13} />
                                    Paid Now
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="flex gap-2.5 pt-1">
                        <button
                            type="button"
                            onClick={onClose}
                            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
                                isDark
                                    ? "border-white/10 text-slate-300 hover:bg-white/5"
                                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                            }`}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving || !description.trim() || !amount}
                            className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-bold shadow-lg shadow-emerald-600/20 transition-all"
                        >
                            {isSaving ? "Saving..." : editingTx ? "Update Entry" : "Save Entry"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
