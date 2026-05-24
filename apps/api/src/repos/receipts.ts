import type pg from "pg";

export type ReceiptRow = {
  id: string;
  posDatetime: Date;
  finalTotal: number | null;
  discountTotal: number | null;
  itemCount: number | null;
  storeName: string | null;
  banner: string | null;
};

function toNumber(value: string | null): number | null {
  if (value === null) {
    return null;
  }
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function fetchReceipts(
  pool: pg.Pool,
  limit: number,
  offset: number,
): Promise<ReceiptRow[]> {
  const result = await pool.query<{
    id: string;
    pos_datetime: Date;
    final_total: string | null;
    discount_total: string | null;
    item_count: number | null;
    store_name: string | null;
    banner: string | null;
  }>(
    `
      SELECT id, pos_datetime, final_total::text, discount_total::text,
             item_count, store_name, banner
      FROM receipts
      ORDER BY pos_datetime DESC
      LIMIT $1 OFFSET $2
    `,
    [limit, offset],
  );

  return result.rows.map((row) => ({
    id: row.id,
    posDatetime: row.pos_datetime,
    finalTotal: toNumber(row.final_total),
    discountTotal: toNumber(row.discount_total),
    itemCount: row.item_count,
    storeName: row.store_name,
    banner: row.banner,
  }));
}

export async function countReceipts(pool: pg.Pool): Promise<number> {
  const result = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM receipts`,
  );
  return Number.parseInt(result.rows[0]?.count ?? "0", 10);
}
