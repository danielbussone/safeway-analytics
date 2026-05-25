ALTER TABLE products
  ADD COLUMN IF NOT EXISTS shopping_category_id TEXT,
  ADD COLUMN IF NOT EXISTS shopping_category_label TEXT;

CREATE INDEX IF NOT EXISTS idx_products_shopping_category
  ON products (shopping_category_id)
  WHERE shopping_category_id IS NOT NULL;
