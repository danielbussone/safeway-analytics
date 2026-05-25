import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MonthlySpend } from "../graphql/types";
import { EmptyState } from "./ui/Panel";
import { formatCurrency, formatMonth } from "../lib/format";

interface MonthlySpendChartProps {
  data: MonthlySpend[];
}

export function MonthlySpendChart({ data }: MonthlySpendChartProps) {
  if (data.length === 0) {
    return <EmptyState message="No monthly spend data yet." />;
  }

  const chartData = data.map((row) => ({
    ...row,
    label: formatMonth(row.month),
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
        <Bar dataKey="spent" name="Spent" fill="#c8102e" radius={[4, 4, 0, 0]} />
        <Bar dataKey="saved" name="Saved" fill="#008000" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
