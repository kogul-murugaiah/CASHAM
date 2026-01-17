import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAccountTypes } from "../hooks/useAccountTypes";
import Footer from "../components/Footer";

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

const formatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

const Monthly = () => {
  const { accountTypes } = useAccountTypes();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  useEffect(() => {
    const fetchExpenses = async () => {
      setLoading(true);
      setError(null);

      try {
        const [year, month] = selectedMonth.split("-").map(Number);
        const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
        const endDate = new Date(year, month, 0).toISOString().split("T")[0];

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
  }, [selectedMonth]);

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

  const [year, month] = selectedMonth.split("-").map(Number);
  const monthName = monthNames[month - 1];

  return (
    <>
      <div className="min-h-screen bg-slate-900 pb-24 md:pb-0">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              Insights
            </p>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400 bg-clip-text text-transparent transform hover:scale-105 transition-all duration-300">
              Monthly Tracking
            </h1>
            <p className="text-sm text-slate-400">
              Track category and account spend for {monthName} {year}.
            </p>
          </div>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-full max-w-xs rounded-lg border border-slate-600 bg-slate-700/50 px-4 py-2 text-sm text-slate-100 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 cursor-pointer [&::-webkit-calendar-picker-indicator]:text-white [&::-webkit-calendar-picker-indicator]:bg-slate-600 [&::-webkit-calendar-picker-indicator]:hover:bg-slate-500"
          />
        </div>

        {loading && (
          <div className="grid gap-4 md:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-2xl bg-slate-800 shadow-sm ring-1 ring-slate-700"
              />
            ))}
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-2xl border border-red-600/30 bg-red-900/50 px-4 py-3 text-red-300">
            {error}
          </div>
        )}

        {!loading && !error && (
          <>
            {expenses.length === 0 ? (
              <div className="rounded-2xl bg-slate-800 p-10 text-center shadow-sm ring-1 ring-slate-700">
                <p className="text-slate-400">
                  No expenses found for {monthName} {year}
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Grand Total Card */}
                <div className="rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg">
                  <div className="px-6 py-6 sm:px-8">
                    <p className="text-sm text-blue-100">
                      Total Expenses for {monthName} {year}
                    </p>
                    <div className="mt-2 text-4xl font-semibold">
                      {formatter.format(grandTotal)}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  {/* Category Totals */}
                  <div className="overflow-hidden rounded-2xl bg-slate-800 shadow-sm ring-1 ring-slate-700">
                    <div className="border-b border-slate-600 bg-slate-700 px-6 py-4">
                      <h2 className="text-lg font-semibold text-slate-100">
                        Category-wise Totals
                      </h2>
                    </div>
                    <div className="divide-y divide-slate-600">
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
                              className="px-6 py-4 transition hover:bg-slate-700"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="text-sm font-semibold text-slate-100">
                                    {cat.categoryName}
                                  </div>
                                  <div className="text-xs text-slate-400">
                                    {percentage}% of total
                                  </div>
                                </div>
                                <div className="text-lg font-semibold text-slate-100">
                                  {formatter.format(cat.total)}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Account Type Totals */}
                  <div className="overflow-hidden rounded-2xl bg-slate-800 shadow-sm ring-1 ring-slate-700">
                    <div className="border-b border-slate-600 bg-slate-700 px-6 py-4">
                      <h2 className="text-lg font-semibold text-slate-100">
                        Account-type Totals
                      </h2>
                    </div>
                    <div className="divide-y divide-slate-600">
                      {accountTotals.length === 0 ? (
                        <div className="px-6 py-8 text-center text-slate-400">
                          No account data available
                        </div>
                      ) : (
                        accountTotals.map((acc) => {
                          const percentage =
                            grandTotal > 0
                              ? ((acc.total / grandTotal) * 100).toFixed(1)
                              : "0.0";
                          return (
                            <div
                              key={acc.accountType}
                              className="px-6 py-4 transition hover:bg-slate-700"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="text-sm font-semibold text-slate-100">
                                    {acc.accountType}
                                  </div>
                                  <div className="text-xs text-slate-400">
                                    {percentage}% of total
                                  </div>
                                </div>
                                <div className="text-lg font-semibold text-slate-100">
                                  {formatter.format(acc.total)}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
    <Footer />
    </>
  );
};

export default Monthly;
