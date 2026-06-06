# Open-Meteo Marine Weather — wave forecasts and ocean conditions, 16-day global

- **Service**: Global marine weather forecasts: wave height/direction/period, ocean currents, SST, tides
- **Homepage**: https://open-meteo.com/en/docs/marine-weather-api
- **Base URL**: `https://marine-api.open-meteo.com/v1/marine`
- **Auth**: None (non-commercial free)
- **Cost**: Free tier
- **Rate limits**: Shared Open-Meteo limits

## Tested on
2026-06-06 — `PASS` in ~1434ms. 168 hourly points offshore San Francisco.

## Endpoints

### `GET /v1/marine`

Required params: `latitude`, `longitude`

Key optional params:
- `hourly=wave_height,wave_direction,wave_period,sea_surface_temperature,ocean_current_velocity,ocean_current_direction`
- `daily=wave_height_max,wind_wave_height_max,wave_period_max`
- `timezone=` — IANA timezone
- `forecast_days=` — 1–16 (default 7)
- `start_date` / `end_date` — for historical archive (ERA5-Ocean back to 1940)

## Sample request (Node.js)

```js
const r = await fetch(
  'https://marine-api.open-meteo.com/v1/marine' +
  '?latitude=37.75&longitude=-122.68' +
  '&hourly=wave_height,wave_direction,wave_period,sea_surface_temperature' +
  '&daily=wave_height_max,wind_wave_height_max&timezone=America/Los_Angeles'
);
const data = await r.json();
```

## Sample response (truncated)

```json
{
  "latitude": 37.75,
  "longitude": -122.68,
  "timezone": "America/Los_Angeles",
  "hourly": {
    "time": ["2026-06-06T00:00", "…"],
    "wave_height": [3.08, 3.12, "…"],
    "wave_direction": [299, 302, "…"],
    "wave_period": [8.1, 8.3, "…"],
    "sea_surface_temperature": [10.8, 10.8, "…"]
  },
  "daily": {
    "time": ["2026-06-06", "…"],
    "wave_height_max": [3.1, "…"],
    "wind_wave_height_max": [1.4, "…"]
  }
}
```

## Gotchas
- The coordinate must be over **ocean** — land points return empty arrays without an error. Test with an offshore point.
- `sea_surface_temperature` can be null close to coastlines depending on model grid coverage.
- Historical marine data uses ERA5-Ocean which has lower spatial resolution (roughly 25 km) vs. the forecast models (5 km).
- `wave_period` is mean wave period; `wave_period_max` is peak period — different variable names.

## Test file
`tests/open-meteo/marine.js`
