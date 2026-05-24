# API discovery findings

Generated: 2026-05-24T22:28:52.973Z

Redacted raw samples are in this directory (`*.raw.json`). Never commit unredacted HAR captures.

## Summary

| Endpoint | Status | Top-level keys | Parse | Count |
|----------|--------|----------------|-------|-------|
| receipt-list | ok | receipts | ok | 69 |
| receipt-detail | ok | receipts | ok | — |
| offers | fail | — | All offer store candidates failed | — |

## Next steps

- Tighten Zod schemas in `@safeway-analytics/shared` based on `*.raw.json` shapes
- Update `SafewayClient` unwrap keys if responses are nested differently
- Re-run with `pnpm probe -- --refresh` to capture Okta refresh shape (optional)

