-- Rolling-window staples (weekly frequency) and day-of-week price/discount signals.

DROP VIEW IF EXISTS staple_products;

CREATE VIEW staple_products AS
WITH window_receipts AS (
  SELECT
    id,
    DATE_TRUNC('week', pos_datetime) AS week_start
  FROM receipts
  WHERE pos_datetime >= NOW() - (90 * INTERVAL '1 day')
),
window_stats AS (
  SELECT
    COUNT(DISTINCT id)::INTEGER AS window_trips,
    COUNT(DISTINCT week_start)::INTEGER AS active_weeks
  FROM window_receipts
),
product_freq AS (
  SELECT
    li.product_id,
    COUNT(DISTINCT wr.id) AS trip_appearances,
    COUNT(DISTINCT wr.week_start) AS week_appearances
  FROM line_items li
  JOIN window_receipts wr ON wr.id = li.receipt_id
  GROUP BY li.product_id
)
SELECT
  p.id,
  p.name,
  p.department,
  pf.trip_appearances,
  pf.week_appearances,
  ws.window_trips AS total_trips,
  ws.active_weeks,
  CASE
    WHEN ws.active_weeks = 0 THEN NULL
    ELSE ROUND(pf.week_appearances::NUMERIC / ws.active_weeks * 100, 1)
  END AS frequency_pct,
  CASE
    WHEN ws.active_weeks = 0 THEN FALSE
    ELSE pf.week_appearances::NUMERIC / ws.active_weeks >= 0.5
  END AS is_staple
FROM product_freq pf
JOIN products p ON p.id = pf.product_id
CROSS JOIN window_stats ws;

CREATE VIEW dow_deal_patterns AS
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
  WHERE r.pos_datetime >= NOW() - (90 * INTERVAL '1 day')
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
  b.trip_count,
  b.line_item_count,
  b.avg_unit_price,
  b.avg_discount_rate,
  CASE
    WHEN o.avg_unit_price IS NULL OR o.avg_unit_price = 0 OR b.avg_unit_price IS NULL
      THEN NULL
    ELSE ROUND(
      (b.avg_unit_price - o.avg_unit_price) / o.avg_unit_price * 100,
      1
    )
  END AS price_vs_overall_pct,
  CASE
    WHEN o.avg_discount_rate IS NULL OR b.avg_discount_rate IS NULL
      THEN NULL
    ELSE ROUND((b.avg_discount_rate - o.avg_discount_rate) * 100, 1)
  END AS discount_vs_overall_pct
FROM by_dow b
CROSS JOIN overall o
WHERE b.line_item_count >= 10
ORDER BY b.day_of_week;
