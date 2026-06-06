# NOAA ERDDAP — CoastWatch

- **Service**: ERDDAP (Environmental Research Division's Data Access Program) — a data server that unifies access to thousands of gridded + tabular environmental datasets (SST, chlorophyll, ocean currents, Coral Reef Watch DHW, wave height, salinity, satellite winds, marine met buoys).
- **Homepage**: <https://coastwatch.noaa.gov/erddap>
- **Base URL**: `https://coastwatch.noaa.gov/erddap`
- **Auth**: **None.** Public.
- **Cost**: Free.
- **Sibling instances** (same software, different datasets):
  - <https://upwell.pfeg.noaa.gov/erddap> — NDBC buoys, ROMS, more SST
  - <https://coastwatch.pfeg.noaa.gov/erddap> — older PFEG mirror

## Tested on
2026-06-05 — `PASS` in ~40 s. ERDDAP is consistently slow on first access; later requests for the same dataset benefit from server-side caching.

## Two API styles

| Style | URL pattern | What it's for |
|---|---|---|
| **`tabledap`** | `/tabledap/{datasetID}.{format}?cols&filter` | Point observations, time series, station data |
| **`griddap`** | `/griddap/{datasetID}.{format}?var[(time)][(lat):(lat)][(lon):(lon)]` | Gridded raster fields (satellite SST, etc.) |

Available output formats (`{format}`): `json`, `jsonp`, `geoJson`, `csv`, `tsv`, `htmlTable`, `nc` (NetCDF), `mat`, `xhtml`, …

## Catalog discovery

```text
GET /info/index.json?page=1&itemsPerPage=25
GET /search/index.json?searchFor=chlorophyll
GET /info/{datasetID}/index.json    → dataset metadata, variables, dimensions
```

## Endpoint tested

```text
GET /griddap/noaacrwsstDaily.json
    ?analysed_sst[(last)][(25):1:(25)][(-80):1:(-80)]
```

Returns a single SST cell off Florida from the Coral Reef Watch Daily v3.1 product.

## Sample request (Node.js)

```js
const url = 'https://coastwatch.noaa.gov/erddap/griddap/noaacrwsstDaily.json'
  + '?analysed_sst[(last)][(25):1:(25)][(-80):1:(-80)]';
const res = await fetch(url);
const j = await res.json();
const [time, lat, lon, sst] = j.table.rows[0];
console.log(`SST = ${sst} °C @ (${lat}, ${lon}) on ${time}`);
// "SST = 29.21 °C @ (25.025, -79.975) on 2026-06-02T12:00:00Z"
```

## Sample response

```json
{
  "table": {
    "columnNames": ["time", "latitude", "longitude", "analysed_sst"],
    "columnTypes": ["String", "float", "float", "double"],
    "columnUnits": ["UTC", "degrees_north", "degrees_east", "degree_C"],
    "rows": [
      ["2026-06-02T12:00:00Z", 25.025, -79.975, 29.21]
    ]
  }
}
```

The "rows of arrays" shape is universal to ERDDAP tabular output, including griddap. Pair `columnNames` with each row.

## Useful datasets on this instance

| Dataset ID | Type | Description |
|---|---|---|
| `noaacrwsstDaily`  | griddap | Coral Reef Watch v3.1 daily SST, 5 km global |
| `noaacrwdhwDaily`  | griddap | Coral Reef Watch Degree Heating Week (bleaching stress) |
| `noaacrwbaa5kmDay` | griddap | Bleaching Alert Area |
| `nesdisGeoPolarSSTN5SQNRT` | griddap | GHRSST L4 1 km blended SST |
| `erdMH1chla1day`   | griddap | MODIS-Aqua chlorophyll-a daily |

For station/buoy data, use `https://upwell.pfeg.noaa.gov/erddap` and its `cwwcNDBCMet` tabledap dataset.

## Gotchas

- **First call is slow.** 30–60 s for a cold cache is normal — use `timeoutMs ≥ 45000`.
- **Variable name ≠ dataset ID.** `noaacrwsstDaily` exposes `analysed_sst`; not `CRW_SST` (that's the older v1 product on a different ERDDAP). Always pull `/info/{datasetID}` first if you're not sure.
- **Square brackets must be URL-encoded** (`%5B`, `%5D`) — most HTTP libraries don't do this automatically.
- **`(last)`** is the magic literal for "latest time index". `(now)` doesn't work; "now-2hours" works only in `time>=...` filters.
- **Lat/lon ordering varies per dataset.** Some are `0..360` longitude, some `-180..180`. Read the dataset metadata.
- **NDBC met data is NOT on this instance** — request fails 404. Use the `upwell.pfeg.noaa.gov` ERDDAP for buoys.

## Test file

`tests/noaa/erddap.js`
