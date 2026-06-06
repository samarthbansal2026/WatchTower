# NOAA NCEI — Climate Data Online (CDO) v2 API

- **Service**: Climate Data Online — the *original* programmatic interface to NCEI's climate data catalog (GHCND, GSOM, GSOY, NEXRAD, normals).
- **Homepage**: <https://www.ncdc.noaa.gov/cdo-web/webservices/v2>
- **Base URL**: `https://www.ncei.noaa.gov/cdo-web/api/v2`
- **Auth**: **Token, free.** Request at <https://www.ncei.noaa.gov/cdo-web/token>. Sent via the `token` HTTP header (not `Authorization: Bearer`).
- **Cost**: Free.
- **Rate limits**: **5 requests/sec, 10,000 requests/day** per token (hard limits).

## Tested on
2026-06-05 — `PASS` (all 7 endpoints) in ~28 s total (~4 s each).

> The legacy host `www.ncdc.noaa.gov/cdo-web/api/v2/...` still works identically. NOAA renamed NCDC → NCEI in 2015; both DNS names resolve to the same service. New code should use `ncei.noaa.gov`.

## CDO v2 vs NCEI Access — which to use?

| | CDO v2 (this doc) | NCEI Access |
|---|---|---|
| Auth | token required | none |
| Endpoint style | classic REST, paginated results | flat query → flat rows |
| Discoverability | `/datasets`, `/datatypes`, `/stations`, `/locations` endpoints | none — you must already know the IDs |
| Output formats | JSON only | JSON, CSV, PDF, NetCDF |
| Best for | exploring the catalog, building UIs | bulk data extraction |

If you already know your station + variables, prefer the NCEI Access API (no token, simpler). Use CDO v2 when you need to enumerate stations or data types.

## Endpoints — full matrix (all verified 2026-06-05)

| Endpoint | Status | Count | Returns |
|---|---|---:|---|
| `GET /datasets`           | ✓ PASS | 11      | Datasets (GHCND, GSOM, GSOY, NEXRAD2, NEXRAD3, NORMAL_*) |
| `GET /datacategories`     | ✓ PASS | 42      | High-level categories (temperature, precipitation, …) |
| `GET /datatypes`          | ✓ PASS | 1,566   | Element codes (TMAX, TMIN, PRCP, …) |
| `GET /locationcategories` | ✓ PASS | 12      | CITY, STATE, COUNTRY, CLIM_REG, … |
| `GET /locations`          | ✓ PASS | 38,862  | Locations under a category |
| `GET /stations`           | ✓ PASS | 156,903 | Station catalog (filter by `locationid`, `datasetid`, `extent=` bbox) |
| `GET /data`               | ✓ PASS | varies  | The actual observations |

Every endpoint also accepts an `{id}` path suffix to fetch a single record (e.g. `/datasets/GHCND`, `/stations/GHCND:USW00094728`).

## Required parameters for `/data`

| Param | Notes |
|---|---|
| `datasetid` | e.g. `GHCND` (Daily) |
| `startdate` | `YYYY-MM-DD` |
| `enddate` | `YYYY-MM-DD` |

Strongly recommended:

| Param | Notes |
|---|---|
| `stationid` | e.g. `GHCND:USW00094728` — note the `GHCND:` prefix (different from NCEI Access) |
| `datatypeid` | `TMAX,TMIN,PRCP` — without this you get every element |
| `units` | `metric` or `standard` |
| `limit` | up to 1000, default 25 |
| `offset` | for pagination |

## Endpoint exercised by `tests/noaa/cdo.js`

The test hits **all 7** endpoints in one run. The only one with non-trivial query params:

```text
GET /cdo-web/api/v2/data?datasetid=GHCND
    &stationid=GHCND:USW00094728
    &startdate=2024-01-01&enddate=2024-01-02
    &datatypeid=TMAX&limit=1
Header: token: <YOUR_TOKEN>
```

The other 6 are smoke-tested with `?limit=1`.

## Sample request (Node.js)

```js
const headers = { token: process.env.NCEI_CDO_TOKEN };

const url = 'https://www.ncei.noaa.gov/cdo-web/api/v2/data'
  + '?datasetid=GHCND'
  + '&stationid=GHCND:USW00094728'
  + '&startdate=2024-01-01&enddate=2024-01-02'
  + '&datatypeid=TMAX,TMIN,PRCP&units=metric&limit=10';

const { results } = await fetch(url, { headers }).then(r => r.json());
console.log(results[0]);
// { date: '2024-01-01T00:00:00', datatype: 'PRCP',
//   station: 'GHCND:USW00094728', value: 0.8, attributes: ',,W,2400' }
```

## Sample response

```json
{
  "metadata": {
    "resultset": { "offset": 1, "count": 6, "limit": 10 }
  },
  "results": [
    { "date": "2024-01-01T00:00:00", "datatype": "PRCP", "station": "GHCND:USW00094728", "value": 0.8, "attributes": ",,W,2400" },
    { "date": "2024-01-01T00:00:00", "datatype": "TMAX", "station": "GHCND:USW00094728", "value": 8.3, "attributes": ",,W,2400" },
    { "date": "2024-01-01T00:00:00", "datatype": "TMIN", "station": "GHCND:USW00094728", "value": 1.7, "attributes": ",,W,2400" }
  ]
}
```

## Gotchas

- **Header is `token`**, not `Authorization`. Sending `Bearer ...` returns 200 with an empty `results` array (silent failure).
- **Station IDs are namespaced** in CDO (`GHCND:USW00094728`) but bare in NCEI Access (`USW00094728`). Easy to confuse.
- **Rows are long-format**: one row per (date × datatype × station). Pivot client-side if you want a wide table.
- **5 req/s burst limit.** Add a 200 ms gap or you'll get `429`.
- **Empty `results` ≠ HTTP 4xx.** Always check `metadata.resultset.count > 0`.
- **Slow.** `/data` calls regularly take 5–10 s even for tiny ranges.

## Token storage

Lives in `.env` as `NCEI_CDO_TOKEN=...`. `.env` is in `.gitignore`.

## Test file

`tests/noaa/cdo.js`
