import type pg from "pg";
import {
  computeDealScore,
  computePriceTrendDirection,
  DOW_DEAL_LOOKBACK_DAYS,
  DOW_DEAL_MIN_LINE_ITEMS,
  getStapleFrequencyThreshold,
  getStapleModeFromWindow,
  MEAT_CATEGORY_IDS,
  STAPLE_LOOKBACK_DAYS,
  STAPLE_NEAR_THRESHOLD_MARGIN,
  type PriceTrendDirection,
} from "@safeway-analytics/shared";

export type SpendSummaryRow = {
  tripCount: number;
  totalSpend: number;
  totalSavings: number;
  avgBasket: number;
  avgWeeklySpend: number;
};

export type MonthlySpendRow = {
  month: string;
  spent: number;
  saved: number;
};

export type WeeklyTrendRow = {
  weekStart: string;
  spent: number;
  saved: number;
};

export type DowPatternRow = {
  dayOfWeek: number;
  dayName: string;
  avgBasket: number;
  avgSavings: number;
  tripCount: number;
};

export type CategoryBreakdownRow = {
  department: string;
  amount: number;
};

export type StapleProductRow = {
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

export type DowDealPatternRow = {
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

export type CategoryPricePointRow = {
  period: string;
  avgPrice: number;
};

export type StapleCategoryInsightRow = {
  categoryId: string;
  label: string;
  productCount: number;
  weekAppearances: number;
  activeWeeks: number;
  weekFrequencyPct: number;
  priceTrendDirection: PriceTrendDirection | null;
  priceChangePct: number | null;
  priceTrend: CategoryPricePointRow[];
  bestDayName: string | null;
  bestDayDealScore: number | null;
  sampleProductNames: string[];
  priceUnit: string;
};

export type NearStapleCategoryRow = {
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

export type HighCostProductRow = {
  productId: string;
  name: string;
  department: string | null;
  unitPrice: number;
  cumulativeSpend: number;
  purchaseCount: number;
};

export type PriceHistoryRow = {
  observedAt: Date;
  observedPrice: number;
  regularPrice: number | null;
  receiptId: string | null;
};

export type PriceTrendStatsRow = {
  avgPrice: number | null;
  bestPrice: number | null;
  worstPrice: number | null;
  volatility: number | null;
  observationCount: number;
};

export type DiscountCaptureRow = {
  department: string | null;
  totalItems: number;
  totalSaved: number;
  avgDiscountPct: number | null;
};

function toNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined) {
    return 0;
  }
  const parsed = typeof value === "number" ? value : Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function fetchSpendSummary(pool: pg.Pool): Promise<SpendSummaryRow> {
  const result = await pool.query<{
    trip_count: string;
    total_spend: string | null;
    total_savings: string | null;
    avg_basket: string | null;
    week_span: string | null;
  }>(`
    SELECT
      COUNT(*)::text AS trip_count,
      COALESCE(SUM(final_total), 0)::text AS total_spend,
      COALESCE(SUM(discount_total), 0)::text AS total_savings,
      COALESCE(AVG(final_total), 0)::text AS avg_basket,
      GREATEST(
        1,
        CEIL(EXTRACT(EPOCH FROM (MAX(pos_datetime) - MIN(pos_datetime))) / 604800)
      )::text AS week_span
    FROM receipts
  `);

  const row = result.rows[0];
  const tripCount = Number.parseInt(row?.trip_count ?? "0", 10);
  const totalSpend = toNumber(row?.total_spend);
  const weekSpan = Math.max(1, Number.parseInt(row?.week_span ?? "1", 10));

  return {
    tripCount,
    totalSpend,
    totalSavings: toNumber(row?.total_savings),
    avgBasket: toNumber(row?.avg_basket),
    avgWeeklySpend: totalSpend / weekSpan,
  };
}

export async function fetchMonthlySpend(
  pool: pg.Pool,
  months: number,
): Promise<MonthlySpendRow[]> {
  const result = await pool.query<{
    month: string;
    spent: string;
    saved: string;
  }>(
    `
      SELECT
        TO_CHAR(pos_datetime, 'YYYY-MM') AS month,
        COALESCE(SUM(final_total), 0)::text AS spent,
        COALESCE(SUM(discount_total), 0)::text AS saved
      FROM receipts
      GROUP BY 1
      ORDER BY 1 DESC
      LIMIT $1
    `,
    [months],
  );

  return result.rows.map((row) => ({
    month: row.month,
    spent: toNumber(row.spent),
    saved: toNumber(row.saved),
  }));
}

export async function fetchWeeklyTrend(
  pool: pg.Pool,
  weeks: number,
): Promise<WeeklyTrendRow[]> {
  const result = await pool.query<{
    week_start: Date;
    spent: string;
    saved: string;
  }>(
    `
      SELECT
        DATE_TRUNC('week', pos_datetime)::date AS week_start,
        COALESCE(SUM(final_total), 0)::text AS spent,
        COALESCE(SUM(discount_total), 0)::text AS saved
      FROM receipts
      WHERE pos_datetime >= NOW() - ($1::int * INTERVAL '1 week')
      GROUP BY 1
      ORDER BY 1
    `,
    [weeks],
  );

  return result.rows.map((row) => ({
    weekStart: row.week_start.toISOString().slice(0, 10),
    spent: toNumber(row.spent),
    saved: toNumber(row.saved),
  }));
}

export async function fetchDowPatterns(pool: pg.Pool): Promise<DowPatternRow[]> {
  const result = await pool.query<{
    day_of_week: number;
    day_name: string;
    avg_basket: string;
    avg_savings: string;
    trip_count: string;
  }>(`
    SELECT
      day_of_week,
      day_name,
      avg_basket::text,
      avg_savings::text,
      trip_count::text
    FROM dow_spend_patterns
    ORDER BY day_of_week
  `);

  return result.rows.map((row) => ({
    dayOfWeek: row.day_of_week,
    dayName: row.day_name.trim(),
    avgBasket: toNumber(row.avg_basket),
    avgSavings: toNumber(row.avg_savings),
    tripCount: Number.parseInt(row.trip_count, 10),
  }));
}

export async function fetchCategoryBreakdown(
  pool: pg.Pool,
): Promise<CategoryBreakdownRow[]> {
  const result = await pool.query<{
    department: string;
    amount: string;
  }>(`
    SELECT
      COALESCE(p.department, 'Unknown') AS department,
      COALESCE(SUM(li.reduced_price_total), 0)::text AS amount
    FROM line_items li
    JOIN products p ON p.id = li.product_id
    GROUP BY 1
    ORDER BY SUM(li.reduced_price_total) DESC
  `);

  return result.rows.map((row) => ({
    department: row.department,
    amount: toNumber(row.amount),
  }));
}

export async function fetchStapleWindowStats(
  pool: pg.Pool,
  lookbackDays: number = STAPLE_LOOKBACK_DAYS,
): Promise<{ windowTripCount: number; activeWeeks: number }> {
  const result = await pool.query<{
    window_trips: string;
    active_weeks: string;
  }>(
    `
    SELECT
      COUNT(DISTINCT id)::text AS window_trips,
      COUNT(DISTINCT DATE_TRUNC('week', pos_datetime))::text AS active_weeks
    FROM receipts
    WHERE pos_datetime >= NOW() - ($1::int * INTERVAL '1 day')
  `,
    [lookbackDays],
  );

  const row = result.rows[0];
  return {
    windowTripCount: Number.parseInt(row?.window_trips ?? "0", 10),
    activeWeeks: Number.parseInt(row?.active_weeks ?? "0", 10),
  };
}

export async function fetchStapleProducts(
  pool: pg.Pool,
): Promise<StapleProductRow[]> {
  const result = await pool.query<{
    id: string;
    name: string;
    department: string | null;
    trip_appearances: number;
    week_appearances: number;
    total_trips: number;
    active_weeks: number;
    frequency_pct: string | null;
    is_staple: boolean;
  }>(`
    SELECT
      id,
      name,
      department,
      trip_appearances,
      week_appearances,
      total_trips,
      active_weeks,
      frequency_pct::text,
      is_staple
    FROM staple_products
    ORDER BY frequency_pct DESC NULLS LAST, name
  `);

  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    department: row.department,
    tripAppearances: row.trip_appearances,
    weekAppearances: row.week_appearances,
    windowTrips: row.total_trips,
    activeWeeks: row.active_weeks,
    frequencyPct: row.frequency_pct === null ? null : toNumber(row.frequency_pct),
    isStaple: row.is_staple,
  }));
}

export type DowDealInsightsRow = {
  lookbackDays: number;
  minLineItems: number;
  recommendedDayName: string | null;
  recommendedDealScore: number | null;
  patterns: DowDealPatternRow[];
};

export async function fetchDowDealPatterns(
  pool: pg.Pool,
  lookbackDays: number = DOW_DEAL_LOOKBACK_DAYS,
  minLineItems: number = DOW_DEAL_MIN_LINE_ITEMS,
): Promise<DowDealInsightsRow> {
  const result = await pool.query<{
    day_of_week: number;
    day_name: string;
    trip_count: string;
    line_item_count: string;
    avg_unit_price: string | null;
    avg_discount_rate: string | null;
    price_vs_overall_pct: string | null;
    discount_vs_overall_pct: string | null;
  }>(
    `
      WITH window_items AS (
        SELECT
          EXTRACT(DOW FROM r.pos_datetime)::SMALLINT AS day_of_week,
          TRIM(TO_CHAR(r.pos_datetime, 'Day')) AS day_name,
          r.id AS receipt_id,
          li.id AS line_item_id,
          li.reduced_price,
          li.regular_price,
          li.discount_amount
        FROM receipts r
        JOIN line_items li ON li.receipt_id = r.id
        WHERE r.pos_datetime >= NOW() - ($1::int * INTERVAL '1 day')
      ),
      overall AS (
        SELECT
          AVG(reduced_price) FILTER (WHERE reduced_price > 0) AS avg_unit_price,
          AVG(discount_amount / NULLIF(regular_price, 0)) FILTER (
            WHERE discount_amount > 0 AND regular_price > 0
          ) AS avg_discount_rate
        FROM window_items
      ),
      by_dow AS (
        SELECT
          day_of_week,
          day_name,
          COUNT(DISTINCT receipt_id) AS trip_count,
          COUNT(line_item_id) AS line_item_count,
          AVG(reduced_price) FILTER (WHERE reduced_price > 0) AS avg_unit_price,
          AVG(discount_amount / NULLIF(regular_price, 0)) FILTER (
            WHERE discount_amount > 0 AND regular_price > 0
          ) AS avg_discount_rate
        FROM window_items
        GROUP BY day_of_week, day_name
      )
      SELECT
        b.day_of_week,
        b.day_name,
        b.trip_count::text,
        b.line_item_count::text,
        b.avg_unit_price::text,
        b.avg_discount_rate::text,
        CASE
          WHEN o.avg_unit_price IS NULL OR o.avg_unit_price = 0 OR b.avg_unit_price IS NULL
            THEN NULL
          ELSE ROUND(
            (b.avg_unit_price - o.avg_unit_price) / o.avg_unit_price * 100,
            1
          )
        END::text AS price_vs_overall_pct,
        CASE
          WHEN o.avg_discount_rate IS NULL OR b.avg_discount_rate IS NULL
            THEN NULL
          ELSE ROUND((b.avg_discount_rate - o.avg_discount_rate) * 100, 1)
        END::text AS discount_vs_overall_pct
      FROM by_dow b
      CROSS JOIN overall o
      WHERE b.line_item_count >= $2
      ORDER BY b.day_of_week
    `,
    [lookbackDays, minLineItems],
  );

  const patterns = result.rows.map((row) => {
    const priceVsOverallPct =
      row.price_vs_overall_pct === null
        ? null
        : toNumber(row.price_vs_overall_pct);
    const discountVsOverallPct =
      row.discount_vs_overall_pct === null
        ? null
        : toNumber(row.discount_vs_overall_pct);
    return {
      dayOfWeek: row.day_of_week,
      dayName: row.day_name.trim(),
      tripCount: Number.parseInt(row.trip_count, 10),
      lineItemCount: Number.parseInt(row.line_item_count, 10),
      avgUnitPrice:
        row.avg_unit_price === null ? null : toNumber(row.avg_unit_price),
      avgDiscountPct:
        row.avg_discount_rate === null
          ? null
          : toNumber(row.avg_discount_rate) * 100,
      priceVsOverallPct,
      discountVsOverallPct,
      dealScore: computeDealScore(priceVsOverallPct, discountVsOverallPct),
    };
  });

  const ranked = patterns
    .filter((p) => p.dealScore !== null)
    .sort((a, b) => (b.dealScore ?? 0) - (a.dealScore ?? 0));
  const best = ranked[0];

  return {
    lookbackDays,
    minLineItems,
    recommendedDayName: best?.dayName ?? null,
    recommendedDealScore: best?.dealScore ?? null,
    patterns,
  };
}

export async function fetchHighCostByUnitPrice(
  pool: pg.Pool,
  limit: number,
): Promise<HighCostProductRow[]> {
  const result = await pool.query<{
    product_id: string;
    name: string;
    department: string | null;
    unit_price: string;
    cumulative_spend: string;
    purchase_count: string;
  }>(
    `
      SELECT
        p.id AS product_id,
        p.name,
        p.department,
        AVG(li.reduced_price)::text AS unit_price,
        COALESCE(SUM(li.reduced_price_total), 0)::text AS cumulative_spend,
        COUNT(*)::text AS purchase_count
      FROM line_items li
      JOIN products p ON p.id = li.product_id
      WHERE li.reduced_price IS NOT NULL AND li.reduced_price > 0
      GROUP BY p.id, p.name, p.department
      ORDER BY AVG(li.reduced_price) DESC
      LIMIT $1
    `,
    [limit],
  );

  return result.rows.map((row) => ({
    productId: row.product_id,
    name: row.name,
    department: row.department,
    unitPrice: toNumber(row.unit_price),
    cumulativeSpend: toNumber(row.cumulative_spend),
    purchaseCount: Number.parseInt(row.purchase_count, 10),
  }));
}

export async function fetchHighCostByCumulativeSpend(
  pool: pg.Pool,
  limit: number,
): Promise<HighCostProductRow[]> {
  const result = await pool.query<{
    product_id: string;
    name: string;
    department: string | null;
    unit_price: string;
    cumulative_spend: string;
    purchase_count: string;
  }>(
    `
      SELECT
        p.id AS product_id,
        p.name,
        p.department,
        AVG(li.reduced_price)::text AS unit_price,
        COALESCE(SUM(li.reduced_price_total), 0)::text AS cumulative_spend,
        COUNT(*)::text AS purchase_count
      FROM line_items li
      JOIN products p ON p.id = li.product_id
      GROUP BY p.id, p.name, p.department
      ORDER BY SUM(li.reduced_price_total) DESC
      LIMIT $1
    `,
    [limit],
  );

  return result.rows.map((row) => ({
    productId: row.product_id,
    name: row.name,
    department: row.department,
    unitPrice: toNumber(row.unit_price),
    cumulativeSpend: toNumber(row.cumulative_spend),
    purchaseCount: Number.parseInt(row.purchase_count, 10),
  }));
}

export async function fetchPriceHistory(
  pool: pg.Pool,
  productId: string,
): Promise<PriceHistoryRow[]> {
  const result = await pool.query<{
    observed_at: Date;
    observed_price: string;
    regular_price: string | null;
    receipt_id: string | null;
  }>(
    `
      SELECT observed_at, observed_price::text, regular_price::text, receipt_id
      FROM price_history
      WHERE product_id = $1
      ORDER BY observed_at
    `,
    [productId],
  );

  return result.rows.map((row) => ({
    observedAt: row.observed_at,
    observedPrice: toNumber(row.observed_price),
    regularPrice:
      row.regular_price === null ? null : toNumber(row.regular_price),
    receiptId: row.receipt_id,
  }));
}

export async function fetchPriceTrendStats(
  pool: pg.Pool,
  productId: string,
): Promise<PriceTrendStatsRow | null> {
  const result = await pool.query<{
    avg_price: string | null;
    best_price: string | null;
    worst_price: string | null;
    volatility: string | null;
    observation_count: string;
  }>(
    `
      SELECT
        avg_price::text,
        best_price::text,
        worst_price::text,
        volatility::text,
        observation_count::text
      FROM product_price_trends
      WHERE product_id = $1
    `,
    [productId],
  );

  const row = result.rows[0];
  if (!row) {
    return null;
  }

  return {
    avgPrice: row.avg_price === null ? null : toNumber(row.avg_price),
    bestPrice: row.best_price === null ? null : toNumber(row.best_price),
    worstPrice: row.worst_price === null ? null : toNumber(row.worst_price),
    volatility: row.volatility === null ? null : toNumber(row.volatility),
    observationCount: Number.parseInt(row.observation_count, 10),
  };
}

export async function fetchProductName(
  pool: pg.Pool,
  productId: string,
): Promise<string | null> {
  const result = await pool.query<{ name: string }>(
    `SELECT name FROM products WHERE id = $1`,
    [productId],
  );
  return result.rows[0]?.name ?? null;
}

export async function fetchDiscountCapture(
  pool: pg.Pool,
): Promise<DiscountCaptureRow[]> {
  const result = await pool.query<{
    department: string | null;
    total_items: string;
    total_saved: string;
    avg_discount_pct: string | null;
  }>(`
    SELECT
      department,
      total_items::text,
      total_saved::text,
      avg_discount_pct::text
    FROM discount_capture
    ORDER BY total_saved DESC NULLS LAST
  `);

  return result.rows.map((row) => ({
    department: row.department,
    totalItems: Number.parseInt(row.total_items, 10),
    totalSaved: toNumber(row.total_saved),
    avgDiscountPct:
      row.avg_discount_pct === null ? null : toNumber(row.avg_discount_pct),
  }));
}

const CATEGORY_DOW_MIN_LINE_ITEMS = 5;

async function fetchCategoryPriceTrend(
  pool: pg.Pool,
  categoryId: string,
  lookbackDays: number,
  options?: { perLbOnly?: boolean },
): Promise<CategoryPricePointRow[]> {
  const perLbOnly = options?.perLbOnly ?? false;
  const result = await pool.query<{ period: string; avg_price: string }>(
    `
      SELECT
        TO_CHAR(ph.observed_at, 'YYYY-MM') AS period,
        AVG(ph.observed_price)::text AS avg_price
      FROM price_history ph
      JOIN products p ON p.id = ph.product_id
      WHERE p.shopping_category_id = $1
        AND ph.observed_at >= NOW() - ($2::int * INTERVAL '1 day')
        AND ph.observed_price > 0
        AND ($3::boolean = FALSE OR ph.price_unit = 'lb')
      GROUP BY 1
      ORDER BY 1
    `,
    [categoryId, lookbackDays, perLbOnly],
  );

  if (result.rows.length > 0 || !perLbOnly) {
    return result.rows.map((row) => ({
      period: row.period,
      avgPrice: toNumber(row.avg_price),
    }));
  }

  const lineResult = await pool.query<{ period: string; avg_price: string }>(
    `
      SELECT
        TO_CHAR(r.pos_datetime, 'YYYY-MM') AS period,
        AVG(li.reduced_price)::text AS avg_price
      FROM line_items li
      JOIN products p ON p.id = li.product_id
      JOIN receipts r ON r.id = li.receipt_id
      WHERE p.shopping_category_id = $1
        AND p.is_weight_item = TRUE
        AND r.pos_datetime >= NOW() - ($2::int * INTERVAL '1 day')
        AND li.reduced_price > 0
      GROUP BY 1
      ORDER BY 1
    `,
    [categoryId, lookbackDays],
  );

  return lineResult.rows.map((row) => ({
    period: row.period,
    avgPrice: toNumber(row.avg_price),
  }));
}

async function fetchCategoryBestDay(
  pool: pg.Pool,
  categoryId: string,
  lookbackDays: number,
  options?: { perLbOnly?: boolean },
): Promise<{ dayName: string | null; dealScore: number | null }> {
  const perLbOnly = options?.perLbOnly ?? false;
  const result = await pool.query<{
    day_name: string;
    price_vs_overall_pct: string | null;
    discount_vs_overall_pct: string | null;
  }>(
    `
      WITH window_items AS (
        SELECT
          TRIM(TO_CHAR(r.pos_datetime, 'Day')) AS day_name,
          li.reduced_price,
          li.regular_price,
          li.discount_amount
        FROM receipts r
        JOIN line_items li ON li.receipt_id = r.id
        JOIN products p ON p.id = li.product_id
        WHERE r.pos_datetime >= NOW() - ($2::int * INTERVAL '1 day')
          AND p.shopping_category_id = $1
          AND ($4::boolean = FALSE OR p.is_weight_item = TRUE)
      ),
      overall AS (
        SELECT
          AVG(reduced_price) FILTER (WHERE reduced_price > 0) AS avg_unit_price,
          AVG(discount_amount / NULLIF(regular_price, 0)) FILTER (
            WHERE discount_amount > 0 AND regular_price > 0
          ) AS avg_discount_rate
        FROM window_items
      ),
      by_dow AS (
        SELECT
          day_name,
          COUNT(*) AS line_item_count,
          AVG(reduced_price) FILTER (WHERE reduced_price > 0) AS avg_unit_price,
          AVG(discount_amount / NULLIF(regular_price, 0)) FILTER (
            WHERE discount_amount > 0 AND regular_price > 0
          ) AS avg_discount_rate
        FROM window_items
        GROUP BY day_name
      )
      SELECT
        b.day_name,
        CASE
          WHEN o.avg_unit_price IS NULL OR o.avg_unit_price = 0 OR b.avg_unit_price IS NULL
            THEN NULL
          ELSE ROUND(
            (b.avg_unit_price - o.avg_unit_price) / o.avg_unit_price * 100,
            1
          )
        END::text AS price_vs_overall_pct,
        CASE
          WHEN o.avg_discount_rate IS NULL OR b.avg_discount_rate IS NULL
            THEN NULL
          ELSE ROUND((b.avg_discount_rate - o.avg_discount_rate) * 100, 1)
        END::text AS discount_vs_overall_pct
      FROM by_dow b
      CROSS JOIN overall o
      WHERE b.line_item_count >= $3
    `,
    [categoryId, lookbackDays, CATEGORY_DOW_MIN_LINE_ITEMS, perLbOnly],
  );

  let bestDayName: string | null = null;
  let bestDealScore: number | null = null;

  for (const row of result.rows) {
    const priceVs =
      row.price_vs_overall_pct === null
        ? null
        : toNumber(row.price_vs_overall_pct);
    const discountVs =
      row.discount_vs_overall_pct === null
        ? null
        : toNumber(row.discount_vs_overall_pct);
    const score = computeDealScore(priceVs, discountVs);
    if (score === null) {
      continue;
    }
    if (bestDealScore === null || score > bestDealScore) {
      bestDealScore = score;
      bestDayName = row.day_name.trim();
    }
  }

  return { dayName: bestDayName, dealScore: bestDealScore };
}

export async function fetchStapleCategoryInsights(
  pool: pg.Pool,
  stapleLookbackDays: number = STAPLE_LOOKBACK_DAYS,
  priceLookbackDays: number = DOW_DEAL_LOOKBACK_DAYS,
  limit: number = 12,
): Promise<{
  stapleLookbackDays: number;
  priceLookbackDays: number;
  activeWeeks: number;
  thresholdPct: number;
  items: StapleCategoryInsightRow[];
  nearStapleItems: NearStapleCategoryRow[];
}> {
  const { windowTripCount, activeWeeks } = await fetchStapleWindowStats(
    pool,
    stapleLookbackDays,
  );
  const mode = getStapleModeFromWindow(windowTripCount, activeWeeks);
  const threshold = getStapleFrequencyThreshold(mode);
  const thresholdPct = threshold === null ? 0 : threshold * 100;

  if (threshold === null || activeWeeks === 0) {
    return {
      stapleLookbackDays,
      priceLookbackDays,
      activeWeeks,
      thresholdPct,
      items: [],
      nearStapleItems: [],
    };
  }

  const nearMinPct = Math.max(
    35,
    thresholdPct - STAPLE_NEAR_THRESHOLD_MARGIN * 100,
  );

  const categories = await pool.query<{
    category_id: string;
    label: string;
    product_count: string;
    week_appearances: string;
    sample_names: string[];
  }>(
    `
      WITH window_receipts AS (
        SELECT
          id,
          DATE_TRUNC('week', pos_datetime) AS week_start
        FROM receipts
        WHERE pos_datetime >= NOW() - ($1::int * INTERVAL '1 day')
      ),
      category_weeks AS (
        SELECT
          p.shopping_category_id AS category_id,
          MAX(p.shopping_category_label) AS label,
          COUNT(DISTINCT p.id) AS product_count,
          COUNT(DISTINCT wr.week_start) AS week_appearances,
          ARRAY_AGG(DISTINCT p.name ORDER BY p.name) AS sample_names
        FROM line_items li
        JOIN products p ON p.id = li.product_id
        JOIN window_receipts wr ON wr.id = li.receipt_id
        WHERE p.shopping_category_id IS NOT NULL
          AND p.shopping_category_id NOT LIKE 'dept:%'
        GROUP BY p.shopping_category_id
      )
      SELECT
        category_id,
        label,
        product_count::text,
        week_appearances::text,
        sample_names[1:4] AS sample_names
      FROM category_weeks
      WHERE week_appearances::NUMERIC / $2 >= $3
      ORDER BY week_appearances DESC, label
      LIMIT $4
    `,
    [stapleLookbackDays, activeWeeks, threshold, limit],
  );

  const items: StapleCategoryInsightRow[] = [];

  for (const row of categories.rows) {
    const weekAppearances = Number.parseInt(row.week_appearances, 10);
    const priceTrend = await fetchCategoryPriceTrend(
      pool,
      row.category_id,
      priceLookbackDays,
    );
    const priceTrendDirection = computePriceTrendDirection(priceTrend);
    let priceChangePct: number | null = null;
    if (priceTrend.length >= 2) {
      const first = priceTrend[0]!.avgPrice;
      const last = priceTrend[priceTrend.length - 1]!.avgPrice;
      if (first > 0) {
        priceChangePct = Math.round(((last - first) / first) * 1000) / 10;
      }
    }

    const bestDay = await fetchCategoryBestDay(
      pool,
      row.category_id,
      priceLookbackDays,
    );

    items.push({
      categoryId: row.category_id,
      label: row.label,
      productCount: Number.parseInt(row.product_count, 10),
      weekAppearances,
      activeWeeks,
      weekFrequencyPct:
        Math.round((weekAppearances / activeWeeks) * 1000) / 10,
      priceTrendDirection,
      priceChangePct,
      priceTrend,
      bestDayName: bestDay.dayName,
      bestDayDealScore: bestDay.dealScore,
      sampleProductNames: row.sample_names ?? [],
      priceUnit: "each",
    });
  }

  const nearRows = await pool.query<{
    category_id: string;
    label: string;
    product_count: string;
    week_appearances: string;
    sample_names: string[];
  }>(
    `
      WITH window_receipts AS (
        SELECT
          id,
          DATE_TRUNC('week', pos_datetime) AS week_start
        FROM receipts
        WHERE pos_datetime >= NOW() - ($1::int * INTERVAL '1 day')
      ),
      category_weeks AS (
        SELECT
          p.shopping_category_id AS category_id,
          MAX(p.shopping_category_label) AS label,
          COUNT(DISTINCT p.id) AS product_count,
          COUNT(DISTINCT wr.week_start) AS week_appearances,
          ARRAY_AGG(DISTINCT p.name ORDER BY p.name) AS sample_names
        FROM line_items li
        JOIN products p ON p.id = li.product_id
        JOIN window_receipts wr ON wr.id = li.receipt_id
        WHERE p.shopping_category_id IS NOT NULL
          AND p.shopping_category_id NOT LIKE 'dept:%'
        GROUP BY p.shopping_category_id
      )
      SELECT
        category_id,
        label,
        product_count::text,
        week_appearances::text,
        sample_names[1:4] AS sample_names
      FROM category_weeks
      WHERE week_appearances::NUMERIC / $2 >= $3
        AND week_appearances::NUMERIC / $2 < $4
      ORDER BY week_appearances DESC, label
      LIMIT 10
    `,
    [stapleLookbackDays, activeWeeks, nearMinPct / 100, threshold],
  );

  const nearStapleItems: NearStapleCategoryRow[] = nearRows.rows.map((row) => {
    const weekAppearances = Number.parseInt(row.week_appearances, 10);
    const weekFrequencyPct =
      Math.round((weekAppearances / activeWeeks) * 1000) / 10;
    return {
      categoryId: row.category_id,
      label: row.label,
      productCount: Number.parseInt(row.product_count, 10),
      weekAppearances,
      activeWeeks,
      weekFrequencyPct,
      thresholdPct,
      gapToThresholdPct:
        Math.round((thresholdPct - weekFrequencyPct) * 10) / 10,
      sampleProductNames: row.sample_names ?? [],
    };
  });

  return {
    stapleLookbackDays,
    priceLookbackDays,
    activeWeeks,
    thresholdPct,
    items,
    nearStapleItems,
  };
}

export async function fetchMeatCategoryInsights(
  pool: pg.Pool,
  priceLookbackDays: number = DOW_DEAL_LOOKBACK_DAYS,
): Promise<{
  priceLookbackDays: number;
  priceUnit: string;
  items: StapleCategoryInsightRow[];
}> {
  const items: StapleCategoryInsightRow[] = [];

  for (const categoryId of MEAT_CATEGORY_IDS) {
    const stats = await pool.query<{
      label: string;
      product_count: string;
      weighted_purchases: string;
      sample_names: string[];
    }>(
      `
        SELECT
          MAX(p.shopping_category_label) AS label,
          COUNT(DISTINCT p.id)::text AS product_count,
          COUNT(li.id)::text AS weighted_purchases,
          ARRAY_AGG(DISTINCT p.name ORDER BY p.name) AS sample_names
        FROM line_items li
        JOIN products p ON p.id = li.product_id
        JOIN receipts r ON r.id = li.receipt_id
        WHERE p.shopping_category_id = $1
          AND p.is_weight_item = TRUE
          AND r.pos_datetime >= NOW() - ($2::int * INTERVAL '1 day')
          AND li.reduced_price > 0
      `,
      [categoryId, priceLookbackDays],
    );

    const row = stats.rows[0];
    const weightedPurchases = Number.parseInt(
      row?.weighted_purchases ?? "0",
      10,
    );
    if (!row || weightedPurchases < 3) {
      continue;
    }

    const priceTrend = await fetchCategoryPriceTrend(
      pool,
      categoryId,
      priceLookbackDays,
      { perLbOnly: true },
    );
    const priceTrendDirection = computePriceTrendDirection(priceTrend);
    let priceChangePct: number | null = null;
    if (priceTrend.length >= 2) {
      const first = priceTrend[0]!.avgPrice;
      const last = priceTrend[priceTrend.length - 1]!.avgPrice;
      if (first > 0) {
        priceChangePct = Math.round(((last - first) / first) * 1000) / 10;
      }
    }

    const bestDay = await fetchCategoryBestDay(pool, categoryId, priceLookbackDays, {
      perLbOnly: true,
    });

    items.push({
      categoryId,
      label: row.label,
      productCount: Number.parseInt(row.product_count, 10),
      weekAppearances: 0,
      activeWeeks: 0,
      weekFrequencyPct: 0,
      priceTrendDirection,
      priceChangePct,
      priceTrend,
      bestDayName: bestDay.dayName,
      bestDayDealScore: bestDay.dealScore,
      sampleProductNames: (row.sample_names ?? []).slice(0, 4),
      priceUnit: "$/lb",
    });
  }

  return {
    priceLookbackDays,
    priceUnit: "$/lb",
    items,
  };
}
