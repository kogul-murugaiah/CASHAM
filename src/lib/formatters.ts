/**
 * Indian Number System & Currency Formatter
 * Handles Lakhs/Crores and custom currency styles (₹ vs Rs.)
 */

export type CurrencyStyle = "symbol" | "text";

export const formatCurrency = (
  amount: number,
  style: CurrencyStyle = "symbol",
  showDecimals: boolean = false
): string => {
  const formatter = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  });

  const formattedNumber = formatter.format(Math.abs(amount));
  const prefix = amount < 0 ? "-" : "";
  const currencyLabel = style === "symbol" ? "₹" : "Rs.";

  return `${prefix}${currencyLabel} ${formattedNumber}`;
};

export const maskAmount = (amount: string, shouldMask: boolean): string => {
  return shouldMask ? "₹ ••••••" : amount;
};

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};
