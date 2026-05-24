/** Minimum delay between Albertsons API requests (1 req/sec). */
export const RATE_LIMIT_MS = 1000;

/** Proactively refresh JWT when within this many seconds of expiry. */
export const JWT_REFRESH_WINDOW_SEC = 24 * 60 * 60;

export const SAFEWAY_INSTORE_API_URL =
  "https://www.safeway.com/order-account/api/instore";

export const OKTA_REFRESH_URL =
  "https://ciam.albertsons.com/api/v1/sessions/me/lifecycle/refresh";

export const SAFEWAY_OFFERS_BASE_URL =
  "https://www.safeway.com/abs/pub/xapi/offers/companiongalleryoffer";

export const SAFEWAY_OFFERS_CONTENT_TYPE = "application/vnd.safeway.v2+json";

export const OFFER_PROGRAM_CODES = ["MF", "PD", "SC"] as const;
export type OfferProgramCode = (typeof OFFER_PROGRAM_CODES)[number];

export const OFFER_PROGRAM_LABELS: Record<OfferProgramCode, string> = {
  MF: "Manufacturer coupon",
  PD: "Personalized deal (J4U)",
  SC: "Store coupon",
};

/** Trips below this count suppress staples UI (cold start). */
export const STAPLE_COLD_START_MAX_TRIPS = 5;

/** Trips up to this count use provisional staple thresholds. */
export const STAPLE_PROVISIONAL_MAX_TRIPS = 9;

/** Minimum purchase frequency for provisional staple classification. */
export const STAPLE_PROVISIONAL_THRESHOLD = 0.5;

/** Minimum purchase frequency for full staple classification. */
export const STAPLE_FULL_THRESHOLD = 0.6;

export const STAPLE_MODES = ["cold_start", "provisional", "full"] as const;
export type StapleMode = (typeof STAPLE_MODES)[number];

export function getStapleMode(tripCount: number): StapleMode {
  if (tripCount < STAPLE_COLD_START_MAX_TRIPS) {
    return "cold_start";
  }
  if (tripCount <= STAPLE_PROVISIONAL_MAX_TRIPS) {
    return "provisional";
  }
  return "full";
}

/** Returns the frequency threshold for staple classification, or null during cold start. */
export function getStapleFrequencyThreshold(tripCount: number): number | null {
  const mode = getStapleMode(tripCount);
  if (mode === "cold_start") {
    return null;
  }
  if (mode === "provisional") {
    return STAPLE_PROVISIONAL_THRESHOLD;
  }
  return STAPLE_FULL_THRESHOLD;
}

export function isStapleFrequency(
  tripCount: number,
  frequencyPct: number,
): boolean {
  const threshold = getStapleFrequencyThreshold(tripCount);
  if (threshold === null) {
    return false;
  }
  return frequencyPct / 100 >= threshold;
}
