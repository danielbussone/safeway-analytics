import {
  clampDowDealLookbackDays,
  DOW_DEAL_LOOKBACK_DAYS,
  formatStapleBasisLabel,
  getStapleFrequencyThreshold,
  getStapleModeFromWindow,
  isStapleFrequency,
  STAPLE_COLD_START_MAX_TRIPS,
  STAPLE_COLD_START_MIN_WEEKS,
  STAPLE_FREQUENCY_BASIS,
  STAPLE_LOOKBACK_DAYS,
} from "@safeway-analytics/shared";
import {
  fetchCategoryBreakdown,
  fetchDiscountCapture,
  fetchDowDealPatterns,
  fetchDowPatterns,
  fetchHighCostByCumulativeSpend,
  fetchHighCostByUnitPrice,
  fetchMonthlySpend,
  fetchPriceHistory,
  fetchPriceTrendStats,
  fetchProductName,
  fetchSpendSummary,
  fetchStapleProducts,
  fetchStapleCategoryInsights,
  fetchMeatCategoryInsights,
  fetchStapleWindowStats,
  fetchWeeklyTrend,
} from "../repos/analytics.js";
import { fetchLatestOffers } from "../repos/offers.js";
import { countReceipts, fetchReceipts } from "../repos/receipts.js";
import { builder } from "./builder.js";
import "./types.js";

function staplesMessage(
  mode: string,
  windowTripCount: number,
  activeWeeks: number,
): string | null {
  const basisLabel = formatStapleBasisLabel(STAPLE_FREQUENCY_BASIS);
  const windowLabel = `last ${STAPLE_LOOKBACK_DAYS} days`;

  if (mode === "cold_start") {
    return `Need at least ${STAPLE_COLD_START_MAX_TRIPS} trips and ${STAPLE_COLD_START_MIN_WEEKS} active weeks in the ${windowLabel} (${windowTripCount} trips, ${activeWeeks} weeks so far).`;
  }
  if (mode === "provisional") {
    const threshold = getStapleFrequencyThreshold("provisional");
    const pct = threshold === null ? 50 : threshold * 100;
    return `Building history — provisional staples use ≥${pct}% of ${basisLabel} in the ${windowLabel}.`;
  }
  return `Staples use ≥50% of ${basisLabel} in the ${windowLabel} (${activeWeeks} active weeks, ${windowTripCount} trips).`;
}

builder.queryField("health", (t) =>
  t.string({
    resolve: () => "ok",
  }),
);

builder.queryField("spendSummary", (t) =>
  t.field({
    type: "SpendSummary",
    resolve: async (_root, _args, ctx) => fetchSpendSummary(ctx.pool),
  }),
);

builder.queryField("monthlySpend", (t) =>
  t.field({
    type: ["MonthlySpend"],
    args: {
      months: t.arg.int({ required: false, defaultValue: 12 }),
    },
    resolve: async (_root, args, ctx) =>
      fetchMonthlySpend(ctx.pool, args.months ?? 12),
  }),
);

builder.queryField("weeklyTrend", (t) =>
  t.field({
    type: ["WeeklyTrend"],
    args: {
      weeks: t.arg.int({ required: false, defaultValue: 13 }),
    },
    resolve: async (_root, args, ctx) =>
      fetchWeeklyTrend(ctx.pool, args.weeks ?? 13),
  }),
);

builder.queryField("dowPatterns", (t) =>
  t.field({
    type: ["DowPattern"],
    resolve: async (_root, _args, ctx) => fetchDowPatterns(ctx.pool),
  }),
);

builder.queryField("dowDealPatterns", (t) =>
  t.field({
    type: "DowDealInsights",
    args: {
      lookbackDays: t.arg.int({ required: false, defaultValue: DOW_DEAL_LOOKBACK_DAYS }),
    },
    resolve: async (_root, args, ctx) => {
      const lookbackDays = clampDowDealLookbackDays(
        args.lookbackDays ?? DOW_DEAL_LOOKBACK_DAYS,
      );
      return fetchDowDealPatterns(ctx.pool, lookbackDays);
    },
  }),
);

builder.queryField("categoryBreakdown", (t) =>
  t.field({
    type: ["CategoryBreakdown"],
    resolve: async (_root, _args, ctx) => fetchCategoryBreakdown(ctx.pool),
  }),
);

builder.queryField("staples", (t) =>
  t.field({
    type: "StaplesResult",
    resolve: async (_root, _args, ctx) => {
      const [{ windowTripCount, activeWeeks }, all] = await Promise.all([
        fetchStapleWindowStats(ctx.pool),
        fetchStapleProducts(ctx.pool),
      ]);

      const mode = getStapleModeFromWindow(windowTripCount, activeWeeks);
      const threshold = getStapleFrequencyThreshold(mode);

      let items = all;
      if (mode === "cold_start") {
        items = [];
      } else if (threshold !== null) {
        items = all.filter(
          (item) =>
            item.frequencyPct !== null &&
            isStapleFrequency(mode, item.frequencyPct),
        );
      }

      return {
        lookbackDays: STAPLE_LOOKBACK_DAYS,
        frequencyBasis: STAPLE_FREQUENCY_BASIS,
        windowTripCount,
        activeWeeks,
        tripCount: windowTripCount,
        mode,
        message: staplesMessage(mode, windowTripCount, activeWeeks),
        items,
      };
    },
  }),
);

builder.queryField("stapleCategoryInsights", (t) =>
  t.field({
    type: "StapleCategoryInsights",
    resolve: async (_root, _args, ctx) => fetchStapleCategoryInsights(ctx.pool),
  }),
);

builder.queryField("meatCategoryInsights", (t) =>
  t.field({
    type: "MeatCategoryInsights",
    resolve: async (_root, _args, ctx) => fetchMeatCategoryInsights(ctx.pool),
  }),
);

builder.queryField("highCostProducts", (t) =>
  t.field({
    type: "HighCostProductsResult",
    args: {
      limit: t.arg.int({ required: false, defaultValue: 15 }),
    },
    resolve: async (_root, args, ctx) => {
      const limit = args.limit ?? 15;
      const [byUnitPrice, byCumulativeSpend] = await Promise.all([
        fetchHighCostByUnitPrice(ctx.pool, limit),
        fetchHighCostByCumulativeSpend(ctx.pool, limit),
      ]);
      return { byUnitPrice, byCumulativeSpend };
    },
  }),
);

builder.queryField("priceTrend", (t) =>
  t.field({
    type: "PriceTrend",
    nullable: true,
    args: {
      productId: t.arg.id({ required: true }),
    },
    resolve: async (_root, args, ctx) => {
      const productId = args.productId;
      const [name, points, stats] = await Promise.all([
        fetchProductName(ctx.pool, productId),
        fetchPriceHistory(ctx.pool, productId),
        fetchPriceTrendStats(ctx.pool, productId),
      ]);

      if (!name && points.length === 0) {
        return null;
      }

      return {
        productId,
        productName: name ?? productId,
        avgPrice: stats?.avgPrice ?? null,
        bestPrice: stats?.bestPrice ?? null,
        worstPrice: stats?.worstPrice ?? null,
        volatility: stats?.volatility ?? null,
        observationCount: stats?.observationCount ?? points.length,
        points,
      };
    },
  }),
);

builder.queryField("discountCapture", (t) =>
  t.field({
    type: ["DiscountCapture"],
    resolve: async (_root, _args, ctx) => fetchDiscountCapture(ctx.pool),
  }),
);

builder.queryField("receipts", (t) =>
  t.field({
    type: "ReceiptConnection",
    args: {
      first: t.arg.int({ required: false, defaultValue: 20 }),
      offset: t.arg.int({ required: false, defaultValue: 0 }),
    },
    resolve: async (_root, args, ctx) => {
      const first = args.first ?? 20;
      const offset = args.offset ?? 0;
      const [items, totalCount] = await Promise.all([
        fetchReceipts(ctx.pool, first, offset),
        countReceipts(ctx.pool),
      ]);
      return { items, totalCount };
    },
  }),
);

builder.queryField("offers", (t) =>
  t.field({
    type: ["Offer"],
    resolve: async (_root, _args, ctx) => fetchLatestOffers(ctx.pool),
  }),
);
