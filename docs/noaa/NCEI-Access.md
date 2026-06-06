# NOAA NCEI — Access Data Service API

- **Service**: NCEI (National Centers for Environmental Information) Access Data Service — programmatic, parameterized retrieval/subset of NCEI datasets.
- **Homepage**: <https://www.ncei.noaa.gov/support/access-data-service-api-user-documentation>
- **Base URL**: `https://www.ncei.noaa.gov/access/services/data/v1`
- **Auth**: **None.** Public endpoint, no key, no header required.
- **Cost**: Free.
- **Rate limits**: No published per-key quota; NCEI asks for reasonable use. Responses can be **large and slow** — restrict columns (`dataTypes=`) and date range.

## Tested on
2026-06-05 — `PASS` in ~4.8 s (the service is genuinely slow even for small queries).

## What you can query

The same v1 endpoint serves many datasets, selected via `dataset=`:

| `dataset` value | What it is |
|---|---|
| `daily-summaries` | GHCN-Daily (TMAX, TMIN, PRCP, SNOW, …) — most common pick |
| `global-summary-of-the-month` (`gsom`) | Monthly aggregates |
| `global-summary-of-the-year` (`gsoy`) | Yearly aggregates |
| `global-marine` | Marine ICOADS observations |
| `local-climatological-data` | NWS hourly LCD |
| `global-hourly` (ISD) | Integrated Surface Database — hourly worldwide |
| `normals-daily` / `normals-monthly` / `normals-annualseasonal` | 1991–2020 climate normals |

## Required parameters

| Param | Notes |
|---|---|
| `dataset` | one of the above |
| `stations` | comma-separated GHCN/USAF/WBAN station IDs |
| `startDate` / `endDate` | `YYYY-MM-DD` (ISO 8601) |

## Useful optional parameters

| Param | Notes |
|---|---|
| `dataTypes` | restrict columns (e.g. `TMAX,TMIN,PRCP`) — STRONGLY recommended |
| `format` | `json`, `csv`, `pdf`, `netcdf`, `ssv` |
| `units` | `metric` or `standard` |
| `boundingBox` | `north,west,south,east` lat/lon — alternative to `stations` |
| `includeAttributes` | include QC flags |
| `includeStationName` / `includeStationLocation` | enrich each row |

## Endpoint tested

```text
GET /access/services/data/v1
    ?dataset=daily-summaries
    &stations=USW00094728            # Central Park, NY
    &startDate=2024-01-01
    &endDate=2024-01-07
    &dataTypes=TMAX,TMIN,PRCP
    &format=json
    &units=metric
```

## Sample request (Node.js)

```js
const params = new URLSearchParams({
  dataset: 'daily-summaries',
  stations: 'USW00094728',
  startDate: '2024-01-01',
  endDate: '2024-01-07',
  dataTypes: 'TMAX,TMIN,PRCP',
  format: 'json',
  units: 'metric',
});
const res = await fetch(
  `https://www.ncei.noaa.gov/access/services/data/v1?${params}`
);
const rows = await res.json();
console.log(rows[0]);
// { DATE: '2024-01-01', STATION: 'USW00094728',
//   TMAX: '8.3', TMIN: '1.7', PRCP: '0.8' }
```

## Sample response (truncated)

```json
[
  { "DATE": "2024-01-01", "STATION": "USW00094728", "TMAX": "8.3", "TMIN": "1.7", "PRCP": "0.8" },
  { "DATE": "2024-01-02", "STATION": "USW00094728", "TMAX": "7.2", "TMIN": "3.3", "PRCP": "0.0" },
  ...
]
```

## Gotchas

- **Slow.** Even a 7-day, 3-column query takes ~5 seconds in our test — assume seconds, not ms.
- **Numeric values are returned as strings.** Convert on the client (`parseFloat(row.TMAX)`).
- **Always pass `dataTypes`.** Omitting it returns *every* available element for the station and bloats responses.
- **Station ID format matters.** For `daily-summaries` use the GHCN ID *without* the `GHCND:` prefix (`USW00094728`, not `GHCND:USW00094728`).
- **No streaming.** The whole response is buffered server-side; large queries can 504. Chunk by year/month.
- This API does NOT require the CDO v2 token — that's a *different* NOAA endpoint (`/cdo-web/api/v2/`).

## Test file

`tests/noaa/ncei-access.js`
