# Safeway analytics — PRD & project plan

## Overview

A personal grocery analytics application that ingests in-store receipt data from the Albertsons/Safeway API, tracks price trends, identifies discount patterns, and surfaces actionable spending insights through a React dashboard.

**Owner:** Daniel Bussone  
**Stack:** TypeScript · Node.js · React · PostgreSQL · pgvector  
**Status:** In development  

---

## Problem statement

Weekly Safeway grocery bills are high and opaque. There is no native tooling to answer:
- Which items are trending up in price?
- What discounts am I consistently missing?
- Which products should I treat as staples vs. opportunistic buys?
- Does day-of-week or timing affect what I pay?

---

## Goals

1. Automatically ingest historical and ongoing receipt data from the Albertsons API
2. Track per-product price history derived from real purchase data
3. Identify discount capture rate — deals taken vs. available
4. Classify purchases as staples (≥60% trip frequency) vs. irregular
5. Surface high-cost items by unit price and cumulative spend
6. Snapshot weekly J4U / member offers for trend analysis

### Non-goals (v1)

- Execution or purchasing — analysis only
- External price comparison (other retailers)
- Nutritional analysis
- Multi-user / household sharing

---

## API surface (discovered via HAR analysis)

All endpoints are on `www.safeway.com`. Auth is managed by Okta via `ciam.albertsons.com`.

> **Note:** Request/response shapes below are from HAR analysis. Zod schemas in `@safeway-analytics/shared` mirror these shapes with `.passthrough()` for unknown fields. Live API probing during ingestion build-out will tighten schemas (especially Okta refresh and offers wrapper format).

### Auth

```
POST https://ciam.albertsons.com/api/v1/sessions/me/lifecycle/refresh
→ Returns JWT Bearer token
→ Session TTL: ~90 days
→ MFA: SMS OTP on initial login only
```

### Receipts list

```
POST https://www.safeway.com/order-account/api/instore
Body: {
  "params": { "clubcard": "<clubcard>", "client-section": "purchase" },
  "token": "<jwt>"
}
→ Array of receipt summaries: { _id, posDateTime, itemCount, finalTotal, banner }
```

### Receipt detail

```
POST https://www.safeway.com/order-account/api/instore
Body: {
  "params": { "clubcard": "<clubcard>", "id": "<receipt _id>" },
  "token": "<jwt>"
}
→ Full receipt: header + items[]
```

### Receipt item shape (key fields)

```json
{
  "id": "7313000132",
  "bpn": "196050883",
  "name": "OROWEAT BREAD WHOLE GRAIN 100% WHOLE WHEAT",
  "quantity": 1,
  "regularPrice": "5.99",
  "discount": "1.00",
  "discounts": [{ "code": "248500404453", "amount": "1.00", "category": "Sale Savings" }],
  "reducedPrice": "4.99",
  "department": "BAKED GOODS",
  "weightItem": false
}
```

**Note:** `bpn` (Buyer Product Number) is Albertsons' internal product identifier.
Use this as the primary key for cross-receipt product matching. Fall back to name normalization only for items without a `bpn`.

### Offers / coupons

```
GET https://www.safeway.com/abs/pub/xapi/offers/companiongalleryoffer?storeId=305
Headers: content-type: application/vnd.safeway.v2+json
→ No Bearer auth required
→ ~400 current J4U offers per call
```

### Offer program codes

| Code | Meaning |
|------|---------|
| `MF` | Manufacturer coupon |
| `PD` | Personalized deal (J4U — account-specific) |
| `SC` | Store coupon |

### Account identifiers (store in `.env`, never commit)

| Key | Purpose |
|-----|---------|
| `CLUBCARD` | Required on all receipt API calls |
| `HHID` | Household ID — rewards/offers |
| `HOME_STORE_ID` | Your home store (e.g. `305`) for offer snapshots |
| `OKTA_USER_ID` | Okta userId from session refresh response |

---

## Data model

Source of truth: Flyway migrations in [`db/sql/`](db/sql/). Summarized below.

### Schema notes

| Topic | Implementation |
|-------|----------------|
| `day_of_week` | Not stored on `receipts` — PostgreSQL rejects `EXTRACT(DOW FROM timestamptz)` in generated columns. Computed in the `dow_spend_patterns` view instead. |
| `offers` primary key | `BIGSERIAL id` with indexed `offer_id` — supports append-only weekly snapshots of the same offer. |
| API types | Zod schemas in `@safeway-analytics/shared` are HAR-derived; will be tightened after live API probing during ingestion build-out. |

### Core tables

```sql
CREATE TABLE receipts (
  id                  TEXT PRIMARY KEY,        -- Albertsons _id
  bar_code            TEXT UNIQUE,
  pos_datetime        TIMESTAMPTZ NOT NULL,
  store_id            TEXT NOT NULL,
  store_name          TEXT,
  banner              TEXT,                    -- 'safeway' | 'vons' | etc
  regular_price_total NUMERIC(8,2),
  discount_total      NUMERIC(8,2),
  reduced_price_total NUMERIC(8,2),
  final_total         NUMERIC(8,2),
  item_count          INTEGER,
  payment_type        TEXT,
  last4_card          TEXT,
  raw_payload         JSONB,
  ingested_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE categories (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  parent_id   INTEGER REFERENCES categories(id)
);

CREATE TABLE products (
  id               TEXT PRIMARY KEY,           -- bpn when available, else UPC/PLU
  bpn              TEXT UNIQUE,                -- Albertsons buyer product number
  upc              TEXT,
  name             TEXT NOT NULL,
  normalized_name  TEXT,
  department       TEXT,                       -- raw department string from receipt
  category_id      INTEGER REFERENCES categories(id),
  is_weight_item   BOOLEAN DEFAULT FALSE,
  is_store_brand   BOOLEAN DEFAULT FALSE
);

CREATE TABLE line_items (
  id                   BIGSERIAL PRIMARY KEY,
  receipt_id           TEXT NOT NULL REFERENCES receipts(id),
  product_id           TEXT NOT NULL REFERENCES products(id),
  quantity             NUMERIC(8,3),
  regular_price        NUMERIC(8,2),           -- shelf price
  discount_amount      NUMERIC(8,2),
  reduced_price        NUMERIC(8,2),           -- price paid
  regular_price_total  NUMERIC(8,2),
  discount_total       NUMERIC(8,2),
  reduced_price_total  NUMERIC(8,2),
  line_item_type       TEXT,
  raw_discounts        JSONB                   -- full discounts[] array preserved
);

CREATE TABLE price_history (
  id               BIGSERIAL PRIMARY KEY,
  product_id       TEXT NOT NULL REFERENCES products(id),
  observed_price   NUMERIC(8,2) NOT NULL,      -- reducedPrice (what was paid)
  regular_price    NUMERIC(8,2),               -- regularPrice (shelf price)
  observed_at      TIMESTAMPTZ NOT NULL,
  receipt_id       TEXT REFERENCES receipts(id)
);

CREATE TABLE offers (
  id                 BIGSERIAL PRIMARY KEY,
  offer_id           TEXT NOT NULL,            -- Albertsons offer identifier
  name               TEXT,
  brand              TEXT,
  category           TEXT,
  offer_pgm          TEXT,                      -- MF | PD | SC
  offer_program_type TEXT,
  offer_price_raw    TEXT,                      -- e.g. "$1.00 OFF"
  regular_price      NUMERIC(8,2),
  description        TEXT,
  start_date         TIMESTAMPTZ,
  end_date           TIMESTAMPTZ,
  status             TEXT,                      -- U=unused, R=redeemed
  store_id           TEXT,
  snapshot_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Key analytics views

```sql
-- Price trend per product (rolling 90 days)
CREATE MATERIALIZED VIEW product_price_trends AS
SELECT
  product_id,
  AVG(observed_price)    AS avg_price,
  MIN(observed_price)    AS best_price,
  MAX(observed_price)    AS worst_price,
  STDDEV(observed_price) AS volatility,
  COUNT(*)               AS observation_count
FROM price_history
WHERE observed_at > NOW() - INTERVAL '90 days'
GROUP BY product_id;

-- Staples (bought in ≥60% of trips; handles zero-trip cold start)
CREATE VIEW staple_products AS
WITH trip_count AS (
  SELECT COUNT(*)::NUMERIC AS total FROM receipts
),
product_freq AS (
  SELECT product_id, COUNT(DISTINCT receipt_id) AS trip_appearances
  FROM line_items GROUP BY product_id
)
SELECT
  p.id, p.name, p.department,
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

-- Discount capture rate by category
CREATE VIEW discount_capture AS
SELECT
  p.department,
  COUNT(*)                                          AS total_items,
  SUM(li.discount_amount)                           AS total_saved,
  AVG(li.discount_amount / NULLIF(li.regular_price, 0)) AS avg_discount_pct
FROM line_items li
JOIN products p ON p.id = li.product_id
WHERE li.discount_amount > 0
GROUP BY p.department;

-- Day-of-week spend patterns (day_of_week derived from pos_datetime)
CREATE VIEW dow_spend_patterns AS
SELECT
  EXTRACT(DOW FROM r.pos_datetime)::SMALLINT AS day_of_week,
  TRIM(TO_CHAR(r.pos_datetime, 'Day')) AS day_name,
  AVG(r.final_total)             AS avg_basket,
  AVG(r.discount_total)          AS avg_savings,
  COUNT(*)                       AS trip_count
FROM receipts r
GROUP BY EXTRACT(DOW FROM r.pos_datetime), TRIM(TO_CHAR(r.pos_datetime, 'Day'))
ORDER BY day_of_week;
```

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                     React dashboard                      │
│  Monthly spend · Staples · High-cost · Price trends      │
└───────────────────────┬──────────────────────────────────┘
                        │ GraphQL
┌───────────────────────▼──────────────────────────────────┐
│              TypeScript / GraphQL API (Node.js)          │
│   ReceiptResolver · ProductResolver · AnalyticsResolver  │
└──────┬──────────────────┬───────────────────────┬────────┘
       │                  │                       │
┌──────▼──────┐  ┌────────▼────────┐  ┌──────────▼───────┐
│   Ingestion │  │ Price analyzer  │  │  Offers snapshot │
│   service   │  │  (pg queries)   │  │  (weekly cron)   │
└──────┬──────┘  └─────────────────┘  └──────────────────┘
       │
┌──────▼──────────────────────────────────────────────────┐
│                      PostgreSQL                         │
│  receipts · line_items · products · price_history       │
│  offers · categories                                    │
└─────────────────────────────────────────────────────────┘
```

### Ingestion pipeline

```
SafewayClient.fetchReceiptList()
  → filter already-ingested by _id
  → for each new receipt:
      SafewayClient.fetchReceiptDetail(id)
      → upsertReceipt(header)
      → for each item:
          resolveProduct(bpn ?? upc ?? name)  ← bpn-first matching
          → upsertLineItem(item, productId)
          → appendPriceHistory(item, productId)
  → rate limit: 1 req/sec to avoid throttling

SafewayClient.fetchOffers()          ← no auth required
  → snapshotOffers(offers)           ← append, never overwrite
  → runs weekly via cron
```

### Token management

The Okta session has a ~90-day TTL. Strategy:
- Store JWT in local `.env` or OS keychain
- On each request, check expiry from JWT payload (`exp` claim)
- If within 24h of expiry, call refresh endpoint proactively
- On 401 response, attempt one refresh then retry
- If refresh fails (session truly expired), prompt for re-login via Playwright

---

## Staples classification

| Trip count | Threshold | Behavior |
|-----------|-----------|---------|
| < 5 trips | — | Suppress staples UI, show cold-start message |
| 5–9 trips | ≥50% | Show as provisional, label "building history" |
| ≥10 trips | ≥60% | Full staples classification |

---

## Project plan

### Phase 1 — data foundation (week 1–2)

| Task | Description | Done |
|------|-------------|------|
| Repo setup | Monorepo: `apps/api`, `apps/web`, `packages/ingestion`, `packages/shared` | [x] |
| DB schema | Flyway migrations for all tables and views | [x] |
| `.env` config | `CLUBCARD`, `HHID`, `HOME_STORE_ID`, `JWT_TOKEN` | [x] |
| Shared types | `@safeway-analytics/shared` — API Zod schemas, env, constants | [x] |
| `SafewayClient` | Token manager + `fetchReceiptList` + `fetchReceiptDetail` | [ ] |
| Ingestion CLI | `pnpm ingest` — fetch, dedupe, upsert receipts + line items | [ ] |
| Product resolver | `bpn`-first matching, name fallback, upsert new products | [ ] |
| Price history | Append `price_history` row on each ingestion | [ ] |
| Offers snapshot | `fetchOffers` cron — snapshot 400+ J4U offers weekly | [ ] |
| Backfill | Ingest all historical receipts from account history | [ ] |

### Phase 2 — GraphQL API (week 2–3)

| Task | Description | Done |
|------|-------------|------|
| Schema definition | `Receipt`, `Product`, `LineItem`, `PriceHistory`, `Offer` types | [ ] |
| Analytics resolvers | Monthly spend, DOW patterns, staples, high-cost queries | [ ] |
| Price trend resolver | Rolling 90-day trend per product | [ ] |
| Discount capture | Capture rate by category, missed deal identification | [ ] |
| Offers resolver | Available deals matched against purchase history | [ ] |

### Phase 3 — React dashboard (week 3–4)

| Task | Description | Done |
|------|-------------|------|
| Scaffold | React + Vite + GraphQL codegen + Tailwind | [ ] |
| Metric cards | Total spend, avg weekly, savings, basket size | [ ] |
| Monthly spend chart | Bar chart: spent vs. saved per month | [ ] |
| Weekly trend chart | Line chart: 13-week rolling spend | [ ] |
| DOW chart | Bar chart: avg basket by day of week | [ ] |
| Category donut | Spend breakdown by department | [ ] |
| Staples panel | Frequency-classified products with toggle | [ ] |
| High-cost panel | Dual leaderboard: unit price + cumulative spend | [ ] |
| Price trend view | Per-product price over time with volatility flag | [ ] |
| Cold-start state | < 5 trips: suppress staples, show onboarding message | [ ] |

### Phase 4 — enrichment (week 4+)

| Task | Description | Done |
|------|-------------|------|
| Discount capture UI | "You missed $X in deals this month" | [ ] |
| Price alerts | Flag items above your 90-day average | [ ] |
| Brand comparison | Store brand vs. name brand price differential | [ ] |
| DOW insight | "Your cheapest trips are on Wednesday" callout | [ ] |
| Product normalization | LLM pass for items missing `bpn` — batch, cached | [ ] |

---

## Repo structure

```
safeway-analytics/
├── apps/
│   ├── api/                    # @safeway-analytics/api — GraphQL server
│   │   └── src/
│   │       ├── schema/
│   │       ├── repos/
│   │       └── index.ts
│   └── web/                    # @safeway-analytics/web — React dashboard
│       └── src/
│           ├── components/
│           ├── pages/
│           └── graphql/        # codegen output
├── packages/
│   ├── ingestion/              # @safeway-analytics/ingestion — CLI + cron
│   │   └── src/
│   │       ├── SafewayClient.ts
│   │       ├── TokenManager.ts
│   │       ├── ingest.ts
│   │       ├── resolveProduct.ts
│   │       └── snapshotOffers.ts
│   └── shared/                 # @safeway-analytics/shared — types + env
│       └── src/
├── db/sql/                     # Flyway migrations (V1__*.sql)
├── docs/
│   └── ARCHITECTURE.md
├── .env.example
├── PRD.md
├── README.md
└── package.json
```

---

## Environment variables

```bash
# .env.example — copy to .env, never commit .env
DATABASE_URL=postgresql://safeway:safeway@localhost:5435/safeway_analytics
CLUBCARD=
HHID=
HOME_STORE_ID=305
OKTA_USER_ID=
JWT_TOKEN=                      # paste from HAR; refresh via TokenManager
PORT=4001
NODE_ENV=development
VITE_GRAPHQL_URL=http://localhost:4001/graphql
VITE_API_PROXY_TARGET=http://127.0.0.1:4001
```

---

## Open questions

- [x] JWT refresh: store in `.env` (simple) — v1 default; OS keychain deferred
- [ ] Product normalization: run Claude API batch on items missing `bpn`, or defer?
- [ ] Offers matching: match offer `brand` string against `products.name` — fuzzy match threshold TBD
- [x] Rate limiting: start at 1 req/sec (`RATE_LIMIT_MS` in shared constants)
- [ ] Live API validation: confirm Okta refresh response shape and offers wrapper format (in progress)

---

## Key decisions & rationale

| Decision | Rationale |
|----------|-----------|
| `bpn` as primary product key | Deterministic cross-receipt matching; no LLM needed for most items |
| Single `POST /instore` endpoint for list + detail | Same endpoint, different params — dedupe on `_id` |
| Offers snapshot (not live) | Offers endpoint needs no auth; snapshot weekly to build deal history over time |
| Offers surrogate PK | Append-only snapshots require storing the same `offer_id` across weeks |
| DOW in analytics view | PostgreSQL generated columns cannot use `EXTRACT(DOW FROM timestamptz)` |
| Frequency-based staples (≥60%) | Simple, self-calibrating with real data; cold-start handled by trip count threshold |
| Monorepo (pnpm workspaces) | Shared types between ingestion + API + web without duplication |
| `apps/*` + `packages/*` layout | Runnable services in `apps/`; CLI and shared libs in `packages/` |
| GraphQL schema-first | Enables frontend to develop against mock data in parallel |
| HAR-first API schemas | Zod types in shared package; tighten after live API probing |
