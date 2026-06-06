# Open-Meteo Air Quality — pollutants, AQI, pollen, and UV — 5-day hourly forecast

- **Service**: Hourly air quality forecasts from CAMS European (11 km) and CAMS Global (45 km) models
- **Homepage**: https://open-meteo.com/en/docs/air-quality-api
- **Base URL**: `https://air-quality-api.open-meteo.com/v1/air-quality`
- **Auth**: None (non-commercial free)
- **Cost**: Free tier
- **Rate limits**: Shared Open-Meteo limits

## Tested on
2026-06-06 — `PASS` in ~1382ms. 120 hourly points, San Francisco.

## Endpoints

### `GET /v1/air-quality`

Required params: `latitude`, `longitude`

Key optional params:
- `hourly=pm10,pm2_5,ozone,nitrogen_dioxide,sulphur_dioxide,carbon_monoxide,us_aqi,european_aqi`
- `hourly=dust,methane,aerosol_optical_depth,uv_index,uv_index_clear_sky`
- `hourly=alder_pollen,birch_pollen,grass_pollen,mugwort_pollen,olive_pollen,ragweed_pollen` (Europe only)
- `timezone=` — IANA timezone
- `forecast_days=` — up to 5 days

## Sample request (Node.js)

```js
const r = await fetch(
  'https://air-quality-api.open-meteo.com/v1/air-quality' +
  '?latitude=37.7749&longitude=-122.4194' +
  '&hourly=pm10,pm2_5,ozone,nitrogen_dioxide,carbon_monoxide,us_aqi' +
  '&timezone=America/Los_Angeles'
);
const data = await r.json();
```

## Sample response (truncated)

```json
{
  "hourly": {
    "time": ["2026-06-06T00:00", "…"],
    "pm2_5": [5.4, 5.1, "…"],
    "pm10": [8.5, 8.1, "…"],
    "ozone": [67, 65, "…"],
    "nitrogen_dioxide": [3.5, 3.2, "…"],
    "carbon_monoxide": [110, 105, "…"],
    "us_aqi": [35, 33, "…"]
  }
}
```

## Gotchas
- Pollen variables (`birch_pollen`, `grass_pollen`, etc.) are only populated for **Europe** — other regions return nulls without an error.
- `us_aqi` and `european_aqi` are dimensionless index values (0–500 US, 0–100 EU). The raw pollutant values are in µg/m³.
- Forecast horizon is 5 days, not 16 like the weather API.
- The CAMS Global model (45 km) is used outside Europe; data is coarser outside EU coverage.
- CO (`carbon_monoxide`) values are in µg/m³, which gives high-looking numbers (e.g. 110 µg/m³ ≈ 0.1 ppm) — not a health concern.

## Test file
`tests/open-meteo/air-quality.js`
