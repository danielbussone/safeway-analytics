import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { CategoryBreakdown } from "../graphql/types";
import { EmptyState } from "./ui/Panel";
import { formatCurrency } from "../lib/format";

const COLORS = [
  "#c8102e",
  "#008000",
  "#57534e",
  "#78716c",
  "#a8a29e",
  "#d6d3d1",
  "#44403c",
  "#292524",
];

interface CategoryDonutProps {
  data: CategoryBreakdown[];
}

export function CategoryDonut({ data }: CategoryDonutProps) {
  if (data.length === 0) {
    return <EmptyState message="No category breakdown yet." />;
  }

  const top = data.slice(0, 8);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={top}
            dataKey="amount"
            nameKey="department"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
          >
            {top.map((entry, index) => (
              <Cell key={entry.department} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value: number) => formatCurrency(value)} />
        </PieChart>
      </ResponsiveContainer>
      <ul className="space-y-2 text-sm">
        {top.map((row, index) => (
          <li key={row.department} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <span className="truncate">{row.department}</span>
            </span>
            <span className="font-medium tabular-nums text-stone-700">
              {formatCurrency(row.amount)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
