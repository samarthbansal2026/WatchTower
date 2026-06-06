# US DOT — WZDx Feed Registry

- **Service**: National directory of all active US state Work Zone Data Exchange (WZDx) feeds. Hosted by USDOT on the federal open-data Socrata portal.
- **Homepage**: <https://data.transportation.gov/d/69qe-yiui>
- **Base URL**: `https://data.transportation.gov/resource/69qe-yiui.json`
- **Auth**: **None.** Socrata's `X-App-Token` header is optional and only raises the per-IP rate limit; unauthenticated callers get ~1k req/day per IP.
- **Cost**: Free.
- **Spec**: Work Zone Data Exchange (WZDx) — JSON-Schema published by USDOT/FHWA at <https://github.com/usdot-jpo-ode/wzdx>.

## Tested on
2026-06-05 — `PASS` in ~1.8 s.

## What you get back

Each row of the response is **one registered state WZDx feed**. The key fields:

| Field | Meaning |
|---|---|
| `state` | US state name (lowercased, ad-hoc) |
| `issuingorganization` | DOT or agency operating the feed |
| `feedname` | short slug for the feed |
| `url.url` | the actual WZDx feed URL — GET this to read work zones |
| `format` | usually `geojson` |
| `version` | WZDx schema version (`3`, `4`, `4.1`, `4.2`) |
| `active` | whether the state currently intends the feed to be live |
| `needapikey` | whether the feed requires a separate key |
| `apikeyurl` | where to request that key, if needed |
| `datafeed_frequency_update` | publish cadence (`1m`, `5m`, `15m`) |
| `geocoded_column` | approx centroid of the state |

## Endpoint tested

```text
GET https://data.transportation.gov/resource/69qe-yiui.json?$limit=500
```

Returns 38–40 rows (all registered feeds). Filter client-side on `active === true` and `needapikey === false` to get the no-auth subset.

## Sample request (Node.js)

```js
const url = 'https://data.transportation.gov/resource/69qe-yiui.json?$limit=500';
const rows = await fetch(url).then(r => r.json());

const noKey = rows.filter(r => r.active && r.needapikey === false);
for (const r of noKey) {
  console.log(r.state.padEnd(15), r.url.url);
}
```

## Sample response (one row)

```json
{
  "state": "utah",
  "issuingorganization": "Utah DOT",
  "feedname": "udot",
  "url": { "url": "https://udottraffic.utah.gov/wzdx/udot/v40/data" },
  "format": "geojson",
  "active": true,
  "datafeed_frequency_update": "15m",
  "version": "4",
  "sdate": "2022-07-15T12:00:00.000",
  "needapikey": false,
  "geocoded_column": { "type": "Point", "coordinates": [-111.68, 39.32] }
}
```

## Gotchas

- **`active: true` is aspirational.** ~20% of "active" feeds returned 403/503/timeout when probed from outside the state. The registry is a directory, not a health check.
- **`state` casing is inconsistent.** "Illinois" vs "illinois" both appear in the same query — some states have multiple feeds with mixed capitalization. Normalize to lowercase before grouping.
- **`url` is a nested object** (`url.url`), not a string. Common Socrata pattern — easy to miss.
- **Socrata defaults to limit=1000** but actually caps lower per-table. Always pass `$limit` explicitly.
- The full Socrata query language (`$where`, `$select`, `$order`) works here too — e.g. `?$where=active=true AND needapikey=false`.

## Test file

`tests/dot511/wzdx-registry.js`
