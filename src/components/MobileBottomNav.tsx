import { useState, useEffect, useRef } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import type { User } from "@supabase/supabase-js";
import Logo from "./Logo";
import {
  FiHome,
  FiPlus,
  FiLogOut,
  FiArrowUpRight,
  FiArrowDownLeft,
  FiX,
  FiTrendingUp,
  FiTrendingDown,
  FiChevronDown,
  FiUser
} from "react-icons/fi";

const MobileBottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [hubOpen, setHubOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const hubRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };
    fetchUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Close hub/profile on route change
  useEffect(() => {
    setHubOpen(false);
    setProfileOpen(false);
  }, [location.pathname]);

  // Handle outside clicks
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (hubOpen && hubRef.current && !hubRef.current.contains(event.target as Node)) {
        setHubOpen(false);
      }
      if (profileOpen && profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [hubOpen, profileOpen]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const truncateEmail = (email: string) => {
    if (!email) return "";
    const [name] = email.split('@');
    if (name.length > 8) return name.slice(0, 8) + '...';
    return email;
  };

  if (loading) return null;

  return (
    <>
      {/* MOBILE TOP NAV */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-40 px-5 pt-5 pb-3 bg-slate-950/80 backdrop-blur-2xl border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Logo size="sm" />
          <span className="text-xl font-bold font-heading text-white tracking-tight">CASHAM</span>
        </div>

        {user && (
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-2.5 pl-3 pr-2 py-1.5 rounded-2xl bg-white/5 border border-white/5 active:bg-white/10 transition-all hover:border-white/10"
            >
              <span className="text-[11px] font-semibold text-slate-300 font-heading">
                {truncateEmail(user.email || "")}
              </span>
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-xs font-bold text-white shadow-lg ring-1 ring-white/10 transform rotate-1 hover:rotate-0 transition-transform">
                {user.email?.charAt(0).toUpperCase()}
              </div>
              <FiChevronDown className={`text-slate-500 transition-transform duration-300 ${profileOpen ? 'rotate-180' : ''}`} size={12} />
            </button>

            {profileOpen && (
              <div className="absolute right-0 mt-4 w-60 glass-card p-4 border-white/10 shadow-3xl animate-fade-in-up origin-top-right overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl -mr-10 -mt-10" />
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em] mb-2 px-1 font-heading">My Account</p>
                <div className="px-1 mb-5 relative z-10">
                  <p className="text-sm font-bold text-white truncate mb-0.5">{user.email}</p>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                    <p className="text-[11px] text-slate-400 font-medium">Premium Access</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-red-500/10 text-red-400 hover:bg-red-500/20 active:scale-95 transition-all font-bold text-sm border border-red-500/10"
                >
                  <FiLogOut size={16} />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        )}
      </header>

      {/* QUICK ACTION HUB OVERLAY */}
      {hubOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-32 md:hidden">
          <div
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-md"
            onClick={() => setHubOpen(false)}
          />
          <div
            ref={hubRef}
            className="relative w-full max-w-sm glass-card p-7 border-white/10 shadow-3xl animate-fade-in-up"
          >
            <div className="flex items-center justify-between mb-7">
              <h3 className="text-2xl font-bold text-white font-heading">Quick Entry</h3>
              <button onClick={() => setHubOpen(false)} className="text-slate-400 p-1.5 bg-white/5 rounded-xl hover:text-white transition-colors"><FiX size={20} /></button>
            </div>
            <div className="grid grid-cols-2 gap-5">
              <button
                onClick={() => navigate('/add')}
                className="flex flex-col items-center gap-4 p-5 rounded-[2.5rem] bg-red-500/5 border border-red-500/10 active:bg-red-500/20 transition-all group"
              >
                <div className="w-14 h-14 rounded-3xl bg-red-500 text-white flex items-center justify-center shadow-lg shadow-red-500/30 group-hover:scale-110 transition-transform">
                  <FiArrowUpRight size={28} />
                </div>
                <span className="text-[11px] font-bold text-red-300 uppercase tracking-widest font-heading">Expense</span>
              </button>
              <button
                onClick={() => navigate('/add-income')}
                className="flex flex-col items-center gap-4 p-5 rounded-[2.5rem] bg-emerald-500/5 border border-emerald-500/10 active:bg-emerald-500/20 transition-all group"
              >
                <div className="w-14 h-14 rounded-3xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 group-hover:scale-110 transition-transform">
                  <FiArrowDownLeft size={28} />
                </div>
                <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-widest font-heading">Income</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MOBILE BOTTOM NAV */}
      <nav className="md:hidden fixed inset-x-0 bottom-0 z-40 px-5 pb-9 pt-3 h-28 flex items-center justify-center pointer-events-none">
        <div className="w-full max-w-sm bg-slate-900/90 backdrop-blur-3xl px-3 h-20 rounded-[2.5rem] flex items-center justify-around border border-white/10 shadow-4xl pointer-events-auto ring-1 ring-white/5">

          {/* Home */}
          <NavLink to="/dashboard" className="flex-1 group">
            {({ isActive }) => (
              <div className={`flex flex-col items-center gap-1.5 transition-all duration-300 ${isActive ? 'text-blue-400 scale-110' : 'text-slate-500 group-hover:text-slate-300'}`}>
                <div className={`p-2 rounded-2xl transition-all ${isActive ? 'bg-blue-500/15 shadow-inner' : ''}`}>
                  <FiHome size={22} strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-widest font-heading transition-all ${isActive ? 'opacity-100' : 'opacity-60'}`}>Home</span>
              </div>
            )}
          </NavLink>

          {/* Expense */}
          <NavLink to="/expense-tracking" className="flex-1 group">
            {({ isActive }) => (
              <div className={`flex flex-col items-center gap-1.5 transition-all duration-300 ${isActive ? 'text-red-400 scale-110' : 'text-slate-500 group-hover:text-slate-300'}`}>
                <div className={`p-2 rounded-2xl transition-all ${isActive ? 'bg-red-500/15 shadow-inner' : ''}`}>
                  <FiTrendingDown size={22} strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-widest font-heading transition-all ${isActive ? 'opacity-100' : 'opacity-60'}`}>Expense</span>
              </div>
            )}
          </NavLink>

          {/* Quick Add HUB */}
          <div className="flex-1 flex justify-center -mt-12 relative">
            <div className={`absolute inset-0 bg-blue-500/20 rounded-full blur-2xl transition-opacity duration-500 ${hubOpen ? 'opacity-100' : 'opacity-0'}`} />
            <button
              onClick={() => setHubOpen(true)}
              className={`w-18 h-18 rounded-[2rem] bg-gradient-to-tr from-blue-700 to-blue-500 text-white flex items-center justify-center shadow-[0_12px_30px_rgba(37,99,235,0.4)] border-4 border-slate-950 transition-all hover:scale-110 hover:shadow-blue-500/50 active:scale-90 relative z-10 ${hubOpen ? 'rotate-45' : ''}`}
            >
              <FiPlus size={34} strokeWidth={3} />
            </button>
          </div>

          {/* Income */}
          <NavLink to="/income-tracking" className="flex-1 group">
            {({ isActive }) => (
              <div className={`flex flex-col items-center gap-1.5 transition-all duration-300 ${isActive ? 'text-emerald-400 scale-110' : 'text-slate-500 group-hover:text-slate-300'}`}>
                <div className={`p-2 rounded-2xl transition-all ${isActive ? 'bg-emerald-500/15 shadow-inner' : ''}`}>
                  <FiTrendingUp size={22} strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-widest font-heading transition-all ${isActive ? 'opacity-100' : 'opacity-60'}`}>Income</span>
              </div>
            )}
          </NavLink>

          {/* Profile Link (Replacing Dummy) */}
          <button
            onClick={() => setProfileOpen(true)}
            className={`flex-1 flex flex-col items-center gap-1.5 transition-all duration-300 ${profileOpen ? 'text-indigo-400 scale-110' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <div className={`p-2 rounded-2xl transition-all ${profileOpen ? 'bg-indigo-500/15 shadow-inner' : ''}`}>
              <FiUser size={22} strokeWidth={profileOpen ? 2.5 : 2} />
            </div>
            <span className={`text-[10px] font-bold uppercase tracking-widest font-heading transition-all ${profileOpen ? 'opacity-100' : 'opacity-60'}`}>More</span>
          </button>

        </div>
      </nav>
    </>
  );
};

export default MobileBottomNav;
