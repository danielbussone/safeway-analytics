import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DowPattern } from "../graphql/types";
import { EmptyState } from "./ui/Panel";
import { formatCurrency } from "../lib/format";

interface DowChartProps {
  data: DowPattern[];
}

export function DowChart({ data }: DowChartProps) {
  if (data.length === 0) {
    return <EmptyState message="No day-of-week patterns yet." />;
  }

  const sorted = [...data].sort((a, b) => a.dayOfWeek - b.dayOfWeek);
  const cheapest = sorted.reduce((min, row) =>
    row.avgBasket < min.avgBasket ? row : min,
  );

  return (
    <div>
      <p className="mb-3 text-sm text-stone-600">
        Cheapest trips tend to be on{" "}
        <span className="font-semibold text-stone-900">{cheapest.dayName}</span>{" "}
        (avg {formatCurrency(cheapest.avgBasket)} basket).
      </p>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={sorted} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
          <XAxis dataKey="dayName" tick={{ fontSize: 12 }} />
          <YAxis
            tick={{ fontSize: 12 }}
            tickFormatter={(v) => `$${Math.round(v)}`}
          />
          <Tooltip
            formatter={(value: number, name) =>
              name === "avgBasket"
                ? [formatCurrency(value), "Avg basket"]
                : [formatCurrency(value), "Avg savings"]
            }
          />
          <Bar dataKey="avgBasket" name="avgBasket" fill="#c8102e" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
