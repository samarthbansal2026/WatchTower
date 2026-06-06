# FRED Sources — Contributing Data Providers

- **Service**: Federal Reserve Bank of St. Louis — FRED API
- **Homepage**: https://fred.stlouisfed.org/docs/api/fred/sources.html
- **Base URL**: `https://api.stlouisfed.org/fred`
- **Auth**: API key (query param `api_key=`)
- **Cost**: Free
- **Rate limits**: Not documented

## Tested on
2026-06-06 — `PASS` in ~3700ms (3 requests: all sources, Fed source detail, Fed releases).

## Endpoints

### `GET /fred/sources`
Get all data sources contributing to FRED (120 total as of 2026).

**Params**: `api_key`, `file_type=json`, `limit`, `sort_order`

**Response shape**: `{ sources: [{ id, name, realtime_start, realtime_end, link }] }`

### `GET /fred/source`
Get detail for a single source.

**Params**: `source_id`, `api_key`, `file_type=json`

### `GET /fred/source/releases`
Get all releases attributed to a source.

**Params**: `source_id`, `api_key`, `file_type=json`, `limit`

## Key source IDs

| ID | Source |
|---|---|
| 1 | Board of Governors of the Federal Reserve System |
| 3 | Federal Reserve Bank of Philadelphia |
| 4 | Federal Reserve Bank of St. Louis |
| 6 | Federal Financial Institutions Examination Council |
| 22 | U.S. Bureau of Labor Statistics |
| 11 | U.S. Bureau of Economic Analysis |
| 19 | U.S. Bureau of the Census |

## Sample request (Node.js)

```js
// All sources
const r = await fetch(
  'https://api.stlouisfed.org/fred/sources?api_key=YOUR_KEY&file_type=json'
);
const { sources } = await r.json();
// sources.length === 120

// All releases from BLS (source_id=22)
const r2 = await fetch(
  'https://api.stlouisfed.org/fred/source/releases?source_id=22&api_key=YOUR_KEY&file_type=json'
);
```

## Gotchas

- **Source id=1 is Federal Reserve Board of Governors**, not BLS. BLS is source_id=22. Easy to confuse since the Fed is the top of the list.
- **120 sources** as of June 2026 (FRED documentation says "118+" — count grows as new sources are added).

## Test file
`tests/fred/sources.js`
