import "./loadEnv.js";

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  instoreRequestHeaders,
  offersRequestHeaders,
  OKTA_REFRESH_URL,
  oktaRefreshResponseSchema,
  parseIngestionEnv,
  parseOffersResponse,
  parseReceiptDetailResponse,
  parseReceiptListResponse,
  SAFEWAY_INSTORE_API_URL,
  SAFEWAY_OFFERS_BASE_URL,
} from "@safeway-analytics/shared";
import { inferSchema, redactValue, topLevelKeys } from "./redact.js";
import { rateLimit } from "./rateLimit.js";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(packageRoot, "../..");
const outDir = resolve(repoRoot, "docs/api-discovery");

type ProbeResult = {
  name: string;
  ok: boolean;
  topLevelKeys: string[];
  schema: ReturnType<typeof inferSchema>;
  parseError?: string;
  sampleCount?: number;
  httpStatus?: number;
};

async function main(): Promise<void> {
  const tryRefresh = process.argv.includes("--refresh");
  const env = parseIngestionEnv(process.env);
  const results: ProbeResult[] = [];
  let firstReceiptId: string | undefined;
  let firstReceiptStoreId: string | undefined;

  mkdirSync(outDir, { recursive: true });

  console.log("Probing Safeway / Albertsons API…\n");

  // Receipt list
  try {
    const listResult = await fetchInstoreRaw(env, {
      params: { clubcard: env.CLUBCARD, "client-section": "purchase" },
      token: env.JWT_TOKEN,
    });
    if (!listResult.ok) {
      writeJson("receipt-list.error.json", listResult.body);
      results.push({
        name: "receipt-list",
        ok: false,
        topLevelKeys: topLevelKeys(listResult.body),
        schema: inferSchema(redactValue(listResult.body)),
        parseError: `HTTP ${listResult.status}`,
        httpStatus: listResult.status,
      });
    } else {
      const rawList = listResult.body;
      writeJson("receipt-list.raw.json", rawList);
      const topKeys = topLevelKeys(rawList);
      let parseError: string | undefined;
      let sampleCount: number | undefined;
      try {
        const parsed = parseReceiptListResponse(rawList);
        sampleCount = parsed.length;
        firstReceiptId = parsed[0]?._id;
      } catch (error) {
        parseError = error instanceof Error ? error.message : String(error);
      }
      results.push({
        name: "receipt-list",
        ok: !parseError,
        topLevelKeys: topKeys,
        schema: inferSchema(redactValue(rawList)),
        parseError,
        sampleCount,
        httpStatus: listResult.status,
      });
    }
  } catch (error) {
    results.push(failedResult("receipt-list", error));
  }

  // Receipt detail (first receipt if available)
  try {
    if (!firstReceiptId) {
      console.log("No receipts in list — skipping detail probe.");
    } else {
      const detailResult = await fetchInstoreRaw(env, {
        params: { clubcard: env.CLUBCARD, id: firstReceiptId },
        token: env.JWT_TOKEN,
      });
      if (!detailResult.ok) {
        writeJson("receipt-detail.error.json", detailResult.body);
        results.push({
          name: "receipt-detail",
          ok: false,
          topLevelKeys: topLevelKeys(detailResult.body),
          schema: inferSchema(redactValue(detailResult.body)),
          parseError: `HTTP ${detailResult.status}`,
          httpStatus: detailResult.status,
        });
      } else {
        const rawDetail = detailResult.body;
        writeJson("receipt-detail.raw.json", rawDetail);
        let parseError: string | undefined;
        try {
          const detail = parseReceiptDetailResponse(rawDetail);
          firstReceiptStoreId = detail.storeId;
        } catch (error) {
          parseError = error instanceof Error ? error.message : String(error);
        }
        results.push({
          name: "receipt-detail",
          ok: !parseError,
          topLevelKeys: topLevelKeys(rawDetail),
          schema: inferSchema(redactValue(rawDetail)),
          parseError,
          httpStatus: detailResult.status,
        });
      }
    }
  } catch (error) {
    results.push(failedResult("receipt-detail", error));
  }

  // Offers — try configured store, then store from latest receipt
  try {
    const storeCandidates = [
      env.HOME_STORE_ID,
      firstReceiptStoreId,
    ].filter((value, index, all): value is string => {
      return Boolean(value) && all.indexOf(value) === index;
    });

    let offersOk = false;
    for (const storeId of storeCandidates) {
      for (const token of [undefined, env.JWT_TOKEN] as const) {
        const label = token ? "auth" : "no-auth";
        try {
          const rawOffers = await fetchOffersRaw(token, storeId);
          writeJson(`offers.raw.${storeId}.${label}.json`, rawOffers);
          let parseError: string | undefined;
          let sampleCount: number | undefined;
          try {
            sampleCount = parseOffersResponse(rawOffers).length;
          } catch (error) {
            parseError = error instanceof Error ? error.message : String(error);
          }
          results.push({
            name: `offers (store ${storeId}, ${label})`,
            ok: !parseError,
            topLevelKeys: topLevelKeys(rawOffers),
            schema: inferSchema(redactValue(rawOffers)),
            parseError,
            sampleCount,
            httpStatus: 200,
          });
          offersOk = true;
          break;
        } catch (error) {
          writeJson(`offers.error.${storeId}.${label}.json`, {
            message: error instanceof Error ? error.message : String(error),
          });
        }
      }
      if (offersOk) {
        break;
      }
    }
    if (!offersOk) {
      throw new Error("All offer store candidates failed");
    }
  } catch (error) {
    results.push(failedResult("offers", error));
  }

  // Okta refresh (optional — mutates session)
  if (tryRefresh) {
    try {
      await rateLimit();
      const response = await fetch(OKTA_REFRESH_URL, {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
        },
        body: JSON.stringify({}),
      });
      const rawRefresh = await response.json();
      writeJson("okta-refresh.raw.json", rawRefresh);
      let parseError: string | undefined;
      try {
        oktaRefreshResponseSchema.parse(rawRefresh);
      } catch (error) {
        parseError = error instanceof Error ? error.message : String(error);
      }
      results.push({
        name: "okta-refresh",
        ok: response.ok && !parseError,
        topLevelKeys: topLevelKeys(rawRefresh),
        schema: inferSchema(redactValue(rawRefresh)),
        parseError: parseError ?? (response.ok ? undefined : `HTTP ${response.status}`),
      });
    } catch (error) {
      results.push(failedResult("okta-refresh", error));
    }
  }

  writeJson("probe-results.json", results);
  writeFindings(results, tryRefresh);

  console.log("\nProbe summary:");
  for (const result of results) {
    const status = result.ok ? "OK" : "FAIL";
    const extra = result.sampleCount !== undefined ? ` (${result.sampleCount} items)` : "";
    const err = result.parseError ? ` — ${result.parseError}` : "";
    console.log(`  [${status}] ${result.name}${extra}${err}`);
    console.log(`         top-level keys: ${result.topLevelKeys.join(", ")}`);
  }
  console.log(`\nRedacted samples written to ${outDir}`);
}

function failedResult(name: string, error: unknown): ProbeResult {
  return {
    name,
    ok: false,
    topLevelKeys: [],
    schema: { type: "unknown" },
    parseError: error instanceof Error ? error.message : String(error),
  };
}

function writeJson(filename: string, value: unknown): void {
  writeFileSync(
    resolve(outDir, filename),
    `${JSON.stringify(redactValue(value), null, 2)}\n`,
    "utf8",
  );
}

async function fetchInstoreRaw(
  env: ReturnType<typeof parseIngestionEnv>,
  body: Record<string, unknown>,
): Promise<{ ok: true; status: number; body: unknown } | { ok: false; status: number; body: unknown }> {
  await rateLimit();
  const response = await fetch(SAFEWAY_INSTORE_API_URL, {
    method: "POST",
    headers: instoreRequestHeaders(env.JWT_TOKEN),
    body: JSON.stringify(body),
  });

  const bodyText = await response.text();
  let parsed: unknown = bodyText;
  try {
    parsed = JSON.parse(bodyText);
  } catch {
    parsed = { rawText: bodyText.slice(0, 500) };
  }

  if (!response.ok) {
    return { ok: false, status: response.status, body: parsed };
  }
  return { ok: true, status: response.status, body: parsed };
}

async function fetchOffersRaw(
  token: string | undefined,
  storeId: string,
): Promise<unknown> {
  await rateLimit();
  const url = new URL(SAFEWAY_OFFERS_BASE_URL);
  url.searchParams.set("storeId", storeId);
  const response = await fetch(url, {
    headers: offersRequestHeaders(token),
  });
  const bodyText = await response.text();
  let parsed: unknown = bodyText;
  try {
    parsed = JSON.parse(bodyText);
  } catch {
    parsed = { rawText: bodyText.slice(0, 500) };
  }
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${bodyText.slice(0, 300)}`);
  }
  return parsed;
}

function writeFindings(results: ProbeResult[], triedRefresh: boolean): void {
  const lines = [
    "# API discovery findings",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "Redacted raw samples are in this directory (`*.raw.json`). Never commit unredacted HAR captures.",
    "",
    "## Summary",
    "",
    "| Endpoint | Status | Top-level keys | Parse | Count |",
    "|----------|--------|----------------|-------|-------|",
  ];

  for (const result of results) {
    lines.push(
      `| ${result.name} | ${result.ok ? "ok" : "fail"} | ${result.topLevelKeys.join(", ") || "—"} | ${result.parseError ?? "ok"} | ${result.sampleCount ?? "—"} |`,
    );
  }

  lines.push(
    "",
    "## Next steps",
    "",
    "- Tighten Zod schemas in `@safeway-analytics/shared` based on `*.raw.json` shapes",
    "- Update `SafewayClient` unwrap keys if responses are nested differently",
    triedRefresh
      ? "- Confirm which Okta refresh field contains the new JWT"
      : "- Re-run with `pnpm probe -- --refresh` to capture Okta refresh shape (optional)",
    "",
  );

  writeFileSync(resolve(outDir, "FINDINGS.md"), `${lines.join("\n")}\n`, "utf8");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
