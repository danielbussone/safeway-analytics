import { describe, expect, it } from "vitest";
import {
  clampDowDealLookbackDays,
  getStapleFrequencyThreshold,
  getStapleFrequencyThresholdByTripCount,
  getStapleMode,
  getStapleModeFromWindow,
  isStapleFrequency,
  DOW_DEAL_LOOKBACK_MAX_DAYS,
  STAPLE_FULL_THRESHOLD,
  STAPLE_PROVISIONAL_THRESHOLD,
} from "./constants.js";
import { parseIngestionEnv, parseSafewayEnv } from "./env.js";
import {
  parseMoneyValue,
  parseReceiptDetailResponse,
  parseReceiptListResponse,
} from "./safeway.js";

describe("staple constants", () => {
  it("classifies all-time trip counts into modes (legacy)", () => {
    expect(getStapleMode(0)).toBe("cold_start");
    expect(getStapleMode(4)).toBe("cold_start");
    expect(getStapleMode(5)).toBe("provisional");
    expect(getStapleMode(9)).toBe("provisional");
    expect(getStapleMode(10)).toBe("full");
  });

  it("classifies rolling window stats into modes", () => {
    expect(getStapleModeFromWindow(3, 12)).toBe("cold_start");
    expect(getStapleModeFromWindow(8, 3)).toBe("cold_start");
    expect(getStapleModeFromWindow(10, 8)).toBe("provisional");
    expect(getStapleModeFromWindow(20, 12)).toBe("full");
  });

  it("returns frequency thresholds by mode", () => {
    expect(getStapleFrequencyThreshold("cold_start")).toBeNull();
    expect(getStapleFrequencyThreshold("provisional")).toBe(
      STAPLE_PROVISIONAL_THRESHOLD,
    );
    expect(getStapleFrequencyThreshold("full")).toBe(STAPLE_FULL_THRESHOLD);
    expect(getStapleFrequencyThresholdByTripCount(7)).toBe(
      STAPLE_PROVISIONAL_THRESHOLD,
    );
  });

  it("evaluates staple frequency against mode-specific thresholds", () => {
    expect(isStapleFrequency("cold_start", 80)).toBe(false);
    expect(isStapleFrequency("provisional", 50)).toBe(true);
    expect(isStapleFrequency("provisional", 49)).toBe(false);
    expect(isStapleFrequency("full", 50)).toBe(true);
    expect(isStapleFrequency("full", 49)).toBe(false);
  });

  it("clamps dow deal lookback days", () => {
    expect(clampDowDealLookbackDays(30)).toBe(90);
    expect(clampDowDealLookbackDays(180)).toBe(180);
    expect(clampDowDealLookbackDays(365)).toBe(365);
    expect(clampDowDealLookbackDays(999)).toBe(DOW_DEAL_LOOKBACK_MAX_DAYS);
  });
});

describe("env schema", () => {
  const baseEnv = {
    DATABASE_URL: "postgresql://safeway:safeway@localhost:5435/safeway_analytics",
    CLUBCARD: "1234567890",
    JWT_TOKEN: "test.jwt.token",
    HOME_STORE_ID: "305",
  };

  it("parses required ingestion env fields", () => {
    const env = parseIngestionEnv(baseEnv);
    expect(env.CLUBCARD).toBe("1234567890");
  });

  it("parses safeway env with optional fields", () => {
    const env = parseSafewayEnv({
      ...baseEnv,
      HHID: "abc",
      OKTA_USER_ID: "user-1",
    });
    expect(env.HHID).toBe("abc");
  });
});

describe("safeway parsers", () => {
  it("parses money values", () => {
    expect(parseMoneyValue("12.34")).toBe(12.34);
    expect(parseMoneyValue(undefined)).toBeNull();
  });

  it("parses receipt list wrapper", () => {
    const list = parseReceiptListResponse({
      receipts: [{ _id: "r1", posDateTime: "2024-01-01T12:00:00Z" }],
    });
    expect(list).toHaveLength(1);
    expect(list[0]?._id).toBe("r1");
  });

  it("parses receipt detail wrapper", () => {
    const detail = parseReceiptDetailResponse({
      receipts: [
        {
          posDateTime: "2024-01-01T12:00:00Z",
          items: [{ id: "1", name: "Milk", bpn: "196050883" }],
        },
      ],
    });
    expect(detail.items[0]?.bpn).toBe("196050883");
  });
});
