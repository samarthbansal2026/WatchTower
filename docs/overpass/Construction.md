# Overpass API — Construction Activity

- **Service**: Query OSM for active road, building, and land-use construction in a bbox
- **Homepage**: https://wiki.openstreetmap.org/wiki/Tag:highway%3Dconstruction
- **Base URL**: `https://overpass-api.de/api/interpreter`
- **Auth**: None
- **Cost**: Free
- **Rate limits**: 2 concurrent slots per IP

## Retail use case

Detect upcoming changes near a store: road closures under construction (access impact), new buildings being built (new competitors or anchors incoming), and large land-use construction zones (new retail pads, mixed-use developments).

## Tested on
2026-06-06 — `PASS` in ~1300ms. 3 active construction elements in 2 km bbox (1 road, 1 building, 1 land-use). One result was NEIU Education Building expected completion 2027.

## Endpoints

### `POST /api/interpreter`

Query:

```
[out:json][timeout:25];
(
  way["highway"="construction"](BBOX);
  way["building"="construction"](BBOX);
  node["highway"="construction"](BBOX);
  way["landuse"="construction"](BBOX);
);
out body;
```

## Sample response (truncated)

```json
{
  "elements": [
    {
      "type": "way",
      "tags": {
        "landuse": "construction",
        "name": "NEIU Education Building (2027)",
        "note": "Construction of the new NEIU Education Building, Completion is expected in 2027",
        "opening_date": "2027"
      }
    }
  ]
}
```

## Gotchas
- **OSM mappers must have tagged it.** Construction only appears after a mapper has updated the tag — brand-new permits won't show up until someone maps them. Cross-reference with DOT 511 WZDx for road work.
- **`opening_date` tag is voluntary.** Only some mappers add it. Don't assume absence means unknown.
- **Use a larger bbox for construction.** A construction project 1.5 km away can still reroute traffic past your store — use ~0.018° (~2 km) rather than the 1 km used for amenity searches.

## Test file
`tests/overpass/construction.js`
