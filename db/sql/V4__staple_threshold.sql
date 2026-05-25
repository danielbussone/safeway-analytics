-- Align staple_products view with STAPLE_FULL_THRESHOLD (50%).
DROP VIEW IF EXISTS staple_products;

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
    ELSE pf.trip_appearances / tc.total >= 0.5
  END AS is_staple
FROM product_freq pf
JOIN products p ON p.id = pf.product_id
CROSS JOIN trip_count tc;
