import { builder } from "./builder.js";

builder.scalarType("DateTime", {
  serialize: (value) => value.toISOString(),
  parseValue: (value) => {
    if (typeof value === "string") {
      return new Date(value);
    }
    throw new Error("DateTime must be an ISO string");
  },
});

builder.objectType("SpendSummary", {
  fields: (t) => ({
    tripCount: t.exposeInt("tripCount"),
    totalSpend: t.exposeFloat("totalSpend"),
    totalSavings: t.exposeFloat("totalSavings"),
    avgBasket: t.exposeFloat("avgBasket"),
    avgWeeklySpend: t.exposeFloat("avgWeeklySpend"),
  }),
});

builder.objectType("MonthlySpend", {
  fields: (t) => ({
    month: t.exposeString("month"),
    spent: t.exposeFloat("spent"),
    saved: t.exposeFloat("saved"),
  }),
});

builder.objectType("WeeklyTrend", {
  fields: (t) => ({
    weekStart: t.exposeString("weekStart"),
    spent: t.exposeFloat("spent"),
    saved: t.exposeFloat("saved"),
  }),
});

builder.objectType("DowPattern", {
  fields: (t) => ({
    dayOfWeek: t.exposeInt("dayOfWeek"),
    dayName: t.exposeString("dayName"),
    avgBasket: t.exposeFloat("avgBasket"),
    avgSavings: t.exposeFloat("avgSavings"),
    tripCount: t.exposeInt("tripCount"),
  }),
});

builder.objectType("DowDealPattern", {
  fields: (t) => ({
    dayOfWeek: t.exposeInt("dayOfWeek"),
    dayName: t.exposeString("dayName"),
    tripCount: t.exposeInt("tripCount"),
    lineItemCount: t.exposeInt("lineItemCount"),
    avgUnitPrice: t.exposeFloat("avgUnitPrice", { nullable: true }),
    avgDiscountPct: t.exposeFloat("avgDiscountPct", { nullable: true }),
    priceVsOverallPct: t.exposeFloat("priceVsOverallPct", { nullable: true }),
    discountVsOverallPct: t.exposeFloat("discountVsOverallPct", {
      nullable: true,
    }),
    dealScore: t.exposeFloat("dealScore", { nullable: true }),
  }),
});

builder.objectType("DowDealInsights", {
  fields: (t) => ({
    lookbackDays: t.exposeInt("lookbackDays"),
    minLineItems: t.exposeInt("minLineItems"),
    recommendedDayName: t.exposeString("recommendedDayName", { nullable: true }),
    recommendedDealScore: t.exposeFloat("recommendedDealScore", {
      nullable: true,
    }),
    patterns: t.field({
      type: ["DowDealPattern"],
      resolve: (parent) => parent.patterns,
    }),
  }),
});

builder.objectType("CategoryPricePoint", {
  fields: (t) => ({
    period: t.exposeString("period"),
    avgPrice: t.exposeFloat("avgPrice"),
  }),
});

builder.objectType("StapleCategoryInsight", {
  fields: (t) => ({
    categoryId: t.exposeID("categoryId"),
    label: t.exposeString("label"),
    productCount: t.exposeInt("productCount"),
    weekAppearances: t.exposeInt("weekAppearances"),
    activeWeeks: t.exposeInt("activeWeeks"),
    weekFrequencyPct: t.exposeFloat("weekFrequencyPct"),
    priceTrendDirection: t.exposeString("priceTrendDirection", { nullable: true }),
    priceChangePct: t.exposeFloat("priceChangePct", { nullable: true }),
    priceTrend: t.field({
      type: ["CategoryPricePoint"],
      resolve: (parent) => parent.priceTrend,
    }),
    bestDayName: t.exposeString("bestDayName", { nullable: true }),
    bestDayDealScore: t.exposeFloat("bestDayDealScore", { nullable: true }),
    sampleProductNames: t.field({
      type: ["String"],
      resolve: (parent) => parent.sampleProductNames,
    }),
    priceUnit: t.exposeString("priceUnit"),
  }),
});

builder.objectType("NearStapleCategory", {
  fields: (t) => ({
    categoryId: t.exposeID("categoryId"),
    label: t.exposeString("label"),
    productCount: t.exposeInt("productCount"),
    weekAppearances: t.exposeInt("weekAppearances"),
    activeWeeks: t.exposeInt("activeWeeks"),
    weekFrequencyPct: t.exposeFloat("weekFrequencyPct"),
    thresholdPct: t.exposeFloat("thresholdPct"),
    gapToThresholdPct: t.exposeFloat("gapToThresholdPct"),
    sampleProductNames: t.field({
      type: ["String"],
      resolve: (parent) => parent.sampleProductNames,
    }),
  }),
});

builder.objectType("StapleCategoryInsights", {
  fields: (t) => ({
    stapleLookbackDays: t.exposeInt("stapleLookbackDays"),
    priceLookbackDays: t.exposeInt("priceLookbackDays"),
    activeWeeks: t.exposeInt("activeWeeks"),
    thresholdPct: t.exposeFloat("thresholdPct"),
    items: t.field({
      type: ["StapleCategoryInsight"],
      resolve: (parent) => parent.items,
    }),
    nearStapleItems: t.field({
      type: ["NearStapleCategory"],
      resolve: (parent) => parent.nearStapleItems,
    }),
  }),
});

builder.objectType("MeatCategoryInsights", {
  fields: (t) => ({
    priceLookbackDays: t.exposeInt("priceLookbackDays"),
    priceUnit: t.exposeString("priceUnit"),
    items: t.field({
      type: ["StapleCategoryInsight"],
      resolve: (parent) => parent.items,
    }),
  }),
});

builder.objectType("CategoryBreakdown", {
  fields: (t) => ({
    department: t.exposeString("department"),
    amount: t.exposeFloat("amount"),
  }),
});

builder.objectType("StapleProduct", {
  fields: (t) => ({
    id: t.exposeID("id"),
    name: t.exposeString("name"),
    department: t.exposeString("department", { nullable: true }),
    tripAppearances: t.exposeInt("tripAppearances"),
    weekAppearances: t.exposeInt("weekAppearances"),
    windowTrips: t.exposeInt("windowTrips"),
    activeWeeks: t.exposeInt("activeWeeks"),
    frequencyPct: t.exposeFloat("frequencyPct", { nullable: true }),
    isStaple: t.exposeBoolean("isStaple"),
  }),
});

builder.objectType("StaplesResult", {
  fields: (t) => ({
    lookbackDays: t.exposeInt("lookbackDays"),
    frequencyBasis: t.exposeString("frequencyBasis"),
    windowTripCount: t.exposeInt("windowTripCount"),
    activeWeeks: t.exposeInt("activeWeeks"),
    tripCount: t.exposeInt("tripCount"),
    mode: t.exposeString("mode"),
    message: t.exposeString("message", { nullable: true }),
    items: t.field({
      type: ["StapleProduct"],
      resolve: (parent) => parent.items,
    }),
  }),
});

builder.objectType("HighCostProduct", {
  fields: (t) => ({
    productId: t.exposeID("productId"),
    name: t.exposeString("name"),
    department: t.exposeString("department", { nullable: true }),
    unitPrice: t.exposeFloat("unitPrice"),
    cumulativeSpend: t.exposeFloat("cumulativeSpend"),
    purchaseCount: t.exposeInt("purchaseCount"),
  }),
});

builder.objectType("HighCostProductsResult", {
  fields: (t) => ({
    byUnitPrice: t.field({
      type: ["HighCostProduct"],
      resolve: (parent) => parent.byUnitPrice,
    }),
    byCumulativeSpend: t.field({
      type: ["HighCostProduct"],
      resolve: (parent) => parent.byCumulativeSpend,
    }),
  }),
});

builder.objectType("PriceHistoryPoint", {
  fields: (t) => ({
    observedAt: t.expose("observedAt", { type: "DateTime" }),
    observedPrice: t.exposeFloat("observedPrice"),
    regularPrice: t.exposeFloat("regularPrice", { nullable: true }),
    receiptId: t.exposeID("receiptId", { nullable: true }),
  }),
});

builder.objectType("PriceTrend", {
  fields: (t) => ({
    productId: t.exposeID("productId"),
    productName: t.exposeString("productName"),
    avgPrice: t.exposeFloat("avgPrice", { nullable: true }),
    bestPrice: t.exposeFloat("bestPrice", { nullable: true }),
    worstPrice: t.exposeFloat("worstPrice", { nullable: true }),
    volatility: t.exposeFloat("volatility", { nullable: true }),
    observationCount: t.exposeInt("observationCount"),
    points: t.field({
      type: ["PriceHistoryPoint"],
      resolve: (parent) => parent.points,
    }),
  }),
});

builder.objectType("DiscountCapture", {
  fields: (t) => ({
    department: t.exposeString("department", { nullable: true }),
    totalItems: t.exposeInt("totalItems"),
    totalSaved: t.exposeFloat("totalSaved"),
    avgDiscountPct: t.exposeFloat("avgDiscountPct", { nullable: true }),
  }),
});

builder.objectType("Receipt", {
  fields: (t) => ({
    id: t.exposeID("id"),
    posDatetime: t.expose("posDatetime", { type: "DateTime" }),
    finalTotal: t.exposeFloat("finalTotal", { nullable: true }),
    discountTotal: t.exposeFloat("discountTotal", { nullable: true }),
    itemCount: t.exposeInt("itemCount", { nullable: true }),
    storeName: t.exposeString("storeName", { nullable: true }),
    banner: t.exposeString("banner", { nullable: true }),
  }),
});

builder.objectType("ReceiptConnection", {
  fields: (t) => ({
    totalCount: t.exposeInt("totalCount"),
    items: t.field({
      type: ["Receipt"],
      resolve: (parent) => parent.items,
    }),
  }),
});

builder.objectType("Offer", {
  fields: (t) => ({
    id: t.exposeID("id"),
    offerId: t.exposeString("offerId"),
    name: t.exposeString("name", { nullable: true }),
    brand: t.exposeString("brand", { nullable: true }),
    category: t.exposeString("category", { nullable: true }),
    offerPgm: t.exposeString("offerPgm", { nullable: true }),
    offerPriceRaw: t.exposeString("offerPriceRaw", { nullable: true }),
    regularPrice: t.exposeFloat("regularPrice", { nullable: true }),
    status: t.exposeString("status", { nullable: true }),
    snapshotAt: t.expose("snapshotAt", { type: "DateTime" }),
  }),
});
