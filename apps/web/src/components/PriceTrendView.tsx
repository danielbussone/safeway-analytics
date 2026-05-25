import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { usePriceTrend } from "../graphql/hooks";
import { EmptyState, ErrorState, LoadingState } from "./ui/Panel";
import { formatCurrencyPrecise } from "../lib/format";

interface PriceTrendViewProps {
  productId: string | null;
}

export function PriceTrendView({ productId }: PriceTrendViewProps) {
  const { data, isLoading, isError, error } = usePriceTrend(productId);

  if (!productId) {
    return (
      <EmptyState message="Select a product from the high-cost panel to inspect price history." />
    );
  }

  if (isLoading) {
    return <LoadingState label="Loading price trend…" />;
  }

  if (isError) {
    return (
      <ErrorState
        message={
          error instanceof Error ? error.message : "Failed to load price trend."
        }
      />
    );
  }

  const trend = data?.priceTrend;
  if (!trend || trend.points.length === 0) {
    return <EmptyState message="No price observations for this product yet." />;
  }

  const chartData = trend.points.map((point) => ({
    ...point,
    label: new Date(point.observedAt).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
  }));

  const volatile =
    trend.volatility !== null &&
    trend.avgPrice !== null &&
    trend.avgPrice > 0 &&
    trend.volatility / trend.avgPrice > 0.15;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-stone-900">
            {trend.productName}
          </h3>
          <p className="text-sm text-stone-600">
            {trend.observationCount} observations
            {volatile ? (
              <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                High volatility
              </span>
            ) : null}
          </p>
        </div>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-stone-500">Avg</dt>
            <dd className="font-semibold tabular-nums">
              {trend.avgPrice !== null
                ? formatCurrencyPrecise(trend.avgPrice)
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-stone-500">Best</dt>
            <dd className="font-semibold tabular-nums text-safeway-green">
              {trend.bestPrice !== null
                ? formatCurrencyPrecise(trend.bestPrice)
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-stone-500">Worst</dt>
            <dd className="font-semibold tabular-nums text-safeway-red">
              {trend.worstPrice !== null
                ? formatCurrencyPrecise(trend.worstPrice)
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-stone-500">Volatility</dt>
            <dd className="font-semibold tabular-nums">
              {trend.volatility !== null
                ? formatCurrencyPrecise(trend.volatility)
                : "—"}
            </dd>
          </div>
        </dl>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
          <XAxis dataKey="label" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v.toFixed(2)}`} />
          <Tooltip
            formatter={(value: number) => formatCurrencyPrecise(value)}
            labelFormatter={(label) => String(label)}
          />
          {trend.avgPrice !== null ? (
            <ReferenceLine
              y={trend.avgPrice}
              stroke="#78716c"
              strokeDasharray="4 4"
              label={{ value: "Avg", position: "insideTopRight", fontSize: 11 }}
            />
          ) : null}
          <Line
            type="monotone"
            dataKey="observedPrice"
            name="Observed price"
            stroke="#c8102e"
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
