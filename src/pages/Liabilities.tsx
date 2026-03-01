import { Link } from 'react-router-dom';

const Liabilities = () => {
    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto w-full animate-fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold font-heading text-white">Liabilities</h1>
                    <p className="text-sm text-slate-400 mt-1">0 liabilities</p>
                </div>
                <div className="flex gap-3 w-full sm:w-auto">
                    <button className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-slate-800 text-slate-200 font-medium hover:bg-slate-700 transition flex items-center justify-center gap-2 border border-white/5">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                        Import
                    </button>
                    <button className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-red-600/20 text-red-500 font-medium hover:bg-red-600/30 transition flex items-center justify-center gap-2 border border-red-500/20">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        Add Liability
                    </button>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-2 mb-6">
                <button className="px-4 py-1.5 rounded-full bg-red-600/20 text-red-500 text-sm font-semibold border border-red-500/20 transition-all">
                    All (0)
                </button>
            </div>

            {/* Empty State Card */}
            <div className="bg-slate-900/40 backdrop-blur-sm border border-white/5 rounded-3xl p-12 lg:p-24 flex flex-col items-center justify-center text-center shadow-lg w-full">
                <div className="w-16 h-16 bg-slate-800/80 rounded-2xl flex items-center justify-center mb-6 border border-white/5 shadow-inner">
                    <div className="flex items-end gap-1 w-8 h-8 opacity-75">
                        <div className="w-1/3 bg-red-400 rounded-sm h-[80%]"></div>
                        <div className="w-1/3 bg-orange-400 rounded-sm h-[50%]"></div>
                        <div className="w-1/3 bg-red-600 rounded-sm h-[30%]"></div>
                    </div>
                </div>
                <h2 className="text-xl font-bold font-heading text-white mb-2">No liabilities yet</h2>
                <p className="text-sm text-slate-400 max-w-sm">
                    Add your loans, mortgages, and debts to get an accurate view of your net worth.
                </p>
            </div>
        </div>
    );
};

export default Liabilities;
