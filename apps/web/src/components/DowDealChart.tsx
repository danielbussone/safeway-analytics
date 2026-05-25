import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DowDealInsights, DowDealPattern } from "../graphql/types";
import { EmptyState } from "./ui/Panel";
import { formatCurrencyPrecise } from "../lib/format";

interface DowDealChartProps {
  insights: DowDealInsights;
}

export function DowDealChart({ insights }: DowDealChartProps) {
  const { lookbackDays, patterns, recommendedDayName, recommendedDealScore } =
    insights;

  if (patterns.length === 0) {
    return (
      <EmptyState message="Not enough line-item history by day yet (need varied shopping days in the lookback window)." />
    );
  }

  const sorted = [...patterns].sort((a, b) => a.dayOfWeek - b.dayOfWeek);
  const chartData = sorted.map((row) => ({
    ...row,
    dealScore: row.dealScore ?? 0,
  }));

  const maxScore = Math.max(...chartData.map((d) => d.dealScore));

  return (
    <div>
      <p className="mb-3 text-sm text-stone-600">
        Last {lookbackDays} days — combined deal score (higher = better day to
        shop). Score blends lower unit prices and deeper discounts vs your
        average.
        {recommendedDayName && recommendedDealScore !== null ? (
          <>
            {" "}
            Best overall:{" "}
            <span className="font-semibold text-stone-900">
              {recommendedDayName.trim()}
            </span>{" "}
            (score {recommendedDealScore.toFixed(1)}).
          </>
        ) : null}
      </p>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
          <XAxis dataKey="dayName" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${v}`} />
          <Tooltip
            formatter={(value: number, name) => {
              if (name === "dealScore") {
                return [value.toFixed(1), "Deal score"];
              }
              return [value, name];
            }}
            labelFormatter={(label, payload) => {
              const row = payload?.[0]?.payload as DowDealPattern | undefined;
              if (!row) {
                return String(label);
              }
              const parts = [
                row.avgUnitPrice !== null
                  ? `avg ${formatCurrencyPrecise(row.avgUnitPrice)}`
                  : null,
                row.priceVsOverallPct !== null
                  ? `price ${row.priceVsOverallPct > 0 ? "+" : ""}${row.priceVsOverallPct}%`
                  : null,
                row.discountVsOverallPct !== null
                  ? `disc ${row.discountVsOverallPct > 0 ? "+" : ""}${row.discountVsOverallPct}pp`
                  : null,
                `${row.tripCount} trips`,
              ].filter(Boolean);
              return `${label} · ${parts.join(" · ")}`;
            }}
          />
          <Legend />
          <ReferenceLine y={0} stroke="#a8a29e" />
          <Bar dataKey="dealScore" name="Deal score" radius={[4, 4, 0, 0]}>
            {chartData.map((entry) => (
              <Cell
                key={entry.dayOfWeek}
                fill={
                  entry.dayName.trim() === recommendedDayName?.trim()
                    ? "#c8102e"
                    : entry.dealScore === maxScore
                      ? "#c8102e"
                      : "#78716c"
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="mt-2 text-xs text-stone-500">
        Deal score = discount edge (pp) minus unit-price premium (%). Red bar =
        recommended day.
      </p>
    </div>
  );
}
