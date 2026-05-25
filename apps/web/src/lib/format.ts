const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const currencyPrecise = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

const percent = new Intl.NumberFormat("en-US", {
  style: "percent",
  maximumFractionDigits: 0,
});

export function formatCurrency(value: number): string {
  return currency.format(value);
}

export function formatCurrencyPrecise(value: number): string {
  return currencyPrecise.format(value);
}

export function formatPercent(value: number): string {
  return percent.format(value / 100);
}

export function formatMonth(month: string): string {
  const [year, m] = month.split("-");
  const date = new Date(Number(year), Number(m) - 1, 1);
  return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

export function formatWeek(weekStart: string): string {
  const date = new Date(weekStart);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
