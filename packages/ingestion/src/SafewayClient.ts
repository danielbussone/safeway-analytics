import {
  instoreRequestHeaders,
  offersRequestHeaders,
  SAFEWAY_INSTORE_API_URL,
  SAFEWAY_OFFERS_BASE_URL,
  parseOffersResponse,
  parseReceiptDetailResponse,
  parseReceiptListResponse,
  type IngestionEnv,
  type Offer,
  type ReceiptDetail,
  type ReceiptSummary,
} from "@safeway-analytics/shared";
import { rateLimit } from "./rateLimit.js";
import { TokenManager } from "./TokenManager.js";

export class SafewayClient {
  private readonly tokenManager: TokenManager;

  constructor(private readonly env: IngestionEnv) {
    this.tokenManager = new TokenManager(env);
  }

  async fetchReceiptList(): Promise<ReceiptSummary[]> {
    const token = await this.tokenManager.ensureFreshToken();
    await rateLimit();

    const response = await this.postInstore({
      params: {
        clubcard: this.env.CLUBCARD,
        "client-section": "purchase",
      },
      token,
    });

    return parseReceiptListResponse(response);
  }

  async fetchReceiptDetail(receiptId: string): Promise<ReceiptDetail> {
    const token = await this.tokenManager.ensureFreshToken();
    await rateLimit();

    const response = await this.postInstore({
      params: {
        clubcard: this.env.CLUBCARD,
        id: receiptId,
      },
      token,
    });

    const detail = parseReceiptDetailResponse(response);
    return { ...detail, _id: detail._id ?? receiptId };
  }

  async fetchOffersRaw(storeId = this.env.HOME_STORE_ID): Promise<unknown> {
    await rateLimit();

    const url = new URL(SAFEWAY_OFFERS_BASE_URL);
    url.searchParams.set("storeId", storeId);

    const response = await fetch(url, {
      headers: offersRequestHeaders(),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `Offers request failed (${response.status}): ${text.slice(0, 300)}`,
      );
    }

    return response.json();
  }

  async fetchOffers(storeId = this.env.HOME_STORE_ID): Promise<Offer[]> {
    const raw = await this.fetchOffersRaw(storeId);
    return parseOffersResponse(raw);
  }

  async probeRefreshRaw(): Promise<unknown> {
    await rateLimit();
    return this.tokenManager.refreshToken().then(() => "refreshed");
  }

  private async postInstore(body: Record<string, unknown>): Promise<unknown> {
    const token = String(body.token ?? this.tokenManager.getToken());
    const response = await fetch(SAFEWAY_INSTORE_API_URL, {
      method: "POST",
      headers: instoreRequestHeaders(token),
      body: JSON.stringify(body),
    });

    if (response.status === 401) {
      throw new Error(
        "Instore API rejected JWT_TOKEN (401). Paste a fresh token from HAR (POST order-account/api/instore → body.token).",
      );
    }

    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `Instore API failed (${response.status}): ${text.slice(0, 200)}`,
      );
    }

    return response.json();
  }
}
