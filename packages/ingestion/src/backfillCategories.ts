import "./loadEnv.js";

import { deriveShoppingCategory } from "@safeway-analytics/shared";
import { closePool, getPool } from "./db/pool.js";

async function main(): Promise<void> {
  const pool = getPool();
  const result = await pool.query<{ id: string; name: string; department: string | null }>(
    `SELECT id, name, department FROM products`,
  );

  let updated = 0;
  for (const row of result.rows) {
    const category = deriveShoppingCategory(row.name, row.department);
    await pool.query(
      `
        UPDATE products
        SET shopping_category_id = $2, shopping_category_label = $3
        WHERE id = $1
      `,
      [row.id, category.id, category.label],
    );
    updated += 1;
  }

  console.log(`Updated shopping categories for ${updated} product(s).`);
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
