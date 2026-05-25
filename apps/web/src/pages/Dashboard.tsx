import { useState } from "react";
import { useDashboard } from "../graphql/hooks";
import { CategoryDonut } from "../components/CategoryDonut";
import { ColdStartBanner } from "../components/ColdStartBanner";
import { DowDealChart } from "../components/DowDealChart";
import { HighCostPanel } from "../components/HighCostPanel";
import { MetricCards } from "../components/MetricCards";
import { MonthlySpendChart } from "../components/MonthlySpendChart";
import { PriceTrendView } from "../components/PriceTrendView";
import { StaplesPanel } from "../components/StaplesPanel";
import { MeatInsightsPanel } from "../components/MeatInsightsPanel";
import { StapleInsightsPanel } from "../components/StapleInsightsPanel";
import { WeeklyTrendChart } from "../components/WeeklyTrendChart";
import { ErrorState, LoadingState, Panel } from "../components/ui/Panel";

export function Dashboard() {
  const { data, isLoading, isError, error } = useDashboard();
  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    null,
  );

  return (
    <div className="min-h-screen">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-safeway-red">
              Safeway Analytics
            </p>
            <h1 className="text-2xl font-bold text-stone-900">
              Grocery spend dashboard
            </h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        {isLoading ? <LoadingState label="Loading dashboard…" /> : null}

        {isError ? (
          <ErrorState
            message={
              error instanceof Error
                ? error.message
                : "Failed to load dashboard data."
            }
          />
        ) : null}

        {data ? (
          <>
            <ColdStartBanner
              windowTripCount={data.staples.windowTripCount}
              activeWeeks={data.staples.activeWeeks}
              staplesMode={data.staples.mode}
              staplesMessage={data.staples.message}
            />

            <MetricCards summary={data.spendSummary} />

            <div className="grid gap-6 xl:grid-cols-2">
              <Panel title="Monthly spend" subtitle="Spent vs saved by month">
                <MonthlySpendChart data={data.monthlySpend} />
              </Panel>
              <Panel title="Weekly trend" subtitle="13-week rolling spend">
                <WeeklyTrendChart data={data.weeklyTrend} />
              </Panel>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <Panel
                title="Best day to save"
                subtitle={`Unit price & discount vs your ${data.dowDealPatterns.lookbackDays}-day average`}
              >
                <DowDealChart insights={data.dowDealPatterns} />
              </Panel>
              <Panel title="Categories" subtitle="Spend by department">
                <CategoryDonut data={data.categoryBreakdown} />
              </Panel>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <Panel
                title="Staples"
                subtitle={`Last ${data.staples.lookbackDays}d · ${data.staples.frequencyBasis === "week" ? "% of weeks" : "% of trips"} · mode ${data.staples.mode}`}
              >
                <StaplesPanel staples={data.staples} />
              </Panel>
              <Panel title="High-cost products" subtitle="Click to inspect price trend">
                <HighCostPanel
                  data={data.highCostProducts}
                  selectedProductId={selectedProductId}
                  onSelectProduct={setSelectedProductId}
                />
              </Panel>
            </div>

            <Panel
              title="Staple shopping patterns"
              subtitle={`Binned categories · ${data.stapleCategoryInsights.stapleLookbackDays}d frequency`}
            >
              <StapleInsightsPanel data={data.stapleCategoryInsights} />
            </Panel>

            <Panel
              title="Meat & seafood ($/lb)"
              subtitle={`Per-pound trends · ${data.meatCategoryInsights.priceLookbackDays}d`}
            >
              <MeatInsightsPanel data={data.meatCategoryInsights} />
            </Panel>

            <Panel title="Price trend" subtitle="Observed prices over time (single SKU)">
              <PriceTrendView productId={selectedProductId} />
            </Panel>
          </>
        ) : null}
      </main>
    </div>
  );
}
