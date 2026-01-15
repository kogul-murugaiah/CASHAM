import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import Footer from "../components/Footer";
import Logo from "../components/Logo";
import { useAccountTypes } from "../hooks/useAccountTypes";

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

const formatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

const Dashboard = () => {
  const { accountTypes } = useAccountTypes();
  const [income, setIncome] = useState<Income[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const now = useMemo(() => new Date(), []);
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-12

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Get current authenticated user
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) throw userError;
        if (!user) {
          throw new Error("User not authenticated");
        }

        // Calculate date range for current month
        const startDate = `${currentYear}-${String(currentMonth).padStart(2, "0")}-01`;
        const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
        const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear;
        const endDate = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;

        // Fetch income for current month - filtered by user_id
        const { data: incomeData, error: incomeError } = await supabase
          .from("income")
          .select("id, amount, date, account_type")
          .eq("user_id", user.id)
          .gte("date", startDate)
          .lt("date", endDate);

        if (incomeError) throw incomeError;

        // Fetch expenses for current month
        const { data: expenseData, error: expenseError } = await supabase
          .from("expenses")
          .select("id, amount, date, account_type")
          .gte("date", startDate)
          .lt("date", endDate);

        if (expenseError) throw expenseError;

        setIncome(incomeData || []);
        setExpenses(expenseData || []);
      } catch (err: any) {
        setError(err.message || "Failed to fetch data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentYear, currentMonth]);

  // Calculate totals
  const monthlyIncome = income.reduce((sum, inc) => sum + inc.amount, 0);
  const monthlyExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const monthlyBalance = monthlyIncome - monthlyExpenses;

  // Calculate account-wise balances
  const accountBalances = accountTypes.map((accountType) => {
    const accountIncome = income
      .filter((inc) => inc.account_type === accountType)
      .reduce((sum, inc) => sum + inc.amount, 0);

    const accountExpenses = expenses
      .filter((exp) => exp.account_type === accountType)
      .reduce((sum, exp) => sum + exp.amount, 0);

    const balance = accountIncome - accountExpenses;

    return {
      accountType,
      income: accountIncome,
      expenses: accountExpenses,
      balance,
    };
  });

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const currentMonthName = monthNames[currentMonth - 1];

  return (
    <>
      <div className="min-h-screen bg-slate-900 pb-24 md:pb-0">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-3">
              <Logo size="md" />
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                  Overview
                </p>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400 bg-clip-text text-transparent transform hover:scale-105 transition-all duration-300">
                  Dashboard – {currentMonthName} {currentYear}
                </h1>
              </div>
            </div>
          </div>
        </header>

        {loading && (
          <div className="grid gap-4 md:grid-cols-3 mb-8">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-32 animate-pulse rounded-2xl bg-slate-800 shadow-sm ring-1 ring-slate-700"
              />
            ))}
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-2xl border border-red-600/30 bg-red-900/50 px-4 py-3 text-red-300">
            {error}
          </div>
        )}

        {!loading && !error && (
          <>
            {/* Overall Summary Cards */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3 mb-8">
              {/* Monthly Expenses Card */}
              <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-blue-500 text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl">
                <div className="px-5 py-6">
                  <p className="text-sm text-blue-100">Monthly Income</p>
                  <div className="mt-2 text-4xl font-semibold">
                    {formatter.format(monthlyIncome)}
                  </div>
                  {monthlyIncome === 0 && (
                    <div className="mt-3 text-xs text-blue-100/80">
                      No income this month
                    </div>
                  )}
                </div>
              </div>

              {/* Monthly Expenses Card */}
              <div className="rounded-2xl bg-slate-800 shadow-sm ring-1 ring-slate-700 transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="px-5 py-6">
                  <p className="text-sm text-slate-400">Monthly Expenses</p>
                  <div className="mt-2 text-4xl font-semibold text-red-400">
                    {formatter.format(monthlyExpenses)}
                  </div>
                  {monthlyExpenses === 0 && (
                    <div className="mt-3 text-xs text-slate-500">
                      No expenses this month
                    </div>
                  )}
                </div>
              </div>

              {/* Monthly Balance Card */}
              <div
                className={`rounded-2xl shadow-sm ring-1 transition hover:-translate-y-0.5 hover:shadow-md ${
                  monthlyBalance >= 0
                    ? "bg-green-900/50 ring-green-800/50"
                    : "bg-red-900/50 ring-red-800/50"
                }`}
              >
                <div className="px-5 py-6">
                  <p className="text-sm text-slate-400">Monthly Balance</p>
                  <div
                    className={`mt-2 text-4xl font-semibold ${
                      monthlyBalance >= 0 ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {formatter.format(monthlyBalance)}
                  </div>
                  {monthlyBalance === 0 && (
                    <div className="mt-3 text-xs text-slate-500">
                      Balanced this month
                    </div>
                  )}
                  {monthlyBalance > 0 && (
                    <div className="mt-3 inline-flex rounded-full bg-green-800/50 px-3 py-1 text-xs font-medium text-green-300">
                      Surplus
                    </div>
                  )}
                  {monthlyBalance < 0 && (
                    <div className="mt-3 inline-flex rounded-full bg-red-800/50 px-3 py-1 text-xs font-medium text-red-300">
                      Deficit
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Account-wise Balances */}
            <section>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                    Accounts
                  </p>
                  <h2 className="text-xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400 bg-clip-text text-transparent transform hover:scale-105 transition-all duration-300">
                    Account-wise Balance
                  </h2>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {accountBalances.map((account) => {
                  const isPositive = account.balance >= 0;
                  return (
                    <div
                      key={account.accountType}
                      className={`rounded-2xl border bg-slate-800 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                        isPositive
                          ? "border-green-700/50"
                          : "border-red-700/50"
                      }`}
                    >
                      <div
                        className={`mb-2 inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
                          account.accountType === "SBI" 
                            ? "bg-blue-900/50 text-blue-300 border-blue-700/50"
                            : account.accountType === "CASH"
                            ? "bg-amber-900/50 text-amber-300 border-amber-700/50"
                            : account.accountType === "UNION"
                            ? "bg-purple-900/50 text-purple-300 border-purple-700/50"
                            : account.accountType === "INDIAN"
                            ? "bg-teal-900/50 text-teal-300 border-teal-700/50"
                            : "border-slate-600 text-slate-300"
                        }`}
                      >
                        {account.accountType}
                      </div>
                      <div
                        className={`text-2xl font-bold ${
                          isPositive ? "text-green-400" : "text-red-400"
                        }`}
                      >
                        {formatter.format(account.balance)}
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-400">
                        <div className="rounded-lg bg-slate-700/50 px-3 py-2">
                          <p className="text-[11px] text-slate-500">Income</p>
                          <p className="font-semibold text-slate-200">
                            {formatter.format(account.income)}
                          </p>
                        </div>
                        <div className="rounded-lg bg-slate-700/50 px-3 py-2">
                          <p className="text-[11px] text-slate-500">Expenses</p>
                          <p className="font-semibold text-slate-200">
                            {formatter.format(account.expenses)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
      <Footer />
    </>
  );
};

export default Dashboard;
