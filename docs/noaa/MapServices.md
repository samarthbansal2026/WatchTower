# NOAA MapServices (formerly NowCoast)

- **Service**: NWS GIS map services — radar, watches/warnings, water/hydro, tropical (NHC). The April 2023 **NowCoast retirement** moved everything here.
- **Host**: `mapservices.weather.noaa.gov`
- **Auth**: **None.** Public.
- **Cost**: Free.
- **Output**: ArcGIS REST — `f=json`, `f=geojson`, `f=pjson`, `f=pbf`. Many services also expose OGC WMS/WFS.

> ⚠️ The old `https://nowcoast.noaa.gov/arcgis/rest/services/...` URLs return **HTTP 403** with a retirement notice as of April 19 2023. All clients must migrate to `mapservices.weather.noaa.gov`.

## Tested on
2026-06-05 — `PASS` in ~2.5 s.

## Folder tree

ArcGIS folders under each "instance":

| Instance | Folders | What's there |
|---|---|---|
| `/eventdriven/rest/services/` | `radar`, `WWA`, `water`, `Utilities` | Things that change minute-to-minute |
| `/tropical/rest/services/` | (services flat) | NHC tropical weather (see `NHC.md`) |
| `/static/rest/services/` *(if present)* | static overlays | basemaps |
| `/raster/rest/services/` *(if present)* | raster imagery | satellite, MRMS rasters |

Within `/eventdriven`:

| Service | Type | What |
|---|---|---|
| `radar/radar_base_reflectivity` | MapServer | MRMS base reflectivity mosaic, 10-min refresh |
| `radar/radar_base_reflectivity_time` | ImageServer | Time-enabled (4-hour slider) base reflectivity |
| `WWA/watch_warn_adv` | MapServer + FeatureServer | All active watches/warnings/advisories |
| `water/...` | Various | River observations / forecasts (overlaps with NWPS) |

## Endpoint tested

The "headline" query is the active warnings count:

```text
GET /eventdriven/rest/services/WWA/watch_warn_adv/MapServer/1/query
    ?where=1=1&returnCountOnly=true&f=json
→ { "count": 764 }

GET /eventdriven/rest/services/WWA/watch_warn_adv/MapServer/1/query
    ?where=1=1&outFields=event,prod_type,phenom,sig,wfo
    &returnGeometry=false&resultRecordCount=5&f=json
→ first feature.attributes:
  { event: "0143", prod_type: "Severe Thunderstorm Warning",
    phenom: "SV", sig: "W", wfo: "KMAF" }
```

## Sample request (Node.js)

```js
const url = 'https://mapservices.weather.noaa.gov/eventdriven/rest/services/WWA/watch_warn_adv/MapServer/1/query'
  + '?where=phenom=%27TO%27'           // only Tornado warnings
  + '&outFields=prod_type,wfo,onset,ends'
  + '&returnGeometry=false&f=json';
const { features } = await fetch(url).then(r => r.json());
for (const f of features) console.log(f.attributes);
```

## Useful `phenom` codes

| Code | Hazard |
|---|---|
| `TO` | Tornado |
| `SV` | Severe Thunderstorm |
| `FF` | Flash Flood |
| `FA` | Areal Flood |
| `WC` | Wind Chill |
| `HT` | Heat |
| `WS` | Winter Storm |

`sig` = severity tier — `W` Warning, `A` Watch, `Y` Advisory, `S` Statement.

## Gotchas

- **Field names are case-sensitive lowercase.** `outFields=Event` matches nothing — use `event`.
- **`returnCountOnly=true` is the cheap path** to "how many records exist" — don't enumerate features just to count.
- **Default page size ~1000.** For full enumeration, paginate with `resultOffset`/`resultRecordCount`.
- **Two service types per layer.** `MapServer` is read-only display + query. `FeatureServer` adds full editing semantics; for read-only queries either works.
- **The old `nowcoast.noaa.gov/arcgis/...` paths are dead.** Migrate any client URL containing `nowcoast.noaa.gov/arcgis` to `mapservices.weather.noaa.gov/eventdriven` (or `/tropical`, etc.).

## Test file

`tests/noaa/mapservices.js`
