CREATE TABLE receipts (
  id                  TEXT PRIMARY KEY,
  bar_code            TEXT UNIQUE,
  pos_datetime        TIMESTAMPTZ NOT NULL,
  store_id            TEXT NOT NULL,
  store_name          TEXT,
  banner              TEXT,
  regular_price_total NUMERIC(8, 2),
  discount_total      NUMERIC(8, 2),
  reduced_price_total NUMERIC(8, 2),
  final_total         NUMERIC(8, 2),
  item_count          INTEGER,
  payment_type        TEXT,
  last4_card          TEXT,
  raw_payload         JSONB,
  ingested_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE categories (
  id        SERIAL PRIMARY KEY,
  name      TEXT NOT NULL UNIQUE,
  parent_id INTEGER REFERENCES categories (id)
);

CREATE TABLE products (
  id              TEXT PRIMARY KEY,
  bpn             TEXT UNIQUE,
  upc             TEXT,
  name            TEXT NOT NULL,
  normalized_name TEXT,
  department      TEXT,
  category_id     INTEGER REFERENCES categories (id),
  is_weight_item  BOOLEAN NOT NULL DEFAULT FALSE,
  is_store_brand  BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE line_items (
  id                  BIGSERIAL PRIMARY KEY,
  receipt_id          TEXT NOT NULL REFERENCES receipts (id) ON DELETE CASCADE,
  product_id          TEXT NOT NULL REFERENCES products (id),
  quantity            NUMERIC(8, 3),
  regular_price       NUMERIC(8, 2),
  discount_amount     NUMERIC(8, 2),
  reduced_price       NUMERIC(8, 2),
  regular_price_total NUMERIC(8, 2),
  discount_total      NUMERIC(8, 2),
  reduced_price_total NUMERIC(8, 2),
  line_item_type      TEXT,
  raw_discounts       JSONB
);

CREATE TABLE price_history (
  id             BIGSERIAL PRIMARY KEY,
  product_id     TEXT NOT NULL REFERENCES products (id),
  observed_price NUMERIC(8, 2) NOT NULL,
  regular_price  NUMERIC(8, 2),
  observed_at    TIMESTAMPTZ NOT NULL,
  receipt_id     TEXT REFERENCES receipts (id) ON DELETE SET NULL
);

-- Append-only offer snapshots: surrogate PK allows the same offer_id across weekly snapshots.
CREATE TABLE offers (
  id                 BIGSERIAL PRIMARY KEY,
  offer_id           TEXT NOT NULL,
  name               TEXT,
  brand              TEXT,
  category           TEXT,
  offer_pgm          TEXT,
  offer_program_type TEXT,
  offer_price_raw    TEXT,
  regular_price      NUMERIC(8, 2),
  description        TEXT,
  start_date         TIMESTAMPTZ,
  end_date           TIMESTAMPTZ,
  status             TEXT,
  store_id           TEXT,
  snapshot_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_receipts_pos_datetime ON receipts (pos_datetime);

CREATE INDEX idx_line_items_receipt_id ON line_items (receipt_id);
CREATE INDEX idx_line_items_product_id ON line_items (product_id);

CREATE INDEX idx_price_history_product_observed ON price_history (product_id, observed_at DESC);
CREATE INDEX idx_price_history_receipt_id ON price_history (receipt_id);

CREATE INDEX idx_products_department ON products (department);
CREATE INDEX idx_products_bpn ON products (bpn) WHERE bpn IS NOT NULL;

CREATE INDEX idx_offers_offer_id ON offers (offer_id);
CREATE INDEX idx_offers_snapshot_at ON offers (snapshot_at DESC);
CREATE INDEX idx_offers_store_snapshot ON offers (store_id, snapshot_at DESC);
