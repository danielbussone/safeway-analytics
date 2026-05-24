import { describe, expect, it } from "vitest";
import {
  getStapleFrequencyThreshold,
  getStapleMode,
  isStapleFrequency,
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
  it("classifies trip counts into cold start, provisional, and full modes", () => {
    expect(getStapleMode(0)).toBe("cold_start");
    expect(getStapleMode(4)).toBe("cold_start");
    expect(getStapleMode(5)).toBe("provisional");
    expect(getStapleMode(9)).toBe("provisional");
    expect(getStapleMode(10)).toBe("full");
  });

  it("returns frequency thresholds by mode", () => {
    expect(getStapleFrequencyThreshold(3)).toBeNull();
    expect(getStapleFrequencyThreshold(7)).toBe(STAPLE_PROVISIONAL_THRESHOLD);
    expect(getStapleFrequencyThreshold(12)).toBe(STAPLE_FULL_THRESHOLD);
  });

  it("evaluates staple frequency against mode-specific thresholds", () => {
    expect(isStapleFrequency(3, 80)).toBe(false);
    expect(isStapleFrequency(7, 50)).toBe(true);
    expect(isStapleFrequency(7, 49)).toBe(false);
    expect(isStapleFrequency(12, 60)).toBe(true);
    expect(isStapleFrequency(12, 59)).toBe(false);
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
    expect(env.HOME_STORE_ID).toBe("305");
  });

  it("applies defaults for optional app env fields", () => {
    const env = parseSafewayEnv(baseEnv);
    expect(env.PORT).toBe(4001);
    expect(env.NODE_ENV).toBe("development");
  });

  it("rejects missing credentials", () => {
    expect(() => parseIngestionEnv({ ...baseEnv, JWT_TOKEN: "" })).toThrow();
  });
});

describe("safeway api schemas", () => {
  it("parses wrapped receipt list responses", () => {
    const receipts = parseReceiptListResponse({
      receipts: [
        {
          _id: "abc123",
          posDateTime: "2025-01-15T18:30:00.000Z",
          itemCount: 12,
          finalTotal: "84.32",
          banner: "safeway",
        },
      ],
    });

    expect(receipts).toHaveLength(1);
    expect(receipts[0]?._id).toBe("abc123");
  });

  it("parses wrapped receipt detail responses", () => {
    const receipt = parseReceiptDetailResponse({
      receipts: [
        {
          posDateTime: "2025-01-15T18:30:00.000Z",
          storeId: "305",
          items: [{ id: "1", name: "TEST ITEM", bpn: "123" }],
        },
      ],
    });

    expect(receipt.items).toHaveLength(1);
    expect(receipt.storeId).toBe("305");
  });

  it("parses receipt list summaries", () => {
    const receipts = parseReceiptListResponse([
      {
        _id: "abc123",
        posDateTime: "2025-01-15T18:30:00.000Z",
        itemCount: 12,
        finalTotal: "84.32",
        banner: "safeway",
      },
    ]);

    expect(receipts).toHaveLength(1);
    expect(receipts[0]?._id).toBe("abc123");
  });

  it("parses receipt detail with line items", () => {
    const receipt = parseReceiptDetailResponse({
      _id: "abc123",
      posDateTime: "2025-01-15T18:30:00.000Z",
      storeId: "305",
      items: [
        {
          id: "7313000132",
          bpn: "196050883",
          name: "OROWEAT BREAD WHOLE GRAIN 100% WHOLE WHEAT",
          quantity: 1,
          regularPrice: "5.99",
          discount: "1.00",
          reducedPrice: "4.99",
          department: "BAKED GOODS",
          weightItem: false,
        },
      ],
    });

    expect(receipt.items).toHaveLength(1);
    expect(receipt.items[0]?.bpn).toBe("196050883");
  });

  it("parses string and numeric money values", () => {
    expect(parseMoneyValue("4.99")).toBe(4.99);
    expect(parseMoneyValue(4.99)).toBe(4.99);
    expect(parseMoneyValue("")).toBeNull();
  });
});
