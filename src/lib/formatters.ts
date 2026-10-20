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

/**
 * Returns local YYYY-MM-DD date string using local browser clock
 * Eliminates UTC midnight shift where 12:00 AM - 5:30 AM IST shifted to yesterday.
 */
export const getLocalDateString = (d: Date = new Date()): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const getLocalDateStr = getLocalDateString;

/**
 * Timezone-safe date formatter (e.g. "20 Oct 2026").
 * Avoids new Date("YYYY-MM-DD") UTC midnight shift by constructing with local date components.
 */
export const formatDate = (dateString: string): string => {
  if (!dateString) return "";
  const parts = dateString.split("T")[0].split("-");
  if (parts.length === 3) {
    const [year, month, day] = parts.map(Number);
    if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
      const localDate = new Date(year, month - 1, day);
      return localDate.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    }
  }
  const date = new Date(dateString);
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

/**
 * Timezone-safe short date formatter (e.g. "20 Oct").
 * Avoids new Date("YYYY-MM-DD") UTC midnight shift by constructing with local date components.
 */
export const formatShortDate = (dateString: string): string => {
  if (!dateString) return "";
  const parts = dateString.split("T")[0].split("-");
  if (parts.length === 3) {
    const [year, month, day] = parts.map(Number);
    if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
      const localDate = new Date(year, month - 1, day);
      return localDate.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
      });
    }
  }
  const date = new Date(dateString);
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });
};
