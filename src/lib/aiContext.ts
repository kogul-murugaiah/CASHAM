/**
 * CASHAM AI - Context Generator
 * Prepares a full "Knowledge Snapshot" of the user's financial state for the AI advisor.
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
  recentExpenses: Transaction[];
}) {
  const {
    userEmail, monthlyBalance, monthlyIncome, monthlyExpenses,
    netWorth, portfolioValue, cashBalance, topCategories, investmentBreakdown,
    todayExpenses, todayIncome, recentExpenses,
  } = data;

  const now = new Date();
  const todayStr = now.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

  const categorySummary = topCategories
    .slice(0, 5)
    .map(c => `  - ${c.name}: ₹${c.value.toLocaleString()}`)
    .join("\n");

  const investmentSummary = investmentBreakdown
    .map(i => `  - ${i.type}: ₹${i.current_value.toLocaleString()}`)
    .join("\n");

  const todayExpTotal = todayExpenses.reduce((s, e) => s + e.amount, 0);
  const todayIncTotal = todayIncome.reduce((s, i) => s + i.amount, 0);

  const todayExpLines = todayExpenses.length > 0
    ? todayExpenses.map(e => `  - [${e.category}] ${e.description || "No description"}: ₹${e.amount.toLocaleString()}`).join("\n")
    : "  None logged today.";

  const todayIncLines = todayIncome.length > 0
    ? todayIncome.map(i => `  - [${i.source || i.account_type || "Income"}] ${i.description || ""}: ₹${i.amount.toLocaleString()}`).join("\n")
    : "  None logged today.";

  const recentExpLines = recentExpenses.length > 0
    ? recentExpenses.slice(0, 10).map(e => `  - ${e.date.slice(0, 10)} | [${e.category}] ${e.description || "No description"}: ₹${e.amount.toLocaleString()}`).join("\n")
    : "  No recent transactions.";

  return `
You are the "CASHAM Elite Financial Protocol Advisor."
You have REAL-TIME access to the user's financial data below. Use it to answer ANY question precisely.
Today's Date: ${todayStr}
User: ${userEmail || "Financial Voyager"}

━━━━━━━━━━━━━━━━━━━━━━━━━
1. NET WORTH SNAPSHOT:
   - Total Net Worth: ₹${netWorth.toLocaleString()}
   - Portfolio Value: ₹${portfolioValue.toLocaleString()}
   - Cash/Bank Balance: ₹${cashBalance.toLocaleString()}

━━━━━━━━━━━━━━━━━━━━━━━━━
2. MONTHLY CASH FLOW (April 2026):
   - Income: ₹${monthlyIncome.toLocaleString()}
   - Expenses: ₹${monthlyExpenses.toLocaleString()}
   - Net Position: ₹${monthlyBalance.toLocaleString()} (${monthlyBalance >= 0 ? "SURPLUS" : "DEFICIT"})

━━━━━━━━━━━━━━━━━━━━━━━━━
3. TODAY'S ACTIVITY (${todayStr}):
   Today's Total Outbound: ₹${todayExpTotal.toLocaleString()}
   Today's Total Inbound: ₹${todayIncTotal.toLocaleString()}

   Today's Expenses:
${todayExpLines}

   Today's Income:
${todayIncLines}

━━━━━━━━━━━━━━━━━━━━━━━━━
4. RECENT TRANSACTIONS (Last 10 Expenses):
${recentExpLines}

━━━━━━━━━━━━━━━━━━━━━━━━━
5. TOP SPENDING CATEGORIES (This Month):
${categorySummary || "  No spending categorized yet."}

━━━━━━━━━━━━━━━━━━━━━━━━━
6. INVESTMENT PORTFOLIO MIX:
${investmentSummary || "  No investments logged yet."}

━━━━━━━━━━━━━━━━━━━━━━━━━
ADVISOR RULES:
- Answer date-specific questions using Section 3 (Today's Activity) and Section 4 (Recent).
- If data exists, ALWAYS give exact figures. Never say "I don't have that data."
- Use professional tone: "Inbound," "Outbound," "Net Position," "Capital Allocation."
- Flag deficits; suggest asset allocation when cash is high.
- Always refer to yourself as the "CASHAM Advisor."
`;
}
