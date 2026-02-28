import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FiPlus, FiArrowUpRight, FiArrowDownLeft, FiTrendingUp, FiX } from "react-icons/fi";

const MobileBottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [hubOpen, setHubOpen] = useState(false);
  const hubRef = useRef<HTMLDivElement>(null);

  // Close hub on route change
  useEffect(() => { setHubOpen(false); }, [location.pathname]);

  // Close hub on outside click
  useEffect(() => {
    if (!hubOpen) return;
    const handler = (e: MouseEvent) => {
      if (hubRef.current && !hubRef.current.contains(e.target as Node)) {
        setHubOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [hubOpen]);

  const handleNavigate = (to: string) => {
    setHubOpen(false);
    navigate(to);
  };

  return (
    <>
      {/* Quick Hub Popup */}
      {hubOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex items-end justify-center pb-24 px-4">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm animate-fade-in"
            onClick={() => setHubOpen(false)}
          />

          {/* Hub Card */}
          <div
            ref={hubRef}
            className="relative w-full max-w-sm glass-card p-6 animate-fade-in shadow-2xl shadow-slate-950/50"
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-0.5">Quick Entry</p>
                <h3 className="text-xl font-bold text-white font-heading">Add Transaction</h3>
              </div>
              <button
                onClick={() => setHubOpen(false)}
                className="text-slate-400 p-1.5 bg-white/5 rounded-xl hover:text-white transition-colors"
              >
                <FiX size={18} />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => handleNavigate("/add")}
                className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-red-500/5 border border-red-500/10 active:bg-red-500/20 transition-all group"
              >
                <div className="w-12 h-12 rounded-2xl bg-red-500 text-white flex items-center justify-center shadow-lg shadow-red-500/30 group-hover:scale-110 transition-transform">
                  <FiArrowUpRight size={22} />
                </div>
                <span className="text-[10px] font-bold text-red-300 uppercase tracking-widest font-heading">Expense</span>
              </button>

              <button
                onClick={() => handleNavigate("/add-income")}
                className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 active:bg-emerald-500/20 transition-all group"
              >
                <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 group-hover:scale-110 transition-transform">
                  <FiArrowDownLeft size={22} />
                </div>
                <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-widest font-heading">Income</span>
              </button>

              <button
                onClick={() => handleNavigate("/add-investment")}
                className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 active:bg-amber-500/20 transition-all group"
              >
                <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/30 group-hover:scale-110 transition-transform">
                  <FiTrendingUp size={22} />
                </div>
                <span className="text-[10px] font-bold text-amber-300 uppercase tracking-widest font-heading">Invest</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FAB Button — Mobile only */}
      <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <button
          onClick={() => setHubOpen(!hubOpen)}
          className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xl shadow-blue-500/30 transition-all duration-300 ${hubOpen
              ? "bg-slate-700 rotate-45 scale-95"
              : "bg-gradient-to-br from-blue-500 to-indigo-600 hover:scale-110 active:scale-95"
            }`}
        >
          <FiPlus size={26} className="text-white" strokeWidth={2.5} />
        </button>
      </div>
    </>
  );
};

export default MobileBottomNav;
