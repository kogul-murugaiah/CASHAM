import { useEffect, useState } from "react";
import { api } from "../lib/api";
// import Footer from "../components/Footer"; // Footer is in App layout now? No, App.tsx has MobileBottomNav but Footer is likely for Landing Page. Keeping it out of Dashboard for clean look? Or keep it?
// Let's keep Footer for now if it was there, but typically Dashboard doesn't have a big footer. 
// Actually, let's remove Footer from Dashboard to keep it "App-like".
// import Logo from "../components/Logo";
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

type Income = {
  id: number;
  amount: number;
  date: string;
  account_type: string;
};

type Expense = {
  id: number;
  amount: number;
  date: string;
  account_type: string;
};

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0, // No decimals for cleaner look
});

const COLORS = ["#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6", "#f59e0b"];

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const Dashboard = () => {
  const { accountTypes } = useAccountTypes();
  const [income, setIncome] = useState<Income[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
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

        // Fetch investment totals for the selected month
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
        if (err.status === 401) {
          // Handle unauthorized if necessary (ProtectedRoute usually catches this)
        } else {
          setError(err.message || "Failed to fetch data");
          console.error("Dashboard fetch error:", err);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentYear, currentMonth, accountTypes]);

  const monthlyIncome = income.reduce((sum, inc) => sum + inc.amount, 0);
  const monthlyExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const monthlyBalance = monthlyIncome - monthlyExpenses;

  // Data for Charts
  const comparisonData = [
    { name: "Income", value: monthlyIncome, fill: "#3b82f6" }, // Blue
    { name: "Expense", value: monthlyExpenses, fill: "#ef4444" }, // Red
  ];

  const accountBalances = accountTypes.map((accountType) => {
    const accIncome = income
      .filter((inc) => inc.account_type === accountType)
      .reduce((sum, inc) => sum + inc.amount, 0);
    const accExp = expenses
      .filter((exp) => exp.account_type === accountType)
      .reduce((sum, exp) => sum + exp.amount, 0);
    return {
      accountType,
      income: accIncome,
      expenses: accExp,
      balance: accIncome - accExp,
    };
  });

  // Filter out zero-balance accounts for pie chart to look cleaner
  const accountDistributionData = accountBalances
    .filter(a => a.balance > 0)
    .map(a => ({ name: a.accountType, value: a.balance }));

  const currentMonthName = MONTH_NAMES[currentMonth - 1];

  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

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
    } catch (e) {
      console.error(e);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="pb-24 pt-8 md:pb-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header / Greeting */}
        <header className="mb-8 animate-fade-in flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div className="flex flex-col gap-1">
            <p className="text-slate-400 font-medium text-sm uppercase tracking-wider">Overview</p>
            <h1 className="text-4xl font-bold font-heading text-white">
              {getGreeting()}, <span className="text-gradient">{userEmail ? userEmail.split('@')[0] : 'User'}</span>
            </h1>
            <p className="text-slate-400 mt-1">
              Here's your financial summary for <span className="text-white font-semibold">{currentMonthName} {currentYear}</span>
            </p>
            <button
              onClick={handleSyncCarryover}
              disabled={syncing}
              className="mt-2 text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1.5 opacity-60 hover:opacity-100 disabled:opacity-30"
            >
              <svg className={`${syncing ? "animate-spin" : ""}`} xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" /><path d="M16 16h5v5" /></svg>
              {syncing ? "Syncing..." : "Sync Balance Carryover"}
            </button>
          </div>

          {/* Month Picker UI */}
          <div className="flex items-center gap-2 bg-slate-800/40 p-1.5 rounded-2xl border border-white/5 backdrop-blur-md self-start md:self-auto">
            <button
              onClick={handlePrevMonth}
              className="p-2 hover:bg-white/10 rounded-xl transition-colors text-slate-400 hover:text-white"
              title="Previous Month"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
            </button>

            <div className="flex items-center gap-2 px-2">
              <select
                value={currentMonth}
                onChange={(e) => setCurrentMonth(parseInt(e.target.value))}
                className="bg-transparent text-white font-semibold focus:outline-none appearance-none cursor-pointer hover:text-blue-400 transition-colors"
              >
                {MONTH_NAMES.map((name, i) => (
                  <option key={name} value={i + 1} className="bg-slate-900 text-white">{name}</option>
                ))}
              </select>
              <span className="text-slate-600">/</span>
              <input
                type="number"
                value={currentYear}
                onChange={(e) => setCurrentYear(parseInt(e.target.value))}
                className="bg-transparent text-white font-semibold w-16 focus:outline-none hover:text-blue-400 transition-colors"
              />
            </div>

            <button
              onClick={handleNextMonth}
              className="p-2 hover:bg-white/10 rounded-xl transition-colors text-slate-400 hover:text-white"
              title="Next Month"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
            </button>
          </div>
        </header>

        {loading ? (
          <div className="grid gap-6 md:grid-cols-3 mb-8">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-40 animate-pulse rounded-3xl bg-slate-800/50" />
            ))}
          </div>
        ) : error ? (
          <div className="mb-6 glass-card border-red-500/20 bg-red-500/10 p-6 text-red-300">
            <p className="font-bold mb-1 font-heading text-lg">System Error</p>
            <div className="bg-black/20 p-4 rounded-xl space-y-2 mt-4 border border-red-500/10">
              <p className="text-sm">Status: <span className="text-white font-medium">{error}</span></p>
              <div className="text-[10px] text-slate-500 mt-2 uppercase tracking-widest flex flex-col gap-1">
                <p>Check console for technical details</p>
                <p>Verify SUPABASE_SERVICE_ROLE_KEY & Vercel Region</p>
                <p>Ensure .env matches Vercel Dashboard</p>
              </div>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 px-6 py-2.5 rounded-xl transition-all shadow-lg shadow-blue-600/20"
            >
              Retry Connection
            </button>
          </div>
        ) : (
          <div className="space-y-8 animate-fade-in">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {/* Income */}
              <div className="glass-card p-6 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <div className="w-24 h-24 rounded-full bg-blue-500 blur-2xl"></div>
                </div>
                <p className="text-sm font-medium text-slate-400">Total Income</p>
                <div className="mt-2 text-3xl font-bold text-white font-heading">
                  {currencyFormatter.format(monthlyIncome)}
                </div>
                <div className="mt-4 flex items-center text-xs text-blue-300 bg-blue-500/10 w-fit px-2 py-1 rounded-lg">
                  <span className="w-2 h-2 rounded-full bg-blue-400 mr-2 animate-pulse"></span>
                  Inflow
                </div>
              </div>

              {/* Expenses */}
              <div className="glass-card p-6 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <div className="w-24 h-24 rounded-full bg-red-500 blur-2xl"></div>
                </div>
                <p className="text-sm font-medium text-slate-400">Total Expenses</p>
                <div className="mt-2 text-3xl font-bold text-white font-heading">
                  {currencyFormatter.format(monthlyExpenses)}
                </div>
                <div className="mt-4 flex items-center text-xs text-red-300 bg-red-500/10 w-fit px-2 py-1 rounded-lg">
                  <span className="w-2 h-2 rounded-full bg-red-400 mr-2 animate-pulse"></span>
                  Outflow
                </div>
              </div>

              {/* Balance */}
              <div className="glass-card p-6 relative overflow-hidden group">
                <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity`}>
                  <div className={`w-24 h-24 rounded-full blur-2xl ${monthlyBalance >= 0 ? "bg-green-500" : "bg-orange-500"}`}></div>
                </div>
                <p className="text-sm font-medium text-slate-400">Net Balance</p>
                <div className={`mt-2 text-3xl font-bold font-heading ${monthlyBalance >= 0 ? "text-green-400" : "text-orange-400"}`}>
                  {currencyFormatter.format(monthlyBalance)}
                </div>
                <div className={`mt-4 flex items-center text-xs w-fit px-2 py-1 rounded-lg ${monthlyBalance >= 0 ? "text-green-300 bg-green-500/10" : "text-orange-300 bg-orange-500/10"}`}>
                  <span className={`w-2 h-2 rounded-full mr-2 animate-pulse ${monthlyBalance >= 0 ? "bg-green-400" : "bg-orange-400"}`}></span>
                  {monthlyBalance >= 0 ? "Healthy" : "Deficit"}
                </div>
              </div>

              {/* Total Invested */}
              <div className="glass-card p-6 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <div className="w-24 h-24 rounded-full bg-amber-500 blur-2xl"></div>
                </div>
                <p className="text-sm font-medium text-slate-400">Total Invested</p>
                <div className="mt-2 text-3xl font-bold text-amber-400 font-heading">
                  {currencyFormatter.format(totalInvested)}
                </div>
                <div className="mt-4 flex items-center text-xs text-amber-300 bg-amber-500/10 w-fit px-2 py-1 rounded-lg">
                  <span className="w-2 h-2 rounded-full bg-amber-400 mr-2 animate-pulse"></span>
                  Portfolio
                </div>
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Comparison Chart */}
              <div className="glass-card p-6">
                <h3 className="text-lg font-bold text-white mb-6 font-heading">Income vs Expense</h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={comparisonData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} vertical={false} />
                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#94a3b8', fontSize: 12 }}
                        dy={10}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#94a3b8', fontSize: 12 }}
                        tickFormatter={(val) => `₹${val / 1000}k`}
                      />
                      <Tooltip
                        cursor={{ fill: '#334155', opacity: 0.2 }}
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#f8fafc' }}
                        itemStyle={{ color: '#f8fafc' }}
                        formatter={(value: any) => currencyFormatter.format(value)}
                      />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={50}>
                        {comparisonData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={_.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Distribution Chart */}
              <div className="glass-card p-6">
                <h3 className="text-lg font-bold text-white mb-6 font-heading">Account Distribution</h3>
                <div className="h-64 w-full">
                  {accountDistributionData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={accountDistributionData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {accountDistributionData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(0,0,0,0)" />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#f8fafc' }}
                          itemStyle={{ color: '#f8fafc' }}
                          formatter={(value: any) => currencyFormatter.format(value)}
                        />
                        <Legend
                          verticalAlign="bottom"
                          height={36}
                          iconType="circle"
                          formatter={(value) => <span className="text-slate-400 text-sm ml-1">{value}</span>}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full w-full flex flex-col items-center justify-center text-slate-500 space-y-2">
                      <div className="w-12 h-12 rounded-full border-2 border-slate-700 border-dashed animate-spin-slow flex items-center justify-center text-xl">
                        📊
                      </div>
                      <p className="text-sm font-medium">No positive balance available</p>
                      <p className="text-xs opacity-60">Accounts with ₹0 or less aren't shown</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Account List */}
            <div className="glass-card p-6">
              <h3 className="text-lg font-bold text-white mb-6 font-heading">Detailed Account Status</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {accountBalances.map((account) => (
                  <div key={account.accountType} className="rounded-2xl border border-white/5 bg-slate-800/50 p-4 hover:bg-slate-800/80 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{account.accountType}</span>
                      <div className={`h-2 w-2 rounded-full ${account.balance >= 0 ? "bg-green-500" : "bg-red-500"}`}></div>
                    </div>
                    <div className="text-xl font-bold text-white mb-3">
                      {currencyFormatter.format(account.balance)}
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">In</span>
                        <span className="text-green-400">+{currencyFormatter.format(account.income)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Out</span>
                        <span className="text-red-400">-{currencyFormatter.format(account.expenses)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
