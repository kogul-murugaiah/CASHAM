import { Link } from 'react-router-dom';

const NetWorth = () => {
    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto w-full animate-fade-in">
            <div className="mb-8">
                <h1 className="text-3xl font-bold font-heading text-white">Net Worth</h1>
                <p className="text-sm text-slate-400 mt-1">Your comprehensive financial snapshot</p>
            </div>

            {/* Top Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-slate-900/40 backdrop-blur-sm border border-white/5 rounded-3xl p-6 shadow-lg">
                    <div className="flex items-center gap-3 mb-2 text-slate-400 text-sm font-medium">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        Total Assets
                    </div>
                    <div className="text-3xl font-bold text-white">₹0</div>
                </div>

                <div className="bg-slate-900/40 backdrop-blur-sm border border-white/5 rounded-3xl p-6 shadow-lg">
                    <div className="flex items-center gap-3 mb-2 text-slate-400 text-sm font-medium">
                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                        Total Liabilities
                    </div>
                    <div className="text-3xl font-bold text-white">₹0</div>
                </div>

                <div className="bg-gradient-to-br from-blue-900/40 to-indigo-900/40 backdrop-blur-sm border border-blue-500/20 rounded-3xl p-6 shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
                    <div className="flex items-center gap-3 mb-2 text-blue-200 text-sm font-medium relative z-10">
                        <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                        Net Worth
                    </div>
                    <div className="text-3xl font-bold text-white relative z-10">₹0</div>
                </div>
            </div>

            {/* Main Chart Area */}
            <div className="bg-slate-900/40 backdrop-blur-sm border border-white/5 rounded-3xl p-6 shadow-lg min-h-[400px] flex flex-col">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-white font-heading">Net Worth Over Time</h3>
                    <div className="flex gap-2">
                        <button className="px-3 py-1 text-xs font-medium rounded-lg bg-blue-500/20 text-blue-400">1M</button>
                        <button className="px-3 py-1 text-xs font-medium rounded-lg text-slate-400 hover:bg-white/5">YTD</button>
                        <button className="px-3 py-1 text-xs font-medium rounded-lg text-slate-400 hover:bg-white/5">1Y</button>
                        <button className="px-3 py-1 text-xs font-medium rounded-lg text-slate-400 hover:bg-white/5">ALL</button>
                    </div>
                </div>

                {/* Empty State Chart Area */}
                <div className="flex-1 border-t border-white/5 mt-2 pt-16 flex flex-col items-center justify-center relative">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/10 via-transparent to-transparent opacity-50"></div>

                    {/* Simulated empty graph line */}
                    <svg className="w-full h-32 absolute top-1/2 -translate-y-1/2 opacity-20" preserveAspectRatio="none" viewBox="0 0 100 100">
                        <path d="M0 50 Q 25 50 50 50 T 100 50" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" className="text-slate-500" />
                    </svg>

                    <p className="text-slate-400 z-10 font-medium">Not enough data to display chart</p>
                    <p className="text-xs text-slate-500 mt-2 z-10">Add assets and liabilities to start tracking your net worth.</p>

                    <div className="flex gap-4 mt-6 z-10">
                        <Link to="/assets" className="px-4 py-2 rounded-xl bg-slate-800 text-slate-200 text-sm font-medium hover:bg-slate-700 transition">
                            Add Assets
                        </Link>
                        <Link to="/liabilities" className="px-4 py-2 rounded-xl bg-slate-800 text-slate-200 text-sm font-medium hover:bg-slate-700 transition">
                            Add Liabilities
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NetWorth;
