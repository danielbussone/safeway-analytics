import type { SpendSummary } from "../graphql/types";
import { formatCurrency } from "../lib/format";

interface MetricCardsProps {
  summary: SpendSummary;
}

const metrics = [
  {
    key: "totalSpend" as const,
    label: "Total spend",
    accent: "text-stone-900",
  },
  {
    key: "avgWeeklySpend" as const,
    label: "Avg weekly",
    accent: "text-stone-900",
  },
  {
    key: "totalSavings" as const,
    label: "Total savings",
    accent: "text-safeway-green",
  },
  {
    key: "avgBasket" as const,
    label: "Avg basket",
    accent: "text-stone-900",
  },
];

export function MetricCards({ summary }: MetricCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map(({ key, label, accent }) => (
        <article
          key={key}
          className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
            {label}
          </p>
          <p className={`mt-2 text-2xl font-bold tabular-nums ${accent}`}>
            {formatCurrency(summary[key])}
          </p>
          {key === "totalSpend" ? (
            <p className="mt-1 text-sm text-stone-500">
              {summary.tripCount} trips tracked
            </p>
          ) : null}
        </article>
      ))}
    </div>
  );
}
