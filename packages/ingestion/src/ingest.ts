import "./loadEnv.js";

import { parseIngestionEnv } from "@safeway-analytics/shared";
import { closePool, getPool, refreshProductPriceTrends } from "./db/pool.js";
import {
  deleteLineItemsForReceipt,
  getExistingReceiptIds,
  insertLineItem,
  insertPriceHistory,
  upsertProduct,
  upsertReceipt,
} from "./db/receipts.js";
import { resolveProduct } from "./resolveProduct.js";
import { SafewayClient } from "./SafewayClient.js";

async function main(): Promise<void> {
  const env = parseIngestionEnv(process.env);
  const client = new SafewayClient(env);
  const pool = getPool();

  console.log("Fetching receipt list…");
  const summaries = await client.fetchReceiptList();
  const existing = await getExistingReceiptIds(pool);
  const pending = summaries.filter((summary) => !existing.has(summary._id));

  console.log(
    `Found ${summaries.length} receipts (${pending.length} new, ${existing.size} already ingested)`,
  );

  let ingested = 0;
  for (const summary of pending) {
    const detail = await client.fetchReceiptDetail(summary._id);
    const dbClient = await pool.connect();
    try {
      await dbClient.query("BEGIN");
      await upsertReceipt(dbClient, detail);
      await deleteLineItemsForReceipt(dbClient, detail._id);

      for (const item of detail.items) {
        const product = resolveProduct(item);
        await upsertProduct(dbClient, product);
        await insertLineItem(dbClient, detail._id, product.id, item);
        await insertPriceHistory(
          dbClient,
          product.id,
          detail._id,
          detail.posDateTime,
          item,
        );
      }

      await dbClient.query("COMMIT");
      ingested += 1;
      console.log(`Ingested ${detail._id} (${detail.items.length} items)`);
    } catch (error) {
      await dbClient.query("ROLLBACK");
      throw error;
    } finally {
      dbClient.release();
    }
  }

  if (ingested > 0) {
    await refreshProductPriceTrends();
  }

  console.log(`Done. Ingested ${ingested} receipt(s).`);
}

main()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePool();
  });
