# Open-Meteo API Index

Open-Meteo is a free, open-source weather API aggregating 15+ national weather service models. No API key required for non-commercial use. Rate limits: 600 req/min, 5k/hour, 10k/day, 300k/month.

| API | Base URL | Auth | Forecast Horizon | Test File | Doc | Status |
|-----|----------|------|-----------------|-----------|-----|--------|
| Weather Forecast | `api.open-meteo.com/v1/forecast` | None | 16 days | `tests/open-meteo/forecast.js` | [Weather-Forecast.md](Weather-Forecast.md) | ✓ PASS ~1.2s |
| Historical Weather | `archive-api.open-meteo.com/v1/archive` | None | 1940–present | `tests/open-meteo/historical.js` | [Historical-Weather.md](Historical-Weather.md) | ✓ PASS ~2.4s |
| Seasonal Forecast | `seasonal-api.open-meteo.com/v1/seasonal` | None | 7 months (50 members) | `tests/open-meteo/seasonal.js` | [Seasonal-Forecast.md](Seasonal-Forecast.md) | ✓ PASS ~1.3s |
| Ensemble Forecast | `ensemble-api.open-meteo.com/v1/ensemble` | None | 7–16 days (15–51 members) | `tests/open-meteo/ensemble.js` | [Ensemble-Forecast.md](Ensemble-Forecast.md) | ✓ PASS ~0.8s |
| Marine Weather | `marine-api.open-meteo.com/v1/marine` | None | 16 days + historical | `tests/open-meteo/marine.js` | [Marine-Weather.md](Marine-Weather.md) | ✓ PASS ~1.4s |
| Air Quality | `air-quality-api.open-meteo.com/v1/air-quality` | None | 5 days | `tests/open-meteo/air-quality.js` | [Air-Quality.md](Air-Quality.md) | ✓ PASS ~1.4s |
| Flood | `flood-api.open-meteo.com/v1/flood` | None | 16 days / 7 mo ensemble | `tests/open-meteo/flood.js` | [Flood.md](Flood.md) | ✓ PASS ~2.6s |
| Satellite Radiation | `api.open-meteo.com/v1/forecast` | None | 16 days | `tests/open-meteo/satellite-radiation.js` | [Satellite-Radiation.md](Satellite-Radiation.md) | ✓ PASS ~0.6s |
| Climate Change | `climate-api.open-meteo.com/v1/climate` | None | 1950–2050 (CMIP6) | `tests/open-meteo/climate-change.js` | [Climate-Change.md](Climate-Change.md) | ✓ PASS ~2.4s |
| Geocoding | `geocoding-api.open-meteo.com/v1/search` | None | n/a | `tests/open-meteo/geocoding.js` | [Geocoding.md](Geocoding.md) | ✓ PASS ~0.8s |

## Notable gotchas

- Each sub-API lives on its **own subdomain** — `api.`, `archive-api.`, `seasonal-api.`, `ensemble-api.`, `marine-api.`, `air-quality-api.`, `flood-api.`, `climate-api.`, `geocoding-api.`
- `models=ec46` is **invalid** for the seasonal API — omit `models=` to get default SEAS5 (50 members).
- **Marine** coordinates must be over ocean — land points return silently empty arrays.
- **Pollen** variables (air quality) are Europe-only; return nulls globally without an error.
- **Climate change** dates are capped to 1950–2050 — outside returns 400.
- **Satellite radiation** from GOES (North America) not yet integrated as of June 2026; US data is model-derived.
- **Historical archive** has ~5-day delay — yesterday may not be available.
- Geocoding returns `{ "results": null }` (not `[]`) when no match.
