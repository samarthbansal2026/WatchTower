# NOAA Aviation Weather Center — Data API

- **Service**: Aviation Weather Center (AWC) — METARs, TAFs, AIRMETs, SIGMETs, PIREPs, station info.
- **Homepage**: <https://aviationweather.gov/data/api/>
- **Base URL**: `https://aviationweather.gov/api/data`
- **Auth**: **None.** Public.
- **Cost**: Free.
- **Rate limits**: Unpublished but enforced — frequent or batch requests get throttled. The doc explicitly asks consumers to cache.
- **Data window**: Most products are available for the **last 15 days** only.

## Tested on
2026-06-05 — `PASS` in ~14.7 s. The API is unusually slow — assume tens of seconds, not ms, for tens of stations.

## Endpoints

All under `https://aviationweather.gov/api/data/`:

| Path | Returns |
|---|---|
| `/metar` | METARs (surface observations) |
| `/taf` | Terminal Aerodrome Forecasts |
| `/pirep` | Pilot reports |
| `/airsigmet` | AIRMETs + SIGMETs |
| `/gairmet` | Graphical AIRMETs |
| `/cwa` | Center Weather Advisories |
| `/stationinfo` | Station metadata (lat/lon, elev) |
| `/dataserver` | Legacy text data server (XML) |

## Common parameters

| Param | Notes |
|---|---|
| `ids` | comma-separated 4-letter ICAO IDs (e.g. `KJFK,KMCI`) |
| `bbox` | `lat0,lon0,lat1,lon1` — alt to `ids` |
| `format` | `json`, `xml`, `geojson`, `raw`, `decoded` |
| `hours` | look-back window in hours (default varies per endpoint) |
| `date` | ISO timestamp — pin to a specific time |
| `taf` | `true` to bundle TAF into the METAR response |

## Endpoint tested

```text
GET /api/data/metar?ids=KMCI,KJFK&format=json&hours=1
```

## Sample request (Node.js)

```js
const url = 'https://aviationweather.gov/api/data/metar?ids=KMCI,KJFK&format=json&hours=1';
const res = await fetch(url);
const reports = await res.json();
console.log(reports[0].rawOb);
// "METAR KMCI 042153Z 18013KT 10SM SCT044 BKN070 BKN200 28/20 A2990 RMK AO2 SLP116"
```

## Sample response (truncated)

```json
[
  {
    "icaoId": "KMCI",
    "obsTime": 1780609980,
    "reportTime": "2026-06-04T21:53:00Z",
    "temp": 28,
    "dewp": 20,
    "wdir": 180,
    "wspd": 13,
    "visib": "10+",
    "altim": 1012.5,
    "rawOb": "METAR KMCI 042153Z 18013KT 10SM SCT044 BKN070 BKN200 28/20 A2990 RMK AO2 SLP116",
    "clouds": [{ "cover": "SCT", "base": 4400 }, ...]
  }
]
```

## Gotchas

- **Slow.** Two-station METAR call took ~14 s in our test. Cache aggressively; expect tens of seconds for larger queries.
- **2025 redesign.** Some legacy field names changed in Sep 2025 and TAF CSV was discontinued — see the "what's new" page.
- **15-day rolling window.** Historical METAR/TAF beyond 2 weeks lives in NCEI's ISD (use the NCEI Access API), not here.
- **`obsTime` is Unix epoch seconds**, not a string.
- **ICAO IDs only.** Bare IATA (`JFK`) won't match — use `KJFK`.

## Test file

`tests/noaa/aviation.js`
