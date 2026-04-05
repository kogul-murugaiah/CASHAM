/**
 * XIRR — Extended Internal Rate of Return (Newton-Raphson iteration)
 *
 * The industry-standard metric used by Groww, ETMoney, Zerodha, and every
 * serious portfolio tracker. Unlike a simple (current−invested)/invested %,
 * XIRR accounts for WHEN each cashflow happened, giving a true annualised return.
 *
 * Usage:
 *   cashflows = buys as negative (outflows), current value as final positive (inflow)
 *   xirr([{amount: -10000, date: new Date('2022-01-01')}, {amount: 12000, date: new Date()}])
 *   → 0.092 = 9.2% p.a.
 */

export interface CashFlow {
  amount: number; // negative = invested (outflow), positive = redeemed/current value (inflow)
  date: Date;
}

/**
 * Computes XIRR for a series of cashflows.
 * @returns annualised rate as a decimal (0.183 = 18.3% p.a.), or null if diverges / insufficient data.
 */
export const xirr = (cashflows: CashFlow[], guess = 0.1): number | null => {
  if (cashflows.length < 2) return null;
  if (!cashflows.some(c => c.amount > 0) || !cashflows.some(c => c.amount < 0)) return null;

  const sorted = [...cashflows].sort((a, b) => a.date.getTime() - b.date.getTime());
  const t0 = sorted[0].date.getTime();
  const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;

  const npv = (r: number) =>
    sorted.reduce((s, cf) => {
      const t = (cf.date.getTime() - t0) / MS_PER_YEAR;
      return s + cf.amount / Math.pow(1 + r, t);
    }, 0);

  const dnpv = (r: number) =>
    sorted.reduce((s, cf) => {
      const t = (cf.date.getTime() - t0) / MS_PER_YEAR;
      if (t === 0) return s;
      return s - (t * cf.amount) / Math.pow(1 + r, t + 1);
    }, 0);

  let r = guess;
  for (let i = 0; i < 300; i++) {
    const d = dnpv(r);
    if (Math.abs(d) < 1e-12) break;
    const rNext = r - npv(r) / d;
    if (!isFinite(rNext) || rNext <= -1) return null;
    if (Math.abs(rNext - r) < 1e-8) return rNext;
    r = rNext;
  }
  return null; // did not converge
};

/**
 * Formats an XIRR rate for display.
 * @param rate - decimal (0.183 = 18.3%)
 */
export const xirrFmt = (rate: number | null): string => {
  if (rate === null || !isFinite(rate)) return 'N/A';
  return `${rate >= 0 ? '+' : ''}${(rate * 100).toFixed(2)}% p.a.`;
};

/** Days a position has been held (from ISO date string to today) */
export const daysHeld = (date: string): number =>
  Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 86_400_000));

/**
 * Formats how long ago a price was last updated (price staleness display).
 * Uses the `current_value_updated_at` timestamp from the investments table.
 */
export const timeAgo = (ts: string | null | undefined): string => {
  if (!ts) return 'Never updated';
  const days = Math.floor((Date.now() - new Date(ts).getTime()) / 86_400_000);
  if (days === 0) return 'Updated today';
  if (days === 1) return 'Updated yesterday';
  if (days < 30) return `Updated ${days}d ago`;
  return `Updated ${Math.floor(days / 30)}mo ago`;
};

/**
 * Indian tax rules (FY 2024-25 post-Budget 2024):
 *   Equity (MF/Stock): LTCG > 12 months at 12.5% (above ₹1.25L exempt)
 *   Gold:              LTCG > 36 months at 12.5%
 *   Real Estate:       LTCG > 24 months at 12.5% (no indexation per Budget 2024)
 *   FD:                Always income tax (slab rate) — not a capital asset
 *   Debt MF:           Always slab rate — no LTCG benefit post 2023
 */
const LTCG_DAYS: Record<string, number> = {
  'Mutual Fund': 365,
  'Stock': 365,
  'Gold': 1095, // 36 months
  'Real Estate': 730, // 24 months
  'FD': Infinity,
};

export interface TaxStatusResult {
  isLTCG: boolean;
  daysToLTCG: number;
  label: string;
  colorClass: string;
}

export const taxStatus = (date: string, type: string): TaxStatusResult => {
  const held = daysHeld(date);
  const threshold = LTCG_DAYS[type] ?? 365;

  if (!isFinite(threshold)) {
    return { isLTCG: false, daysToLTCG: 0, label: 'Income Tax', colorClass: 'text-slate-500' };
  }

  const isLTCG = held >= threshold;
  const daysToLTCG = Math.max(0, threshold - held);

  return {
    isLTCG,
    daysToLTCG,
    label: isLTCG ? 'LTCG ✓' : `STCG → ${daysToLTCG}d`,
    colorClass: isLTCG ? 'text-emerald-400' : 'text-orange-400',
  };
};
