import { z } from "zod";

/** API may return monetary values as strings or numbers. */
export const moneyValueSchema = z.union([z.string(), z.number()]);

export const receiptDiscountSchema = z
  .object({
    code: z.string().optional(),
    amount: moneyValueSchema.optional(),
    category: z.string().optional(),
  })
  .passthrough();

export type ReceiptDiscount = z.infer<typeof receiptDiscountSchema>;

export const receiptItemSchema = z
  .object({
    id: z.string(),
    bpn: z.string().optional(),
    name: z.string(),
    quantity: z.union([z.string(), z.number()]).optional(),
    regularPrice: moneyValueSchema.optional(),
    discount: moneyValueSchema.optional(),
    discounts: z.array(receiptDiscountSchema).optional(),
    reducedPrice: moneyValueSchema.optional(),
    department: z.string().optional(),
    weightItem: z.boolean().optional(),
    upc: z.string().optional(),
    lineItemType: z.string().optional(),
    regularPriceTotal: moneyValueSchema.optional(),
    discountTotal: moneyValueSchema.optional(),
    reducedPriceTotal: moneyValueSchema.optional(),
  })
  .passthrough();

export type ReceiptItem = z.infer<typeof receiptItemSchema>;

export const receiptSummarySchema = z
  .object({
    _id: z.string(),
    posDateTime: z.string(),
    itemCount: z.number().optional(),
    finalTotal: moneyValueSchema.optional(),
    banner: z.string().optional(),
    storeId: z.string().optional(),
    storeName: z.string().optional(),
  })
  .passthrough();

export type ReceiptSummary = z.infer<typeof receiptSummarySchema>;

export const receiptDetailSchema = z
  .object({
    _id: z.string().optional(),
    posDateTime: z.string(),
    itemCount: z.number().optional(),
    finalTotal: moneyValueSchema.optional(),
    banner: z.string().optional(),
    storeId: z.string().optional(),
    storeName: z.string().optional(),
    barCode: z.string().optional(),
    regularPriceTotal: moneyValueSchema.optional(),
    discountTotal: moneyValueSchema.optional(),
    reducedPriceTotal: moneyValueSchema.optional(),
    paymentType: z.string().optional(),
    last4Card: z.string().optional(),
    last4CardNumber: z.string().optional(),
    transactionId: z.string().optional(),
    items: z.array(receiptItemSchema).default([]),
  })
  .passthrough();

export type ReceiptDetail = z.infer<typeof receiptDetailSchema>;

export const receiptListResponseSchema = z.union([
  z.array(receiptSummarySchema),
  z
    .object({
      receipts: z.array(receiptSummarySchema),
    })
    .passthrough()
    .transform((payload) => payload.receipts),
]);

export const receiptDetailResponseSchema = z.union([
  receiptDetailSchema,
  z
    .object({
      receipts: z.array(receiptDetailSchema).min(1),
    })
    .passthrough()
    .transform((payload) => payload.receipts[0]!),
]);

export const instoreListRequestSchema = z.object({
  params: z.object({
    clubcard: z.string(),
    "client-section": z.literal("purchase"),
  }),
  token: z.string(),
});

export const instoreDetailRequestSchema = z.object({
  params: z.object({
    clubcard: z.string(),
    id: z.string(),
  }),
  token: z.string(),
});

export type InstoreListRequest = z.infer<typeof instoreListRequestSchema>;
export type InstoreDetailRequest = z.infer<typeof instoreDetailRequestSchema>;

export const oktaRefreshResponseSchema = z
  .object({
    sessionToken: z.string().optional(),
    token: z.string().optional(),
    accessToken: z.string().optional(),
    idToken: z.string().optional(),
    userId: z.string().optional(),
  })
  .passthrough();

export type OktaRefreshResponse = z.infer<typeof oktaRefreshResponseSchema>;

export const offerSchema = z
  .object({
    offerId: z.string().optional(),
    id: z.string().optional(),
    name: z.string().optional(),
    brand: z.string().optional(),
    category: z.string().optional(),
    offerPgm: z.string().optional(),
    offerProgramType: z.string().optional(),
    offerPrice: z.string().optional(),
    regularPrice: moneyValueSchema.optional(),
    description: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    status: z.string().optional(),
  })
  .passthrough()
  .transform((offer) => ({
    ...offer,
    offerId: offer.offerId ?? offer.id,
  }));

export type Offer = z.infer<typeof offerSchema>;

export const offersResponseSchema = z.union([
  z.array(offerSchema),
  z
    .object({
      offers: z.array(offerSchema).optional(),
      companionGalleryOffer: z.array(offerSchema).optional(),
      data: z.array(offerSchema).optional(),
    })
    .passthrough()
    .transform((payload) => {
      if (Array.isArray(payload)) {
        return payload;
      }
      return (
        payload.offers ??
        payload.companionGalleryOffer ??
        payload.data ??
        []
      );
    }),
]);

export function parseMoneyValue(value: string | number | undefined | null): number | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  const parsed = typeof value === "number" ? value : Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseReceiptListResponse(data: unknown): ReceiptSummary[] {
  return receiptListResponseSchema.parse(data);
}

export function parseReceiptDetailResponse(data: unknown): ReceiptDetail {
  return receiptDetailResponseSchema.parse(data);
}

export function parseOffersResponse(data: unknown): Offer[] {
  return offersResponseSchema.parse(data);
}
