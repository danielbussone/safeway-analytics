import { RATE_LIMIT_MS } from "@safeway-analytics/shared";

let lastRequestAt = 0;

export async function rateLimit(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastRequestAt;
  if (elapsed < RATE_LIMIT_MS) {
    await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_MS - elapsed));
  }
  lastRequestAt = Date.now();
}

export function resetRateLimitForTests(): void {
  lastRequestAt = 0;
}
