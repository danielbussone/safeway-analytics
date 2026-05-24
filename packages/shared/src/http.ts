/** Strip optional Bearer prefix from pasted JWT values. */
export function normalizeJwtToken(token: string): string {
  return token.trim().replace(/^Bearer\s+/i, "");
}

export const SAFEWAY_ORIGIN = "https://www.safeway.com";

export function instoreRequestHeaders(token: string): Record<string, string> {
  const jwt = normalizeJwtToken(token);
  return {
    accept: "application/json, text/plain, */*",
    "accept-language": "en-US,en;q=0.9",
    "content-type": "application/json",
    authorization: `Bearer ${jwt}`,
    origin: SAFEWAY_ORIGIN,
    referer: `${SAFEWAY_ORIGIN}/order-account/order-history`,
    "user-agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  };
}

export function offersRequestHeaders(token?: string): Record<string, string> {
  const headers: Record<string, string> = {
    accept: "application/vnd.safeway.v2+json, application/json, */*",
    "accept-language": "en-US,en;q=0.9",
    origin: SAFEWAY_ORIGIN,
    referer: `${SAFEWAY_ORIGIN}/foru/coupons-deals.html`,
    "user-agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  };
  if (token) {
    headers.authorization = `Bearer ${normalizeJwtToken(token)}`;
  }
  return headers;
}
