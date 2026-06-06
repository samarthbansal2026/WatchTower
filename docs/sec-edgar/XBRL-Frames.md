# SEC EDGAR — XBRL Frames

- **Service**: One financial fact (e.g. Assets) reported by **every** filer for a single period, in one response. The opposite axis of Company Facts: instead of "all facts, one company", this is "one fact, all companies".
- **Base URL**: `https://data.sec.gov/api/xbrl/frames`
- **Auth**: `User-Agent` header (required).

## Tested on
2026-06-05 — `PASS` in ~3 s. Q4 2023 Assets frame returned **6,426 reporting entities**.

## Endpoint

```text
GET /api/xbrl/frames/{taxonomy}/{tag}/{unit}/{period}.json
```

Components:

- **taxonomy** — `us-gaap`, `dei`, `ifrs-full`
- **tag** — concept name, e.g. `Assets`, `Revenues`, `NetIncomeLoss`
- **unit** — `USD`, `USD-per-shares`, `shares`, `pure`
- **period** — see below

### Period format

| Type | Pattern | Example | Use for |
|---|---|---|---|
| Calendar-year quarter, **instantaneous** | `CY{Y}Q{q}I` | `CY2023Q4I` | Balance-sheet items (Assets, Liabilities, CashAndCashEquivalentsAtCarryingValue) |
| Calendar-year quarter, **cumulative** | `CY{Y}Q{q}` | `CY2023Q4` | Income / cash-flow items (Revenues, NetIncomeLoss) |
| Calendar year, cumulative | `CY{Y}` | `CY2023` | Annual income/cash-flow values |

Choosing the wrong period type for the tag returns an empty `data[]` — silent, not an error. Always pick `I` for stock concepts, no `I` for flow concepts.

## Response shape

```json
{
  "taxonomy": "us-gaap",
  "tag": "Assets",
  "ccp": "CY2023Q4I",
  "uom": "USD",
  "label": "Assets",
  "description": "Sum of the carrying amounts...",
  "pts": 6426,
  "data": [
    {
      "accn": "0000037996-24-000010",
      "cik":  37996,
      "entityName": "FORD MOTOR CO",
      "loc":  "US-MI",
      "end":  "2023-12-31",
      "val":  273310000000
    },
    ...
  ]
}
```

## Sample request (Node.js)

```js
const UA = 'my-app me@example.com';
const url = 'https://data.sec.gov/api/xbrl/frames/us-gaap/Assets/USD/CY2023Q4I.json';
const j = await fetch(url, { headers: { 'User-Agent': UA } }).then(r => r.json());

const top10 = [...j.data].sort((a, b) => b.val - a.val).slice(0, 10);
console.log(`${j.tag} @ ${j.ccp}: ${j.pts} reporters`);
for (const d of top10) {
  console.log(`  $${(d.val / 1e9).toFixed(0)}B  ${d.entityName} (CIK ${d.cik})`);
}
```

Output:

```
Assets @ CY2023Q4I: 6426 reporters
  $4325B  FEDERAL NATIONAL MORTGAGE ASSOCIATION FANNIE MAE (CIK 310522)
  $3875B  JPMorgan Chase & Co (CIK 19617)
  $3281B  Federal Home Loan Mortgage Corporation (CIK 1026214)
  $3179B  BANK OF AMERICA CORP /DE/ (CIK 70858)
  ...
```

## Gotchas

- **`I` vs no-`I` is critical.** Same tag, wrong period type → empty `data[]` with no error.
- **Frame coverage trails real-time.** Q4 frames for the prior year don't fully populate until ~March (companies file 10-Ks). Pick a settled period for stable counts.
- **`val` is `Number`, not `BigInt`** — fine up to ~$9 quadrillion (Apple-scale numbers fit easily) but watch for precision if doing arithmetic across many filers.
- **Frames are deduped to one fact per entity.** If a company restated, only the most recent filing is included.
- **Small / private foreign issuers** sometimes report in IFRS taxonomy — use `/api/xbrl/frames/ifrs-full/...` for those.

## Test file

`tests/sec-edgar/xbrl-frames.js`
