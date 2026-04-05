import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAccountTypes } from "../hooks/useAccountTypes";
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

export const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const COLORS = ["#10b981", "#8b5cf6", "#ec4899", "#14b8a6", "#f59e0b"];
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

// ─── Component ──────────────────────────────────────────────────

const Dashboard = () => {
  const { accountTypes } = useAccountTypes();
  const [income, setIncome] = useState<Income[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [totalInvested, setTotalInvested] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const userData = await api.get('/api/auth/user');
        if (!userData?.user) throw new Error("User not authenticated");
        setUserEmail(userData.user.email ?? null);

        const data = await api.get(`/api/dashboard?year=${currentYear}&month=${currentMonth}`);
        setIncome(data.income || []);
        setExpenses(data.expenses || []);
        setTransfers(data.transfers || []);

        try {
          const startDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
          const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
          const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear;
          const endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;
          const invData = await api.get(`/api/investments?startDate=${startDate}&endDate=${endDate}`);
          const bought = (invData || []).filter((i: any) => i.action === 'buy').reduce((s: number, i: any) => s + i.amount, 0);
          setTotalInvested(bought);
        } catch { setTotalInvested(0); }
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

  const accountDistributionData = accountBalances.filter(a => a.balance > 0).map(a => ({ name: a.accountType, value: a.balance }));

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const [syncing, setSyncing] = useState(false);
  const handleSyncCarryover = async () => {
    setSyncing(true);
    try {
      await api.post('/api/dashboard', { year: currentYear, month: currentMonth });
      window.location.reload();
    } catch (e) { console.error(e); } finally { setSyncing(false); }
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
              {getGreeting()}, <span className="text-gradient">{userEmail ? userEmail.split('@')[0] : 'User'}</span>
            </h1>
            <p className="text-slate-400 mt-1">
              Financial summary for <span className="text-white font-semibold">{MONTH_NAMES[currentMonth - 1]} {currentYear}</span>
            </p>
            <button onClick={handleSyncCarryover} disabled={syncing} className="mt-2 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1.5 opacity-60 hover:opacity-100 disabled:opacity-30">
              <svg className={`${syncing ? "animate-spin" : ""}`} xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" /><path d="M16 16h5v5" /></svg>
              {syncing ? "Syncing..." : "Sync Balance Carryover"}
            </button>
          </div>

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
              <div className={`text-6xl md:text-8xl font-black font-heading tracking-tighter mb-12 ${monthlyBalance >= 0 ? "text-white" : "text-red-400"}`}>
                {currencyFormatter.format(monthlyBalance)}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-8 pt-8 border-t border-white/5">
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Monthly Income</p>
                  <p className="text-xl font-bold text-emerald-400 font-mono mt-1">{currencyFormatter.format(monthlyIncome)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Monthly Expense</p>
                  <p className="text-xl font-bold text-red-400 font-mono mt-1">{currencyFormatter.format(monthlyExpenses)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Weekly Expense</p>
                  <p className="text-xl font-bold text-orange-400 font-mono mt-1">
                    {currencyFormatter.format(expenses.filter(e => {
                        const d = new Date(e.date);
                        const today = new Date();
                        const monday = new Date(today);
                        monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
                        monday.setHours(0,0,0,0);
                        return d >= monday;
                    }).reduce((s, e) => s + e.amount, 0))}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Today's Expense</p>
                  <p className="text-xl font-bold text-rose-400 font-mono mt-1">{currencyFormatter.format(todayExpenses)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Allocated Invest.</p>
                  <p className="text-xl font-bold text-amber-400 font-mono mt-1">{currencyFormatter.format(totalInvested)}</p>
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
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} vertical={false} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={(val) => `₹${val / 1000}k`} />
                    <Tooltip cursor={{ fill: '#334155', opacity: 0.2 }} contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#f8fafc' }} formatter={(v: any) => currencyFormatter.format(v)} />
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
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#f8fafc' }} formatter={(v: any) => currencyFormatter.format(v)} />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" formatter={(v) => <span className="text-slate-400 text-sm ml-1">{v}</span>} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-500 text-sm italic text-center">No cash balances available to chart</div>
                )}
              </div>
            </div>
          </div>

          <div className="glass-card p-6">
            <h3 className="text-lg font-bold text-white mb-6 font-heading">Account Wallets</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {accountBalances.map((acc) => (
                <div key={acc.accountType} className="rounded-2xl border border-white/5 bg-slate-700/50 p-4 hover:bg-slate-700/80 transition-colors">
                  <div className="flex justify-between items-start mb-2"><span className="text-xs font-bold uppercase tracking-wider text-slate-500">{acc.accountType}</span><div className={`h-2 w-2 rounded-full ${acc.balance >= 0 ? "bg-green-500" : "bg-red-500"}`} /></div>
                  <div className="text-xl font-bold text-white mb-3">{currencyFormatter.format(acc.balance)}</div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px]"><span className="text-slate-500">Inbound</span><span className="text-green-400">+{currencyFormatter.format(acc.income)}</span></div>
                    <div className="flex justify-between text-[10px]"><span className="text-slate-500">Outbound</span><span className="text-red-400">-{currencyFormatter.format(acc.expenses)}</span></div>
                  </div>
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
