# US State WZDx Feeds — Sampler

- **Service**: Live work-zone GeoJSON feeds published by individual state DOTs in the standardized WZDx format. This doc covers the *pattern* of consuming them, exercised against 6 representative states.
- **Spec**: WZDx (Work Zone Data Exchange) — <https://github.com/usdot-jpo-ode/wzdx>
- **Auth**: None for the states tested here. Many other state feeds require a free key — see the Registry doc.
- **Cost**: Free.

## Tested on
2026-06-05 — `PASS` (6/6 states reachable) in ~16 s total.

| State | Org | Events live | Schema | URL |
|---|---|---:|---|---|
| MD | Maryland DOT SHA (via RITIS) | 54 | 4.1 | `https://filter.ritis.org/wzdx_v4.1/mdot.geojson` |
| NY | 511NY (Arcadis-hosted) | 8,458 | 4.1 | `https://511ny.org/api/wzdx` |
| WA | WSDOT | 560 | 4.2 | `https://wzdx.wsdot.wa.gov/api/v4/WorkZoneFeed` |
| DE | Delaware DOT (HaulHub e-dot) | 18 | 4.1 | `https://wzdx.e-dot.com/del_dot_feed_wzdx_v4.1.geojson` |
| LA | Louisiana DOTD (HaulHub e-dot) | 2 | 4.1 | `https://wzdx.e-dot.com/la_dot_d_feed_wzdx_v4.1.geojson` |
| ID | 511 Idaho (Arcadis) | 898 | 4.1 | `https://511.idaho.gov/api/wzdx` |

## Common response shape

Every WZDx feed is a GeoJSON `FeatureCollection`. Top level:

```json
{
  "feed_info": {
    "publisher": "Maryland DOT SHA",
    "version": "4.1",
    "license": "https://creativecommons.org/publicdomain/zero/1.0/",
    "update_date": "2026-06-05T00:10:57Z",
    "data_sources": [{ "data_source_id": "…", "organization_name": "…" }]
  },
  "type": "FeatureCollection",
  "features": [ /* one Feature per active work zone */ ]
}
```

Each feature:

```json
{
  "id": "3da1a9c5-…",
  "type": "Feature",
  "geometry": { "type": "LineString", "coordinates": [[lon,lat], …] },
  "properties": {
    "core_details": {
      "event_type": "work-zone",
      "data_source_id": "…",
      "road_names": ["I-95"],
      "direction": "northbound",
      "description": "Lane closure for resurfacing",
      "update_date": "2026-06-04T…Z"
    },
    "start_date": "2026-06-04T13:00:00Z",
    "end_date": "2026-09-01T23:59:59Z",
    "vehicle_impact": "some-lanes-closed",
    "location_method": "…",
    "lanes": [ {…} ]
  }
}
```

## Sample request (Node.js)

```js
const feeds = [
  'https://filter.ritis.org/wzdx_v4.1/mdot.geojson',
  'https://511ny.org/api/wzdx',
  'https://wzdx.wsdot.wa.gov/api/v4/WorkZoneFeed',
];

for (const url of feeds) {
  const res = await fetch(url);
  let body = await res.text();
  // Some feeds serve JSON as application/octet-stream — always re-parse defensively.
  try { body = JSON.parse(body); } catch {}
  console.log(url, '→', body.features?.length, 'work zones,', 'version', body.feed_info?.version);
}
```

## Gotchas

- **Wrong content-type.** `wzdx.e-dot.com` returns valid JSON but advertises `application/octet-stream`. Strict JSON parsers skip it — always wrap in a try/parse fallback.
- **Schema version drift.** Field nesting differs between WZDx 3.x and 4.x: top-level was `road_event_feed_info` in 3.x and is `feed_info` in 4.x. Read `feed_info?.version || road_event_feed_info?.version` to detect.
- **403/503 from outside the state.** Even WZDx feeds the registry lists as `needapikey:false` (UT, IA, WI, MO direct) can refuse non-state IPs. The Arcadis-hosted (NY, ID) and e-dot/HaulHub-hosted (DE, LA) and RITIS-hosted (MD) ones are reliably accessible from anywhere.
- **Event counts swing wildly.** NY (8,458) is dominated by long-running maintenance windows; LA (2) reflects a state with sparse digital tracking. Don't infer construction activity from feed size alone.
- **Geometry varies.** WZDx allows `Point`, `LineString`, or `MultiLineString` per feature. Don't assume one.

## Test file

`tests/dot511/wzdx-states.js`
