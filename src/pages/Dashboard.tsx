import { useEffect, useState, useRef, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTheme } from "../contexts/ThemeContext";
import { api } from "../lib/api";
import { useAccountTypes } from "../hooks/useAccountTypes";
import { useUserPreferences } from "../hooks/useUserPreferences";
import { formatCurrency } from "../lib/formatters";
import { FiEye, FiEyeOff, FiCheckCircle, FiCircle, FiCheckSquare, FiZap, FiArrowRight, FiChevronDown, FiCreditCard } from "react-icons/fi";
import type { CreditCard } from "../hooks/useCreditCards";
import { useTasks, getLocalDateStr } from "../hooks/useTasks";
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
  const { todayTasks, fetchTodayTasks, toggleComplete, heatmapData, fetchHeatmapData } = useTasks();

  useEffect(() => {
    fetchTodayTasks();
    fetchHeatmapData();
  }, [fetchTodayTasks, fetchHeatmapData]);

  const todayTasksCompleted = todayTasks.filter(t => t.completed_today).length;
  const todayTasksTotal = todayTasks.length;
  const todayTasksPct = todayTasksTotal > 0 ? Math.round((todayTasksCompleted / todayTasksTotal) * 100) : 0;

  const dashboardStreak = useMemo(() => {
    if (!heatmapData?.counts) return 0;
    const today = getLocalDateStr();
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = getLocalDateStr(yesterdayDate);

    const hasToday = (heatmapData.counts[today] || 0) > 0;
    const hasYesterday = (heatmapData.counts[yesterday] || 0) > 0;

    if (!hasToday && !hasYesterday) return 0;

    let count = 0;
    const curr = hasToday ? new Date() : yesterdayDate;
    while (true) {
      const dStr = getLocalDateStr(curr);
      if ((heatmapData.counts[dStr] || 0) > 0) {
        count++;
        curr.setDate(curr.getDate() - 1);
      } else {
        break;
      }
    }
    return count;
  }, [heatmapData]);

  const { accountTypes } = useAccountTypes();
  const [income, setIncome] = useState<Income[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
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

  // Sync when localStorage changes from Settings (e.g. navigating back)
  useEffect(() => {
    const onStorage = () => setDailyLimitAccount(localStorage.getItem("dashboard_daily_limit_account") || "All");
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

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

        const [cardsData, goalsData] = await Promise.all([
          api.get('/api/credit-cards').catch(() => []),
          api.get('/api/goals').catch(() => [])
        ]);
        setCreditCards(cardsData || []);
        setGoals(goalsData || []);
      } catch (err: any) {
        setError(err.message || "Failed to fetch data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [currentYear, currentMonth, accountTypes]);
  // ── Due-Soon Credit Card Alerts (within 5 days with pending dues) ────────
  const dueSoonCards = useMemo(() => {
    const today = new Date();
    const currentDay = today.getDate();
    const totalDaysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();

    return creditCards
      .filter(card => {
        const dues = Number(card.total_dues || 0);
        if (dues <= 0) return false;
        const dueDay = card.payment_due_day;
        if (!dueDay) return false;

        let daysLeft = dueDay - currentDay;
        if (daysLeft < 0) {
          daysLeft = totalDaysInMonth - currentDay + dueDay;
        }
        return daysLeft <= 5;
      })
      .map(card => {
        const dueDay = card.payment_due_day || 20;
        let daysLeft = dueDay - currentDay;
        if (daysLeft < 0) {
          daysLeft = totalDaysInMonth - currentDay + dueDay;
        }
        return {
          ...card,
          daysUntilDue: daysLeft
        };
      })
      .sort((a, b) => a.daysUntilDue - b.daysUntilDue);
  }, [creditCards]);

  // Derived state
  const monthlyIncome = income.reduce((sum, inc) => sum + inc.amount, 0);
  const monthlyExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const monthlyBalance = monthlyIncome - monthlyExpenses;

  const todayISO = getLocalDateStr();

  const accountBalances = accountTypes.map((accountType) => {
    const accIncome = income.filter((inc) => inc.account_type === accountType).reduce((sum, inc) => sum + inc.amount, 0);
    const accExp = expenses.filter((exp) => exp.account_type === accountType).reduce((sum, exp) => sum + exp.amount, 0);
    const accTransferIn = transfers.filter((t) => t.to_account === accountType).reduce((sum, t) => sum + t.amount, 0);
    const accTransferOut = transfers.filter((t) => t.from_account === accountType).reduce((sum, t) => sum + t.amount, 0);
    const totalInbound = accIncome + accTransferIn;
    const totalOutbound = accExp + accTransferOut;
    return {
      accountType,
      balance: totalInbound - totalOutbound,
      income: accIncome,
      expenses: accExp,
      transferIn: accTransferIn,
      transferOut: accTransferOut,
      totalInbound,
      totalOutbound,
    };
  });

  // Daily Average Limits Logic (Envelope Method)
  const today = new Date();
  const isCurrentMonth = today.getMonth() + 1 === currentMonth && today.getFullYear() === currentYear;
  const totalDaysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  const daysPassed = isCurrentMonth ? today.getDate() : totalDaysInMonth;

  // "Days Remaining Including Today"
  const daysRemainingIncludingToday = isCurrentMonth ? Math.max(1, totalDaysInMonth - daysPassed + 1) : 1;

  // ── Selected-account aggregates (for Avg Daily Spend, Base Limit, Today's Expense & Daily Limit Left) ──
  const selectedAccountExpenses = dailyLimitAccount === 'All'
    ? expenses
    : expenses.filter(e => e.account_type === dailyLimitAccount);

  const selectedAccountMonthlyExpenses = selectedAccountExpenses.reduce((sum, exp) => sum + exp.amount, 0);

  // Avg Daily Spend (for selected account or all accounts)
  const avgDailySpend = selectedAccountMonthlyExpenses / (daysPassed || 1);

  const selectedPastExpenses = selectedAccountExpenses
    .filter(e => !e.date.startsWith(todayISO))
    .reduce((s, e) => s + e.amount, 0);

  // Today's spend from the selected account (or all accounts if 'All')
  const todaySelectedExpenses = selectedAccountExpenses
    .filter(e => e.date.startsWith(todayISO))
    .reduce((s, e) => s + e.amount, 0);

  // Income available for the selected account (including transfers)
  const effectiveTargetIncome = dailyLimitAccount === 'All'
    ? monthlyIncome
    : (() => {
        const acc = accountBalances.find(a => a.accountType === dailyLimitAccount);
        return acc ? acc.income + acc.transferIn - acc.transferOut : 0;
      })();

  // Base Limit = how much the selected account can spend per day from today
  const baseDailyLimit = Math.max(0, (effectiveTargetIncome - selectedPastExpenses) / daysRemainingIncludingToday);

  // Daily Limit Left = Base Limit (selected account) - Today's spend (selected account only)
  const avgDailyLimitRemaining = Math.max(0, baseDailyLimit - todaySelectedExpenses);

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
            <p className="text-slate-500 dark:text-slate-400 font-medium text-sm uppercase tracking-wider">Overview</p>
            <h1 className="text-4xl font-bold font-heading text-slate-900 dark:text-white">
              {getGreeting()}, <span className="text-gradient">{displayName || (userEmail ? userEmail.split('@')[0] : 'User')}</span>
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Financial summary for <span className="text-slate-900 dark:text-white font-semibold">{MONTH_NAMES[currentMonth - 1]} {currentYear}</span>
            </p>
            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-2">
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>

          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <button 
                onClick={toggleHideBalance}
                className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-700/50 border border-slate-200 dark:border-white/5 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all text-xs font-bold shadow-sm"
            >
              {hideBalance ? <FiEyeOff size={14} /> : <FiEye size={14} />}
              {hideBalance ? "Reveal Balances" : "Privacy Mode"}
            </button>

            <div className="flex items-center gap-2 bg-white dark:bg-slate-700/40 p-1.5 rounded-2xl border border-slate-200 dark:border-white/5 backdrop-blur-md self-start md:self-auto shadow-sm">
              <button onClick={() => { if (currentMonth === 1) { setCurrentMonth(12); setCurrentYear(y => y - 1); } else setCurrentMonth(m => m - 1); }} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl transition-colors text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg></button>
              <div className="flex items-center gap-2 px-2">
                <select value={currentMonth} onChange={(e) => setCurrentMonth(parseInt(e.target.value))} className="bg-transparent text-slate-900 dark:text-white font-semibold focus:outline-none appearance-none cursor-pointer hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors">
                  {MONTH_NAMES.map((name, i) => <option key={name} value={i + 1} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">{name}</option>)}
                </select>
                <span className="text-slate-400 dark:text-slate-600">/</span>
                <input type="number" value={currentYear} onChange={(e) => setCurrentYear(parseInt(e.target.value))} className="bg-transparent text-slate-900 dark:text-white font-semibold w-16 focus:outline-none hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors" />
              </div>
              <button onClick={() => { if (currentMonth === 12) { setCurrentMonth(1); setCurrentYear(y => y + 1); } else setCurrentMonth(m => m + 1); }} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl transition-colors text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg></button>
            </div>
          </div>
        </header>

        {error && <div className="mb-6 glass-card border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10 p-6 text-red-700 dark:text-red-300"><p className="font-bold mb-1 font-heading text-lg">System Error</p><p className="text-sm">{error}</p></div>}

        <div className="space-y-8 animate-fade-in">
          {/* 💳 Bill Due-Date Alert Banner */}
          {dueSoonCards.length > 0 && (
            <div className="space-y-3">
              {dueSoonCards.map(card => {
                const daysLeft = card.daysUntilDue;
                const dueText = daysLeft === 0
                  ? "due today"
                  : daysLeft === 1
                  ? "due tomorrow"
                  : `due in ${daysLeft} days`;

                return (
                  <div
                    key={card.id}
                    onClick={() => navigate('/credit-cards')}
                    className={`cursor-pointer rounded-2xl p-4 sm:p-5 border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm hover:scale-[1.005] group ${
                      isDark
                        ? "bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/15"
                        : "bg-amber-50/90 border-amber-200 hover:bg-amber-100/70"
                    }`}
                    title="Click to view and settle card dues"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl transition-transform group-hover:scale-105 ${isDark ? "bg-amber-500/20 text-amber-400" : "bg-amber-100 text-amber-700"}`}>
                        <FiCreditCard size={22} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-black uppercase tracking-widest ${isDark ? "text-amber-400" : "text-amber-800"}`}>
                            Bill Due Alert
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            daysLeft <= 1
                              ? "bg-rose-500/15 text-rose-500 border border-rose-500/25"
                              : "bg-amber-500/15 text-amber-500 border border-amber-500/25"
                          }`}>
                            {daysLeft === 0 ? "Due Today" : daysLeft === 1 ? "Due Tomorrow" : `${daysLeft} Days Left`}
                          </span>
                        </div>
                        <p className={`text-sm sm:text-base font-bold mt-0.5 ${isDark ? "text-slate-100" : "text-slate-900"}`}>
                          <span className="font-extrabold">{card.name}</span> bill payment {dueText}{" "}
                          <span className="font-mono text-amber-500">
                            ({formatCurrency(card.total_dues || 0, currencyStyle)} pending)
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto text-xs font-bold text-amber-600 dark:text-amber-400 group-hover:translate-x-0.5 transition-transform">
                      <span>Settle in Credit Cards</span>
                      <FiArrowRight size={14} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Monthly Net Balance Master Card */}
          <div className="glass-card p-10 relative overflow-hidden group border border-slate-200 dark:border-emerald-500/10 bg-white/90 dark:bg-slate-800/20 shadow-sm">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-all transform group-hover:scale-110"><div className="w-64 h-64 rounded-full bg-emerald-500 blur-3xl" /></div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-4">
                <p className="text-sm font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em]">Monthly Net Balance</p>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold border border-emerald-500/20">THIS MONTH</span>
              </div>
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 mb-12">
                <div className={`text-6xl md:text-8xl font-black font-heading tracking-tighter text-center lg:text-left transition-all ${hideBalance ? 'blur-md select-none' : (monthlyBalance >= 0 ? "text-slate-900 dark:text-white" : "text-rose-600 dark:text-red-400")}`}>
                  {formatCurrency(monthlyBalance, currencyStyle)}
                </div>
                
                <div className="flex-1 max-w-xl w-full lg:self-end pb-4">
                  <div className="flex justify-between items-end mb-3 font-mono">
                    <div className="flex flex-col">
                      <span className="text-[10px] sm:text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Expense</span>
                      <span className={`text-lg sm:text-xl font-bold text-rose-600 dark:text-red-400 ${hideBalance ? 'blur-sm select-none' : ''}`}>{formatCurrency(monthlyExpenses, currencyStyle)}</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] sm:text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Income</span>
                      <span className={`text-lg sm:text-xl font-bold text-emerald-600 dark:text-emerald-400 ${hideBalance ? 'blur-sm select-none' : ''}`}>{formatCurrency(monthlyIncome, currencyStyle)}</span>
                    </div>
                  </div>
                  <div className="h-5 w-full bg-slate-100 dark:bg-slate-700/40 rounded-full overflow-hidden border border-slate-200 dark:border-white/5 backdrop-blur-sm p-[2px]">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_12px_rgba(16,185,129,0.3)] ${monthlyExpenses > monthlyIncome ? 'bg-red-500' : 'bg-emerald-500'}`}
                      style={{ width: `${Math.min((monthlyExpenses / (monthlyIncome || 1)) * 100, 100)}%` }}
                    />
                  </div>
                  <div className="mt-2 flex justify-between items-center text-[9px] font-bold uppercase tracking-tighter text-slate-500 dark:text-slate-400">
                    <span>Usage: {((monthlyExpenses / (monthlyIncome || 1)) * 100).toFixed(1)}%</span>
                    <span>Remaining: <span className={hideBalance ? 'blur-[2px] select-none' : ''}>{formatCurrency(Math.max(0, monthlyIncome - monthlyExpenses), currencyStyle)}</span></span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-5 gap-6 pt-8 border-t border-slate-200/60 dark:border-white/5 items-start">
                <div className="flex flex-col">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Avg Daily Spend</p>
                  <div className="h-8 flex items-center mt-1">
                    <p className={`text-xl font-bold text-orange-400 font-mono leading-none ${hideBalance ? 'blur-sm select-none' : ''}`}>{formatCurrency(avgDailySpend, currencyStyle)}</p>
                  </div>
                </div>
                <div className="flex flex-col">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Base Limit</p>
                  <div className="h-8 flex items-center mt-1">
                    <p className={`text-xl font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'} font-mono leading-none ${hideBalance ? 'blur-sm select-none' : ''}`}>{formatCurrency(baseDailyLimit, currencyStyle)}</p>
                  </div>
                </div>
                <div className="flex flex-col">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Today's Expense</p>
                  <div className="h-8 flex items-center mt-1">
                    <p className={`text-xl font-bold text-rose-400 font-mono leading-none ${hideBalance ? 'blur-sm select-none' : ''}`}>{formatCurrency(todaySelectedExpenses, currencyStyle)}</p>
                  </div>
                </div>
                <div className="flex flex-col">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap" title={`${daysRemainingIncludingToday} days remaining`}>Daily Limit Left</p>
                  <div className="h-8 flex items-center mt-1">
                    <p className={`text-xl font-bold text-teal-400 font-mono leading-none ${hideBalance ? 'blur-sm select-none' : ''}`}>{formatCurrency(avgDailyLimitRemaining, currencyStyle)}</p>
                  </div>
                </div>
                <div className="col-span-2 sm:col-span-1 lg:col-span-1 flex flex-col">
                  <label htmlFor="dashboard-kpi-account-selector" className="text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap block">
                    Account
                  </label>
                  <div className="h-8 flex items-center mt-1">
                    <div className="relative w-full">
                      <select
                        id="dashboard-kpi-account-selector"
                        value={dailyLimitAccount}
                        onChange={(e) => {
                          const val = e.target.value;
                          setDailyLimitAccount(val);
                          localStorage.setItem("dashboard_daily_limit_account", val);
                        }}
                        className={`w-full h-8 font-bold text-xs sm:text-sm px-3 rounded-xl border outline-none transition-all cursor-pointer appearance-none truncate pr-8 shadow-sm ${
                          isDark
                            ? "bg-slate-800/90 hover:bg-slate-700/90 text-white border-white/10 hover:border-emerald-500/40 focus:border-emerald-500"
                            : "bg-white hover:bg-slate-50 text-slate-800 border-slate-200 hover:border-emerald-500/40 focus:border-emerald-500"
                        }`}
                        title="Filter daily limits by account"
                      >
                        <option value="All" className={isDark ? "bg-slate-900 text-white font-medium" : "bg-white text-slate-900 font-medium"}>
                          All Accounts
                        </option>
                        {accountTypes.map((type) => (
                          <option key={type} value={type} className={isDark ? "bg-slate-900 text-white font-medium" : "bg-white text-slate-900 font-medium"}>
                            {type}
                          </option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400">
                        <FiChevronDown size={14} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Today's Habits & Tasks Widget ── */}
          <div className="glass-card p-6 border-emerald-500/15 relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 shadow-sm shadow-emerald-500/10">
                  <FiCheckSquare size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white font-heading">Today's Focus & Habits</h3>
                    {todayTasksTotal > 0 && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        {todayTasksCompleted}/{todayTasksTotal} Done ({todayTasksPct}%)
                      </span>
                    )}
                    {dashboardStreak > 0 && (
                      <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                        <FiZap size={11} />
                        {dashboardStreak}d Streak
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Track and complete your daily routines directly</p>
                </div>
              </div>

              <Link
                to="/tasks"
                className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 dark:hover:text-emerald-300 transition-colors w-fit group"
              >
                <span>Open Task Manager</span>
                <FiArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>

            {/* Progress Bar */}
            {todayTasksTotal > 0 && (
              <div className="mb-4">
                <div className="h-2 w-full bg-slate-100 dark:bg-slate-700/40 rounded-full overflow-hidden border border-slate-200 dark:border-white/5">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                    style={{ width: `${todayTasksPct}%` }}
                  />
                </div>
              </div>
            )}

            {/* Quick-Action Task List */}
            {todayTasksTotal === 0 ? (
              <div className="py-6 text-center rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5">
                <p className="text-xs text-slate-500 dark:text-slate-400">No habits or tasks scheduled for today.</p>
                <Link
                  to="/tasks"
                  className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-2 hover:underline"
                >
                  + Add daily habits in Task Manager
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {todayTasks.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => toggleComplete(task.id)}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none group ${
                      task.completed_today
                        ? "bg-emerald-500/5 border-emerald-500/20 text-slate-400"
                        : "bg-slate-50 hover:bg-slate-100 dark:bg-slate-700/30 dark:hover:bg-slate-700/60 border-slate-200 dark:border-white/5 text-slate-800 dark:text-slate-200 shadow-sm"
                    }`}
                  >
                    <button
                      type="button"
                      className={`flex-shrink-0 transition-colors ${
                        task.completed_today ? "text-emerald-500 dark:text-emerald-400" : "text-slate-400 dark:text-slate-500 group-hover:text-emerald-500 dark:group-hover:text-emerald-400"
                      }`}
                    >
                      {task.completed_today ? <FiCheckCircle size={18} /> : <FiCircle size={18} />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-semibold truncate ${task.completed_today ? "line-through text-slate-400 dark:text-slate-500" : "text-slate-900 dark:text-white"}`}>
                          {task.title}
                        </span>
                        <span
                          style={{ backgroundColor: (task.color || '#10b981') + '22', color: task.color || '#10b981' }}
                          className="px-1.5 py-0.2 rounded text-[9px] font-bold"
                        >
                          {task.category}
                        </span>
                      </div>
                      {task.time_block && (
                        <p className="text-[10px] text-slate-500 capitalize">{task.time_block}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="glass-card p-6">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 font-heading">Income vs Expense</h3>
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
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 font-heading">Account Distribution</h3>
              <div className="h-64 w-full">
                {accountDistributionData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={accountDistributionData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                        {accountDistributionData.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} stroke="rgba(0,0,0,0)" />)}
                      </Pie>
                       <Tooltip {...tooltipStyle} formatter={(v: any) => formatCurrency(v, currencyStyle)} />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" formatter={(v) => <span className="text-slate-500 dark:text-slate-400 text-sm ml-1">{v}</span>} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-500 dark:text-slate-400 text-sm italic text-center">No cash balances available to chart</div>
                )}
              </div>
            </div>
          </div>

          {/* Savings Goals Mini-Section */}
          {goals.filter(g => !g.is_completed).length > 0 && (
            <div className="glass-card p-6 mb-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white font-heading">Active Savings Goals</h3>
                <Link to="/goals" className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 dark:hover:text-emerald-300 transition-colors uppercase tracking-wider">View All</Link>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {goals.filter(g => !g.is_completed).slice(0, 3).map(goal => {
                  const pct = goal.target_amount > 0 ? (goal.current_amount / goal.target_amount) * 100 : 0;
                  return (
                    <div key={goal.id} className="rounded-2xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-slate-700/50 p-4 relative overflow-hidden group hover:bg-slate-100 dark:hover:bg-slate-700/80 transition-all shadow-sm">
                      <div className="absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl pointer-events-none opacity-20" style={{ backgroundColor: goal.color }} />
                      <div className="flex items-center gap-3 mb-3 relative z-10">
                        <span className="text-2xl">{goal.icon}</span>
                        <div>
                          <p className="text-sm font-bold text-slate-900 dark:text-white">{goal.name}</p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-widest">{pct.toFixed(0)}% Saved</p>
                        </div>
                      </div>
                      <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden relative z-10">
                        <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: goal.color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="glass-card p-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 font-heading">Account Wallets</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" ref={walletPopupRef}>
              {accountBalances.map((acc) => (
                <div 
                  key={acc.accountType} 
                  className="relative rounded-2xl border border-slate-200 dark:border-white/5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-700/50 dark:hover:bg-slate-700/80 p-4 transition-all shadow-sm hover:shadow-md cursor-pointer"
                  onClick={() => setActiveWalletPopup(activeWalletPopup === acc.accountType ? null : acc.accountType)}
                >
                  <div className="flex justify-between items-start mb-2"><span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">{acc.accountType}</span><div className={`h-2 w-2 rounded-full ${acc.balance >= 0 ? "bg-green-500" : "bg-red-500"}`} /></div>
                  <div className={`text-xl font-bold text-slate-900 dark:text-white mb-3 ${hideBalance ? 'blur-sm select-none' : ''}`}>{formatCurrency(acc.balance, currencyStyle)}</div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px]" title={acc.transferIn > 0 ? `Income: ${formatCurrency(acc.income, currencyStyle)} + Transfers In: ${formatCurrency(acc.transferIn, currencyStyle)}` : undefined}><span className="text-slate-500 dark:text-slate-400">Inbound</span><span className={`text-emerald-600 dark:text-green-400 font-semibold ${hideBalance ? 'blur-[2px] select-none' : ''}`}>+{formatCurrency(acc.totalInbound, currencyStyle)}</span></div>
                    <div className="flex justify-between text-[10px]" title={acc.transferOut > 0 ? `Expenses: ${formatCurrency(acc.expenses, currencyStyle)} + Transfers Out: ${formatCurrency(acc.transferOut, currencyStyle)}` : undefined}><span className="text-slate-500 dark:text-slate-400">Outbound</span><span className={`text-rose-600 dark:text-red-400 font-semibold ${hideBalance ? 'blur-[2px] select-none' : ''}`}>-{formatCurrency(acc.totalOutbound, currencyStyle)}</span></div>
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
