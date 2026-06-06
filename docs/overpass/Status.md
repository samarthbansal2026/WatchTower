# Overpass API — Status & Timestamp

- **Service**: Server health, quota, and database currency
- **Homepage**: https://overpass-api.de/
- **Base URL**: `https://overpass-api.de/api`
- **Auth**: None
- **Cost**: Free
- **Rate limits**: No stated limit for status/timestamp; these are cheap read-only endpoints

## Tested on
2026-06-06 — `PASS` in ~5000ms (two sequential calls).

## Endpoints

### `GET /api/timestamp`
Returns the UTC timestamp of the most recently applied OSM diff, as a plain-text string.

```
2026-06-05T20:21:32Z
```

### `GET /api/status`
Returns plain-text server info: connected IP hash, current time, active endpoint hostname, rate limit (concurrent slot count), and any currently running queries.

```
Connected as: 1679561676
Current time: 2026-06-05T20:23:23Z
Announced endpoint: gall.openstreetmap.de/
Rate limit: 2
```

## Sample request (Node.js)

```js
const r = await fetch('https://overpass-api.de/api/timestamp', {
  headers: { Accept: '*/*', 'User-Agent': 'myapp/1.0 (contact@example.com)' },
});
const ts = await r.text(); // "2026-06-05T20:21:32Z"
```

## Gotchas
- **HTTP 406 without User-Agent.** Both endpoints return 406 if no `User-Agent` is present. This is different from NWS (which returns 403) — just as surprising.
- **Timestamps indicate data freshness.** If `/api/timestamp` is hours old, the database is lagging behind the live OSM planet.
- **`/api/status` rate limit line.** The `Rate limit: N` line is the number of concurrent query slots you're allowed, not requests per second. Overpass queues requests when slots are full; 429 means all slots are occupied.

## Test file
`tests/overpass/status.js`
