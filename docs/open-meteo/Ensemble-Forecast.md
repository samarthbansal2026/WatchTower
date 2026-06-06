# Open-Meteo Ensemble Forecast — probabilistic short-range forecasts, 15+ models

- **Service**: Ensemble weather forecasts with individual member access from DWD ICON, ECMWF IFS/AIFS, GFS ENS, GEM, etc.
- **Homepage**: https://open-meteo.com/en/docs/ensemble-api
- **Base URL**: `https://ensemble-api.open-meteo.com/v1/ensemble`
- **Auth**: None (non-commercial free)
- **Cost**: Free tier
- **Rate limits**: Shared Open-Meteo limits

## Tested on
2026-06-06 — `PASS` in ~797ms. ICON Seamless: 40 members, 168 hourly time points.

## Endpoints

### `GET /v1/ensemble`

Required params: `latitude`, `longitude`

Key optional params:
- `hourly=` — variables (e.g. `temperature_2m,precipitation,wind_speed_10m`)
- `models=` — `icon_seamless` (40 members, 7.5 days), `gfs_seamless` (31 members, 16 days), `ecmwf_ifs04` (51 members, 15 days), etc.
- `timezone=` — IANA timezone

## Sample request (Node.js)

```js
const r = await fetch(
  'https://ensemble-api.open-meteo.com/v1/ensemble' +
  '?latitude=37.7749&longitude=-122.4194' +
  '&hourly=temperature_2m,precipitation' +
  '&models=icon_seamless&timezone=America/Los_Angeles'
);
const data = await r.json();
```

## Sample response (truncated)

```json
{
  "hourly": {
    "time": ["2026-06-06T00:00", "…"],
    "temperature_2m": [11.8, 11.7, "…"],
    "temperature_2m_member01": [11.6, 11.5, "…"],
    "temperature_2m_member02": [12.0, 11.9, "…"],
    "…": "40 member columns total for ICON"
  }
}
```

## Gotchas
- Member columns are named `temperature_2m_member01` … `temperature_2m_memberNN` (2-digit zero-padded). The bare `temperature_2m` is the ensemble mean/control member.
- Number of members varies by model: ICON=40, GFS=31, ECMWF IFS=51.
- ICON Seamless only goes 7.5 days; use `gfs_seamless` or `ecmwf_ifs04` for 15–16 days.
- Response size is large when requesting many variables × many members — scope requests tightly.

## Test file
`tests/open-meteo/ensemble.js`
