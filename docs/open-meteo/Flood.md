# Open-Meteo Flood — river discharge forecasts from GloFAS

- **Service**: Daily river discharge forecasts and historical data from GloFAS (Global Flood Awareness System) at 5 km resolution
- **Homepage**: https://open-meteo.com/en/docs/flood-api
- **Base URL**: `https://flood-api.open-meteo.com/v1/flood`
- **Auth**: None (non-commercial free)
- **Cost**: Free tier
- **Rate limits**: Shared Open-Meteo limits

## Tested on
2026-06-06 — `PASS` in ~2581ms. 16-day forecast, Sacramento River basin.

## Endpoints

### `GET /v1/flood`

Required params: `latitude`, `longitude`

Key optional params:
- `daily=river_discharge` — main variable; also `river_discharge_mean`, `river_discharge_median`, `river_discharge_max`, `river_discharge_min`, `river_discharge_p25`, `river_discharge_p75`
- `ensemble=true` — return all 50 GloFAS ensemble members
- `forecast_days=` — 1–210 (up to ~7 months with ensemble model)
- `start_date` / `end_date` — historical data back to 1984
- `timezone=` — IANA timezone

## Sample request (Node.js)

```js
const r = await fetch(
  'https://flood-api.open-meteo.com/v1/flood' +
  '?latitude=38.5&longitude=-121.5' +
  '&daily=river_discharge&forecast_days=16' +
  '&timezone=America/Los_Angeles'
);
const data = await r.json();
```

## Sample response (truncated)

```json
{
  "daily": {
    "time": ["2026-06-06", "2026-06-07", "…"],
    "river_discharge": [0.5, 0.5, "…"]
  }
}
```

## Gotchas
- GloFAS operates at 5 km grid resolution. Requesting a lat/lon that maps to a grid cell not on a river will return very low/null values with no error. Use known river basin coordinates.
- The Sacramento River basin in summer (June) has very low discharge (0.5 m³/s) due to irrigation withdrawals upstream — this is expected, not a data issue.
- Historical data starts 1984-01-01 (not 1940 like the weather archive).
- `ensemble=true` returns 50 member columns similar to the seasonal API naming convention.
- The `river_discharge_p25/p75` percentile variables require `ensemble=true`.

## Test file
`tests/open-meteo/flood.js`
