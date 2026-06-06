# Overpass API — Attic (Historical Diff)

- **Service**: Query past OSM state using `[date:"..."]` to detect neighborhood change over time
- **Homepage**: https://wiki.openstreetmap.org/wiki/Overpass_API/Overpass_API_by_Example#Attic_data
- **Base URL**: `https://overpass-api.de/api/interpreter`
- **Auth**: None
- **Cost**: Free
- **Rate limits**: 2 concurrent slots per IP; attic queries are heavier — add 10 s gap after other tests

## Retail use case

Compare shop/restaurant counts at a location 12 months ago vs. today. A positive delta signals a growing retail corridor; negative signals closures/decline. Useful for site selection and competitive monitoring.

## Tested on
2026-06-06 — `PASS` in ~12000ms (two sequential queries). Chicago sample: 49 shops/restaurants 12 months ago → 48 today (delta: -1, trend: shrinking).

## Endpoints

### `POST /api/interpreter` with `[date:"YYYY-MM-DDTHH:MM:SSZ"]`

Past snapshot query:

```
[out:json][timeout:30][date:"2025-06-05T00:00:00Z"];
(
  node["shop"](41.9585,-87.7357,41.9765,-87.7177);
  way["shop"](41.9585,-87.7357,41.9765,-87.7177);
  node["amenity"="restaurant"](41.9585,-87.7357,41.9765,-87.7177);
  node["amenity"="fast_food"](41.9585,-87.7357,41.9765,-87.7177);
);
out count;
```

Remove `[date:...]` for the current snapshot. Use `out count;` (not `out body;`) to get just a count without transferring all element data.

## Sample response

```json
{
  "elements": [
    {
      "type": "count",
      "id": 0,
      "tags": {
        "nodes": "38",
        "ways": "11",
        "relations": "0",
        "areas": "0",
        "total": "49"
      }
    }
  ]
}
```

## Gotchas
- **Attic queries are slower.** Plan for 5–15 s per query. The server has to reconstruct historical state from diffs.
- **Rate-limit sensitivity.** Running an attic query immediately after other Overpass tests causes 429. Wait at least 10 s after other queries.
- **`out count;` is required for efficiency.** Requesting full element bodies for a historical snapshot of a 1 km² area can return tens of thousands of elements. Always use `out count;` for change detection.
- **OSM history ≠ real-world history.** A closure only appears in the diff when a mapper updates the tag. There can be a months-long lag. Use this as a signal, not a ground-truth audit.

## Test file
`tests/overpass/attic-diff.js`
