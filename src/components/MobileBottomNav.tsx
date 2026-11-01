import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  FiPlus,
  FiArrowUpRight,
  FiArrowDownLeft,
  FiTrendingUp,
  FiCheckSquare,
  FiX,
} from "react-icons/fi";

const MobileBottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [hubOpen, setHubOpen] = useState(false);
  const hubRef = useRef<HTMLDivElement>(null);

  // Close hub on route change
  const [prevPath, setPrevPath] = useState(location.pathname);
  if (prevPath !== location.pathname) {
    setPrevPath(location.pathname);
    setHubOpen(false);
  }

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
            className="absolute inset-0 bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm animate-fade-in"
            onClick={() => setHubOpen(false)}
          />

          {/* Hub Card */}
          <div
            ref={hubRef}
            className="relative w-full max-w-sm glass-card p-5 sm:p-6 animate-fade-in shadow-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 rounded-2xl"
          >
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100 dark:border-white/5">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400 font-bold mb-0.5">Quick Entry</p>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white font-heading">Add New</h3>
              </div>
              <button
                onClick={() => setHubOpen(false)}
                className="text-slate-400 p-1.5 rounded-xl hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
              >
                <FiX size={18} />
              </button>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {/* Add Expense */}
              <button
                onClick={() => handleNavigate("/add")}
                className="flex flex-col items-center gap-2 p-2.5 rounded-2xl bg-red-500/5 hover:bg-red-500/10 active:bg-red-500/20 border border-red-500/10 transition-all group"
              >
                <div className="w-11 h-11 rounded-2xl bg-red-500 text-white flex items-center justify-center shadow-lg shadow-red-500/30 group-hover:scale-110 transition-transform">
                  <FiArrowUpRight size={20} />
                </div>
                <span className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wider font-heading">Expense</span>
              </button>

              {/* Add Income */}
              <button
                onClick={() => handleNavigate("/add-income")}
                className="flex flex-col items-center gap-2 p-2.5 rounded-2xl bg-emerald-500/5 hover:bg-emerald-500/10 active:bg-emerald-500/20 border border-emerald-500/10 transition-all group"
              >
                <div className="w-11 h-11 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 group-hover:scale-110 transition-transform">
                  <FiArrowDownLeft size={20} />
                </div>
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider font-heading">Income</span>
              </button>

              {/* Add Task */}
              <button
                onClick={() => handleNavigate("/tasks?add=true")}
                className="flex flex-col items-center gap-2 p-2.5 rounded-2xl bg-teal-500/5 hover:bg-teal-500/10 active:bg-teal-500/20 border border-teal-500/10 transition-all group"
              >
                <div className="w-11 h-11 rounded-2xl bg-teal-500 text-white flex items-center justify-center shadow-lg shadow-teal-500/30 group-hover:scale-110 transition-transform">
                  <FiCheckSquare size={20} />
                </div>
                <span className="text-[10px] font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider font-heading">Task</span>
              </button>

              {/* Add Investment */}
              <button
                onClick={() => handleNavigate("/add-investment")}
                className="flex flex-col items-center gap-2 p-2.5 rounded-2xl bg-amber-500/5 hover:bg-amber-500/10 active:bg-amber-500/20 border border-amber-500/10 transition-all group"
              >
                <div className="w-11 h-11 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/30 group-hover:scale-110 transition-transform">
                  <FiTrendingUp size={20} />
                </div>
                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider font-heading">Invest</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FAB Button — Mobile only */}
      <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <button
          onClick={() => setHubOpen(!hubOpen)}
          className={`relative flex items-center gap-2.5 px-6 py-3.5 rounded-full font-bold text-white text-sm font-heading transition-all duration-300 shadow-2xl ${hubOpen
              ? "bg-slate-700 shadow-slate-900/50 scale-95"
              : "bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 shadow-emerald-500/40 hover:shadow-emerald-500/60 hover:scale-105 active:scale-95"
            }`}
        >
          {!hubOpen && (
            <span className="absolute inset-0 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 opacity-30 blur-md animate-pulse pointer-events-none" />
          )}
          <FiPlus
            size={20}
            strokeWidth={2.5}
            className={`transition-transform duration-300 ${hubOpen ? "rotate-45" : ""}`}
          />
          <span>{hubOpen ? "Close" : "Add"}</span>
        </button>
      </div>
    </>
  );
};

export default MobileBottomNav;
