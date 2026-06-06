# NOAA NGS — National Geodetic Survey APIs

- **Service**: National Geodetic Survey — geoid heights, gravity, datum/coordinate conversion, control survey data sheets, OPUS solutions.
- **Homepage**: <https://geodesy.noaa.gov/web_services/>
- **Base URL**: `https://geodesy.noaa.gov/api`
- **Auth**: **None.** Public.
- **Cost**: Free.
- **Rate limits**: Unpublished.

## Tested on
2026-06-05 — `PASS` (GEOID endpoint) in ~1.6 s.

## Sub-APIs

NGS exposes **seven** separate web services under the same host:

| Sub-API | Base path | Status | Purpose |
|---|---|---|---|
| **GEOID**           | `/api/geoid/ght`                                        | ✓ tested (`tests/noaa/ngs-geoid.js`) | Geoid height at lat/lon for a chosen geoid model |
| **NCAT**            | `/api/ncat/llh`, `/spc`, `/utm`, `/xyz`, `/usng`         | ✓ partial (`tests/noaa/ngs-siblings.js`: llh + usng work; spc returned 500 on our probe) | Coordinate / datum conversion |
| **OPUS**            | `/api/opus/meta`, `/api/opus/...`                       | ✓ tested (`tests/noaa/ngs-siblings.js`: `/meta`) | Published OPUS shared solutions |
| **GRAV-D**          | `/api/gravd/...`                                        | ⨯ not tested | Predicted gravity at a geodetic location |
| **NGS Data Explorer** | `/api/data-explorer/...`                              | ⨯ not tested | Survey control data sheet attributes |
| **NCN**             | `/api/ncn-api/...`                                      | ⨯ not tested | NOAA CORS Network attributes |
| **VDatum (tidal)**  | `vdatum.noaa.gov/...`                                   | ⨯ not tested | Vertical-datum / tidal transformation (different host) |

### NCAT examples

```text
# Datum shift NAD83(2011) → NAD83(1986) at 40N, 80W
GET /api/ncat/llh?lat=40.0&lon=-80.0&eht=0.0
   &inDatum=NAD83(2011)&outDatum=NAD83(1986)

# Decode a U.S. National Grid coordinate to lat/lon
GET /api/ncat/usng?usng=18SUJ2348316806&inDatum=NAD83(2011)
```

`outDatum` must be one of the NCAT-supported datums (NAD83(1986), NAD83(2011), NAD83(NSRS2007), NAD27, IGS14, …). Invalid values come back as `{ "error": "Invalid outputDatum" }`. SPC (`/api/ncat/spc`) returned HTTP 500 in our test — likely a server-side bug; treat as unstable.

### OPUS metadata

```text
GET /api/opus/meta
```

Returns a JSON object whose keys describe the fields in an OPUS shared solution (latitude, longitude, ellHt, epoch, datum, condition, designation, …) — useful for parsing the full OPUS query responses.

## Endpoint tested

```text
GET /api/geoid/ght?lat=40.0&lon=-80.0&model=14
```

- `model=14` → GEOID18 (current US model). Other model IDs: 13 = GEOID12B, 15 = xGEOID20, etc.

## Sample request (Node.js)

```js
const url = 'https://geodesy.noaa.gov/api/geoid/ght?lat=40.0&lon=-80.0&model=14';
const r = await fetch(url).then(r => r.json());
console.log(`${r.geoidModel} height: ${r.geoidHeight} m ±${r.error} m`);
// "GEOID18 height: -33.203 m ±0.034 m"
```

## Sample response

```json
{
  "geoidModel": "GEOID18",
  "station": "UserStation",
  "lat": 40,
  "latDms": "N400000.00000",
  "lon": -80,
  "lonDms": "W0800000.00000",
  "geoidHeight": -33.203,
  "error": 0.034
}
```

## Gotchas

- **All values in meters** (geoid height & error).
- **Lat/lon accept both decimal degrees and DMS strings** (`N400000.0` / `W0800000.0`). Mixing formats in one request is undefined; pick one.
- **Geoid18 covers only CONUS + AK/HI/PR/VI.** Lat/lon outside the model's grid returns `geoidHeight: null` (still HTTP 200) — always validate the type.
- **NCAT input/output are model-pinned.** You must specify the source and destination datum (`inDatum`, `outDatum`) and any epoch — defaults vary.
- **VDatum is on a different host** (`vdatum.noaa.gov`), not `geodesy.noaa.gov`.

## Test files

- `tests/noaa/ngs-geoid.js` — GEOID `/ght` endpoint
- `tests/noaa/ngs-siblings.js` — NCAT LLH + USNG, OPUS `/meta`
