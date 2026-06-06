# FRED Releases — Economic Data Release Calendar

- **Service**: Federal Reserve Bank of St. Louis — FRED API
- **Homepage**: https://fred.stlouisfed.org/docs/api/fred/releases.html
- **Base URL**: `https://api.stlouisfed.org/fred`
- **Auth**: API key (query param `api_key=`)
- **Cost**: Free
- **Rate limits**: Not documented

## Tested on
2026-06-06 — `PASS` in ~2400ms (3 requests: all releases, release dates, Employment Situation detail).

## Endpoints

### `GET /fred/releases`
Get all economic data releases (325 total as of 2026).

**Params**: `api_key`, `file_type=json`, `limit`, `offset`, `sort_order`, `order_by`

**Response shape**: `{ count, releases: [{ id, name, realtime_start, realtime_end, link, notes, press_release }] }`

### `GET /fred/releases/dates`
Get upcoming release dates across all releases.

**Params**: `api_key`, `file_type=json`, `limit`, `include_release_dates_with_no_data=true`

### `GET /fred/release`
Get a specific release by ID.

**Params**: `release_id`, `api_key`, `file_type=json`

### `GET /fred/release/dates`
Get release dates for a specific release.

### `GET /fred/release/series`
Get series included in a specific release.

## Key release IDs

| ID | Release Name |
|---|---|
| 50 | Employment Situation (BLS, monthly) |
| 10 | Consumer Price Index (BLS, monthly) |
| 53 | Gross Domestic Product (BEA, quarterly) |
| 21 | H.15 Selected Interest Rates (Fed, weekly) |
| 51 | U.S. International Trade in Goods and Services |
| 454 | University of Michigan: Consumer Sentiment |

## Sample request (Node.js)

```js
// Get Employment Situation release detail
const r = await fetch(
  'https://api.stlouisfed.org/fred/release?release_id=50&api_key=YOUR_KEY&file_type=json'
);
const { releases } = await r.json();
// releases[0] = { id: 50, name: 'Employment Situation', link: 'http://www.bls.gov/ces/' }
```

## Gotchas

- **`releases/dates` default sort shows far-future dates.** Add `sort_order=asc` and filter by date range to get truly upcoming releases.
- **325 releases total** as of June 2026; paginate with `limit`/`offset` to traverse all.
- **`press_release` boolean** distinguishes data releases from secondary publications.

## Test file
`tests/fred/releases.js`
