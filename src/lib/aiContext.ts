/**
 * CASHAM AI - Context Generator
 * Multi-granularity financial snapshot: line-level for recent days,
 * aggregated summaries for older periods — maximum coverage, minimal tokens.
 */

export interface Transaction {
  date: string;
  category: string;
  description?: string;
  amount: number;
  account_type?: string;
}

export interface IncomeEntry {
  date: string;
  source?: string;
  description?: string;
  amount: number;
  account_type?: string;
}

export interface DailyTotal {
  date: string;       // "YYYY-MM-DD"
  totalExp: number;
  totalInc: number;
}

export interface MonthlyBreakdown {
  month: string;      // "YYYY-MM"
  totalExp: number;
  totalInc: number;
  topCategories: { name: string; value: number }[];
}

export function buildFinancialContext(data: {
  userEmail?: string | null;
  monthlyBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  netWorth: number;
  portfolioValue: number;
  cashBalance: number;
  topCategories: { name: string; value: number }[];
  investmentBreakdown: { type: string; current_value: number }[];
  todayExpenses: Transaction[];
  todayIncome: IncomeEntry[];
  yesterdayExpenses: Transaction[];
  yesterdayIncome: IncomeEntry[];
  last7DaysTotals: DailyTotal[];
  last6MonthsBreakdown: MonthlyBreakdown[];
  recentExpenses: Transaction[];
}) {
  const {
    userEmail, monthlyBalance, monthlyIncome, monthlyExpenses,
    netWorth, portfolioValue, cashBalance, topCategories, investmentBreakdown,
    todayExpenses, todayIncome, yesterdayExpenses, yesterdayIncome,
    last7DaysTotals, last6MonthsBreakdown, recentExpenses,
  } = data;

  const now = new Date();
  const todayStr = now.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

  // ── Helpers ──────────────────────────────────────────────────────────────
  const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;

  const txLines = (list: Transaction[]) =>
    list.length > 0
      ? list.map(e => `    • [${e.category}] ${e.description || "–"}: ${fmt(e.amount)}`).join("\n")
      : "    None.";

  const incLines = (list: IncomeEntry[]) =>
    list.length > 0
      ? list.map(i => `    • [${i.source || i.account_type || "Income"}] ${i.description || "–"}: ${fmt(i.amount)}`).join("\n")
      : "    None.";

  // ── Totals ────────────────────────────────────────────────────────────────
  const todayExpTotal   = todayExpenses.reduce((s, e) => s + e.amount, 0);
  const todayIncTotal   = todayIncome.reduce((s, i) => s + i.amount, 0);
  const yesterdayExpTotal = yesterdayExpenses.reduce((s, e) => s + e.amount, 0);
  const yesterdayIncTotal = yesterdayIncome.reduce((s, i) => s + i.amount, 0);

  // ── Last 7 days daily summary ────────────────────────────────────────────
  const last7Lines = last7DaysTotals.length > 0
    ? last7DaysTotals.map(d =>
        `    ${d.date} | Out: ${fmt(d.totalExp)} | In: ${fmt(d.totalInc)}`
      ).join("\n")
    : "    No data.";

  // ── Last 6 months summary ────────────────────────────────────────────────
  const last6MonthsLines = last6MonthsBreakdown.length > 0
    ? last6MonthsBreakdown.map(m => {
        const topCats = m.topCategories.slice(0, 3)
          .map(c => `${c.name}: ${fmt(c.value)}`).join(", ");
        return `    ${m.month} | Out: ${fmt(m.totalExp)} | In: ${fmt(m.totalInc)} | Top: ${topCats || "–"}`;
      }).join("\n")
    : "    No data.";

  // ── Recent 10 transactions ───────────────────────────────────────────────
  const recentLines = recentExpenses.length > 0
    ? recentExpenses.map(e =>
        `    ${e.date.slice(0, 10)} | [${e.category}] ${e.description || "–"}: ${fmt(e.amount)}`
      ).join("\n")
    : "    No recent transactions.";

  // ── Monthly top categories ────────────────────────────────────────────────
  const categorySummary = topCategories.slice(0, 5)
    .map(c => `    • ${c.name}: ${fmt(c.value)}`).join("\n") || "    None.";

  const investmentSummary = investmentBreakdown
    .map(i => `    • ${i.type}: ${fmt(i.current_value)}`).join("\n") || "    None.";

  // ── Final prompt ──────────────────────────────────────────────────────────
  return `
You are the "CASHAM Elite Financial Protocol Advisor."
You have REAL-TIME access to the user's complete financial data at multiple time granularities.
Use the data below to answer ANY question precisely. If data exists, give exact figures.

Today: ${todayStr} | User: ${userEmail || "Financial Voyager"}

━━━ 1. NET WORTH ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Net Worth: ${fmt(netWorth)} | Portfolio: ${fmt(portfolioValue)} | Cash: ${fmt(cashBalance)}

━━━ 2. THIS MONTH (April 2026) ━━━━━━━━━━━━━━━━━━━━
  Income: ${fmt(monthlyIncome)} | Expenses: ${fmt(monthlyExpenses)} | Net: ${fmt(monthlyBalance)} (${monthlyBalance >= 0 ? "SURPLUS" : "DEFICIT"})

━━━ 3. TODAY ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Out: ${fmt(todayExpTotal)} | In: ${fmt(todayIncTotal)}
  Expenses:
${txLines(todayExpenses)}
  Income:
${incLines(todayIncome)}

━━━ 4. YESTERDAY ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Out: ${fmt(yesterdayExpTotal)} | In: ${fmt(yesterdayIncTotal)}
  Expenses:
${txLines(yesterdayExpenses)}
  Income:
${incLines(yesterdayIncome)}

━━━ 5. LAST 7 DAYS (daily totals) ━━━━━━━━━━━━━━━━━
${last7Lines}

━━━ 6. LAST 6 MONTHS (monthly totals) ━━━━━━━━━━━━━
${last6MonthsLines}

━━━ 7. LAST 10 TRANSACTIONS ━━━━━━━━━━━━━━━━━━━━━━━
${recentLines}

━━━ 8. TOP SPENDING CATEGORIES (this month) ━━━━━━━
${categorySummary}

━━━ 9. INVESTMENT PORTFOLIO ━━━━━━━━━━━━━━━━━━━━━━━
${investmentSummary}

━━━ ADVISOR RULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Use Section 3 for "today", Section 4 for "yesterday", Section 5 for "last week/days", Section 6 for "last month/months".
- ALWAYS give exact figures from the data. Never say "I don't have access."
- If a specific date is outside the data range, say so clearly and offer the closest available.
- Professional tone: "Inbound," "Outbound," "Net Position," "Capital Allocation."
- Always refer to yourself as the "CASHAM Advisor."
`.trim();
}
