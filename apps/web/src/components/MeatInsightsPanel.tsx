import type { MeatCategoryInsights } from "../graphql/types";
import { CategoryInsightCard } from "./CategoryInsightCard";
import { EmptyState } from "./ui/Panel";

interface MeatInsightsPanelProps {
  data: MeatCategoryInsights;
}

export function MeatInsightsPanel({ data }: MeatInsightsPanelProps) {
  if (data.items.length === 0) {
    return (
      <EmptyState message="No weighted meat/seafood purchases in the lookback window yet (need by-the-pound items)." />
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-stone-600">
        Per-pound price trends over {data.priceLookbackDays} days (weighted
        items only). Different cuts and package sizes roll up into Salmon,
        Poultry, Beef, and Pork — quantity on the receipt is pounds, and
        Safeway&apos;s line price is already {data.priceUnit}.
      </p>
      <div className="grid gap-4 lg:grid-cols-2">
        {data.items.map((item) => (
          <CategoryInsightCard
            key={item.categoryId}
            item={item}
            subtitle={`Avg ${item.priceUnit} from weighted purchases`}
          />
        ))}
      </div>
    </div>
  );
}
