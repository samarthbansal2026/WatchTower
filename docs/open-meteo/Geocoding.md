# Open-Meteo Geocoding — city/location name to coordinates, elevation, and timezone

- **Service**: Location search backed by GeoNames; also provides elevation from Copernicus DEM
- **Homepage**: https://open-meteo.com/en/docs/geocoding-api
- **Base URL**: `https://geocoding-api.open-meteo.com/v1/search`
- **Auth**: None
- **Cost**: Free
- **Rate limits**: Shared Open-Meteo limits

## Tested on
2026-06-06 — `PASS` in ~777ms. "San Francisco" → 5 results.

## Endpoints

### `GET /v1/search` — search by name

Required params: `name` — city or location name (URL-encoded)

Optional params:
- `count=` — max results (default 10)
- `language=` — ISO language code for localized names (default `en`)
- `format=json|protobuf`

### `GET /v1/get` — lookup by GeoNames ID

Required params: `id` — GeoNames integer ID

### Elevation API (separate base URL)
`GET https://api.open-meteo.com/v1/elevation?latitude=37.77&longitude=-122.42`
- Returns `elevation` in meters from Copernicus DEM (90 m resolution)
- Accepts `latitude` and `longitude` as comma-separated lists for batch lookups (up to 100)

## Sample request (Node.js)

```js
const r = await fetch(
  'https://geocoding-api.open-meteo.com/v1/search' +
  '?name=San+Francisco&count=5&language=en&format=json'
);
const data = await r.json();
// data.results[0] → top hit
```

## Sample response (truncated)

```json
{
  "results": [
    {
      "id": 5391959,
      "name": "San Francisco",
      "latitude": 37.77493,
      "longitude": -122.41942,
      "elevation": 16,
      "timezone": "America/Los_Angeles",
      "country": "United States",
      "country_code": "US",
      "admin1": "California",
      "admin2": "San Francisco County",
      "population": 827526
    }
  ]
}
```

## Gotchas
- Returns `{ "results": null }` (not an empty array) when no results are found — check for null before iterating.
- The `elevation` in geocoding results is the city's representative elevation from GeoNames, not DEM terrain elevation. Use the `/v1/elevation` endpoint for precise terrain elevation.
- Fuzzy matching is limited — exact name or common English name works best; abbreviations and alternate spellings may return no results.
- The GeoNames `id` from search results can be passed to `/v1/get?id=` to retrieve stable metadata.

## Test file
`tests/open-meteo/geocoding.js`
