# NOAA NHC — National Hurricane Center Tropical Weather

- **Service**: National Hurricane Center + Central Pacific Hurricane Center — live storm tracks, forecast cones, watch/warning polygons, wind radii, surge inundation, arrival-time products.
- **Homepage**: <https://www.nhc.noaa.gov/gis/>
- **Base URL (ArcGIS REST)**: `https://mapservices.weather.noaa.gov/tropical/rest/services/tropical/NHC_tropical_weather/MapServer`
- **Auth**: **None.** Public.
- **Cost**: Free.
- **Output**: `f=json` (Esri JSON), **`f=geojson` (RFC 7946 GeoJSON)**, `f=pbf` (Mapbox Vector Tiles).
- **Rate limits**: Unpublished. The service is fronted by CDN.

## Tested on
2026-06-05 — `PASS` in ~2.2 s.

## Service shape (ArcGIS REST)

ArcGIS REST is not the typical "one endpoint per resource" REST. Each *MapServer* groups many **layers**, and you query each layer by its numeric ID.

```text
GET .../MapServer?f=json                       → service metadata + layer list
GET .../MapServer/layers?f=json                → expanded layer definitions
GET .../MapServer/{layerId}?f=json             → fields/symbology for one layer
GET .../MapServer/{layerId}/query?where=…&outFields=*&f=geojson   → features
```

The NHC service has **400 layers**. Group-layer IDs jump around (groups vs feature layers are interleaved). Useful entry points:

| Layer ID | Name | Geometry |
|---:|---|---|
| 1 | Two-Day: Current Location | Point |
| 2 | Seven-Day: Current Location | Point (used in this test) |
| 3 | Seven-Day: Potential Development Region | Polygon |
| 398 | Seven-Day: Development Motion | Polyline |

Each active basin gets its own block of layers, e.g. AT1 (Atlantic storm 1), AT2, EP1, CP1, …:

| Per-storm layer offset | Content |
|---|---|
| `… Forecast Points` | discrete advisory positions |
| `… Forecast Track` | center-line |
| `… Forecast Cone` | probability cone polygon |
| `… Watch-Warning` | coast segments under watch/warning |
| `… Past Track`, `… Past Cumulative Wind Swath` | history |
| `… Forecast Wind Radii`, `… Advisory Wind Field` | wind extents |
| `… Earliest / Most Likely Arrival of TS Winds` | timing |
| `… Inundation and Tidal Mask` | surge raster |

There is no global "list of active storms" feature service — discover storms by enumerating layer names for the `AT`/`EP`/`CP` prefixes in `/MapServer?f=json`.

## Endpoints tested

```text
GET /tropical/.../MapServer?f=json
GET /tropical/.../MapServer/2/query?where=1=1&outFields=*&f=geojson
```

## Sample request (Node.js)

```js
const SERVICE = 'https://mapservices.weather.noaa.gov/tropical/rest/services/tropical/NHC_tropical_weather/MapServer';

const r = await fetch(`${SERVICE}/2/query?where=1=1&outFields=*&f=geojson`);
const fc = await r.json();
for (const f of fc.features) {
  const p = f.properties;
  console.log(`${p.basin}: 2-day ${p.prob2day} (${p.risk2day}), 7-day ${p.prob7day} (${p.risk7day})`);
}
```

## Sample response (truncated, `f=geojson`)

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": { "type": "Point", "coordinates": [...] },
      "properties": {
        "basin": "Pacific",
        "prob2day": "10%",
        "risk2day": "Low",
        "prob7day": "70%",
        "risk7day": "High",
        "idp_source": "gtwo_points_202606041749",
        "idp_ingestdate": 1780595754000
      }
    }
  ]
}
```

When a storm is named, per-storm `AT*` / `EP*` layers populate with forecast points, cone polygons, etc.

## Gotchas

- **It's ArcGIS REST, not "regular" REST.** Always pass `f=geojson` (or `f=json`) — without an `f` you get an HTML viewer page.
- **Coordinates default to Web Mercator (102100).** Pass `outSR=4326` when using Esri JSON if you want lat/lon. GeoJSON output is always WGS84.
- **400 layers.** Querying `/MapServer/0` is a *group layer* and returns no features — use specific feature-layer IDs.
- **Storm-specific layers come and go** as advisories are issued / retired. The layer count is stable (named `AT1`..`AT5`, `EP1`..`EP5`, `CP1`..`CP3`), but layer **names** change to e.g. `AT1 Hurricane Beryl Forecast Cone`.
- **`idp_*` timestamps are epoch milliseconds**, not seconds.
- **The `f=pbf` vector tiles** require a tile URL, not `/query`. Use `/tile/{z}/{y}/{x}.pbf` if available.

## Companion services on the same host

`mapservices.weather.noaa.gov/tropical/rest/services/tropical/` also hosts:

- `NHC_Peak_Storm_Surge` — peak inundation by storm
- `NHC_Probabilistic_Storm_Surge` — probabilistic surge heights
- `NHC_TC_Wind_Probabilities` — wind-speed probability rasters
- `NHC_Tropical_Cyclones` — historical tracks (HURDAT2)

## Test file

`tests/noaa/nhc.js`
