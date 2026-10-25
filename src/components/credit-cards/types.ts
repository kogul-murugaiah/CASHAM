import type { CreditCard, CreditCardSettlement } from "../../hooks/useCreditCards";
import type { CCAdvance } from "../../hooks/useCCAdvances";
import type { CurrencyStyle } from "../../lib/formatters";

export type UnsettledExpense = {
  id: string;
  amount: number;
  date: string;
  item: string;
  description: string | null;
  category_id: number | null;
  account_type: string;
  paid_via_credit_card: boolean;
  credit_card_id: string | null;
  credit_card_name: string | null;
  cc_bill_settled: boolean;
  cc_funds_set_aside?: boolean;
  categories: { id: number; name: string } | null;
};

export type UnifiedMasterTransaction = {
  id: string;
  rawId: string;
  type: "expense" | "advance";
  date: string;
  title: string;
  description: string | null;
  account_type: string | null;
  credit_card_id: string | null;
  credit_card_name: string | null;
  category: string | undefined;
  amount: number;
  settled: boolean;
  funds_set_aside?: boolean;
  cash_received?: boolean;
  rawExpense?: UnsettledExpense;
  rawAdvance?: CCAdvance;
};

export type CardFormState = {
  name: string;
  bank_name: string;
  card_last4: string;
  credit_limit: string;
  billing_cycle_day: string;
  payment_due_day: string;
  color: string;
};

export type AdvanceFormState = {
  person_name: string;
  amount: string;
  credit_card_id: string;
  credit_card_name: string;
  date: string;
  description: string;
};

export type { CreditCard, CreditCardSettlement, CCAdvance, CurrencyStyle };
