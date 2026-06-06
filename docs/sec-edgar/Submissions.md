# SEC EDGAR — Submissions API

- **Service**: Full filing history + identity metadata for a single company, identified by CIK. Updated within ~1 second of a new filing being accepted.
- **Base URL**: `https://data.sec.gov/submissions`
- **Auth**: `User-Agent` header (required, no key).

## Tested on
2026-06-05 — `PASS` in ~2.7 s. Apple's submissions returned 1,000 recent filings; latest 10-K filed 2025-10-31.

## Endpoint

```text
GET https://data.sec.gov/submissions/CIK{10-digit-zero-padded}.json
```

Example: Apple (CIK 320193) → `CIK0000320193.json`.

## Response shape

```json
{
  "cik": "0000320193",
  "name": "Apple Inc.",
  "tickers": ["AAPL"],
  "exchanges": ["Nasdaq"],
  "sic": "3571",
  "sicDescription": "Electronic Computers",
  "ein": "942404110",
  "formerNames": [...],
  "addresses": { "mailing": {...}, "business": {...} },
  "filings": {
    "recent": {
      "accessionNumber": ["0001140361-26-023363", "0001140361-26-023362", ...],
      "filingDate":      ["2026-05-29",          "2026-05-29",          ...],
      "form":            ["4",                   "4",                   ...],
      "primaryDocument": ["xslF345X05/...xml",   "xslF345X05/...xml",   ...],
      "isXBRL":          [0, 0, ...],
      ...
    },
    "files": [
      { "name": "CIK0000320193-submissions-001.json", "filingCount": 250, ... }
    ]
  }
}
```

**`filings.recent` is column-oriented**: each field is a parallel array. `recent.form[i]` aligns with `recent.filingDate[i]`, `recent.accessionNumber[i]`, etc. **Iterate by index.**

`filings.recent` is capped at the **most recent 1,000 filings.** Anything older lives in the **paginated shard files** listed under `filings.files[]`. Each shard is a separate JSON file at `https://data.sec.gov/submissions/{name}`.

## Sample request (Node.js)

```js
const UA = 'my-app me@example.com';
const cik = String(320193).padStart(10, '0');  // -> '0000320193'

const res = await fetch(`https://data.sec.gov/submissions/CIK${cik}.json`, {
  headers: { 'User-Agent': UA }
});
const body = await res.json();

const r = body.filings.recent;
const tenKs = r.form.flatMap((f, i) =>
  f === '10-K' ? [{ date: r.filingDate[i], accession: r.accessionNumber[i] }] : []
);
console.log(tenKs.slice(0, 3));
```

## Resolving a filing URL

The `accessionNumber` format is `XXXXXXXXXX-YY-NNNNNN`. To get the primary document:

```
https://www.sec.gov/Archives/edgar/data/{CIK-no-padding}/{accession-no-dashes}/{primaryDocument}
```

Example: Apple's 2025 10-K accession `0000320193-25-000079`, primary `aapl-20250927.htm`:
`https://www.sec.gov/Archives/edgar/data/320193/000032019325000079/aapl-20250927.htm`

## Gotchas

- **CIK must be 10-digit zero-padded** in the URL — `CIK320193.json` → 404.
- **Column-oriented `recent`** trips up code that expects `recent.map(f => f.form)`. There is no per-filing object; you build it yourself.
- **1,000-row cap.** For history-spanning queries (anything > 1k filings; common for big issuers), traverse `filings.files[]`.
- **`isXBRL` / `isInlineXBRL`** are `0` or `1`, not boolean — be ready for either.
- The `recent` arrays are sorted **newest first**.
- **Some fields are empty strings** rather than null when missing (e.g. `primaryDocDescription` for Form 4s). Defensive `?? ''`.

## Test file

`tests/sec-edgar/submissions.js`
