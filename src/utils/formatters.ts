/**
 * Formats a numeric amount to USD/BDT currency format
 */
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount)
}

/**
 * Formats a money amount using South Asian / Indian numbering system (Lakh, Crore)
 * If the amount has a non-zero decimal fraction (> 0, e.g. .50, .75, .25), it displays up to 2 decimal places.
 * If the amount is an integer (.00), it hides the decimal point completely.
 */
export function formatMoney(amount: number | string | undefined | null): string {
  if (amount === undefined || amount === null || amount === "") return "0";
  const num = Number(amount);
  if (isNaN(num)) return "0";

  const isInteger = Number.isInteger(num) || num % 1 === 0;

  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: isInteger ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * Formats a date string or timestamp
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date)
}
