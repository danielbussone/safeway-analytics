CREATE MATERIALIZED VIEW product_price_trends AS
SELECT
  product_id,
  AVG(observed_price) AS avg_price,
  MIN(observed_price) AS best_price,
  MAX(observed_price) AS worst_price,
  STDDEV(observed_price) AS volatility,
  COUNT(*) AS observation_count
FROM price_history
WHERE observed_at > NOW() - INTERVAL '90 days'
GROUP BY product_id;

CREATE UNIQUE INDEX idx_product_price_trends_product_id ON product_price_trends (product_id);

CREATE VIEW staple_products AS
WITH trip_count AS (
  SELECT COUNT(*)::NUMERIC AS total FROM receipts
),
product_freq AS (
  SELECT product_id, COUNT(DISTINCT receipt_id) AS trip_appearances
  FROM line_items
  GROUP BY product_id
)
SELECT
  p.id,
  p.name,
  p.department,
  pf.trip_appearances,
  tc.total::INTEGER AS total_trips,
  CASE
    WHEN tc.total = 0 THEN NULL
    ELSE ROUND(pf.trip_appearances / tc.total * 100, 1)
  END AS frequency_pct,
  CASE
    WHEN tc.total = 0 THEN FALSE
    ELSE pf.trip_appearances / tc.total >= 0.6
  END AS is_staple
FROM product_freq pf
JOIN products p ON p.id = pf.product_id
CROSS JOIN trip_count tc;

CREATE VIEW discount_capture AS
SELECT
  p.department,
  COUNT(*) AS total_items,
  SUM(li.discount_amount) AS total_saved,
  AVG(li.discount_amount / NULLIF(li.regular_price, 0)) AS avg_discount_pct
FROM line_items li
JOIN products p ON p.id = li.product_id
WHERE li.discount_amount > 0
GROUP BY p.department;

CREATE VIEW dow_spend_patterns AS
SELECT
  EXTRACT(DOW FROM r.pos_datetime)::SMALLINT AS day_of_week,
  TRIM(TO_CHAR(r.pos_datetime, 'Day')) AS day_name,
  AVG(r.final_total) AS avg_basket,
  AVG(r.discount_total) AS avg_savings,
  COUNT(*) AS trip_count
FROM receipts r
GROUP BY EXTRACT(DOW FROM r.pos_datetime), TRIM(TO_CHAR(r.pos_datetime, 'Day'))
ORDER BY day_of_week;
