# Safeway Analytics

Personal grocery analytics for Albertsons/Safeway receipts. Ingests in-store purchase history, tracks price trends, and surfaces spending insights through a React dashboard backed by GraphQL.

**Stack:** pnpm monorepo · TypeScript · GraphQL (Yoga + Pothos) · React (Vite + Tailwind) · PostgreSQL (Flyway + pgvector)

**Status:** MVP-A complete — ingestion, GraphQL API, and React dashboard are wired. See [docs/ROADMAP.md](docs/ROADMAP.md) for follow-up phases.

## Prerequisites

- Node 20+
- pnpm 9+
- Docker Desktop (Postgres + Flyway)

## Ports

| Service     | Host port |
|-------------|-----------|
| Postgres    | 5435      |
| GraphQL API | 4001      |
| Vite web    | 5174      |

## Quick start

```bash
cp .env.example .env          # fill CLUBCARD, JWT_TOKEN, etc.
docker compose up -d db
pnpm install
pnpm db:migrate
```

```bash
pnpm ingest                   # sync receipts from Safeway API
pnpm backfill:categories      # re-apply shopping-category rules to products
pnpm ingest:offers            # snapshot J4U offers (blocked until offers API key is configured)
pnpm probe                    # probe live API; writes redacted samples to docs/api-discovery/
pnpm dev:all                  # GraphQL API + React dashboard
```

- GraphQL: http://localhost:4001/graphql
- Web: http://localhost:5174

## Environment

Copy [`.env.example`](.env.example) to `.env` at the repo root. Never commit `.env` — it holds your clubcard and JWT.

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection (default port 5435) |
| `CLUBCARD` | Required on all receipt API calls |
| `JWT_TOKEN` | Bearer token from browser HAR; refreshed by `TokenManager` |
| `HOME_STORE_ID` | Store ID for offer snapshots (e.g. `305`) |
| `HHID` | Household ID (rewards/offers) |
| `OKTA_USER_ID` | Okta user ID from session refresh |

Paste `JWT_TOKEN` from a Safeway browser session HAR capture on first setup. When the session expires (~90 days), update the token manually until Playwright re-login is implemented.

## Scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` | GraphQL API at http://localhost:4001/graphql |
| `pnpm dev:all` | API + web concurrently |
| `pnpm backfill:categories` | Re-run `shopping_category_id` rules on existing products |
| `pnpm build` | Build all workspace packages |
| `pnpm lint` | Typecheck all packages |
| `pnpm db:migrate` | Run Flyway migrations |
| `pnpm db:repair` | Flyway repair |
| `pnpm ingest` | Sync receipts from Safeway API |
| `pnpm ingest:offers` | Snapshot J4U offers for your home store |
| `pnpm probe` | Probe live Safeway API; writes redacted samples to `docs/api-discovery/` |

### Cron (optional)

Keep data fresh without manual runs:

```bash
# Receipts — after each shopping trip or daily
0 9 * * * cd /path/to/safeway-analytics && pnpm ingest >> /tmp/safeway-ingest.log 2>&1

# Offers — weekly, after ingest:offers works (see docs/api-discovery/FINDINGS.md)
0 8 * * 0 cd /path/to/safeway-analytics && pnpm ingest:offers >> /tmp/safeway-offers.log 2>&1
```

## Monorepo layout

```
apps/api/              GraphQL server (@safeway-analytics/api)
apps/web/              React dashboard (@safeway-analytics/web)
packages/ingestion/    Receipt + offer ingestion CLI
packages/shared/       Safeway API types, Zod env schema, constants
db/sql/                Flyway migrations (V1__*.sql)
```

## Dashboard (MVP-A)

- **Spend:** metric cards, monthly bar chart, weekly trend, category donut
- **Staples:** SKU-level staples (90-day window, % of shopping weeks), binned category insights, near-staples
- **Prices:** high-cost leaderboards, per-product price trend with volatility
- **Timing:** day-of-week deal score (discount vs price vs overall; default 365-day lookback)
- **Meat:** salmon / poultry / beef / pork trends on a $/lb basis for weighted items
- **Cold start:** suppresses staples when history is too thin

Not yet in the UI: discount capture by department, offers, receipt browser (API exists for the latter two).

## Docs

- [Architecture](docs/ARCHITECTURE.md) — service topology, ingestion pipeline, analytics model
- [Roadmap](docs/ROADMAP.md) — follow-up phases (MVP-B through enrichment)
- [PRD](PRD.md) — product requirements and completed project plan

## Security

Single-user local app. Do not expose the GraphQL endpoint publicly without adding authentication. JWT and clubcard values must never be logged or committed.
