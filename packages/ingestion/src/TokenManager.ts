import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { OKTA_REFRESH_URL, type IngestionEnv } from "@safeway-analytics/shared";

type JwtPayload = {
  exp?: number;
  sub?: string;
  uid?: string;
};

export class TokenManager {
  private token: string;
  private readonly envPath: string;

  constructor(
    private readonly env: Pick<IngestionEnv, "JWT_TOKEN" | "OKTA_USER_ID">,
    envPath?: string,
  ) {
    this.token = env.JWT_TOKEN;
    this.envPath = envPath ?? resolve(process.cwd(), ".env");
  }

  getToken(): string {
    return this.token;
  }

  /**
   * v1: use JWT from .env as-is (HAR paste). Okta lifecycle refresh needs browser
   * session cookies and returns 404 without them; short-lived access tokens also
   * triggered erroneous proactive refresh when exp was under 24h.
   */
  async ensureFreshToken(): Promise<string> {
    const exp = decodeJwtExp(this.token);
    if (exp !== null) {
      const nowSec = Math.floor(Date.now() / 1000);
      if (exp <= nowSec) {
        throw new Error(
          "JWT_TOKEN is expired. Paste a fresh token from HAR (POST order-account/api/instore → body.token).",
        );
      }
    }
    return this.token;
  }

  async refreshToken(): Promise<string> {
    // SECURITY-REVIEW: external auth call; never log token values
    const response = await fetch(OKTA_REFRESH_URL, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      throw new Error(
        `Okta token refresh failed (${response.status}). Update JWT_TOKEN in .env from a fresh browser session.`,
      );
    }

    const payload: unknown = await response.json();
    const nextToken = extractTokenFromRefreshResponse(payload);
    if (!nextToken) {
      throw new Error(
        "Okta refresh response did not include a token. Update JWT_TOKEN manually from HAR.",
      );
    }

    this.token = nextToken;
    this.persistToken(nextToken);
    return this.token;
  }

  private persistToken(token: string): void {
    try {
      const contents = readFileSync(this.envPath, "utf8");
      const updated = contents.replace(
        /^JWT_TOKEN=.*$/m,
        `JWT_TOKEN=${token}`,
      );
      writeFileSync(this.envPath, updated, "utf8");
    } catch {
      // Non-fatal: token works for this process even if .env is not writable
    }
  }
}

export function decodeJwtExp(token: string): number | null {
  const parts = token.split(".");
  if (parts.length < 2) {
    return null;
  }
  try {
    const payload = JSON.parse(
      Buffer.from(parts[1]!, "base64url").toString("utf8"),
    ) as JwtPayload;
    return typeof payload.exp === "number" ? payload.exp : null;
  } catch {
    return null;
  }
}

export function extractTokenFromRefreshResponse(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const record = payload as Record<string, unknown>;
  const candidates = [
    record.token,
    record.sessionToken,
    record.accessToken,
    record.idToken,
    (record.data as Record<string, unknown> | undefined)?.token,
    (record.data as Record<string, unknown> | undefined)?.sessionToken,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.length > 0) {
      return candidate;
    }
  }
  return null;
}
