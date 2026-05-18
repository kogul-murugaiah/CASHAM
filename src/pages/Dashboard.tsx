import { useEffect, useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTheme } from "../contexts/ThemeContext";
import { api } from "../lib/api";
import { useAccountTypes } from "../hooks/useAccountTypes";
import { useUserPreferences } from "../hooks/useUserPreferences";
import { formatCurrency } from "../lib/formatters";
import { FiEye, FiEyeOff } from "react-icons/fi";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

// ─── Types ───────────────────────────────────────────────────────

type Income = { id: number; amount: number; date: string; account_type: string; };
type Expense = { id: number; amount: number; date: string; account_type: string; };
type Transfer = { id: string; from_account: string; to_account: string; amount: number; date: string; note: string | null; };



const COLORS = ["#10b981", "#8b5cf6", "#ec4899", "#14b8a6", "#f59e0b"];
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

// ─── Component ──────────────────────────────────────────────────

const Dashboard = () => {
  const { accountTypes } = useAccountTypes();
  const [income, setIncome] = useState<Income[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const { hideBalance, currencyStyle, toggleHideBalance } = useUserPreferences();

  const navigate = useNavigate();
  const { theme } = useTheme();

  // ─── Theme-aware chart styles ──────────────────────────────────
  const isDark = theme === 'dark';
  const tooltipStyle = {
    contentStyle: {
      backgroundColor: isDark ? '#0f172a' : '#ffffff',
      border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}`,
      borderRadius: '14px',
      boxShadow: isDark ? '0 10px 30px rgba(0,0,0,0.5)' : '0 8px 24px rgba(0,0,0,0.1)',
      color: isDark ? '#f8fafc' : '#0f172a',
    },
    itemStyle: { fontWeight: 700 as const, color: isDark ? '#f8fafc' : '#1e293b' },
    labelStyle: { color: isDark ? '#94a3b8' : '#64748b', fontSize: '11px' },
  };
  const axisColor = isDark ? '#94a3b8' : '#64748b';
  const gridColor = isDark ? '#334155' : '#e2e8f0';
  const cursorFill = isDark ? '#334155' : '#f1f5f9';

  const [activeWalletPopup, setActiveWalletPopup] = useState<string | null>(null);
  const walletPopupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (walletPopupRef.current && !walletPopupRef.current.contains(event.target as Node)) {
        setActiveWalletPopup(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [dailyLimitAccount, setDailyLimitAccount] = useState<string>(() => localStorage.getItem("dashboard_daily_limit_account") || "All");

  useEffect(() => {
    localStorage.setItem("dashboard_daily_limit_account", dailyLimitAccount);
  }, [dailyLimitAccount]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const userData = await api.get('/api/auth/user');
        if (!userData?.user) throw new Error("User not authenticated");
        setUserEmail(userData.user.email ?? null);
        setDisplayName(userData.user.display_name ?? null);

        const data = await api.get(`/api/dashboard?year=${currentYear}&month=${currentMonth}`);
        setIncome(data.income || []);
        setExpenses(data.expenses || []);
        setTransfers(data.transfers || []);

        const goalsData = await api.get('/api/goals');
        setGoals(goalsData || []);
      } catch (err: any) {
        setError(err.message || "Failed to fetch data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [currentYear, currentMonth, accountTypes]);
  // Derived state
  const monthlyIncome = income.reduce((sum, inc) => sum + inc.amount, 0);
  const monthlyExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const monthlyBalance = monthlyIncome - monthlyExpenses;

  const todayISO = new Date().toISOString().slice(0, 10);
  const todayExpenses = expenses.filter(exp => exp.date.startsWith(todayISO)).reduce((sum, exp) => sum + exp.amount, 0);

  const accountBalances = accountTypes.map((accountType) => {
    const accIncome = income.filter((inc) => inc.account_type === accountType).reduce((sum, inc) => sum + inc.amount, 0);
    const accExp = expenses.filter((exp) => exp.account_type === accountType).reduce((sum, exp) => sum + exp.amount, 0);
    const accTransferIn = transfers.filter((t) => t.to_account === accountType).reduce((sum, t) => sum + t.amount, 0);
    const accTransferOut = transfers.filter((t) => t.from_account === accountType).reduce((sum, t) => sum + t.amount, 0);
    return { accountType, balance: accIncome - accExp + accTransferIn - accTransferOut, income: accIncome, expenses: accExp, transferIn: accTransferIn, transferOut: accTransferOut };
  });

  // Daily Average Limits Logic (Envelope Method)
  const today = new Date();
  const isCurrentMonth = today.getMonth() + 1 === currentMonth && today.getFullYear() === currentYear;
  const totalDaysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  const daysPassed = isCurrentMonth ? today.getDate() : totalDaysInMonth;
  
  // "Days Remaining Including Today"
  const daysRemainingIncludingToday = isCurrentMonth ? Math.max(1, totalDaysInMonth - daysPassed + 1) : 1;

  // Split expenses into "past" (before today) and "today"
  // Note: todayISO is already defined above, but we reuse it here
  const filteredExpenses = dailyLimitAccount === 'All' ? expenses : expenses.filter(e => e.account_type === dailyLimitAccount);
  const pastExpenses = filteredExpenses.filter(e => !e.date.startsWith(todayISO)).reduce((s, e) => s + e.amount, 0);
  const todayFilteredExpenses = filteredExpenses.filter(e => e.date.startsWith(todayISO)).reduce((s, e) => s + e.amount, 0);
  const totalFilteredExpenses = pastExpenses + todayFilteredExpenses;
  
  // The income available for this account filter (including transfers)
  const effectiveTargetIncome = dailyLimitAccount === 'All'
    ? monthlyIncome
    : (() => {
        const acc = accountBalances.find(a => a.accountType === dailyLimitAccount);
        return acc ? acc.income + acc.transferIn - acc.transferOut : 0;
      })();
    
  // Base Limit (How much we can spend per day starting today, ignoring what we already spent today)
  const baseDailyLimit = Math.max(0, (effectiveTargetIncome - pastExpenses) / daysRemainingIncludingToday);
  
  // Actual Limit Left Today
  const avgDailyLimitRemaining = Math.max(0, baseDailyLimit - todayFilteredExpenses);
  
  // Avg Daily Spend
  const avgDailySpend = totalFilteredExpenses / (daysPassed || 1);

  const accountDistributionData = accountBalances.filter(a => a.balance > 0).map(a => ({ name: a.accountType, value: a.balance }));

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };



  if (loading) return <div className="p-8"><div className="grid gap-6 md:grid-cols-3 mb-8">{[...Array(3)].map((_, i) => <div key={i} className="h-40 animate-pulse rounded-3xl bg-slate-700/50" />)}</div></div>;

  return (
    <div className="pb-24 pt-8 md:pb-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="mb-8 animate-fade-in flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div className="flex flex-col gap-1">
            <p className="text-slate-400 font-medium text-sm uppercase tracking-wider">Overview</p>
            <h1 className="text-4xl font-bold font-heading text-white">
              {getGreeting()}, <span className="text-gradient">{displayName || (userEmail ? userEmail.split('@')[0] : 'User')}</span>
            </h1>
            <p className="text-slate-400 mt-1">
              Financial summary for <span className="text-white font-semibold">{MONTH_NAMES[currentMonth - 1]} {currentYear}</span>
            </p>
          </div>

          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <button 
                onClick={toggleHideBalance}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 hover:bg-slate-700/50 border border-white/5 rounded-xl text-slate-400 hover:text-white transition-all text-xs font-bold"
            >
              {hideBalance ? <FiEyeOff size={14} /> : <FiEye size={14} />}
              {hideBalance ? "Reveal Balances" : "Privacy Mode"}
            </button>

            <div className="flex items-center gap-2 bg-slate-700/40 p-1.5 rounded-2xl border border-white/5 backdrop-blur-md self-start md:self-auto">
              <button onClick={() => { if (currentMonth === 1) { setCurrentMonth(12); setCurrentYear(y => y - 1); } else setCurrentMonth(m => m - 1); }} className="p-2 hover:bg-white/10 rounded-xl transition-colors text-slate-400 hover:text-white"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg></button>
              <div className="flex items-center gap-2 px-2">
                <select value={currentMonth} onChange={(e) => setCurrentMonth(parseInt(e.target.value))} className="bg-transparent text-white font-semibold focus:outline-none appearance-none cursor-pointer hover:text-emerald-400 transition-colors">
                  {MONTH_NAMES.map((name, i) => <option key={name} value={i + 1} className="bg-slate-900 text-white">{name}</option>)}
                </select>
                <span className="text-slate-600">/</span>
                <input type="number" value={currentYear} onChange={(e) => setCurrentYear(parseInt(e.target.value))} className="bg-transparent text-white font-semibold w-16 focus:outline-none hover:text-emerald-400 transition-colors" />
              </div>
              <button onClick={() => { if (currentMonth === 12) { setCurrentMonth(1); setCurrentYear(y => y + 1); } else setCurrentMonth(m => m + 1); }} className="p-2 hover:bg-white/10 rounded-xl transition-colors text-slate-400 hover:text-white"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg></button>
            </div>
          </div>
        </header>

        {error && <div className="mb-6 glass-card border-red-500/20 bg-red-500/10 p-6 text-red-300"><p className="font-bold mb-1 font-heading text-lg">System Error</p><p className="text-sm">{error}</p></div>}

        <div className="space-y-8 animate-fade-in">
          {/* Monthly Net Balance Master Card */}
          <div className="glass-card p-10 relative overflow-hidden group border-emerald-500/10 bg-slate-800/20">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-all transform group-hover:scale-110"><div className="w-64 h-64 rounded-full bg-emerald-500 blur-3xl" /></div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-4">
                <p className="text-sm font-black text-slate-500 uppercase tracking-[0.2em]">Monthly Net Balance</p>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20">THIS MONTH</span>
              </div>
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 mb-12">
                <div className={`text-6xl md:text-8xl font-black font-heading tracking-tighter text-center lg:text-left transition-all ${hideBalance ? 'blur-md select-none' : (monthlyBalance >= 0 ? "text-white" : "text-red-400")}`}>
                  {formatCurrency(monthlyBalance, currencyStyle)}
                </div>
                
                <div className="flex-1 max-w-xl w-full lg:self-end pb-4">
                  <div className="flex justify-between items-end mb-3 font-mono">
                    <div className="flex flex-col">
                      <span className="text-[10px] sm:text-xs font-black text-slate-500 uppercase tracking-widest">Expense</span>
                      <span className={`text-lg sm:text-xl font-bold text-red-400 ${hideBalance ? 'blur-sm select-none' : ''}`}>{formatCurrency(monthlyExpenses, currencyStyle)}</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] sm:text-xs font-black text-slate-500 uppercase tracking-widest">Income</span>
                      <span className={`text-lg sm:text-xl font-bold text-emerald-400 ${hideBalance ? 'blur-sm select-none' : ''}`}>{formatCurrency(monthlyIncome, currencyStyle)}</span>
                    </div>
                  </div>
                  <div className="h-5 w-full bg-slate-700/40 rounded-full overflow-hidden border border-white/5 backdrop-blur-sm p-[2px]">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_12px_rgba(16,185,129,0.3)] ${monthlyExpenses > monthlyIncome ? 'bg-red-500' : 'bg-emerald-500'}`}
                      style={{ width: `${Math.min((monthlyExpenses / (monthlyIncome || 1)) * 100, 100)}%` }}
                    />
                  </div>
                  <div className="mt-2 flex justify-between items-center text-[9px] font-bold uppercase tracking-tighter text-slate-600">
                    <span>Usage: {((monthlyExpenses / (monthlyIncome || 1)) * 100).toFixed(1)}%</span>
                    <span>Remaining: <span className={hideBalance ? 'blur-[2px] select-none' : ''}>{formatCurrency(Math.max(0, monthlyIncome - monthlyExpenses), currencyStyle)}</span></span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 pt-8 border-t border-white/5">
                <div className="flex flex-col relative justify-end">
                  <select 
                    value={dailyLimitAccount} 
                    onChange={(e) => setDailyLimitAccount(e.target.value)} 
                    className="absolute -top-3 left-0 bg-transparent border-b border-emerald-500/30 pb-0.5 focus:outline-none text-[8px] font-bold uppercase tracking-widest text-emerald-400 hover:text-emerald-300 cursor-pointer transition-colors max-w-[120px]"
                  >
                        <option value="All" className="bg-slate-900 text-slate-300">Target: All</option>
                        {accountTypes.map(acc => (
                           <option key={acc} value={acc} className="bg-slate-900 text-slate-300">Target: {acc}</option>
                        ))}
                  </select>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-3" title={`${daysPassed} days passed`}>Avg Daily Spend</p>
                  <p className={`text-xl font-bold text-orange-400 font-mono mt-1 ${hideBalance ? 'blur-sm select-none' : ''}`}>{formatCurrency(avgDailySpend, currencyStyle)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest" title={`${daysRemainingIncludingToday} days remaining`}>Daily Limit Left</p>
                  <p className={`text-xl font-bold text-teal-400 font-mono mt-1 ${hideBalance ? 'blur-sm select-none' : ''}`}>{formatCurrency(avgDailyLimitRemaining, currencyStyle)}</p>
                  <p className="text-[9px] font-bold text-slate-500 mt-1 uppercase">Base: {formatCurrency(baseDailyLimit, currencyStyle)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Today's Expense</p>
                  <p className={`text-xl font-bold text-rose-400 font-mono mt-1 ${hideBalance ? 'blur-sm select-none' : ''}`}>{formatCurrency(todayExpenses, currencyStyle)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Weekly Expense</p>
                  <p className={`text-xl font-bold text-amber-500 font-mono mt-1 ${hideBalance ? 'blur-sm select-none' : ''}`}>
                    {formatCurrency(expenses.filter(e => {
                        const d = new Date(e.date);
                        const t = new Date();
                        const monday = new Date(t);
                        monday.setDate(t.getDate() - ((t.getDay() + 6) % 7));
                        monday.setHours(0,0,0,0);
                        return d >= monday;
                    }).reduce((s, e) => s + e.amount, 0), currencyStyle)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="glass-card p-6">
              <h3 className="text-lg font-bold text-white mb-6 font-heading">Income vs Expense</h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[{ name: "Income", value: monthlyIncome, fill: "#10b981" }, { name: "Expense", value: monthlyExpenses, fill: "#ef4444" }]} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} opacity={0.5} vertical={false} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: axisColor, fontSize: 12 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: axisColor, fontSize: 12 }} tickFormatter={(val) => `₹${val / 1000}k`} />
                     <Tooltip cursor={{ fill: cursorFill, opacity: 0.3 }} {...tooltipStyle} formatter={(v: any) => formatCurrency(v, currencyStyle)} />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={50}>
                      {[{ fill: "#10b981" }, { fill: "#ef4444" }].map((_, index) => <Cell key={index} fill={_.fill} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="glass-card p-6">
              <h3 className="text-lg font-bold text-white mb-6 font-heading">Account Distribution</h3>
              <div className="h-64 w-full">
                {accountDistributionData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={accountDistributionData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                        {accountDistributionData.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} stroke="rgba(0,0,0,0)" />)}
                      </Pie>
                       <Tooltip {...tooltipStyle} formatter={(v: any) => formatCurrency(v, currencyStyle)} />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" formatter={(v) => <span className="text-slate-400 text-sm ml-1">{v}</span>} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-500 text-sm italic text-center">No cash balances available to chart</div>
                )}
              </div>
            </div>
          </div>

          {/* Savings Goals Mini-Section */}
          {goals.filter(g => !g.is_completed).length > 0 && (
            <div className="glass-card p-6 mb-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-white font-heading">Active Savings Goals</h3>
                <Link to="/goals" className="text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors uppercase tracking-wider">View All</Link>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {goals.filter(g => !g.is_completed).slice(0, 3).map(goal => {
                  const pct = goal.target_amount > 0 ? (goal.current_amount / goal.target_amount) * 100 : 0;
                  return (
                    <div key={goal.id} className="rounded-2xl border border-white/5 bg-slate-700/50 p-4 relative overflow-hidden group hover:bg-slate-700/80 transition-colors">
                      <div className="absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl pointer-events-none opacity-20" style={{ backgroundColor: goal.color }} />
                      <div className="flex items-center gap-3 mb-3 relative z-10">
                        <span className="text-2xl">{goal.icon}</span>
                        <div>
                          <p className="text-sm font-bold text-white">{goal.name}</p>
                          <p className="text-[10px] text-slate-400 uppercase tracking-widest">{pct.toFixed(0)}% Saved</p>
                        </div>
                      </div>
                      <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden relative z-10">
                        <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: goal.color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="glass-card p-6">
            <h3 className="text-lg font-bold text-white mb-6 font-heading">Account Wallets</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" ref={walletPopupRef}>
              {accountBalances.map((acc) => (
                <div 
                  key={acc.accountType} 
                  className="relative rounded-2xl border border-white/5 bg-slate-700/50 p-4 hover:bg-slate-700/80 transition-colors cursor-pointer"
                  onClick={() => setActiveWalletPopup(activeWalletPopup === acc.accountType ? null : acc.accountType)}
                >
                  <div className="flex justify-between items-start mb-2"><span className="text-xs font-bold uppercase tracking-wider text-slate-500">{acc.accountType}</span><div className={`h-2 w-2 rounded-full ${acc.balance >= 0 ? "bg-green-500" : "bg-red-500"}`} /></div>
                  <div className={`text-xl font-bold text-white mb-3 ${hideBalance ? 'blur-sm select-none' : ''}`}>{formatCurrency(acc.balance, currencyStyle)}</div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px]"><span className="text-slate-500">Inbound</span><span className={`text-green-400 ${hideBalance ? 'blur-[2px] select-none' : ''}`}>+{formatCurrency(acc.income, currencyStyle)}</span></div>
                    <div className="flex justify-between text-[10px]"><span className="text-slate-500">Outbound</span><span className={`text-red-400 ${hideBalance ? 'blur-[2px] select-none' : ''}`}>-{formatCurrency(acc.expenses, currencyStyle)}</span></div>
                  </div>
                  
                  {activeWalletPopup === acc.accountType && (
                    <div className={`absolute bottom-full left-0 mb-2 w-48 border rounded-xl shadow-2xl z-50 overflow-hidden animate-fade-in py-1 ${theme === 'dark' ? 'bg-slate-800 border-white/10' : 'bg-white border-slate-200 shadow-slate-200/80'}`}>
                      <div className={`px-3 py-2 text-[10px] font-black uppercase tracking-widest border-b ${theme === 'dark' ? 'text-slate-500 border-white/5' : 'text-slate-400 border-slate-100'}`}>{acc.accountType} Actions</div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); navigate(`/expense-tracking?account=${encodeURIComponent(acc.accountType)}`); }}
                        className={`w-full text-left px-4 py-2.5 text-xs font-bold transition-colors flex items-center gap-2 ${theme === 'dark' ? 'text-slate-300 hover:bg-white/5 hover:text-white' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                      >
                        <span className="w-2 h-2 rounded-full bg-red-500/80"></span>
                        View Expenses
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); navigate(`/income-tracking?account=${encodeURIComponent(acc.accountType)}`); }}
                        className={`w-full text-left px-4 py-2.5 text-xs font-bold transition-colors flex items-center gap-2 ${theme === 'dark' ? 'text-slate-300 hover:bg-white/5 hover:text-white' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                      >
                        <span className="w-2 h-2 rounded-full bg-emerald-500/80"></span>
                        View Incomes
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
