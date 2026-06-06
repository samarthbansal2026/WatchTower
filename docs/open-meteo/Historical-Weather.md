# Open-Meteo Historical Weather — ERA5 reanalysis archive back to 1940

- **Service**: Historical weather data based on ERA5 and ERA5-Land reanalysis datasets from ECMWF
- **Homepage**: https://open-meteo.com/en/docs/historical-weather-api
- **Base URL**: `https://archive-api.open-meteo.com/v1/archive`
- **Auth**: None (non-commercial free)
- **Cost**: Free up to 300k calls/month non-commercial
- **Rate limits**: Same as forecast — 600/min, 5k/hour, 10k/day

## Tested on
2026-06-06 — `PASS` in ~2403ms.

## Endpoints

### `GET /v1/archive`

Required params: `latitude`, `longitude`, `start_date` (YYYY-MM-DD), `end_date` (YYYY-MM-DD)

Key optional params:
- `hourly=` / `daily=` — same variable names as the forecast API
- `temperature_unit=fahrenheit|celsius`
- `timezone=` — IANA timezone string
- `models=era5|era5_land|cerra|…` — default era5; era5_land is higher resolution for land areas

Start date can go back to 1940-01-01.

## Sample request (Node.js)

```js
const r = await fetch(
  'https://archive-api.open-meteo.com/v1/archive' +
  '?latitude=37.7749&longitude=-122.4194' +
  '&start_date=2024-01-01&end_date=2024-01-07' +
  '&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max' +
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
  "daily": {
    "time": ["2024-01-01", "2024-01-02", "2024-01-03"],
    "temperature_2m_max": [58.1, 59.7, 56.3],
    "temperature_2m_min": [45.3, 46.7, 47.4],
    "precipitation_sum": [0, 14, 2],
    "wind_speed_10m_max": [12.1, 18.4, 14.2]
  }
}
```

## Gotchas
- The archive endpoint is on `archive-api.open-meteo.com`, not `api.open-meteo.com`. They are different hostnames.
- Large date ranges (years of hourly data) can be very slow — allow 30s+ timeout for big requests.
- ERA5 data has ~5-day delay from real-time; yesterday's data may not be available yet.
- `era5_land` has finer resolution (9 km vs 25 km) but only covers land, not oceans.

## Test file
`tests/open-meteo/historical.js`
