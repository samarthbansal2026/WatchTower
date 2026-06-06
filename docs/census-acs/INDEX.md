# US Census ACS (American Community Survey) — Index

- **Service**: Neighborhood demographic data from the US Census Bureau
- **Homepage**: https://www.census.gov/data/developers/data-sets/acs-5year.html
- **Auth**: Free API key — https://api.census.gov/data/key_signup.html
- **Cost**: Free
- **Rate limits**: Not documented; generous in practice

## Retail use case

Given any store lat/lon, pull census-tract-level demographics: population, median household income, poverty rate, and housing units. Useful for site selection, trade area analysis, and understanding whether a neighborhood is growing or declining.

## Two-step workflow

1. **Geocode** lat/lon → FIPS codes (state + county + tract) via `geocoding.geo.census.gov` (no key needed)
2. **Query ACS** using FIPS codes → demographic variables via `api.census.gov` (key required)

## Sub-APIs

| Name | Endpoint | Auth | Test file | Doc | Status |
|---|---|---|---|---|---|
| Demographics (geocode + ACS 5yr) | geocoder + `api.census.gov/data/2022/acs/acs5` | API key | [demographics.js](../../tests/census-acs/demographics.js) | [Demographics.md](Demographics.md) | ✓ PASS |

## Getting a key

1. Go to https://api.census.gov/data/key_signup.html
2. Enter name + email → instant email with key
3. Add to `.env`: `CENSUS_API_KEY=<your-key>`
