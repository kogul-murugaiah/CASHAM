/**
 * CASHAM AI - Context Generator
 * Prepares a "Knowledge Snapshot" of the user's financial state for the AI advisor.
 */

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
}) {
  const { 
    userEmail, monthlyBalance, monthlyIncome, monthlyExpenses, 
    netWorth, portfolioValue, cashBalance, topCategories, investmentBreakdown 
  } = data;

  const categorySummary = topCategories
    .slice(0, 5)
    .map(c => `- ${c.name}: ₹${c.value.toLocaleString()}`)
    .join("\n");

  const investmentSummary = investmentBreakdown
    .map(i => `- ${i.type}: ₹${i.current_value.toLocaleString()}`)
    .join("\n");

  return `
You are the "CASHAM Elite Financial Protocol Advisor." 
You help the user (koguldev7) manage their wealth and optimize spending.
Current Environment Context:
- User: ${userEmail || "Financial Voyager"}
- Month: April 2026

YOUR KNOWLEDGE OF THEIR CURRENT FINANCES:
1. NET WORTH Snapshot:
   - Total Net Worth: ₹${netWorth.toLocaleString()}
   - Portfolio Value: ₹${portfolioValue.toLocaleString()}
   - Cash/Bank Balance: ₹${cashBalance.toLocaleString()}

2. MONTHLY CASH FLOW:
   - Income: ₹${monthlyIncome.toLocaleString()}
   - Expenses: ₹${monthlyExpenses.toLocaleString()}
   - Net Balance: ₹${monthlyBalance.toLocaleString()} (${monthlyBalance >= 0 ? "SURPLUS" : "DEFICIT"})

3. TOP SPENDING CATEGORIES:
${categorySummary || "No spending data categorized yet."}

4. INVESTMENT PORTFOLIO MIX:
${investmentSummary || "No investments logged yet."}

ADVICE GUIDELINES:
- Keep it professional, premium, and elite (Enfix Emerald style).
- Be concise but insightful. 
- Use terms like "Inbound," "Outbound," "Net Position," and "Capital Allocation."
- If the user is in a deficit, suggest optimizations.
- If they have high cash, suggest "Allocating to Assets."
- Always refer to yourself as the "CASHAM Advisor."
`;
}
