import { useQuery } from "@tanstack/react-query";
import { graphqlClient } from "../api/client";
import { DASHBOARD_QUERY, PRICE_TREND_QUERY } from "./queries";
import type { DashboardData, PriceTrendData } from "./types";

export function useDashboard() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: () =>
      graphqlClient.request<DashboardData>(DASHBOARD_QUERY, {
        months: 12,
        weeks: 13,
        highCostLimit: 15,
      }),
    staleTime: 60_000,
  });
}

export function usePriceTrend(productId: string | null) {
  return useQuery({
    queryKey: ["priceTrend", productId],
    queryFn: () =>
      graphqlClient.request<PriceTrendData>(PRICE_TREND_QUERY, {
        productId,
      }),
    enabled: productId !== null && productId.length > 0,
    staleTime: 60_000,
  });
}
