# SEC EDGAR — XBRL Company Facts + Concept

- **Service**: Two related XBRL endpoints that surface tagged financial data for a single company.
  - **Company Facts** — every XBRL fact ever reported for one company, across every concept.
  - **Company Concept** — one specific concept (e.g. Revenues) for one company over time.
- **Base URL**: `https://data.sec.gov/api/xbrl`
- **Auth**: `User-Agent` header (required).

## Tested on
2026-06-05 — `PASS` in ~9 s. Apple's facts: 503 GAAP concepts. Concept `Revenues` returned 11 historical values (FY 2008–2018).

## Endpoints

```text
GET /api/xbrl/companyfacts/CIK{10}.json
GET /api/xbrl/companyconcept/CIK{10}/{taxonomy}/{tag}.json
```

Taxonomy is almost always `us-gaap`; less common: `dei` (Document & Entity Information, e.g. shares outstanding) and `ifrs-full` (foreign filers).

## Response shape — Company Facts

```json
{
  "cik": 320193,
  "entityName": "Apple Inc.",
  "facts": {
    "dei":     { "EntityCommonStockSharesOutstanding": {...}, ... },
    "us-gaap": {
      "Assets":             { "label": "Assets", "description": "...", "units": { "USD": [...] } },
      "AccountsPayable":    { ... },
      ...  // ~500 tags for a mature filer
    }
  }
}
```

Each tag's `units` is an object keyed by unit-of-measure (`USD`, `USD/shares`, `shares`, `pure`, etc.). Each unit-array is a list of `{ start, end, val, accn, fy, fp, form, filed, frame }` data points — one per reported period.

## Response shape — Company Concept

```json
{
  "cik": 320193,
  "taxonomy": "us-gaap",
  "tag": "Revenues",
  "label": "Revenues",
  "description": "...",
  "entityName": "Apple Inc.",
  "units": {
    "USD": [
      {
        "end": "2008-09-27",
        "val": 32479000000,
        "accn": "0001193125-08-204326",
        "fy": 2008, "fp": "FY",
        "form": "10-K",
        "filed": "2008-11-05",
        "frame": "CY2008Q3I"
      },
      ...
    ]
  }
}
```

## Sample request (Node.js)

```js
const UA = 'my-app me@example.com';
const cik = '0000320193';

// All Apple revenue, every period, in one call
const url = `https://data.sec.gov/api/xbrl/companyconcept/CIK${cik}/us-gaap/RevenueFromContractWithCustomerExcludingAssessedTax.json`;
const j = await fetch(url, { headers: { 'User-Agent': UA } }).then(r => r.json());

const rows = j.units.USD.filter(d => d.form === '10-K');
for (const d of rows) {
  console.log(`FY${d.fy}: $${(d.val / 1e9).toFixed(2)}B`);
}
```

## Gotchas

- **Tag names drift.** Apple used `Revenues` through FY 2018 then switched to `RevenueFromContractWithCustomerExcludingAssessedTax` (ASC 606 adoption). Pulling only the old tag truncates history. Common modern revenue tags:
  - `Revenues`
  - `RevenueFromContractWithCustomerExcludingAssessedTax`
  - `RevenueFromContractWithCustomerIncludingAssessedTax`
  - `SalesRevenueNet` (older)
- **Company-facts is large.** Apple's response is ~5 MB; smaller filers are < 100 KB. Use 90 s+ timeout, and cache aggressively.
- **Same `end` date can appear multiple times** with different `accn` — companies file amendments (10-K/A) that re-state the same period. Filter by `form` and `filed` if you only want originals.
- **`fp` values**: `FY` (fiscal year), `Q1`–`Q4`, `H1`/`H2` (mid-year). `Q4` is rare — most issuers use `FY` for the year-end value instead.
- **`frame` is null** for periods that don't fit a clean calendar quarter — common for Apple (Sept fiscal year end).
- **Some tags only have non-USD units.** Shares outstanding lives under `units.shares`; ratios under `units.pure`. Always inspect `Object.keys(units)`.

## Test file

`tests/sec-edgar/xbrl-company.js`
