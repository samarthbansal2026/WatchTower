# Open-Meteo Seasonal Forecast — probabilistic forecasts up to 7 months

- **Service**: Long-range seasonal forecasts from ECMWF SEAS5 (50 ensemble members)
- **Homepage**: https://open-meteo.com/en/docs/seasonal-forecast-api
- **Base URL**: `https://seasonal-api.open-meteo.com/v1/seasonal`
- **Auth**: None (non-commercial free)
- **Cost**: Free tier
- **Rate limits**: Same shared limits as other Open-Meteo APIs

## Tested on
2026-06-06 — `PASS` in ~1270ms. 183 days, 50 ensemble members.

## Endpoints

### `GET /v1/seasonal`

Required params: `latitude`, `longitude`

Key optional params:
- `daily=` — variables to request (e.g. `temperature_2m_max,precipitation_sum`)
- `six_hourly=` — 6-hourly resolution variables
- `timezone=` — IANA timezone string

Returns data from today up to ~7 months out. Each daily variable gets 50 member columns (e.g. `temperature_2m_max`, `temperature_2m_max_member01` … `temperature_2m_max_member50`) plus an ensemble mean.

## Sample request (Node.js)

```js
const r = await fetch(
  'https://seasonal-api.open-meteo.com/v1/seasonal' +
  '?latitude=37.7749&longitude=-122.4194' +
  '&daily=temperature_2m_max,precipitation_sum' +
  '&timezone=America/Los_Angeles'
);
const data = await r.json();
```

## Sample response (truncated)

```json
{
  "daily": {
    "time": ["2026-06-06", "2026-06-07", "…", "2026-12-05"],
    "temperature_2m_max": [27, 26.5, "…"],
    "temperature_2m_max_member01": [28.1, 27.0, "…"],
    "temperature_2m_max_member02": [25.6, 26.1, "…"],
    "…": "50 member columns total"
  }
}
```

## Gotchas
- The `models=ec46` parameter string is **invalid** — the API rejects it with a 400 error saying "Cannot initialize MultiDomains from invalid String value ec46." Just omit `models=` to get the default SEAS5 (50 members, 7 months).
- Units are Celsius regardless of `temperature_unit=fahrenheit` on this endpoint.
- Response can be very large (50 member × 183 days per variable) — be selective with variables.
- The `temperature_2m_max` column without a member suffix is the ensemble mean.

## Test file
`tests/open-meteo/seasonal.js`
