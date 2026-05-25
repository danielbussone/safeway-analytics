import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { StapleCategoryInsight } from "../graphql/types";
import { formatCurrencyPrecise, formatMonth } from "../lib/format";

function trendLabel(direction: string | null, changePct: number | null): string {
  if (!direction || changePct === null) {
    return "Stable";
  }
  if (direction === "up") {
    return `Up ${changePct}%`;
  }
  if (direction === "down") {
    return `Down ${Math.abs(changePct)}%`;
  }
  return "Flat";
}

function trendColor(direction: string | null): string {
  if (direction === "up") {
    return "text-safeway-red";
  }
  if (direction === "down") {
    return "text-safeway-green";
  }
  return "text-stone-600";
}

interface CategoryInsightCardProps {
  item: StapleCategoryInsight;
  subtitle?: string;
}

export function CategoryInsightCard({ item, subtitle }: CategoryInsightCardProps) {
  const chartData = item.priceTrend.map((point) => ({
    ...point,
    label: formatMonth(`${point.period}-01`),
  }));
  const unit = item.priceUnit || "each";

  return (
    <article className="rounded-lg border border-stone-200 bg-stone-50/50 p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-stone-900">{item.label}</h3>
          {subtitle ? (
            <p className="text-xs text-stone-500">{subtitle}</p>
          ) : item.weekAppearances > 0 ? (
            <p className="text-xs text-stone-500">
              {item.weekAppearances}/{item.activeWeeks} weeks (
              {item.weekFrequencyPct}%) · {item.productCount} SKU
              {item.productCount === 1 ? "" : "s"}
            </p>
          ) : (
            <p className="text-xs text-stone-500">
              {item.productCount} weighted SKU
              {item.productCount === 1 ? "" : "s"}
            </p>
          )}
          {item.sampleProductNames.length > 0 ? (
            <p className="mt-1 text-xs text-stone-500">
              e.g. {item.sampleProductNames.slice(0, 2).join(", ")}
            </p>
          ) : null}
        </div>
        <div className="text-right text-sm">
          <p className={trendColor(item.priceTrendDirection)}>
            {trendLabel(item.priceTrendDirection, item.priceChangePct)}
          </p>
          {item.bestDayName ? (
            <p className="text-stone-700">
              Best day:{" "}
              <span className="font-semibold">{item.bestDayName}</span>
            </p>
          ) : null}
        </div>
      </div>
      {chartData.length >= 2 ? (
        <ResponsiveContainer width="100%" height={140}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} />
            <YAxis
              tick={{ fontSize: 10 }}
              width={52}
              tickFormatter={(v) => `$${v}`}
            />
            <Tooltip
              formatter={(value: number) =>
                `${formatCurrencyPrecise(value)}${unit === "$/lb" ? "/lb" : ""}`
              }
            />
            <Line
              type="monotone"
              dataKey="avgPrice"
              name={`Avg price (${unit})`}
              stroke="#c8102e"
              strokeWidth={2}
              dot={{ r: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <p className="text-xs text-stone-500">
          Not enough price history for a trend line.
        </p>
      )}
    </article>
  );
}
