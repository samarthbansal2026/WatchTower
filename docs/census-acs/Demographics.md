# Census ACS — Neighborhood Demographics

- **Service**: US Census American Community Survey 5-year estimates for a census tract
- **Homepage**: https://www.census.gov/data/developers/data-sets/acs-5year.html
- **Geocoder**: `https://geocoding.geo.census.gov/geocoder/geographies/coordinates`
- **ACS Base URL**: `https://api.census.gov/data/2022/acs/acs5`
- **Auth**: Free API key (geocoder needs no key; ACS data does)
- **Cost**: Free
- **Rate limits**: Not formally documented; no issues observed in testing

## Tested on
2026-06-06 — `PASS` in ~2000ms. Chicago sample tract (Census Tract 1406.01, Cook County): population 2,762 · median income $87,045 · poverty rate 11.5% · housing units 895.

## Workflow

### Step 1: Geocode lat/lon → FIPS

```
GET https://geocoding.geo.census.gov/geocoder/geographies/coordinates
  ?x={longitude}&y={latitude}
  &benchmark=Public_AR_Current
  &vintage=Current_Current
  &format=json
```

Returns `result.geographies["Census Tracts"][0]` with fields `STATE`, `COUNTY`, `TRACT`.

### Step 2: Query ACS 5-year estimates

```
GET https://api.census.gov/data/2022/acs/acs5
  ?get=B01003_001E,B19013_001E,B17001_002E,B25001_001E
  &for=tract:{TRACT}
  &in=state:{STATE}+county:{COUNTY}
  &key={CENSUS_API_KEY}
```

Response is a 2-row JSON array: `[headers, values]`.

## Key ACS variables for retail

| Variable | Description |
|---|---|
| `B01003_001E` | Total population |
| `B19013_001E` | Median household income |
| `B17001_002E` | Population below poverty level |
| `B25001_001E` | Total housing units |
| `B23025_004E` | Employed civilian population |
| `B08301_001E` | Total commuters (transport to work) |

## Sample request (Node.js)

```js
// Step 1: geocode
const geoUrl = `https://geocoding.geo.census.gov/geocoder/geographies/coordinates` +
  `?x=${lon}&y=${lat}&benchmark=Public_AR_Current&vintage=Current_Current&format=json`;
const geo = await fetch(geoUrl).then(r => r.json());
const tract = geo.result.geographies['Census Tracts'][0];

// Step 2: ACS data
const acsUrl = `https://api.census.gov/data/2022/acs/acs5` +
  `?get=B01003_001E,B19013_001E&for=tract:${tract.TRACT}` +
  `&in=state:${tract.STATE}+county:${tract.COUNTY}&key=${process.env.CENSUS_API_KEY}`;
const [headers, values] = await fetch(acsUrl).then(r => r.json());
```

## Sample ACS response

```json
[
  ["B01003_001E","B19013_001E","state","county","tract"],
  ["4823","47250","17","031","140601"]
]
```

Population: 4,823 · Median household income: $47,250.

## Gotchas
- **Census returns HTTP 200 with HTML "Missing Key" on a bad/missing key.** The body starts with `<html>` — check for this before trying to parse as JSON.
- **TRACT code is 6 digits, zero-padded.** `140601` not `1406.01` (the human-readable form uses a decimal). The geocoder `TRACT` field gives you the correct padded form directly.
- **`x` = longitude, `y` = latitude.** The geocoder uses Cartesian (`x,y`) naming — longitude is `x`, latitude is `y`. Swapping returns wrong or no results silently.
- **ACS 5-year data lags by ~2 years.** The 2022 dataset (released late 2023) is the most recent available as of mid-2026. Don't interpret it as reflecting today's conditions for rapidly changing neighborhoods.
- **`vintage=Current_Current`** maps the geographic boundaries to the same year as the benchmark. Use this unless you need a specific historical vintage.

## Test file
`tests/census-acs/demographics.js`
