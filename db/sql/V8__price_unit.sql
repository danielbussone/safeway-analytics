ALTER TABLE price_history
  ADD COLUMN IF NOT EXISTS price_unit TEXT NOT NULL DEFAULT 'each';

COMMENT ON COLUMN price_history.price_unit IS 'each = observed_price per package; lb = per-pound for weight items';

UPDATE price_history ph
SET price_unit = 'lb'
FROM products p
WHERE p.id = ph.product_id
  AND p.is_weight_item = TRUE;
