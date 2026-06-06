# Overpass API — Transit Proximity

- **Service**: Find transit stops within walking radius of a point using `around` filter
- **Homepage**: https://wiki.openstreetmap.org/wiki/Overpass_API/Language_Guide#Around
- **Base URL**: `https://overpass-api.de/api/interpreter`
- **Auth**: None
- **Cost**: Free
- **Rate limits**: 2 concurrent slots per IP

## Retail use case

Transit access is a key foot-traffic driver for dollar stores. This query returns all bus stops, subway entrances, and train stations within a configurable walking radius (e.g. 500 m) of a store coordinate.

## Tested on
2026-06-06 — `PASS` in ~1260ms. 17 bus stops within 500 m of Chicago Dollar Tree; 0 train stations (nearest L is ~1 km away).

## Endpoints

### `POST /api/interpreter`

```
[out:json][timeout:25];
(
  node["highway"="bus_stop"](around:500,41.9675,-87.7267);
  node["public_transport"="stop_position"](around:500,41.9675,-87.7267);
  node["railway"="station"](around:500,41.9675,-87.7267);
  node["railway"="subway_entrance"](around:500,41.9675,-87.7267);
  node["amenity"="bus_station"](around:500,41.9675,-87.7267);
);
out body;
```

## Sample response (truncated)

```json
{
  "elements": [
    {
      "type": "node",
      "lat": 41.9683,
      "lon": -87.7278,
      "tags": {
        "highway": "bus_stop",
        "name": "Lawrence & Pulaski"
      }
    }
  ]
}
```

## Gotchas
- **`around:radius,lat,lon` syntax.** Radius is in meters. The coordinate order is lat-then-lon, which is the *opposite* of the bbox format (`south,west,north,east`). Easy to mix up.
- **Bus stops are duplicated.** OSM maps both directions of a stop as separate nodes. Expect roughly 2× the physical stop count.
- **`public_transport=stop_position`** is the modern tagging scheme; `highway=bus_stop` is the legacy scheme. Many stops have both; include both queries and deduplicate by `id` if you need a precise count.

## Test file
`tests/overpass/transit.js`
