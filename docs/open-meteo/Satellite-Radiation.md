# Open-Meteo Satellite Radiation — real-time solar irradiance from geostationary satellites

- **Service**: Solar radiation variables derived from geostationary satellite imagery (EUMETSAT MTG for Europe/Africa; Himawari-9 for Asia/Australia)
- **Homepage**: https://open-meteo.com/en/docs
- **Base URL**: `https://api.open-meteo.com/v1/forecast` (same main endpoint)
- **Auth**: None (non-commercial free)
- **Cost**: Free tier
- **Rate limits**: Shared Open-Meteo limits

## Tested on
2026-06-06 — `PASS` in ~647ms. Frankfurt, Germany (EUMETSAT coverage).

## Endpoints

The radiation variables are exposed through the standard `/v1/forecast` endpoint — no separate base URL needed.

### `GET /v1/forecast` with radiation hourly variables

Key radiation variables:
- `shortwave_radiation` — total global horizontal irradiance (GHI), W/m²
- `direct_radiation` — beam/direct radiation on horizontal surface, W/m²
- `diffuse_radiation` — diffuse component, W/m²
- `direct_normal_irradiance` — DNI (perpendicular to sun), W/m²
- `global_tilted_irradiance` — GTI at a given tilt/azimuth (requires `tilt=` and `azimuth=` params)
- `shortwave_radiation_instant` — instantaneous values (vs. hourly mean)

Daily radiation variables:
- `sunrise`, `sunset`, `daylight_duration`, `sunshine_duration`

## Sample request (Node.js)

```js
const r = await fetch(
  'https://api.open-meteo.com/v1/forecast' +
  '?latitude=50.1109&longitude=8.6821' +
  '&hourly=direct_radiation,diffuse_radiation,direct_normal_irradiance,shortwave_radiation' +
  '&timezone=Europe/Berlin'
);
const data = await r.json();
```

## Sample response (truncated)

```json
{
  "hourly": {
    "time": ["2026-06-06T00:00", "…", "2026-06-06T06:00", "…"],
    "shortwave_radiation": [0, 0, 7, "…"],
    "direct_radiation": [0, 0, 0, "…"],
    "diffuse_radiation": [0, 0, 7, "…"],
    "direct_normal_irradiance": [0, 0, 0, "…"]
  }
}
```

## Gotchas
- NASA GOES (North America) satellite integration is **not yet available** as of June 2026 — for US locations, radiation variables fall back to model-derived values rather than live satellite data.
- Nighttime hours return 0, not null — filter by `shortwave_radiation > 0` to find daytime values.
- `direct_radiation` can be 0 even when `shortwave_radiation > 0` at sunrise/sunset (sun below direct horizon but diffuse light present).
- `direct_normal_irradiance` (DNI) uses `direct_radiation / sin(solar_elevation)` — it can be very high or unstable at low solar angles.
- For PV panel simulation, use `global_tilted_irradiance` with `tilt=` (degrees from horizontal) and `azimuth=` (degrees from south; 0=south, -90=east, 90=west).

## Test file
`tests/open-meteo/satellite-radiation.js`
