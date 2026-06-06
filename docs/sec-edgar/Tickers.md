# SEC EDGAR — Ticker → CIK Lookup

- **Service**: Static JSON file mapping every public-company ticker to its CIK (Central Index Key) and registered name. This is the canonical starting point for "I know the ticker, give me filings".
- **URL**: `https://www.sec.gov/files/company_tickers.json`
- **Auth**: `User-Agent` header (required, no key).
- **Update cadence**: refreshed by the SEC nightly.

## Tested on
2026-06-05 — `PASS` in ~400 ms. 10,405 companies listed.

## Endpoint

```text
GET https://www.sec.gov/files/company_tickers.json
Headers: User-Agent: "YourOrg YourApp you@example.com"
```

## Shape

The response is *not* an array — it's an object keyed by sequential index strings (`"0"`, `"1"`, …). Each value is `{cik_str, ticker, title}`:

```json
{
  "0":   { "cik_str": 320193, "ticker": "AAPL", "title": "Apple Inc." },
  "1":   { "cik_str": 789019, "ticker": "MSFT", "title": "MICROSOFT CORP" },
  "2":   { "cik_str": 1318605, "ticker": "TSLA", "title": "Tesla, Inc." },
  ...
}
```

To work with it as an array, call `Object.values(body)`.

## Sample request (Node.js)

```js
const UA = 'my-app me@example.com';
const res = await fetch('https://www.sec.gov/files/company_tickers.json', {
  headers: { 'User-Agent': UA }
});
const map = Object.values(await res.json());
const byTicker = Object.fromEntries(map.map(r => [r.ticker, r]));

console.log(byTicker.AAPL);
// { cik_str: 320193, ticker: 'AAPL', title: 'Apple Inc.' }
```

## Related files (not tested here)

| File | Purpose |
|---|---|
| `https://www.sec.gov/files/company_tickers_exchange.json` | Same data + the listing exchange (NYSE, Nasdaq) |
| `https://www.sec.gov/files/company_tickers_mf.json` | Mutual-fund ticker → series CIK mapping |

## Gotchas

- **`cik_str` is a NUMBER** in this file, not a string. The submissions/XBRL endpoints need it **zero-padded to 10 chars** (`'0000320193'`). Always cast and pad before constructing those URLs.
- **One company can have multiple tickers** (Alphabet GOOG + GOOGL share a CIK, but only one is in this file at a time). If you need every traded share class, use `company_tickers_exchange.json`.
- **No User-Agent → 403.** Same as the rest of EDGAR.
- The file refreshes nightly, so cache for 24 h is safe.

## Test file

`tests/sec-edgar/tickers.js`
