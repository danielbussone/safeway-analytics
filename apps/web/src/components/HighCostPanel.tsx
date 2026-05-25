import { useState } from "react";
import type { HighCostProductsResult } from "../graphql/types";
import { EmptyState } from "./ui/Panel";
import { formatCurrencyPrecise } from "../lib/format";

interface HighCostPanelProps {
  data: HighCostProductsResult;
  onSelectProduct: (productId: string) => void;
  selectedProductId: string | null;
}

type Tab = "unit" | "cumulative";

export function HighCostPanel({
  data,
  onSelectProduct,
  selectedProductId,
}: HighCostPanelProps) {
  const [tab, setTab] = useState<Tab>("unit");
  const rows =
    tab === "unit" ? data.byUnitPrice : data.byCumulativeSpend;

  if (
    data.byUnitPrice.length === 0 &&
    data.byCumulativeSpend.length === 0
  ) {
    return <EmptyState message="No high-cost products yet." />;
  }

  return (
    <div>
      <div className="mb-3 flex gap-2">
        <button
          type="button"
          onClick={() => setTab("unit")}
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            tab === "unit"
              ? "bg-safeway-red text-white"
              : "bg-stone-100 text-stone-600 hover:bg-stone-200"
          }`}
        >
          By unit price
        </button>
        <button
          type="button"
          onClick={() => setTab("cumulative")}
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            tab === "cumulative"
              ? "bg-safeway-red text-white"
              : "bg-stone-100 text-stone-600 hover:bg-stone-200"
          }`}
        >
          By cumulative spend
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-stone-200 text-left text-xs uppercase tracking-wide text-stone-500">
              <th className="pb-2 pr-4 font-semibold">Product</th>
              <th className="pb-2 pr-4 font-semibold">Dept</th>
              <th className="pb-2 pr-4 font-semibold">
                {tab === "unit" ? "Unit price" : "Cumulative"}
              </th>
              <th className="pb-2 font-semibold">Purchases</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const isSelected = selectedProductId === row.productId;
              return (
                <tr
                  key={row.productId}
                  className={`border-b border-stone-100 ${isSelected ? "bg-red-50" : ""}`}
                >
                  <td className="py-2 pr-4">
                    <button
                      type="button"
                      onClick={() => onSelectProduct(row.productId)}
                      className="text-left font-medium text-stone-900 hover:underline"
                    >
                      {row.name}
                    </button>
                  </td>
                  <td className="py-2 pr-4 text-stone-600">
                    {row.department ?? "—"}
                  </td>
                  <td className="py-2 pr-4 tabular-nums text-stone-700">
                    {tab === "unit"
                      ? formatCurrencyPrecise(row.unitPrice)
                      : formatCurrencyPrecise(row.cumulativeSpend)}
                  </td>
                  <td className="py-2 tabular-nums text-stone-700">
                    {row.purchaseCount}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-stone-500">
        Click a product to view its price trend below.
      </p>
    </div>
  );
}
