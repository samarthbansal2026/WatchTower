# Open-Meteo Weather Forecast — 16-day global forecast, hourly + daily

- **Service**: Global weather forecasts powered by 15+ NWS models (GFS, ICON, ECMWF, etc.)
- **Homepage**: https://open-meteo.com/en/docs
- **Base URL**: `https://api.open-meteo.com/v1/forecast`
- **Auth**: None (free for non-commercial; commercial use requires paid API key)
- **Cost**: Free up to 300k calls/month non-commercial; paid plans from ~$3/month
- **Rate limits**: 600 req/min, 5k/hour, 10k/day (free tier)

## Tested on
2026-06-06 — `PASS` in ~1224ms.

## Endpoints

### `GET /v1/forecast`

Required params: `latitude`, `longitude`

Key optional params:
- `hourly=` — comma-separated hourly variables (e.g. `temperature_2m,precipitation,wind_speed_10m`)
- `daily=` — comma-separated daily variables (e.g. `temperature_2m_max,precipitation_sum`)
- `temperature_unit=fahrenheit|celsius` (default: celsius)
- `timezone=` — IANA timezone string (e.g. `America/Los_Angeles`); default UTC
- `forecast_days=` — 1–16 (default 7)
- `models=` — specific NWS model to use; default is best_match

## Sample request (Node.js)

```js
const r = await fetch(
  'https://api.open-meteo.com/v1/forecast' +
  '?latitude=37.7749&longitude=-122.4194' +
  '&hourly=temperature_2m,precipitation,weather_code' +
  '&daily=temperature_2m_max,temperature_2m_min,precipitation_sum' +
  '&temperature_unit=fahrenheit&timezone=America/Los_Angeles'
);
const data = await r.json();
```

## Sample response (truncated)

```json
{
  "latitude": 37.775,
  "longitude": -122.419,
  "timezone": "America/Los_Angeles",
  "hourly": {
    "time": ["2026-06-06T00:00", "2026-06-06T01:00", "…"],
    "temperature_2m": [54.1, 53.8, "…"],
    "precipitation": [0, 0, "…"],
    "weather_code": [3, 2, "…"]
  },
  "daily": {
    "time": ["2026-06-06", "…"],
    "temperature_2m_max": [67.9, "…"],
    "temperature_2m_min": [50.9, "…"],
    "precipitation_sum": [0.0, "…"]
  }
}
```

## Gotchas
- Default forecast is only 7 days; you must pass `forecast_days=16` to get the full range.
- Without `timezone=` all times are in UTC.
- `weather_code` uses WMO Weather interpretation codes (0=clear, 3=overcast, 61=rain, etc.) — the docs include a full table.
- The `hourly` arrays always have `forecast_days × 24` entries.
- No `User-Agent` required (unlike NWS / Overpass).

## Test file
`tests/open-meteo/forecast.js`
