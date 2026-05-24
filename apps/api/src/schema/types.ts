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
    totalTrips: t.exposeInt("totalTrips"),
    frequencyPct: t.exposeFloat("frequencyPct", { nullable: true }),
    isStaple: t.exposeBoolean("isStaple"),
  }),
});

builder.objectType("StaplesResult", {
  fields: (t) => ({
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
