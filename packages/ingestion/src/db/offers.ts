import type pg from "pg";
import { parseMoneyValue, type Offer } from "@safeway-analytics/shared";

export async function insertOfferSnapshot(
  client: pg.Pool | pg.PoolClient,
  offer: Offer,
  storeId: string,
  snapshotAt: Date,
): Promise<void> {
  const offerId = offer.offerId ?? offer.id;
  if (!offerId) {
    return;
  }

  await client.query(
    `
      INSERT INTO offers (
        offer_id, name, brand, category, offer_pgm, offer_program_type,
        offer_price_raw, regular_price, description, start_date, end_date,
        status, store_id, snapshot_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    `,
    [
      offerId,
      offer.name ?? null,
      offer.brand ?? null,
      offer.category ?? null,
      offer.offerPgm ?? null,
      offer.offerProgramType ?? null,
      offer.offerPrice ?? null,
      parseMoneyValue(offer.regularPrice),
      offer.description ?? null,
      offer.startDate ? new Date(offer.startDate) : null,
      offer.endDate ? new Date(offer.endDate) : null,
      offer.status ?? null,
      storeId,
      snapshotAt,
    ],
  );
}
