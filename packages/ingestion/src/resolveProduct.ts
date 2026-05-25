import { createHash } from "node:crypto";
import type { ReceiptItem } from "@safeway-analytics/shared";
import { deriveShoppingCategory } from "@safeway-analytics/shared";

const SIZE_TOKENS =
  /\b(\d+(\.\d+)?\s*(OZ|LB|LBS|CT|PK|ML|G|KG|FL\s*OZ|COUNT|EA))\b/gi;

export function normalizeProductName(name: string): string {
  return name
    .toUpperCase()
    .replace(SIZE_TOKENS, " ")
    .replace(/[^A-Z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function hashNormalizedName(name: string): string {
  const normalized = normalizeProductName(name);
  return createHash("sha256").update(normalized).digest("hex").slice(0, 16);
}

export type ResolvedProduct = {
  id: string;
  bpn: string | null;
  upc: string | null;
  name: string;
  normalizedName: string;
  department: string | null;
  isWeightItem: boolean;
  shoppingCategoryId: string;
  shoppingCategoryLabel: string;
};

export function resolveProduct(item: ReceiptItem): ResolvedProduct {
  const normalizedName = normalizeProductName(item.name);
  const bpn = item.bpn?.trim() || null;
  const upc = item.upc?.trim() || item.id?.trim() || null;

  let id: string;
  if (bpn) {
    id = bpn;
  } else if (upc) {
    id = `upc:${upc}`;
  } else {
    id = `name:${hashNormalizedName(item.name)}`;
  }

  const department = item.department?.trim() ?? null;
  const category = deriveShoppingCategory(item.name, department);

  return {
    id,
    bpn,
    upc,
    name: item.name,
    normalizedName,
    department,
    isWeightItem: Boolean(item.weightItem),
    shoppingCategoryId: category.id,
    shoppingCategoryLabel: category.label,
  };
}
