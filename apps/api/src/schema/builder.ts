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
    CategoryBreakdown: {
      department: string;
      amount: number;
    };
    StapleProduct: {
      id: string;
      name: string;
      department: string | null;
      tripAppearances: number;
      totalTrips: number;
      frequencyPct: number | null;
      isStaple: boolean;
    };
    StaplesResult: {
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
