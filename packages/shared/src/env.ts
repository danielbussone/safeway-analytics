import { z } from "zod";

const postgresUrl = z
  .string()
  .min(1, "DATABASE_URL is required")
  .refine(
    (value) => value.startsWith("postgresql://") || value.startsWith("postgres://"),
    "DATABASE_URL must be a PostgreSQL connection string",
  );

export const safewayEnvSchema = z.object({
  DATABASE_URL: postgresUrl,
  CLUBCARD: z.string().min(1, "CLUBCARD is required"),
  HHID: z.string().optional(),
  HOME_STORE_ID: z.string().min(1).default("305"),
  OKTA_USER_ID: z.string().optional(),
  JWT_TOKEN: z.string().min(1, "JWT_TOKEN is required"),
  PORT: z.coerce.number().int().positive().default(4001),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  VITE_GRAPHQL_URL: z.string().url().optional(),
  VITE_API_PROXY_TARGET: z.string().url().optional(),
});

export type SafewayEnv = z.infer<typeof safewayEnvSchema>;

/** Env fields required by the ingestion CLI (subset of full app env). */
export const ingestionEnvSchema = safewayEnvSchema.pick({
  DATABASE_URL: true,
  CLUBCARD: true,
  HHID: true,
  HOME_STORE_ID: true,
  OKTA_USER_ID: true,
  JWT_TOKEN: true,
});

export type IngestionEnv = z.infer<typeof ingestionEnvSchema>;

export function parseSafewayEnv(
  env: Record<string, string | undefined> = process.env,
): SafewayEnv {
  return safewayEnvSchema.parse(env);
}

export function parseIngestionEnv(
  env: Record<string, string | undefined> = process.env,
): IngestionEnv {
  return ingestionEnvSchema.parse(env);
}
