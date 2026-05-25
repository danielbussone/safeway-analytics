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

/** Rolling window for staple and day-of-week deal analytics. */
export const STAPLE_LOOKBACK_DAYS = 90;

/** Day-of-week price/discount patterns use a longer window than staples. */
export const DOW_DEAL_LOOKBACK_DAYS = 365;

/** Optional GraphQL override bounds for dow deal lookback. */
export const DOW_DEAL_LOOKBACK_MIN_DAYS = 90;
export const DOW_DEAL_LOOKBACK_MAX_DAYS = 365;

/** Minimum line items on a day before surfacing price/discount DOW signals. */
export const DOW_DEAL_MIN_LINE_ITEMS = 10;

export const STAPLE_FREQUENCY_BASES = ["week", "trip"] as const;
export type StapleFrequencyBasis = (typeof STAPLE_FREQUENCY_BASES)[number];

/** Default: % of active shopping weeks (handles weekly Sunday runs + smaller trips). */
export const STAPLE_FREQUENCY_BASIS: StapleFrequencyBasis = "week";

/** Trips below this count suppress staples UI (cold start), within the lookback window. */
export const STAPLE_COLD_START_MAX_TRIPS = 5;

/** Fewer than this many active weeks in the window → cold start. */
export const STAPLE_COLD_START_MIN_WEEKS = 4;

/** Active weeks up to this count use provisional staple thresholds. */
export const STAPLE_PROVISIONAL_MAX_WEEKS = 9;

/** Trips up to this count use provisional staple thresholds (legacy trip-based mode). */
export const STAPLE_PROVISIONAL_MAX_TRIPS = 9;

/** Minimum purchase frequency for provisional staple classification. */
export const STAPLE_PROVISIONAL_THRESHOLD = 0.5;

/** Minimum purchase frequency for full staple classification. */
export const STAPLE_FULL_THRESHOLD = 0.5;

export const STAPLE_MODES = ["cold_start", "provisional", "full"] as const;
export type StapleMode = (typeof STAPLE_MODES)[number];

/** Legacy all-time trip count mode (prefer getStapleModeFromWindow). */
export function getStapleMode(tripCount: number): StapleMode {
  if (tripCount < STAPLE_COLD_START_MAX_TRIPS) {
    return "cold_start";
  }
  if (tripCount <= STAPLE_PROVISIONAL_MAX_TRIPS) {
    return "provisional";
  }
  return "full";
}

export function getStapleModeFromWindow(
  windowTripCount: number,
  activeWeeks: number,
): StapleMode {
  if (
    windowTripCount < STAPLE_COLD_START_MAX_TRIPS ||
    activeWeeks < STAPLE_COLD_START_MIN_WEEKS
  ) {
    return "cold_start";
  }
  if (activeWeeks <= STAPLE_PROVISIONAL_MAX_WEEKS) {
    return "provisional";
  }
  return "full";
}

/** Returns the frequency threshold for staple classification, or null during cold start. */
export function getStapleFrequencyThreshold(
  mode: StapleMode,
): number | null {
  if (mode === "cold_start") {
    return null;
  }
  if (mode === "provisional") {
    return STAPLE_PROVISIONAL_THRESHOLD;
  }
  return STAPLE_FULL_THRESHOLD;
}

/** @deprecated Use getStapleFrequencyThreshold(mode) with getStapleModeFromWindow. */
export function getStapleFrequencyThresholdByTripCount(
  tripCount: number,
): number | null {
  return getStapleFrequencyThreshold(getStapleMode(tripCount));
}

export function isStapleFrequency(
  mode: StapleMode,
  frequencyPct: number,
): boolean {
  const threshold = getStapleFrequencyThreshold(mode);
  if (threshold === null) {
    return false;
  }
  return frequencyPct / 100 >= threshold;
}

export function clampDowDealLookbackDays(days: number): number {
  return Math.min(
    DOW_DEAL_LOOKBACK_MAX_DAYS,
    Math.max(DOW_DEAL_LOOKBACK_MIN_DAYS, Math.round(days)),
  );
}

export const STAPLE_NEAR_THRESHOLD_MARGIN = 0.15;

/** Meat categories tracked on a per-pound basis when sold by weight. */
export const MEAT_CATEGORY_IDS = [
  "salmon",
  "poultry",
  "beef",
  "pork",
] as const;

export type MeatCategoryId = (typeof MEAT_CATEGORY_IDS)[number];

export function isMeatCategory(categoryId: string): categoryId is MeatCategoryId {
  return (MEAT_CATEGORY_IDS as readonly string[]).includes(categoryId);
}

export function priceUnitLabel(categoryId: string, isWeightItem: boolean): string {
  if (isMeatCategory(categoryId) || isWeightItem) {
    return "$/lb";
  }
  return "each";
}

export function formatStapleBasisLabel(basis: StapleFrequencyBasis): string {
  return basis === "week" ? "shopping weeks" : "trips";
}
