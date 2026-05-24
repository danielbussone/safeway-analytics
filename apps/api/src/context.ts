import type pg from "pg";
import { getPool } from "./db/pool.js";

export type GraphQLContext = {
  pool: pg.Pool;
};

export function createContext(): GraphQLContext {
  return { pool: getPool() };
}
