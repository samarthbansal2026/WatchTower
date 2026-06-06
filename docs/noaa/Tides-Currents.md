# NOAA CO-OPS — Tides & Currents API

- **Service**: Center for Operational Oceanographic Products and Services (CO-OPS) — water level, tide predictions, currents, met, salinity.
- **Homepage**: <https://api.tidesandcurrents.noaa.gov/api/prod/>
- **Base URL**: `https://api.tidesandcurrents.noaa.gov`
- **Auth**: **None.** A short `application=<your-app-name>` query param is requested (not enforced) so CO-OPS can identify high-volume callers.
- **Cost**: Free.
- **Rate limits**: No published quota. CO-OPS caps a single request to **≤ 31 days** of 6-min or hourly data, **≤ 1 year** of monthly, **≤ 10 years** of annual.

## Tested on
2026-06-05 — `PASS` in ~2.1 s.

## Two co-located APIs

| API | Base path | Purpose |
|---|---|---|
| **Data API** | `/api/prod/datagetter` | Observations & predictions (use this for water levels, tides, currents, met) |
| **Metadata API (MDAPI)** | `/mdapi/prod/webapi/stations` | Station catalog, capabilities, sensors |

## Required parameters (Data API)

| Param | Notes |
|---|---|
| `station` | 7-digit CO-OPS station id (e.g. `8443970` = Boston) |
| `product` | What to fetch — see below |
| Date selector | one of: `date=latest` / `date=today` / `date=recent` / `range=N` (hours) / `begin_date=YYYYMMDD&end_date=YYYYMMDD` |
| `format` | `json`, `xml`, `csv` |

Strongly recommended:

| Param | Notes |
|---|---|
| `datum` | reference datum — `MLLW`, `MSL`, `NAVD`, `STND` etc. **Required for water_level / predictions.** |
| `time_zone` | `gmt`, `lst`, `lst_ldt` |
| `units` | `english` (ft) or `metric` (m) |
| `application` | identify your caller |
| `interval` | `h`, `hilo`, `6` (mins) — for predictions |

## Common `product` values

- `water_level` — observed water level (6-min)
- `predictions` — astronomical tide predictions
- `hourly_height` — hourly water level
- `high_low` — high/low tide times
- `currents` / `currents_predictions`
- `air_temperature`, `water_temperature`, `wind`, `air_pressure`, `humidity`, `salinity`
- `monthly_mean`

## Endpoint tested

```text
GET /api/prod/datagetter
    ?station=8443970          # Boston, MA
    &product=water_level
    &date=latest
    &datum=MLLW
    &time_zone=gmt
    &units=english
    &format=json
    &application=watchtower-api-tester
```

## Sample request (Node.js)

```js
const params = new URLSearchParams({
  station: '8443970',
  product: 'water_level',
  date: 'latest',
  datum: 'MLLW',
  time_zone: 'gmt',
  units: 'english',
  format: 'json',
  application: 'my-app',
});
const res = await fetch(
  `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?${params}`
);
const json = await res.json();
console.log(json.data.at(-1));
// { t: '2026-06-04 22:06', v: '5.632', s: '0.066', f: '0,0,0,0', q: 'p' }
```

## Sample response (truncated)

```json
{
  "metadata": {
    "id": "8443970",
    "name": "Boston",
    "lat": "42.3548",
    "lon": "-71.0534"
  },
  "data": [
    { "t": "2026-06-04 22:06", "v": "5.632", "s": "0.066", "f": "0,0,0,0", "q": "p" }
  ]
}
```

Field meanings:
- `t` — timestamp (in requested `time_zone`)
- `v` — value
- `s` — sigma (1-σ stdev of the 1-second samples)
- `f` — flags: `inferred,flat-tolerance,rate-of-change,T-test`
- `q` — quality: `p` preliminary, `v` verified

## Errors

Errors return HTTP 200 with a body like `{ "error": { "message": "..." } }`. Always check `body.error` before reading `body.data`.

## Gotchas

- **Errors come back as HTTP 200**, not 4xx — parse `body.error.message`.
- **`datum` is mandatory** for `water_level` / `predictions`; omitting it yields `"datum is required"`.
- **6-min data max 31 days per request** — for longer ranges, paginate by month.
- **Boston station 8443970** is reliable for smoke tests; coastal stations only — no inland lakes.
- This host also serves a **separate** metadata API at `/mdapi/prod/webapi/...` — don't mix base paths.

## Test file

`tests/noaa/tides.js`
