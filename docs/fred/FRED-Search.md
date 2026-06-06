# FRED Search — Series Discovery by Keyword and Tag

- **Service**: Federal Reserve Bank of St. Louis — FRED API
- **Homepage**: https://fred.stlouisfed.org/docs/api/fred/series_search.html
- **Base URL**: `https://api.stlouisfed.org/fred`
- **Auth**: API key (query param `api_key=`)
- **Cost**: Free
- **Rate limits**: Not documented

## Tested on
2026-06-06 — `PASS` in ~2800ms (3 requests: keyword search, tag search, series updates).

## Endpoints

### `GET /fred/series/search`
Full-text search across all 800K+ series titles and metadata.

**Params**: `search_text` (URL-encoded, use `+` for spaces), `api_key`, `file_type=json`, `limit`, `offset`, `sort_order`, `order_by`

**Response shape**: `{ count, seriess: [...] }` — returns full series metadata per result.

"consumer price index" returns 30,412 matching series.

### `GET /fred/tags/series`
Get series matching one or more tag names (semicolon-separated for AND logic).

**Params**: `tag_names=unemployment;monthly`, `api_key`, `file_type=json`, `limit`

"unemployment;monthly" returns 11,828 series (all monthly unemployment-tagged series including state/MSA level).

### `GET /fred/tags`
Get all tags with usage counts.

### `GET /fred/series/updates`
Get series sorted by most-recently-updated. Useful for polling for new data.

**Params**: `api_key`, `file_type=json`, `limit`, `start_time`, `end_time` (e.g. `start_time=20260601000000`)

## Sample request (Node.js)

```js
// Search by keyword
const r = await fetch(
  'https://api.stlouisfed.org/fred/series/search' +
  '?search_text=unemployment+rate&api_key=YOUR_KEY&file_type=json&limit=5&sort_order=desc&order_by=popularity'
);
const { seriess } = await r.json();

// Search by tags (AND)
const r2 = await fetch(
  'https://api.stlouisfed.org/fred/tags/series' +
  '?tag_names=unemployment;monthly&api_key=YOUR_KEY&file_type=json&limit=5'
);
```

## Gotchas

- **Tag names are lowercase and slugified.** Use `fred/tags` to browse valid tag names — guessing fails silently (returns 0 results, not an error).
- **Semicolons in `tag_names` apply AND logic.** Comma would be OR (not documented clearly).
- **`search_text` returns by relevance by default.** Add `order_by=popularity` to surface canonical series first.
- **Series count is huge.** "unemployment rate" returns 30K+ series because every US county, state, and MSA has its own UNRATE series. Use tags + filters to narrow.
- **`series/updates` uses `start_time`/`end_time` in `YYYYMMDDHHmmss` format** — unusual format, not ISO 8601.

## Test file
`tests/fred/search.js`
