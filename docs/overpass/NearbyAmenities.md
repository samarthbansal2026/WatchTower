# Overpass API — Nearby Amenities

- **Service**: Query OSM nodes by tag within a bounding box (competitors + anchor tenants)
- **Homepage**: https://wiki.openstreetmap.org/wiki/Overpass_API/Language_Guide
- **Base URL**: `https://overpass-api.de/api/interpreter`
- **Auth**: None
- **Cost**: Free
- **Rate limits**: 2 concurrent slots per IP

## Retail use case

Given a store's lat/lon, find nearby competitors (`shop=variety_store`, `shop=dollar_store`) and anchor tenants (pharmacy, supermarket, bank, fast food) that drive co-traffic. Returns names, types, and coordinates.

## Tested on
2026-06-06 — `PASS` in ~2200ms. 16 amenities in 1 km bbox around Chicago Dollar Tree.

## Endpoints

### `POST /api/interpreter`

Query body (`data=<OverpassQL>`):

```
[out:json][timeout:25];
(
  node["shop"="variety_store"](BBOX);
  node["shop"="dollar_store"](BBOX);
  node["amenity"="pharmacy"](BBOX);
  node["shop"="supermarket"](BBOX);
  node["amenity"="bank"](BBOX);
  node["amenity"="fast_food"](BBOX);
  node["amenity"="restaurant"](BBOX);
);
out body;
```

where `BBOX` = `south,west,north,east` in decimal degrees (~0.009° ≈ 1 km per side).

## Sample request (Node.js)

```js
const BBOX = '41.9585,-87.7357,41.9765,-87.7177';
const query = `[out:json][timeout:25];
(
  node["shop"="variety_store"](${BBOX});
  node["amenity"="pharmacy"](${BBOX});
  node["amenity"="fast_food"](${BBOX});
);
out body;`;

const r = await fetch('https://overpass-api.de/api/interpreter', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'User-Agent': 'myapp/1.0 (contact@example.com)',
  },
  body: `data=${encodeURIComponent(query)}`,
});
const data = await r.json();
console.log(data.elements.length); // number of POIs found
```

## Sample response (truncated)

```json
{
  "version": 0.6,
  "elements": [
    {
      "type": "node",
      "id": 123456789,
      "lat": 41.9684,
      "lon": -87.7249,
      "tags": {
        "amenity": "restaurant",
        "name": "Lawrence Fish Market"
      }
    }
  ]
}
```

## Gotchas
- **Only nodes, not ways.** Many large stores (Walgreens, Walmart) are mapped as *ways* (polygons), not nodes. To include them add `way["shop"="supermarket"](BBOX);` and `out center;` to get a representative lat/lon.
- **OSM completeness varies by area.** Dense urban areas have good coverage; suburban strip-mall data is spottier.
- **bbox orientation.** Overpass uses `(south,west,north,east)` — longitude is *second*, not first. Swapping lat/lon silently returns 0 results.

## Test file
`tests/overpass/nearby-amenities.js`
