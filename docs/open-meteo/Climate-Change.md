# Open-Meteo Climate Change — CMIP6 projections at 10 km resolution (1950–2050)

- **Service**: High-resolution regional climate projections from seven CMIP6 HighResMIP models
- **Homepage**: https://open-meteo.com/en/docs/climate-api
- **Base URL**: `https://climate-api.open-meteo.com/v1/climate`
- **Auth**: None (non-commercial free)
- **Cost**: Free tier
- **Rate limits**: Shared Open-Meteo limits

## Tested on
2026-06-06 — `PASS` in ~2441ms. EC_Earth3P_HR model, 2030 projection window.

## Endpoints

### `GET /v1/climate`

Required params: `latitude`, `longitude`, `start_date` (YYYY-MM-DD), `end_date` (YYYY-MM-DD)

The date range must be within 1950–2050.

Key optional params:
- `daily=temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,et0_fao_evapotranspiration,shortwave_radiation_sum,relative_humidity_2m_max`
- `models=` — comma-separated CMIP6 model IDs; default returns all 7 models
  - `EC_Earth3P_HR`, `FGOALS_f3_H`, `HiRAM_SIT_HR`, `MRI_AGCM3_2_S`, `EC_Earth3P_HR`, `MPI_ESM1_2_XR`, `NICAM16_8S`, `CMCC_CM2_VHR4`

## Sample request (Node.js)

```js
const r = await fetch(
  'https://climate-api.open-meteo.com/v1/climate' +
  '?latitude=37.7749&longitude=-122.4194' +
  '&start_date=2030-01-01&end_date=2030-01-07' +
  '&daily=temperature_2m_max,temperature_2m_min,precipitation_sum' +
  '&models=EC_Earth3P_HR&timezone=America/Los_Angeles'
);
const data = await r.json();
```

## Sample response (truncated)

```json
{
  "daily": {
    "time": ["2030-01-01", "2030-01-02", "…"],
    "temperature_2m_max": [15.5, 14.9, 14.8, "…"],
    "temperature_2m_min": [4.6, 5.2, 6.2, "…"],
    "precipitation_sum": [0, 0.08, 0.08, "…"]
  }
}
```

## Gotchas
- Date range is limited to **1950–2050**. Requesting outside this window returns a 400 error.
- When requesting multiple models, each model's variables appear as separate columns (e.g. `temperature_2m_max_EC_Earth3P_HR`). Requesting all 7 models at once produces a very wide response.
- These are **model projections** under SSP scenarios, not deterministic predictions — values represent one plausible future state.
- Response can be slow for large date ranges (months of daily data) — allow 30s+ timeout.
- Temperature is in Celsius — `temperature_unit=fahrenheit` does not convert on the climate endpoint.

## Test file
`tests/open-meteo/climate-change.js`
