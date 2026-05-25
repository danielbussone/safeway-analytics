/**
 * Rule-based shopping categories bin similar SKUs (brands, sizes) for analytics.
 * Examples: Oroweat + Milton's → bread; Peets variants → ground coffee.
 */

export type ShoppingCategory = {
  id: string;
  label: string;
};

type CategoryRule = {
  id: string;
  label: string;
  match: (name: string, department: string | null) => boolean;
};

function upper(name: string): string {
  return name.toUpperCase();
}

const RULES: CategoryRule[] = [
  {
    id: "bread",
    label: "Bread",
    match: (name) => {
      const n = upper(name);
      return (
        /\bBREAD\b/.test(n) &&
        !/\bCRACKER/.test(n) &&
        (/\bOROWEAT\b|\bMILTONS\b|\bO ORGANICS\b|\bWHOLE GRAIN\b|\bMULTI.?GRAIN\b/.test(
          n,
        ) ||
          /\bBREAD\b/.test(n))
      );
    },
  },
  {
    id: "greek-yogurt",
    label: "Greek yogurt",
    match: (name) => {
      const n = upper(name);
      return /\bFAGE\b/.test(n) || /\bGREEK YOGURT\b/.test(n);
    },
  },
  {
    id: "milk",
    label: "Milk",
    match: (name) => {
      const n = upper(name);
      return (
        /\bMILK\b/.test(n) &&
        !/\bALMOND MILK\b/.test(n) &&
        !/\bCOCONUT MILK\b/.test(n)
      );
    },
  },
  {
    id: "eggs",
    label: "Eggs",
    match: (name) => {
      const n = upper(name);
      return /\bEGGS?\b/.test(n) && !/\bEGGPLANT\b/.test(n);
    },
  },
  {
    id: "ground-coffee",
    label: "Ground coffee",
    match: (name) => {
      const n = upper(name);
      if (/\bICE CREAM\b/.test(n) || /\bFILTERS\b/.test(n)) {
        return false;
      }
      return (
        /\bGROUND COFFEE\b/.test(n) ||
        /\bCOLD BREW\b/.test(n) ||
        (/\b(PEETS|STARBUCKS)\b/.test(n) && /\bCOFFEE\b/.test(n)) ||
        (/\bCOFFEE\b/.test(n) &&
          /\b(ROAST|BEAN|BREW|BLEND|GROUND)\b/.test(n) &&
          !/\bK CUP\b/.test(n))
      );
    },
  },
  {
    id: "fresh-fruit-chunks",
    label: "Fresh fruit (pre-cut)",
    match: (name) => {
      const n = upper(name);
      return (
        /\b(CHUNKS|SLICES)\b/.test(n) &&
        /\b(WATERMELON|CANTALOUPE|MANGO|PINEAPPLE|BERRIES|RASPBERRIES)\b/.test(
          n,
        )
      );
    },
  },
  {
    id: "bananas",
    label: "Bananas",
    match: (name) => /\bBANANAS?\b/.test(upper(name)),
  },
  {
    id: "diapers",
    label: "Diapers",
    match: (name) =>
      /\b(HUGGIES|PAMPERS|PULL.?UPS|DIAPER)\b/.test(upper(name)),
  },
  {
    id: "paper-towels",
    label: "Paper towels",
    match: (name) => /\b(PAPER TOWEL|BOUNTY|CHARMIN)\b/.test(upper(name)),
  },
  {
    id: "cheese-shred",
    label: "Shredded cheese",
    match: (name) => {
      const n = upper(name);
      return /\b(CHEESE|MOZZARELLA|CHEDDAR)\b/.test(n) && /\bSHRED\b/.test(n);
    },
  },
  {
    id: "oatmeal",
    label: "Oatmeal",
    match: (name) => /\bOATMEAL\b/.test(upper(name)),
  },
  {
    id: "green-beans",
    label: "Green beans",
    match: (name) => /\bGREEN BEANS?\b/.test(upper(name)),
  },
  {
    id: "pasta-sauce",
    label: "Pasta sauce",
    match: (name) => {
      const n = upper(name);
      if (/\b(KETCHUP|SOY SAUCE|HOT SAUCE|WORCESTERSHIRE)\b/.test(n)) {
        return false;
      }
      return (
        (/\bRAOS\b/.test(n) &&
          /\b(SAUCE|BOLOGNESE|MARINARA|ALFREDO|TOMATO BASIL)\b/.test(n)) ||
        /\b(PREGO|CLASSICO|RAGU|BARILLA)\b/.test(n) ||
        (/\b(TOMATO|MARINARA|BOLOGNESE)\b/.test(n) && /\bSAUCE\b/.test(n))
      );
    },
  },
  {
    id: "salmon",
    label: "Salmon",
    match: (name) => /\bSALMON\b/.test(upper(name)),
  },
  {
    id: "poultry",
    label: "Poultry",
    match: (name) => {
      const n = upper(name);
      return (
        /\b(CHICKEN|TURKEY)\b/.test(n) &&
        !/\b(CHICKEN BROTH|CHICKEN STOCK)\b/.test(n)
      );
    },
  },
  {
    id: "beef",
    label: "Beef",
    match: (name) => {
      const n = upper(name);
      return (
        /\b(BEEF|STEAK|FLANK|RIBEYE|SIRLOIN|BRISKET|TACO MEAT)\b/.test(n) &&
        !/\b(BEEF BROTH|STOCK)\b/.test(n)
      );
    },
  },
  {
    id: "pork",
    label: "Pork",
    match: (name) => {
      const n = upper(name);
      return /\b(PORK|PULLED PORK|PORK CHOP)\b/.test(n);
    },
  },
];

function departmentFallback(
  department: string | null,
  name: string,
): ShoppingCategory {
  const dept = department?.trim() || "Other";
  const slug = dept
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const shortName = upper(name).split(" ").slice(0, 3).join(" ").trim();
  return {
    id: `dept:${slug}`,
    label: shortName.length > 0 ? `${dept} · ${shortName}` : dept,
  };
}

export function deriveShoppingCategory(
  name: string,
  department: string | null = null,
): ShoppingCategory {
  const trimmed = name.trim();
  if (!trimmed) {
    return { id: "unknown", label: "Unknown" };
  }

  for (const rule of RULES) {
    if (rule.match(trimmed, department)) {
      return { id: rule.id, label: rule.label };
    }
  }

  return departmentFallback(department, trimmed);
}

/** Higher = better day to buy (deeper discounts, lower unit prices vs your average). */
export function computeDealScore(
  priceVsOverallPct: number | null,
  discountVsOverallPct: number | null,
): number | null {
  if (priceVsOverallPct === null && discountVsOverallPct === null) {
    return null;
  }
  return (discountVsOverallPct ?? 0) - (priceVsOverallPct ?? 0);
}

export type PriceTrendDirection = "up" | "down" | "flat";

export function computePriceTrendDirection(
  points: { avgPrice: number }[],
): PriceTrendDirection | null {
  if (points.length < 2) {
    return null;
  }
  const first = points[0]!.avgPrice;
  const last = points[points.length - 1]!.avgPrice;
  if (first <= 0) {
    return null;
  }
  const changePct = ((last - first) / first) * 100;
  if (changePct >= 5) {
    return "up";
  }
  if (changePct <= -5) {
    return "down";
  }
  return "flat";
}
