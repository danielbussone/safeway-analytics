import "./loadEnv.js";

import { parseIngestionEnv } from "@safeway-analytics/shared";
import { closePool, getPool } from "./db/pool.js";
import { insertOfferSnapshot } from "./db/offers.js";
import { SafewayClient } from "./SafewayClient.js";

async function main(): Promise<void> {
  const env = parseIngestionEnv(process.env);
  const client = new SafewayClient(env);
  const pool = getPool();
  const snapshotAt = new Date();

  console.log(`Fetching offers for store ${env.HOME_STORE_ID}…`);
  const offers = await client.fetchOffers(env.HOME_STORE_ID);
  console.log(`Snapshotting ${offers.length} offers at ${snapshotAt.toISOString()}`);

  const dbClient = await pool.connect();
  try {
    await dbClient.query("BEGIN");
    for (const offer of offers) {
      await insertOfferSnapshot(dbClient, offer, env.HOME_STORE_ID, snapshotAt);
    }
    await dbClient.query("COMMIT");
  } catch (error) {
    await dbClient.query("ROLLBACK");
    throw error;
  } finally {
    dbClient.release();
  }

  console.log("Offer snapshot complete.");
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
