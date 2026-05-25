import SchemaBuilder from "@pothos/core";
import type { GraphQLContext } from "../context.js";

export type SchemaTypes = {
  Context: GraphQLContext;
  Objects: {
    SpendSummary: {
      tripCount: number;
      totalSpend: number;
      totalSavings: number;
      avgBasket: number;
      avgWeeklySpend: number;
    };
    MonthlySpend: {
      month: string;
      spent: number;
      saved: number;
    };
    WeeklyTrend: {
      weekStart: string;
      spent: number;
      saved: number;
    };
    DowPattern: {
      dayOfWeek: number;
      dayName: string;
      avgBasket: number;
      avgSavings: number;
      tripCount: number;
    };
    DowDealPattern: {
      dayOfWeek: number;
      dayName: string;
      tripCount: number;
      lineItemCount: number;
      avgUnitPrice: number | null;
      avgDiscountPct: number | null;
      priceVsOverallPct: number | null;
      discountVsOverallPct: number | null;
      dealScore: number | null;
    };
    DowDealInsights: {
      lookbackDays: number;
      minLineItems: number;
      recommendedDayName: string | null;
      recommendedDealScore: number | null;
      patterns: Array<SchemaTypes["Objects"]["DowDealPattern"]>;
    };
    CategoryPricePoint: {
      period: string;
      avgPrice: number;
    };
    StapleCategoryInsight: {
      categoryId: string;
      label: string;
      productCount: number;
      weekAppearances: number;
      activeWeeks: number;
      weekFrequencyPct: number;
      priceTrendDirection: string | null;
      priceChangePct: number | null;
      priceTrend: Array<SchemaTypes["Objects"]["CategoryPricePoint"]>;
      bestDayName: string | null;
      bestDayDealScore: number | null;
      sampleProductNames: string[];
      priceUnit: string;
    };
    NearStapleCategory: {
      categoryId: string;
      label: string;
      productCount: number;
      weekAppearances: number;
      activeWeeks: number;
      weekFrequencyPct: number;
      thresholdPct: number;
      gapToThresholdPct: number;
      sampleProductNames: string[];
    };
    StapleCategoryInsights: {
      stapleLookbackDays: number;
      priceLookbackDays: number;
      activeWeeks: number;
      thresholdPct: number;
      items: Array<SchemaTypes["Objects"]["StapleCategoryInsight"]>;
      nearStapleItems: Array<SchemaTypes["Objects"]["NearStapleCategory"]>;
    };
    MeatCategoryInsights: {
      priceLookbackDays: number;
      priceUnit: string;
      items: Array<SchemaTypes["Objects"]["StapleCategoryInsight"]>;
    };
    CategoryBreakdown: {
      department: string;
      amount: number;
    };
    StapleProduct: {
      id: string;
      name: string;
      department: string | null;
      tripAppearances: number;
      weekAppearances: number;
      windowTrips: number;
      activeWeeks: number;
      frequencyPct: number | null;
      isStaple: boolean;
    };
    StaplesResult: {
      lookbackDays: number;
      frequencyBasis: string;
      windowTripCount: number;
      activeWeeks: number;
      tripCount: number;
      mode: string;
      message: string | null;
      items: Array<SchemaTypes["Objects"]["StapleProduct"]>;
    };
    HighCostProduct: {
      productId: string;
      name: string;
      department: string | null;
      unitPrice: number;
      cumulativeSpend: number;
      purchaseCount: number;
    };
    HighCostProductsResult: {
      byUnitPrice: Array<SchemaTypes["Objects"]["HighCostProduct"]>;
      byCumulativeSpend: Array<SchemaTypes["Objects"]["HighCostProduct"]>;
    };
    PriceHistoryPoint: {
      observedAt: Date;
      observedPrice: number;
      regularPrice: number | null;
      receiptId: string | null;
    };
    PriceTrend: {
      productId: string;
      productName: string;
      avgPrice: number | null;
      bestPrice: number | null;
      worstPrice: number | null;
      volatility: number | null;
      observationCount: number;
      points: Array<SchemaTypes["Objects"]["PriceHistoryPoint"]>;
    };
    DiscountCapture: {
      department: string | null;
      totalItems: number;
      totalSaved: number;
      avgDiscountPct: number | null;
    };
    Receipt: {
      id: string;
      posDatetime: Date;
      finalTotal: number | null;
      discountTotal: number | null;
      itemCount: number | null;
      storeName: string | null;
      banner: string | null;
    };
    ReceiptConnection: {
      totalCount: number;
      items: Array<SchemaTypes["Objects"]["Receipt"]>;
    };
    Offer: {
      id: string;
      offerId: string;
      name: string | null;
      brand: string | null;
      category: string | null;
      offerPgm: string | null;
      offerPriceRaw: string | null;
      regularPrice: number | null;
      status: string | null;
      snapshotAt: Date;
    };
  };
  Scalars: {
    DateTime: {
      Input: Date;
      Output: Date;
    };
  };
};

export const builder = new SchemaBuilder<SchemaTypes>({});

builder.queryType({});
