import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const AddLiability = () => {
    const navigate = useNavigate();
    const [liabilityType, setLiabilityType] = useState('credit_card');

    // Using a mock form submission for the UI scaffolding
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Here we would normally save to state or DB
        navigate('/liabilities');
    };

    return (
        <div className="p-4 md:p-8 max-w-3xl mx-auto w-full animate-fade-in relative z-10">
            <button
                onClick={() => navigate('/liabilities')}
                className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition"
            >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                Back to Liabilities
            </button>

            <div className="mb-8">
                <h1 className="text-3xl font-bold font-heading text-white">Add Liability</h1>
                <p className="text-sm text-slate-400 mt-1">Record a loan, mortgage, or credit card balance.</p>
            </div>

            <div className="bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-3xl p-6 md:p-8 shadow-xl">
                <form onSubmit={handleSubmit} className="space-y-6">

                    {/* Liability Type Selector */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-3">Liability Type</label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {[
                                { id: 'credit_card', icon: '💳', label: 'Credit Card' },
                                { id: 'personal_loan', icon: '💸', label: 'Personal Loan' },
                                { id: 'auto_loan', icon: '🚗', label: 'Auto Loan' },
                                { id: 'mortgage', icon: '🏠', label: 'Mortgage' },
                                { id: 'student_loan', icon: '🎓', label: 'Student Loan' },
                                { id: 'taxes', icon: '🧾', label: 'Taxes Owed' },
                                { id: 'medical', icon: '🏥', label: 'Medical Debt' },
                                { id: 'other', icon: '📝', label: 'Other Debt' },
                            ].map((type) => (
                                <button
                                    key={type.id}
                                    type="button"
                                    onClick={() => setLiabilityType(type.id)}
                                    className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${liabilityType === type.id
                                            ? 'bg-red-500/20 border-red-500/50 text-red-400'
                                            : 'bg-slate-800/50 border-white/5 text-slate-400 hover:bg-slate-800 hover:text-white hover:border-white/20'
                                        }`}
                                >
                                    <span className="text-2xl mb-1">{type.icon}</span>
                                    <span className="text-xs font-semibold">{type.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Liability Name */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Liability Name</label>
                            <input
                                type="text"
                                required
                                placeholder="e.g., HDFC Credit Card or Home Loan"
                                className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 transition"
                            />
                        </div>

                        {/* Current Balance */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Current Balance (₹)</label>
                            <input
                                type="number"
                                required
                                min="0"
                                step="any"
                                placeholder="0.00"
                                className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 transition font-mono"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Interest Rate (Optional) */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Interest Rate (%) <span className="text-slate-500 font-normal">(Optional)</span></label>
                            <input
                                type="number"
                                min="0"
                                step="any"
                                placeholder="0.00"
                                className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 transition font-mono"
                            />
                        </div>

                        {/* Minimum Payment (Optional) */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Minimum Monthly Payment (₹) <span className="text-slate-500 font-normal">(Optional)</span></label>
                            <input
                                type="number"
                                min="0"
                                step="any"
                                placeholder="0.00"
                                className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 transition font-mono"
                            />
                        </div>
                    </div>

                    {/* Notes (Optional) */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">Notes</label>
                        <textarea
                            rows={3}
                            placeholder="Add any extra details here..."
                            className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 transition resize-none"
                        ></textarea>
                    </div>

                    {/* Submit Area */}
                    <div className="pt-4 flex justify-end gap-3 border-t border-white/5">
                        <button
                            type="button"
                            onClick={() => navigate('/liabilities')}
                            className="px-6 py-3 rounded-xl bg-transparent text-slate-400 font-medium hover:text-white hover:bg-white/5 transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-8 py-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 text-white font-bold hover:from-red-500 hover:to-rose-500 transition shadow-lg shadow-red-500/25 flex items-center justify-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            Save Liability
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
};

export default AddLiability;
