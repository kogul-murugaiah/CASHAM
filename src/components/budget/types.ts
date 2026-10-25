export type BudgetItem = {
  id: string;
  category_id: string;
  name: string;
  amount: number; // planned amount
  paid_amount: number | null; // actual amount spent (set when marking paid)
  status: "planned" | "paid";
};

export type BudgetCategory = {
  id: string;
  budget_id: string;
  name: string;
  allocated_amount: number;
  account_name: string | null;
  items: BudgetItem[];
};

export type BudgetMonth = {
  id: string | null;
  total_income: number;
  categories: BudgetCategory[];
};

export const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});
