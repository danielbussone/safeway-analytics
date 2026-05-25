export interface SpendSummary {
  tripCount: number;
  totalSpend: number;
  totalSavings: number;
  avgBasket: number;
  avgWeeklySpend: number;
}

export interface MonthlySpend {
  month: string;
  spent: number;
  saved: number;
}

export interface WeeklyTrend {
  weekStart: string;
  spent: number;
  saved: number;
}

export interface DowDealPattern {
  dayOfWeek: number;
  dayName: string;
  tripCount: number;
  lineItemCount: number;
  avgUnitPrice: number | null;
  avgDiscountPct: number | null;
  priceVsOverallPct: number | null;
  discountVsOverallPct: number | null;
  dealScore: number | null;
}

export interface DowDealInsights {
  lookbackDays: number;
  minLineItems: number;
  recommendedDayName: string | null;
  recommendedDealScore: number | null;
  patterns: DowDealPattern[];
}

export interface CategoryPricePoint {
  period: string;
  avgPrice: number;
}

export interface StapleCategoryInsight {
  categoryId: string;
  label: string;
  productCount: number;
  weekAppearances: number;
  activeWeeks: number;
  weekFrequencyPct: number;
  priceTrendDirection: string | null;
  priceChangePct: number | null;
  priceTrend: CategoryPricePoint[];
  bestDayName: string | null;
  bestDayDealScore: number | null;
  sampleProductNames: string[];
  priceUnit: string;
}

export interface NearStapleCategory {
  categoryId: string;
  label: string;
  productCount: number;
  weekAppearances: number;
  activeWeeks: number;
  weekFrequencyPct: number;
  thresholdPct: number;
  gapToThresholdPct: number;
  sampleProductNames: string[];
}

export interface StapleCategoryInsights {
  stapleLookbackDays: number;
  priceLookbackDays: number;
  activeWeeks: number;
  thresholdPct: number;
  items: StapleCategoryInsight[];
  nearStapleItems: NearStapleCategory[];
}

export interface MeatCategoryInsights {
  priceLookbackDays: number;
  priceUnit: string;
  items: StapleCategoryInsight[];
}

export interface DowPattern {
  dayOfWeek: number;
  dayName: string;
  avgBasket: number;
  avgSavings: number;
  tripCount: number;
}

export interface CategoryBreakdown {
  department: string;
  amount: number;
}

export interface StapleProduct {
  id: string;
  name: string;
  department: string | null;
  tripAppearances: number;
  weekAppearances: number;
  windowTrips: number;
  activeWeeks: number;
  frequencyPct: number | null;
  isStaple: boolean;
}

export interface StaplesResult {
  lookbackDays: number;
  frequencyBasis: string;
  windowTripCount: number;
  activeWeeks: number;
  tripCount: number;
  mode: string;
  message: string | null;
  items: StapleProduct[];
}

export interface HighCostProduct {
  productId: string;
  name: string;
  department: string | null;
  unitPrice: number;
  cumulativeSpend: number;
  purchaseCount: number;
}

export interface HighCostProductsResult {
  byUnitPrice: HighCostProduct[];
  byCumulativeSpend: HighCostProduct[];
}

export interface DiscountCapture {
  department: string | null;
  totalItems: number;
  totalSaved: number;
  avgDiscountPct: number | null;
}

export interface DowPattern {
  dayOfWeek: number;
  dayName: string;
  avgBasket: number;
  avgSavings: number;
  tripCount: number;
}

export interface DashboardData {
  spendSummary: SpendSummary;
  monthlySpend: MonthlySpend[];
  weeklyTrend: WeeklyTrend[];
  dowDealPatterns: DowDealInsights;
  stapleCategoryInsights: StapleCategoryInsights;
  meatCategoryInsights: MeatCategoryInsights;
  categoryBreakdown: CategoryBreakdown[];
  staples: StaplesResult;
  highCostProducts: HighCostProductsResult;
  discountCapture: DiscountCapture[];
}

export interface PriceHistoryPoint {
  observedAt: string;
  observedPrice: number;
  regularPrice: number | null;
  receiptId: string | null;
}

export interface PriceTrend {
  productId: string;
  productName: string;
  avgPrice: number | null;
  bestPrice: number | null;
  worstPrice: number | null;
  volatility: number | null;
  observationCount: number;
  points: PriceHistoryPoint[];
}

export interface PriceTrendData {
  priceTrend: PriceTrend | null;
}
