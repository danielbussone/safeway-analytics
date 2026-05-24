import type pg from "pg";

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
  totalTrips: number;
  frequencyPct: number | null;
  isStaple: boolean;
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
    ORDER BY amount DESC
  `);

  return result.rows.map((row) => ({
    department: row.department,
    amount: toNumber(row.amount),
  }));
}

export async function fetchStapleProducts(
  pool: pg.Pool,
): Promise<StapleProductRow[]> {
  const result = await pool.query<{
    id: string;
    name: string;
    department: string | null;
    trip_appearances: number;
    total_trips: number;
    frequency_pct: string | null;
    is_staple: boolean;
  }>(`
    SELECT
      id,
      name,
      department,
      trip_appearances,
      total_trips,
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
    totalTrips: row.total_trips,
    frequencyPct: row.frequency_pct === null ? null : toNumber(row.frequency_pct),
    isStaple: row.is_staple,
  }));
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
      ORDER BY unit_price DESC
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
      ORDER BY cumulative_spend DESC
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
