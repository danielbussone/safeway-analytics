import type pg from "pg";

export type OfferRow = {
  id: string;
  offerId: string;
  name: string | null;
  brand: string | null;
  category: string | null;
  offerPgm: string | null;
  offerPriceRaw: string | null;
  regularPrice: number | null;
  status: string | null;
  snapshotAt: Date;
};

function toNumber(value: string | null): number | null {
  if (value === null) {
    return null;
  }
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function fetchLatestOffers(pool: pg.Pool): Promise<OfferRow[]> {
  const result = await pool.query<{
    id: string;
    offer_id: string;
    name: string | null;
    brand: string | null;
    category: string | null;
    offer_pgm: string | null;
    offer_price_raw: string | null;
    regular_price: string | null;
    status: string | null;
    snapshot_at: Date;
  }>(`
    SELECT o.id, o.offer_id, o.name, o.brand, o.category, o.offer_pgm,
           o.offer_price_raw, o.regular_price::text, o.status, o.snapshot_at
    FROM offers o
    WHERE o.snapshot_at = (SELECT MAX(snapshot_at) FROM offers)
    ORDER BY o.name
  `);

  return result.rows.map((row) => ({
    id: String(row.id),
    offerId: row.offer_id,
    name: row.name,
    brand: row.brand,
    category: row.category,
    offerPgm: row.offer_pgm,
    offerPriceRaw: row.offer_price_raw,
    regularPrice: toNumber(row.regular_price),
    status: row.status,
    snapshotAt: row.snapshot_at,
  }));
}
