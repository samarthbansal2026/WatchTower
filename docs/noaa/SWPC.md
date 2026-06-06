# NOAA SWPC — Space Weather Prediction Center

- **Service**: Space Weather Prediction Center — solar wind, geomagnetic activity, X-ray flux, aurora forecast, satellite environment.
- **Homepage**: <https://www.swpc.noaa.gov/content/data-access>
- **Base URL**: `https://services.swpc.noaa.gov`
- **Auth**: **None.** Public.
- **Cost**: Free.
- **Shape**: This is *not* a parameterized REST API. It is a tree of **static-ish JSON / text files** at fixed paths, updated continuously. You GET a fixed URL and get back the latest blob.
- **Rate limits**: Unpublished but CloudFront-cached, so re-fetches inside a minute are free.

## Tested on
2026-06-05 — `PASS` in ~80 ms.

## File-tree layout (the "API")

| Path prefix | What lives there |
|---|---|
| `/products/noaa-planetary-k-index.json` | Past 7 days of Kp (geomagnetic activity) |
| `/products/solar-wind/plasma-{1,2,5,7}-day.json` | DSCOVR/ACE solar wind plasma |
| `/products/solar-wind/mag-{1,2,5,7}-day.json` | Interplanetary magnetic field |
| `/products/summary/10cm-flux.json` | 10.7 cm radio flux (F10.7) |
| `/products/aurora-3-day-forecast.json` | Aurora forecast |
| `/products/alerts.json` | Active alerts/warnings |
| `/json/goes/primary/xrays-{1,3,6}-hour.json` | GOES X-ray flux |
| `/json/goes/primary/integral-protons-1-day.json` | GOES proton flux |
| `/json/dscovr_pop_1m.json` | DSCOVR ephemeris |
| `/json/planetary_k_index_1m.json` | 1-minute Kp |

A directory-style listing of all JSON files: <https://services.swpc.noaa.gov/json/>

## Endpoint tested

```text
GET https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json
```

Returns ~63 rows (8 × ~7 days) of:

```json
{ "time_tag": "2026-06-04T18:00:00", "Kp": 0.67, "a_running": 3, "station_count": 8 }
```

## Sample request (Node.js)

```js
const url = 'https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json';
const rows = await fetch(url).then(r => r.json());
const latest = rows.at(-1);
console.log(`Kp = ${latest.Kp} as of ${latest.time_tag} UTC`);
```

## Gotchas

- **No query parameters.** You can't ask for a custom window — each URL embeds the window (`-1-day`, `-7-day`, etc.). Pick the path that matches your need.
- **Response shape varies per file.** Some are arrays of objects (modern), some are CSV-style arrays of arrays where row 0 is a header (older). Inspect before trusting field access.
- **Times are UTC**, ISO 8601 *without* a `Z` suffix. Treat as UTC manually.
- **Aurora & forecast files are mixed text/JSON.** The "3-day aurora forecast" includes a free-text product alongside JSON.
- **Alerts** (`/products/alerts.json`) is the easiest way to get a feed of issued G-storm / S-storm / R-storm warnings.

## Test file

`tests/noaa/swpc.js`
