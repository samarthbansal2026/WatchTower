# NY Fed Reference Rates — SOFR, EFFR, OBFR, TGCR, BGCR

- **Service**: Federal Reserve Bank of New York — Markets Data API
- **Homepage**: https://markets.newyorkfed.org/static/docs/markets-api.html
- **Base URL**: `https://markets.newyorkfed.org/api/rates`
- **Auth**: None — fully public, no API key or registration
- **Cost**: Free
- **Rate limits**: Not documented; CORS headers present, designed for browser/client use

## Tested on
2026-06-06 — `PASS` in ~420ms.

## Rates covered

| Type | Full Name | Description |
|---|---|---|
| SOFR | Secured Overnight Financing Rate | Benchmark repo rate replacing LIBOR |
| EFFR | Effective Federal Funds Rate | Daily target rate the Fed targets |
| OBFR | Overnight Bank Funding Rate | Blended overnight rate |
| TGCR | Tri-Party General Collateral Rate | Tri-party repo only |
| BGCR | Broad General Collateral Rate | Tri-party + GCF repos |
| SOFRAI | SOFR Averages & Index | 30/90/180-day compounded averages |

## Endpoints

### `GET /api/rates/all/latest.json`
Returns all current reference rates in a single call. **This is the only working "latest" endpoint.** Per-rate URLs (e.g. `/api/rates/sofr/last/1.json`) return HTTP 400.

**Response shape**:
```json
{
  "refRates": [
    { "effectiveDate": "YYYY-MM-DD", "type": "SOFR", "percentRate": 3.62, "volumeInBillions": 3147, ... },
    { "effectiveDate": "YYYY-MM-DD", "type": "EFFR", "percentRate": 3.62, ... },
    { "effectiveDate": "YYYY-MM-DD", "type": "SOFRAI", "average30day": 3.58967, "index": 1.24596107, ... }
  ]
}
```

### `GET /api/rates/all/{year}/{month}/{day}.json`
Historical data for a specific date. E.g. `/api/rates/all/2026/01/15.json`.

## Sample request (Node.js)

```js
const r = await fetch('https://markets.newyorkfed.org/api/rates/all/latest.json');
const { refRates } = await r.json();
const byType = Object.fromEntries(refRates.map(e => [e.type, e]));
console.log('SOFR:', byType.SOFR.percentRate, '%');  // 3.62
console.log('EFFR:', byType.EFFR.percentRate, '%');  // 3.62
```

## Sample response (2026-06-04)

```json
{
  "refRates": [
    { "effectiveDate": "2026-06-05", "type": "SOFRAI", "average30day": 3.58967, "average90day": 3.63865, "average180day": 3.68806, "index": 1.24596107, "revisionIndicator": "" },
    { "effectiveDate": "2026-06-04", "type": "EFFR", "percentRate": 3.62, "percentPercentile1": 3.60, "percentPercentile25": 3.62, "percentPercentile75": 3.63, "percentPercentile99": 3.68, "targetRateFrom": 3.50, "targetRateTo": 3.75, "volumeInBillions": 121 },
    { "effectiveDate": "2026-06-04", "type": "SOFR", "percentRate": 3.62, "percentPercentile1": 3.58, "percentPercentile25": 3.59, "percentPercentile75": 3.67, "percentPercentile99": 3.70, "volumeInBillions": 3147 }
  ]
}
```

## Gotchas

- **Per-rate last/N URLs return HTTP 400.** Only `/api/rates/all/latest.json` (combined, all rates) works for "latest". Despite examples in older docs suggesting `/sofr/last/1.json`.
- **SOFRAI has a different field structure.** It has `average30day`, `average90day`, `average180day`, `index` instead of `percentRate`. Handle as a special case.
- **EFFR includes `targetRateFrom`/`targetRateTo`** — the current FOMC target range. Very useful for policy context.
- **`refRates` is a flat array**, not keyed by type. Use `Object.fromEntries(rates.map(e => [e.type, e]))` to index by type.
- **No auth, no User-Agent required.** CORS is open; works directly from browsers.
- **Data lags by 1 business day.** "Latest" rates are typically for the previous business day (T-1).

## Test file
`tests/fred/nyfed-rates.js`
