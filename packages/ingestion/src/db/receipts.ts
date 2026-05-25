import type pg from "pg";
import {
  parseMoneyValue,
  type ReceiptDetail,
  type ReceiptItem,
} from "@safeway-analytics/shared";
import type { ResolvedProduct } from "../resolveProduct.js";

export async function getExistingReceiptIds(client: pg.Pool): Promise<Set<string>> {
  const result = await client.query<{ id: string }>("SELECT id FROM receipts");
  return new Set(result.rows.map((row) => row.id));
}

export async function upsertReceipt(
  client: pg.Pool | pg.PoolClient,
  receipt: ReceiptDetail,
): Promise<void> {
  await client.query(
    `
      INSERT INTO receipts (
        id, bar_code, pos_datetime, store_id, store_name, banner,
        regular_price_total, discount_total, reduced_price_total, final_total,
        item_count, payment_type, last4_card, raw_payload
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10,
        $11, $12, $13, $14::jsonb
      )
      ON CONFLICT (id) DO UPDATE SET
        bar_code = EXCLUDED.bar_code,
        pos_datetime = EXCLUDED.pos_datetime,
        store_id = EXCLUDED.store_id,
        store_name = EXCLUDED.store_name,
        banner = EXCLUDED.banner,
        regular_price_total = EXCLUDED.regular_price_total,
        discount_total = EXCLUDED.discount_total,
        reduced_price_total = EXCLUDED.reduced_price_total,
        final_total = EXCLUDED.final_total,
        item_count = EXCLUDED.item_count,
        payment_type = EXCLUDED.payment_type,
        last4_card = EXCLUDED.last4_card,
        raw_payload = EXCLUDED.raw_payload
    `,
    [
      receipt._id,
      receipt.barCode ?? null,
      receipt.posDateTime,
      receipt.storeId ?? "unknown",
      receipt.storeName ?? null,
      receipt.banner ?? null,
      parseMoneyValue(receipt.regularPriceTotal),
      parseMoneyValue(receipt.discountTotal),
      parseMoneyValue(receipt.reducedPriceTotal),
      parseMoneyValue(receipt.finalTotal),
      receipt.itemCount ?? receipt.items.length,
      receipt.paymentType ?? null,
      receipt.last4Card ?? receipt.last4CardNumber ?? null,
      JSON.stringify(receipt),
    ],
  );
}

export async function upsertProduct(
  client: pg.Pool | pg.PoolClient,
  product: ResolvedProduct,
): Promise<void> {
  await client.query(
    `
      INSERT INTO products (
        id, bpn, upc, name, normalized_name, department, is_weight_item,
        shopping_category_id, shopping_category_label
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (id) DO UPDATE SET
        bpn = COALESCE(EXCLUDED.bpn, products.bpn),
        upc = COALESCE(EXCLUDED.upc, products.upc),
        name = EXCLUDED.name,
        normalized_name = EXCLUDED.normalized_name,
        department = COALESCE(EXCLUDED.department, products.department),
        is_weight_item = EXCLUDED.is_weight_item,
        shopping_category_id = EXCLUDED.shopping_category_id,
        shopping_category_label = EXCLUDED.shopping_category_label
    `,
    [
      product.id,
      product.bpn,
      product.upc,
      product.name,
      product.normalizedName,
      product.department,
      product.isWeightItem,
      product.shoppingCategoryId,
      product.shoppingCategoryLabel,
    ],
  );
}

export async function insertLineItem(
  client: pg.Pool | pg.PoolClient,
  receiptId: string,
  productId: string,
  item: ReceiptItem,
): Promise<void> {
  const quantityRaw = item.quantity;
  const quantity =
    quantityRaw === undefined || quantityRaw === null
      ? null
      : typeof quantityRaw === "number"
        ? quantityRaw
        : Number.parseFloat(String(quantityRaw));

  await client.query(
    `
      INSERT INTO line_items (
        receipt_id, product_id, quantity,
        regular_price, discount_amount, reduced_price,
        regular_price_total, discount_total, reduced_price_total,
        line_item_type, raw_discounts
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb)
    `,
    [
      receiptId,
      productId,
      Number.isFinite(quantity) ? quantity : null,
      parseMoneyValue(item.regularPrice),
      parseMoneyValue(item.discount),
      parseMoneyValue(item.reducedPrice),
      parseMoneyValue(item.regularPriceTotal),
      parseMoneyValue(item.discountTotal),
      parseMoneyValue(item.reducedPriceTotal),
      item.lineItemType ?? null,
      JSON.stringify(item.discounts ?? []),
    ],
  );
}

export async function insertPriceHistory(
  client: pg.Pool | pg.PoolClient,
  productId: string,
  receiptId: string,
  observedAt: string,
  item: ReceiptItem,
): Promise<void> {
  const observedPrice = parseMoneyValue(item.reducedPrice ?? item.regularPrice);
  if (observedPrice === null) {
    return;
  }

  const priceUnit = item.weightItem ? "lb" : "each";

  await client.query(
    `
      INSERT INTO price_history (
        product_id, observed_price, regular_price, observed_at, receipt_id, price_unit
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `,
    [
      productId,
      observedPrice,
      parseMoneyValue(item.regularPrice),
      observedAt,
      receiptId,
      priceUnit,
    ],
  );
}

export async function deleteLineItemsForReceipt(
  client: pg.Pool | pg.PoolClient,
  receiptId: string,
): Promise<void> {
  await client.query("DELETE FROM line_items WHERE receipt_id = $1", [receiptId]);
}
