import { describe, expect, it } from "vitest";
import {
  computeDealScore,
  computePriceTrendDirection,
  deriveShoppingCategory,
} from "./productCategory.js";

describe("deriveShoppingCategory", () => {
  it("bins bread brands together", () => {
    expect(deriveShoppingCategory("OROWEAT BREAD WHOLE GRAIN").id).toBe("bread");
    expect(deriveShoppingCategory("MILTONS BREAD MULTI-GRAIN").id).toBe("bread");
  });

  it("bins Fage variants together", () => {
    expect(deriveShoppingCategory("FAGE TOTAL 2% GREEK YOGURT STRAINED PLAIN").id).toBe(
      "greek-yogurt",
    );
    expect(deriveShoppingCategory("FAGE TOTAL 5% GREEK YOGURT STRAINED PLAIN").id).toBe(
      "greek-yogurt",
    );
  });

  it("bins ground coffee SKUs together", () => {
    expect(
      deriveShoppingCategory("PEETS COFFEE FRENCH ROAST DARK ROAST GROUND COFFEE 28OZ BAG")
        .id,
    ).toBe("ground-coffee");
    expect(deriveShoppingCategory("STARBUCKS DARK PREMIUM INSTANT COFFEE").id).toBe(
      "ground-coffee",
    );
  });

  it("bins pasta sauce variants together", () => {
    expect(deriveShoppingCategory("RAOS BOLOGNESE SAUCE").id).toBe("pasta-sauce");
    expect(deriveShoppingCategory("RAOS TOMATO BASIL PASTA SAUCE").id).toBe(
      "pasta-sauce",
    );
  });

  it("bins meat types", () => {
    expect(deriveShoppingCategory("SALMON ATLANTIC FILLET").id).toBe("salmon");
    expect(deriveShoppingCategory("USDA CHOICE BEEF TACO MEAT").id).toBe("beef");
  });
});

describe("computeDealScore", () => {
  it("rewards lower prices and higher discounts", () => {
    expect(computeDealScore(-3, 5)).toBe(8);
    expect(computeDealScore(10, -2)).toBe(-12);
  });
});

describe("computePriceTrendDirection", () => {
  it("detects upward and downward trends", () => {
    expect(
      computePriceTrendDirection([
        { avgPrice: 4 },
        { avgPrice: 5 },
      ]),
    ).toBe("up");
    expect(
      computePriceTrendDirection([
        { avgPrice: 5 },
        { avgPrice: 4 },
      ]),
    ).toBe("down");
  });
});
