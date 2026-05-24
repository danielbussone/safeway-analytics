import pg from "pg";

let pool: pg.Pool | null = null;

export function getPool(): pg.Pool {
  const url = process.env.DATABASE_URL;
  if (!url?.trim()) {
    throw new Error("DATABASE_URL is not set");
  }
  if (!pool) {
    pool = new pg.Pool({ connectionString: url, max: 10 });
  }
  return pool;
}
