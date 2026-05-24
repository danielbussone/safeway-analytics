import {
  getStapleFrequencyThreshold,
  getStapleMode,
  STAPLE_COLD_START_MAX_TRIPS,
} from "@safeway-analytics/shared";
import {
  fetchCategoryBreakdown,
  fetchDiscountCapture,
  fetchDowPatterns,
  fetchHighCostByCumulativeSpend,
  fetchHighCostByUnitPrice,
  fetchMonthlySpend,
  fetchPriceHistory,
  fetchPriceTrendStats,
  fetchProductName,
  fetchSpendSummary,
  fetchStapleProducts,
  fetchWeeklyTrend,
} from "../repos/analytics.js";
import { fetchLatestOffers } from "../repos/offers.js";
import { countReceipts, fetchReceipts } from "../repos/receipts.js";
import { builder } from "./builder.js";
import "./types.js";

function staplesMessage(mode: string, tripCount: number): string | null {
  if (mode === "cold_start") {
    return `Need at least ${STAPLE_COLD_START_MAX_TRIPS} trips before staples analysis (${tripCount} so far).`;
  }
  if (mode === "provisional") {
    const threshold = getStapleFrequencyThreshold(tripCount);
    const pct = threshold === null ? 50 : threshold * 100;
    return `Building history — provisional staples use ${pct}% trip frequency (${tripCount} trips).`;
  }
  return null;
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
      const summary = await fetchSpendSummary(ctx.pool);
      const mode = getStapleMode(summary.tripCount);
      const all = await fetchStapleProducts(ctx.pool);
      const threshold = getStapleFrequencyThreshold(summary.tripCount);

      let items = all;
      if (mode === "cold_start") {
        items = [];
      } else if (threshold !== null) {
        items = all.filter(
          (item) =>
            item.frequencyPct !== null && item.frequencyPct / 100 >= threshold,
        );
      }

      return {
        tripCount: summary.tripCount,
        mode,
        message: staplesMessage(mode, summary.tripCount),
        items,
      };
    },
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
