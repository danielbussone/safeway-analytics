import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { WeeklyTrend } from "../graphql/types";
import { EmptyState } from "./ui/Panel";
import { formatCurrency, formatWeek } from "../lib/format";

interface WeeklyTrendChartProps {
  data: WeeklyTrend[];
}

export function WeeklyTrendChart({ data }: WeeklyTrendChartProps) {
  if (data.length === 0) {
    return <EmptyState message="No weekly trend data yet." />;
  }

  const chartData = data.map((row) => ({
    ...row,
    label: formatWeek(row.weekStart),
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
        <XAxis dataKey="label" tick={{ fontSize: 12 }} />
        <YAxis
          tick={{ fontSize: 12 }}
          tickFormatter={(v) => `$${Math.round(v / 100) * 100}`}
        />
        <Tooltip
          formatter={(value: number) => formatCurrency(value)}
          labelFormatter={(label) => String(label)}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="spent"
          name="Spent"
          stroke="#c8102e"
          strokeWidth={2}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="saved"
          name="Saved"
          stroke="#008000"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
