export interface CardBillingCycleInfo {
  lastStatementDate: string; // YYYY-MM-DD
  dueDate: string;           // YYYY-MM-DD
  nextStatementDate: string; // YYYY-MM-DD
  daysUntilDue: number;
  isDueSoon: boolean;
  isOverdue: boolean;
}

export interface CardCycleDues {
  statementDue: number;
  unbilledSpends: number;
  totalOutstanding: number;
  isStatementPaid: boolean;
  cycleInfo: CardBillingCycleInfo;
}

/**
 * Calculates billing statement dates and payment due dates for a credit card.
 * Handles month rollovers, leap years, and varying days per month.
 */
export function getCardCycleDates(
  billingDay: number = 23,
  paymentDueDay: number = 20,
  refDate: Date = new Date()
): CardBillingCycleInfo {
  const y = refDate.getFullYear();
  const m = refDate.getMonth();
  const d = refDate.getDate();

  const safeBillingDay = Math.min(31, Math.max(1, Number(billingDay) || 23));
  const safeDueDay = Math.min(31, Math.max(1, Number(paymentDueDay) || 20));

  // 1. Last Statement Date
  let lastStmtY = y;
  let lastStmtM = m;
  if (d < safeBillingDay) {
    lastStmtM = m - 1;
    if (lastStmtM < 0) {
      lastStmtM = 11;
      lastStmtY = y - 1;
    }
  }
  const maxDayInLastStmtMonth = new Date(lastStmtY, lastStmtM + 1, 0).getDate();
  const lastStmtD = Math.min(safeBillingDay, maxDayInLastStmtMonth);
  const lastStmtDate = new Date(lastStmtY, lastStmtM, lastStmtD);

  // 2. Due Date for the Last Statement
  let dueY = lastStmtY;
  let dueM = lastStmtM;
  if (safeDueDay <= safeBillingDay) {
    dueM = lastStmtM + 1;
    if (dueM > 11) {
      dueM = 0;
      dueY = lastStmtY + 1;
    }
  }
  const maxDayInDueMonth = new Date(dueY, dueM + 1, 0).getDate();
  const actualDueD = Math.min(safeDueDay, maxDayInDueMonth);
  const dueDate = new Date(dueY, dueM, actualDueD);

  // 3. Next Statement Date
  let nextStmtY = lastStmtY;
  let nextStmtM = lastStmtM + 1;
  if (nextStmtM > 11) {
    nextStmtM = 0;
    nextStmtY = lastStmtY + 1;
  }
  const maxDayInNextStmtMonth = new Date(nextStmtY, nextStmtM + 1, 0).getDate();
  const nextStmtD = Math.min(safeBillingDay, maxDayInNextStmtMonth);
  const nextStmtDate = new Date(nextStmtY, nextStmtM, nextStmtD);

  // 4. Days Until Due (calendar day difference)
  const refMidnight = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate());
  const dueMidnight = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
  const diffDays = Math.round((dueMidnight.getTime() - refMidnight.getTime()) / (1000 * 60 * 60 * 24));

  const toISODate = (dt: Date): string => {
    const yr = dt.getFullYear();
    const mo = String(dt.getMonth() + 1).padStart(2, '0');
    const da = String(dt.getDate()).padStart(2, '0');
    return `${yr}-${mo}-${da}`;
  };

  return {
    lastStatementDate: toISODate(lastStmtDate),
    dueDate: toISODate(dueDate),
    nextStatementDate: toISODate(nextStmtDate),
    daysUntilDue: diffDays,
    isDueSoon: diffDays >= 0 && diffDays <= 5,
    isOverdue: diffDays < 0,
  };
}

/**
 * Calculates statement dues vs unbilled current cycle spends for a specific credit card.
 */
export function calculateCardCycleDues(
  card: { id: string; name: string; billing_cycle_day?: number; payment_due_day?: number },
  unsettledExpenses: Array<{ credit_card_id?: string | null; credit_card_name?: string | null; amount: number; date: string; cc_bill_settled?: boolean }>,
  unsettledAdvances: Array<{ credit_card_id?: string | null; credit_card_name?: string | null; amount: number; date: string; cc_bill_settled?: boolean }>,
  refDate: Date = new Date()
): CardCycleDues {
  const cycleInfo = getCardCycleDates(card.billing_cycle_day || 23, card.payment_due_day || 20, refDate);
  const cutoff = cycleInfo.lastStatementDate;

  let statementDue = 0;
  let unbilledSpends = 0;

  for (const exp of unsettledExpenses) {
    if (exp.cc_bill_settled) continue;
    const match = (exp.credit_card_id && exp.credit_card_id === card.id) ||
                  (exp.credit_card_name && exp.credit_card_name.trim().toLowerCase() === card.name.trim().toLowerCase());
    if (match) {
      const amt = Number(exp.amount || 0);
      if (exp.date <= cutoff) {
        statementDue += amt;
      } else {
        unbilledSpends += amt;
      }
    }
  }

  for (const adv of unsettledAdvances) {
    if (adv.cc_bill_settled) continue;
    const match = (adv.credit_card_id && adv.credit_card_id === card.id) ||
                  (adv.credit_card_name && adv.credit_card_name.trim().toLowerCase() === card.name.trim().toLowerCase());
    if (match) {
      const amt = Number(adv.amount || 0);
      if (adv.date <= cutoff) {
        statementDue += amt;
      } else {
        unbilledSpends += amt;
      }
    }
  }

  const totalOutstanding = statementDue + unbilledSpends;

  return {
    statementDue,
    unbilledSpends,
    totalOutstanding,
    isStatementPaid: statementDue === 0,
    cycleInfo,
  };
}
