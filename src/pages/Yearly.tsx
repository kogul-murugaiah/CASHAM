import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAccountTypes } from "../hooks/useAccountTypes";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';

type Category = {
  id: number;
  name: string;
};

type Expense = {
  id: number;
  amount: number;
  date: string;
  category_id: number;
  account_type: string;
  categories: Category | null;
};

type CategoryTotal = {
  categoryId: number;
  categoryName: string;
  total: number;
};

type AccountTotal = {
  accountType: string;
  total: number;
};

type MonthTotal = {
  month: number;
  monthName: string;
  total: number;
};

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const Yearly = () => {
  const { accountTypes } = useAccountTypes();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState(() => {
    return new Date().getFullYear().toString();
  });

  useEffect(() => {
    const fetchExpenses = async () => {
      setLoading(true);
      setError(null);

      try {
        const year = Number(selectedYear);
        const startDate = `${year}-01-01`;
        const endDate = `${year}-12-31`;

        const { data, error } = await supabase
          .from("expenses")
          .select(
            `
            id,
            amount,
            date,
            category_id,
            account_type,
            categories (
              id,
              name
            )
          `
          )
          .gte("date", startDate)
          .lte("date", endDate)
          .order("date", { ascending: false });

        if (error) throw error;

        const typedData = (data || []).map((exp: any) => ({
          ...exp,
          categories: Array.isArray(exp.categories)
            ? exp.categories[0] || null
            : exp.categories || null,
        })) as Expense[];

        setExpenses(typedData);
      } catch (err: any) {
        setError(err.message || "Failed to fetch expenses");
      } finally {
        setLoading(false);
      }
    };

    fetchExpenses();
  }, [selectedYear]);

  // Calculate month-wise totals
  const monthTotals: MonthTotal[] = MONTH_NAMES.map((monthName, index) => {
    const month = index + 1;
    const total = expenses
      .filter((exp) => {
        const expenseDate = new Date(exp.date);
        return expenseDate.getMonth() + 1 === month;
      })
      .reduce((sum, exp) => sum + exp.amount, 0);

    return { month, monthName, total };
  }).filter((mt) => mt.total > 0);

  // Calculate category totals
  const categoryTotals: CategoryTotal[] = expenses.reduce(
    (acc, exp) => {
      const categoryId = exp.category_id;
      const categoryName = exp.categories?.name || "Unknown";

      const existing = acc.find((item) => item.categoryId === categoryId);

      if (existing) {
        existing.total += exp.amount;
      } else {
        acc.push({
          categoryId,
          categoryName,
          total: exp.amount,
        });
      }

      return acc;
    },
    [] as CategoryTotal[]
  );

  categoryTotals.sort((a, b) => b.total - a.total);

  // Calculate account type totals
  const accountTotals: AccountTotal[] = accountTypes.map((accountType) => {
    const total = expenses
      .filter((exp) => exp.account_type === accountType)
      .reduce((sum, exp) => sum + exp.amount, 0);

    return { accountType, total };
  }).filter((acc) => acc.total > 0);

  accountTotals.sort((a, b) => b.total - a.total);

  // Calculate grand total
  const grandTotal = expenses.reduce((sum, exp) => sum + exp.amount, 0);

  return (
    <div className="pb-24 pt-8 md:pb-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between animate-fade-in">
          <div>
            <p className="text-slate-400 font-medium text-sm uppercase tracking-wider">Historical Data</p>
            <h1 className="text-3xl font-bold font-heading text-white">
              Yearly Overview
            </h1>
            <p className="text-slate-400 mt-1">
              Spending analysis for <span className="text-white font-semibold">{selectedYear}</span>
            </p>
          </div>
          <input
            type="number"
            min="2000"
            max="2100"
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="w-full max-w-[140px] rounded-xl border border-white/10 bg-slate-900/50 backdrop-blur px-4 py-2.5 text-sm text-slate-100 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer transition-all hover:bg-slate-800/50"
          />
        </div>

        {loading ? (
          <div className="grid gap-6 md:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 animate-pulse rounded-3xl bg-slate-800/50" />
            ))}
          </div>
        ) : error ? (
          <div className="mb-6 glass-card border-red-500/20 bg-red-500/10 p-6 text-red-300">
            {error}
          </div>
        ) : (
          <div className="space-y-8 animate-fade-in">
            {expenses.length === 0 ? (
              <div className="glass-card p-12 text-center">
                <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">📊</span>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">No Data Available</h3>
                <p className="text-slate-400">No expenses recorded for year {selectedYear}.</p>
              </div>
            ) : (
              <>
                {/* Grand Total Card */}
                <div className="glass-card p-8 bg-gradient-to-r from-purple-600/20 to-pink-600/20 border-purple-500/30 relative overflow-hidden">
                  <div className="relative z-10">
                    <p className="text-sm font-medium text-purple-200 mb-2">
                      Total Yearly Spend
                    </p>
                    <div className="text-5xl font-bold text-white font-heading tracking-tight">
                      {currencyFormatter.format(grandTotal)}
                    </div>
                  </div>
                  <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                </div>

                {/* Charts Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Monthly Trend Chart */}
                  <div className="glass-card p-6">
                    <h3 className="text-lg font-bold text-white mb-6 font-heading">Monthly Trend</h3>
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={monthTotals.sort((a, b) => a.month - b.month)}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} vertical={false} />
                          <XAxis
                            dataKey="monthName"
                            stroke="#94a3b8"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(val) => val.slice(0, 3)}
                            dy={10}
                          />
                          <YAxis
                            stroke="#94a3b8"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => `₹${value}`}
                          />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#f8fafc' }}
                            itemStyle={{ color: '#f8fafc' }}
                            formatter={(value: any) => currencyFormatter.format(value)}
                          />
                          <Bar dataKey="total" name="Total" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Category Breakdown Chart */}
                  <div className="glass-card p-6">
                    <h3 className="text-lg font-bold text-white mb-6 font-heading">Category Breakdown</h3>
                    <div className="h-[300px] w-full flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={categoryTotals.filter(c => c.total > 0).map(c => ({ name: c.categoryName, value: c.total }))}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={2}
                            dataKey="value"
                          >
                            {categoryTotals.filter(c => c.total > 0).map((_, index) => {
                              const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#6366f1'];
                              return <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(0,0,0,0)" />;
                            })}
                          </Pie>
                          <Tooltip
                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#f8fafc' }}
                            itemStyle={{ color: '#f8fafc' }}
                            formatter={(value: any) => currencyFormatter.format(value)}
                          />
                          <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  {/* Month-wise Totals List */}
                  <div className="glass-card p-0 overflow-hidden">
                    <div className="border-b border-white/5 bg-slate-900/40 px-6 py-4">
                      <h2 className="text-lg font-bold text-white font-heading">Monthly Breakdown</h2>
                    </div>
                    <div className="divide-y divide-white/5">
                      {monthTotals.length === 0 ? (
                        <div className="px-6 py-8 text-center text-slate-400">
                          No monthly data available
                        </div>
                      ) : (
                        monthTotals.map((mt) => {
                          const percentage =
                            grandTotal > 0 ? ((mt.total / grandTotal) * 100).toFixed(1) : "0.0";
                          return (
                            <div
                              key={mt.month}
                              className="px-6 py-4 transition hover:bg-white/5"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="text-sm font-semibold text-slate-200">
                                    {mt.monthName}
                                  </div>
                                  <div className="text-xs text-slate-500">
                                    {percentage}% of total
                                  </div>
                                </div>
                                <div className="text-base font-bold text-white">
                                  {currencyFormatter.format(mt.total)}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Category Totals List */}
                  <div className="glass-card p-0 overflow-hidden">
                    <div className="border-b border-white/5 bg-slate-900/40 px-6 py-4">
                      <h2 className="text-lg font-bold text-white font-heading">Category Details</h2>
                    </div>
                    <div className="divide-y divide-white/5">
                      {categoryTotals.length === 0 ? (
                        <div className="px-6 py-8 text-center text-slate-400">
                          No category data available
                        </div>
                      ) : (
                        categoryTotals.map((cat) => {
                          const percentage =
                            grandTotal > 0
                              ? ((cat.total / grandTotal) * 100).toFixed(1)
                              : "0.0";
                          return (
                            <div
                              key={cat.categoryId}
                              className="px-6 py-4 transition hover:bg-white/5"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="text-sm font-semibold text-slate-200">
                                    {cat.categoryName}
                                  </div>
                                  <div className="text-xs text-slate-500">
                                    {percentage}% of total
                                  </div>
                                </div>
                                <div className="text-base font-bold text-white">
                                  {currencyFormatter.format(cat.total)}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Yearly;
