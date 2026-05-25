import type { StapleCategoryInsights } from "../graphql/types";
import { CategoryInsightCard } from "./CategoryInsightCard";
import { EmptyState } from "./ui/Panel";

interface StapleInsightsPanelProps {
  data: StapleCategoryInsights;
}

export function StapleInsightsPanel({ data }: StapleInsightsPanelProps) {
  const hasStaples = data.items.length > 0;
  const hasNear = data.nearStapleItems.length > 0;

  if (!hasStaples && !hasNear) {
    return (
      <EmptyState message="No staple categories yet — run pnpm backfill:categories after migrating." />
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-stone-600">
        Binned staples (last {data.stapleLookbackDays}d, ≥{data.thresholdPct}% of
        shopping weeks). Similar SKUs roll up together — e.g. Oroweat + Milton&apos;s
        → Bread, Rao&apos;s Bolognese + Tomato Basil → Pasta sauce.
      </p>

      {hasStaples ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {data.items.map((item) => (
            <CategoryInsightCard key={item.categoryId} item={item} />
          ))}
        </div>
      ) : null}

      {hasNear ? (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-stone-800">
            Almost staples
          </h3>
          <p className="mb-3 text-xs text-stone-500">
            Within {data.thresholdPct}% weekly threshold — often alternating
            variants or one more shopping week away.
          </p>
          <ul className="space-y-2">
            {data.nearStapleItems.map((item) => (
              <li
                key={item.categoryId}
                className="rounded-lg border border-amber-200 bg-amber-50/60 px-4 py-3 text-sm"
              >
                <span className="font-medium text-stone-900">{item.label}</span>
                <span className="text-stone-600">
                  {" "}
                  — {item.weekFrequencyPct}% of weeks ({item.weekAppearances}/
                  {item.activeWeeks}),{" "}
                  <span className="font-medium text-amber-900">
                    {item.gapToThresholdPct}pp below
                  </span>{" "}
                  {item.thresholdPct}% bar
                </span>
                {item.sampleProductNames.length > 0 ? (
                  <p className="mt-1 text-xs text-stone-500">
                    {item.sampleProductNames.join(", ")}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
