import { useMemo, useState } from "react";
import type { StaplesResult } from "../graphql/types";
import { EmptyState } from "./ui/Panel";
import { formatPercent } from "../lib/format";

interface StaplesPanelProps {
  staples: StaplesResult;
}

export function StaplesPanel({ staples }: StaplesPanelProps) {
  const [showAll, setShowAll] = useState(false);
  const weekBasis = staples.frequencyBasis === "week";

  const items = useMemo(() => {
    const sorted = [...staples.items].sort(
      (a, b) => (b.frequencyPct ?? 0) - (a.frequencyPct ?? 0),
    );
    return showAll ? sorted : sorted.slice(0, 10);
  }, [showAll, staples.items]);

  if (staples.mode === "cold_start") {
    return (
      <EmptyState
        message={
          staples.message ??
          "Staples analysis unlocks after a few more trips in the lookback window."
        }
      />
    );
  }

  if (items.length === 0) {
    return <EmptyState message="No staple products identified yet." />;
  }

  return (
    <div>
      {staples.message ? (
        <p className="mb-3 text-sm text-stone-600">{staples.message}</p>
      ) : null}
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-stone-200 text-left text-xs uppercase tracking-wide text-stone-500">
              <th className="pb-2 pr-4 font-semibold">Product</th>
              <th className="pb-2 pr-4 font-semibold">Dept</th>
              <th className="pb-2 pr-4 font-semibold">
                {weekBasis ? "Weeks" : "Trips"}
              </th>
              <th className="pb-2 font-semibold">Frequency</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-stone-100">
                <td className="py-2 pr-4 font-medium text-stone-900">
                  {item.name}
                </td>
                <td className="py-2 pr-4 text-stone-600">
                  {item.department ?? "—"}
                </td>
                <td className="py-2 pr-4 tabular-nums text-stone-700">
                  {weekBasis
                    ? `${item.weekAppearances}/${item.activeWeeks}`
                    : `${item.tripAppearances}/${item.windowTrips}`}
                </td>
                <td className="py-2 tabular-nums text-stone-700">
                  {item.frequencyPct !== null
                    ? formatPercent(item.frequencyPct)
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {staples.items.length > 10 ? (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="mt-3 text-sm font-medium text-safeway-red hover:underline"
        >
          {showAll ? "Show top 10" : `Show all ${staples.items.length}`}
        </button>
      ) : null}
    </div>
  );
}
