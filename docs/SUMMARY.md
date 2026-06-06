# Watchtower — API Master Summary

All services covered as of 2026-06-05. For full details see each service's `INDEX.md` and per-API docs.

---

## Table of Contents

- [NOAA](#noaa)
- [Ticketmaster](#ticketmaster)
- [DOT 511](#dot-511)
- [SEC EDGAR](#sec-edgar)

---

## NOAA

13 sub-APIs across 9 service families. All free. See [`docs/noaa/INDEX.md`](noaa/INDEX.md).

### NWS — National Weather Service
**Base URL**: `https://api.weather.gov`  
**Auth**: None — `User-Agent` header required (e.g. `"myapp contact@example.com"`)  

| Endpoint | Params | Provides |
|---|---|---|
| `GET /points/{lat},{lon}` | lat/lon | Forecast office, grid coordinates, zone IDs, timezone |
| `GET /gridpoints/{office}/{x},{y}/forecast` | — | 7-day / 14-period text forecast |
| `GET /gridpoints/{office}/{x},{y}/forecast/hourly` | — | Hourly forecast for 156 hours |
| `GET /stations/{stationId}/observations/latest` | — | Current obs (temp, wind, humidity, pressure) |
| `GET /alerts/active/count` | — | Nationwide active alert count by zone/area |
| `GET /alerts/active` | `point`, `area`, `zone`, `severity` | Active weather alerts (no `limit=` param) |

---

### NCEI Access Data Service
**Base URL**: `https://www.ncei.noaa.gov/access/services/data/v1`  
**Auth**: None  

| Endpoint | Key Params | Provides |
|---|---|---|
| `GET /` | `dataset`, `stations`, `startDate`, `endDate`, `dataTypes`, `format`, `units` | Historical climate obs (temp, precip, snow, normals, marine, hourly LCD) |

**`dataset` values**: `daily-summaries`, `gsom`, `gsoy`, `global-marine`, `local-climatological-data`, `global-hourly`, `normals-annualseasonal`, `normals-daily`, `normals-hourly`, `normals-monthly`  
**`format` values**: `json`, `csv`, `pdf`, `netcdf`  
Slow (5–10 s); timeout ≥ 30 s.

---

### NCEI CDO v2 — Climate Data Online
**Base URL**: `https://www.ncei.noaa.gov/cdo-web/api/v2`  
**Auth**: Free token — request at `https://www.ncei.noaa.gov/cdo-web/token`; pass as header `token: <value>` (NOT `Authorization: Bearer`)  
**Rate**: 5 req/s, 10,000 req/day  

| Endpoint | Key Params | Provides |
|---|---|---|
| `GET /datasets` | `stationid`, `locationid`, `datatypeid`, `startdate`, `enddate`, `sortfield`, `limit`, `offset` | Available datasets |
| `GET /datacategories` | same filters | Data category taxonomy |
| `GET /datatypes` | same + `datacategoryid` | 1,566 observation types |
| `GET /locationcategories` | — | Location category list |
| `GET /locations` | `locationcategoryid`, `datacategoryid`, `startdate`, `enddate`, `sortfield`, `limit`, `offset` | 38,862 locations |
| `GET /stations` | `datasetid`, `locationid`, `datatypeid`, `extent`, `startdate`, `enddate`, `sortfield`, `limit`, `offset` | 156,903 stations |
| `GET /data` | `datasetid` (req), `stationid`, `datatypeid`, `startdate`, `enddate`, `units`, `limit`, `offset` | Actual observations |

---

### CO-OPS — Tides & Currents
**Base URL**: `https://api.tidesandcurrents.noaa.gov`  
**Auth**: None (optional `application=` param for identification)  

| Endpoint | Key Params | Provides |
|---|---|---|
| `GET /api/prod/datagetter` | `station` (7-digit ID), `product`, `date`/`begin_date`+`end_date`, `datum`, `units`, `format`, `time_zone` | Water level, tide predictions, currents, temperature, wind, pressure, salinity |
| `GET /mdapi/prod/webapi/stations` | `type` (waterlevels, currents, etc.), `units` | Station metadata list |
| `GET /mdapi/prod/webapi/stations/{stationId}/details` | — | Single station metadata |

**`product` values**: `water_level`, `predictions`, `currents`, `air_temperature`, `water_temperature`, `wind`, `barometric_pressure`, `humidity`, `conductivity`, `salinity`  
**`datum` required** for `water_level` / `predictions`: `MLLW`, `MSL`, `NAVD`, `STND`, etc.  
**Time range limits**: ≤ 31 days (6-min/hourly), ≤ 1 year (monthly), ≤ 10 years (annual).

---

### AWC — Aviation Weather Center
**Base URL**: `https://aviationweather.gov/api/data`  
**Auth**: None  

| Endpoint | Key Params | Provides |
|---|---|---|
| `GET /metar` | `ids` (ICAO codes), `bbox`, `format`, `hours`, `date` | METARs — surface obs at airports |
| `GET /taf` | `ids`, `bbox`, `format`, `hours`, `date` | TAFs — terminal area forecasts |
| `GET /pirep` | `ids`, `bbox`, `format`, `hours`, `level`, `distance` | Pilot reports |
| `GET /airsigmet` | `format`, `hazard`, `level`, `date` | AIRMETs and SIGMETs |
| `GET /gairmet` | `format`, `time` | Graphical AIRMETs |
| `GET /cwa` | `hazard`, `format` | Center Weather Advisories |
| `GET /stationinfo` | `ids`, `bbox`, `state` | Airport station metadata |

**`format` values**: `json`, `xml`, `geojson`, `raw`, `decoded`  
Slow (10–14 s for multi-station); data window ≤ 15 days.

---

### SWPC — Space Weather Prediction Center
**Base URL**: `https://services.swpc.noaa.gov`  
**Auth**: None — static file paths, no query params  

| URL | Provides |
|---|---|
| `/products/noaa-planetary-k-index.json` | Kp index (planetary geomagnetic activity), 3-hour intervals |
| `/products/solar-wind/plasma-{1,2,5,7}-day.json` | Solar wind density, speed, temperature |
| `/products/alerts.json` | Active space weather alerts and watches |
| `/json/goes/primary/xrays-{1,3,6}-hour.json` | GOES X-ray flux (solar flares) |
| `/json/planetary_k_index_1m.json` | 1-minute Kp index |
| `/products/solar-wind/mag-{1,2,5,7}-day.json` | Interplanetary magnetic field (Bz component) |

---

### NWPS — National Water Prediction Service
**Base URL**: `https://api.water.noaa.gov/nwps/v1`  
**Auth**: None  

| Endpoint | Key Params | Provides |
|---|---|---|
| `GET /gauges` | `bbox`, `siteType`, `state`, `limit`, `cursor` | All river/stream gauges list |
| `GET /gauges/{lid}` | — | Single gauge metadata (name, usgsId, flood categories) |
| `GET /gauges/{lid}/stageflow` | — | Observed + forecast stage and flow |
| `GET /reaches/{reachId}` | — | NWM reach metadata |
| `GET /reaches/{reachId}/streamflow` | `series` (short/medium/long) | NWM streamflow forecast |

LIDs are 5-char NWS codes (e.g. `MROI2`); each has a linked `usgsId` for cross-reference with USGS NWIS.

---

### NGS — National Geodetic Survey
**Base URL**: `https://geodesy.noaa.gov/api`  
**Auth**: None  

| Endpoint | Key Params | Provides |
|---|---|---|
| `GET /geoid/ght` | `lat`, `lon`, `model` (e.g. GEOID18) | Geoid height (difference between ellipsoid and geoid) |
| `GET /ncat/llh` | `lat`, `lon`, `inDatum`, `outDatum` | Coordinate conversion between horizontal datums |
| `GET /ncat/usng` | `usng`, `inDatum`, `outDatum` | USNG ↔ lat/lon + datum conversion |
| `GET /opus/meta` | — | OPUS field metadata (datum definitions) |

---

### NHC — National Hurricane Center (ArcGIS REST)
**Base URL**: `https://mapservices.weather.noaa.gov/tropical/rest/services/tropical/NHC_tropical_weather/MapServer`  
**Auth**: None — append `f=json` or `f=geojson` to every request  

| Endpoint | Params | Provides |
|---|---|---|
| `?f=json` | — | Service catalog, 400+ layer list |
| `/{layerId}/query` | `where`, `outFields`, `f`, `geometry`, `resultRecordCount` | Spatial features for a given layer |

Layer contents: storm track points, forecast cones, watch/warning polygons, wind radii, surge inundation, arrival times. Layer IDs shift each season — query the catalog first.

---

### MapServices (NWS ArcGIS / formerly NowCoast)
**Base URL**: `https://mapservices.weather.noaa.gov`  
**Auth**: None — `f=json` or `f=geojson` required  

| Service Path | Provides |
|---|---|
| `/eventdriven/rest/services/radar/radar_base_reflectivity/MapServer` | MRMS nationwide radar mosaic |
| `/eventdriven/rest/services/WWA/watch_warn_adv/MapServer` | Active watches, warnings, advisories (phenom codes: TO, SV, FF, WS, …) |
| `/eventdriven/rest/services/water/watch_warn_adv/MapServer` | River flood watches/warnings |
| `/tropical/rest/services/tropical/NHC_tropical_weather/MapServer` | NHC tropical data (see above) |

Old `nowcoast.noaa.gov` URLs return 403 since 2023-04-19. Use `mapservices.weather.noaa.gov` instead.

---

### ERDDAP — CoastWatch
**Base URL**: `https://coastwatch.noaa.gov/erddap`  
**Auth**: None  

| Endpoint | Key Params | Provides |
|---|---|---|
| `GET /info/index.json` | `page`, `itemsPerPage` | All dataset IDs and metadata |
| `GET /info/{datasetID}/index.json` | — | Variable names, units, time range for one dataset |
| `GET /tabledap/{datasetID}.json` | columns, filter expressions | Point observations / time series |
| `GET /griddap/{datasetID}.json` | `var[(time)][(lat):(lat)][(lon):(lon)]` | Gridded raster slice |
| `GET /search/index.json` | `searchFor`, `page`, `itemsPerPage` | Dataset search |

**Key datasets**: `noaacrwsstDaily` (SST), `noaacrwdhwDaily` (coral bleaching DHW), `erdMH1chla1day` (chlorophyll-a)  
Formats: `json`, `csv`, `tsv`, `nc`, `mat`. Square brackets must be URL-encoded (`%5B`, `%5D`). Cold cache: 30–60 s; use `timeoutMs: 90000`.

---

## Ticketmaster

**Base URL**: `https://app.ticketmaster.com/discovery/v2`  
**Auth**: `apikey=<Consumer Key>` query param (required on every request)  
**Rate**: 5,000 calls/day, 5 req/sec. Paging hard cap: `size × page < 1000`.  
See [`docs/ticketmaster/INDEX.md`](ticketmaster/INDEX.md).

| Endpoint | Key Params | Provides |
|---|---|---|
| `GET /events.json` | `keyword`, `city`, `stateCode`, `countryCode`, `startDateTime`, `endDateTime`, `classificationName`, `attractionId`, `venueId`, `segmentId`, `genreId`, `source`, `size`, `page`, `sort`, `latlong`, `radius`, `unit`, `locale`, `includeTest` | Paginated live/upcoming events with pricing, images, classifications |
| `GET /events/{id}.json` | — | Single event detail |
| `GET /events/{id}/images.json` | — | All image variants for an event |
| `GET /attractions.json` | `keyword`, `classificationName`, `source`, `size`, `page`, `locale`, `includeTest` | Artists, teams, packages with `upcomingEvents` counts |
| `GET /attractions/{id}.json` | — | Single attraction detail |
| `GET /venues.json` | `keyword`, `city`, `stateCode`, `countryCode`, `size`, `page`, `locale`, `latlong`, `radius`, `unit` | Venues with address, lat/lon, timezone |
| `GET /venues/{id}.json` | — | Single venue detail |
| `GET /classifications.json` | `size`, `page` | Segment → Genre → SubGenre taxonomy (~17 segments) |
| `GET /classifications/{id}.json` | — | Single classification node |
| `GET /classifications/segments/{id}.json` | — | Segment detail |
| `GET /classifications/genres/{id}.json` | — | Genre detail |
| `GET /classifications/subgenres/{id}.json` | — | SubGenre detail |
| `GET /suggest.json` | `keyword`, `resource` | Typeahead — top ~5 matches per entity type |

Response shape: HAL-like — results in `_embedded.{events,attractions,venues,classifications}`, pagination in `page`, links in `_links`.

---

## DOT 511

No single national API. Three tiers: federal registry, state WZDx feeds, and state traveler-info REST APIs.  
See [`docs/dot511/INDEX.md`](dot511/INDEX.md).

### WZDx Federal Registry
**URL**: `https://data.transportation.gov/resource/69qe-yiui.json`  
**Auth**: None (optional `X-App-Token` header to raise rate limit)  

| Params | Provides |
|---|---|
| `$limit`, `$offset`, `$where`, `$order` (Socrata SoQL) | Directory of 38 active WZDx state feeds — state, org, URL, format, schema version, active flag, update frequency |

---

### WZDx State Feeds (GeoJSON)
**Auth**: None (some states require IP from within state or key)  
**Shape**: GeoJSON FeatureCollection per [WZDx spec](https://github.com/usdot-jpo-ode/wzdx)

Each feature provides: `event_type`, `road_names`, `direction`, `description`, `start_date`, `end_date`, `vehicle_impact`, `lanes[]`. Schema version (3.x / 4.x / 4.2) affects field nesting.

| State | URL | Schema |
|---|---|---|
| MD | `https://filter.ritis.org/wzdx_v4.1/mdot.geojson` | 4.1 |
| NY | `https://511ny.org/api/wzdx` | 4.1 |
| WA | `https://wzdx.wsdot.wa.gov/api/v4/WorkZoneFeed` | 4.2 |
| DE | `https://wzdx.e-dot.com/del_dot_feed_wzdx_v4.1.geojson` | 4.1 |
| LA | `https://wzdx.e-dot.com/la_dot_d_feed_wzdx_v4.1.geojson` | 4.1 |
| ID | `https://511.idaho.gov/api/wzdx` | 4.1 |

---

### WSDOT — Washington DOT Traveler Info
**Base URL**: `https://www.wsdot.com/Traffic/api`  
**Auth**: `AccessCode=<key>` query param (free instant signup at `wsdot.com/traffic/api`)  
**Pattern**: `GET /{Resource}/{Resource}REST.svc/Get{Resource}AsJson?AccessCode=…`

| Resource | Provides |
|---|---|
| `HighwayAlerts` | Active highway incidents/alerts (location, headline, start time, priority) |
| `HighwayCameras` | Camera list (location, URL, lat/lon) |
| `TrafficFlow` | Speed/flow readings at sensor locations |
| `MountainPassConditions` | 16 mountain pass reports (elevation, weather, road condition, restriction) |
| `TravelTimes` | A-to-B travel time estimates (untested) |
| `BorderCrossings` | US–Canada wait times (untested) |
| `BridgeClearances` | Vertical clearance data (untested) |
| `WeatherInformation` | Road weather stations (untested) |

Response: raw JSON array (no wrapper). Dates as .NET `/Date(epoch_ms+tz)/`.

---

## SEC EDGAR

6 APIs. All free, no key. **`User-Agent` header mandatory** (`"Org Project user@email"`) on every request — omitting it returns 403.  
**Rate**: 10 req/sec per IP hard limit; exceed → 10-minute block.  
See [`docs/sec-edgar/INDEX.md`](sec-edgar/INDEX.md).

### Ticker → CIK Lookup
**URL**: `https://www.sec.gov/files/company_tickers.json`  
**Auth**: User-Agent header  

| Params | Provides |
|---|---|
| None (static file) | ~10,405 public companies: `cik_str`, `ticker`, `title` |

Related: `company_tickers_exchange.json` (adds listing exchange), `company_tickers_mf.json` (mutual funds).

---

### Submissions API
**URL**: `https://data.sec.gov/submissions/CIK{10-digit-zero-padded}.json`  
**Auth**: User-Agent header  

| Params | Provides |
|---|---|
| CIK in path | Full filing history + company identity (name, SIC, EIN, addresses, formerNames), 1,000 most-recent filings |

`filings.recent` is column-oriented (parallel arrays, not array of objects). Older filings in `filings.files[]` shards.

---

### XBRL Company Facts
**URL**: `https://data.sec.gov/api/xbrl/companyfacts/CIK{10}.json`  
**Auth**: User-Agent header  

| Params | Provides |
|---|---|
| CIK in path | Every XBRL fact ever filed for one company, grouped by taxonomy (us-gaap, dei, ifrs-full) → concept → unit → historical values |

Each value: `{start, end, val, accn, fy, fp, form, filed, frame}`. File can be 3–5 MB; use 90 s+ timeout.

---

### XBRL Company Concept
**URL**: `https://data.sec.gov/api/xbrl/companyconcept/CIK{10}/{taxonomy}/{tag}.json`  
**Auth**: User-Agent header  

| Params | Provides |
|---|---|
| CIK, taxonomy (us-gaap/dei/ifrs-full), tag (e.g. Assets) in path | Time series of one XBRL tag for one company |

Tag names can change across years (e.g. `Revenues` → `RevenueFromContractWithCustomerExcludingAssessedTax`).

---

### XBRL Frames
**URL**: `https://data.sec.gov/api/xbrl/frames/{taxonomy}/{tag}/{unit}/{period}.json`  
**Auth**: User-Agent header  

| Params | Provides |
|---|---|
| taxonomy, tag, unit (USD/shares/pure), period in path | One fact for every filer in a single period — cross-company comparison |

**Period formats**: `CY{Y}Q{q}I` (balance sheet, instantaneous), `CY{Y}Q{q}` (income/cash-flow, cumulative), `CY{Y}` (annual cumulative).

---

### Full-Text Search
**URL**: `https://efts.sec.gov/LATEST/search-index`  
**Auth**: User-Agent header  

| Params | Provides |
|---|---|
| `q` (quoted phrases, AND/OR/NOT), `forms` (10-K,8-K,…), `dateRange` (custom/1y/5y/10y), `startdt`, `enddt`, `ciks`, `entityName`, `locationCode`, `from`, `size` | Elasticsearch-style full-text search across all EDGAR filings |

Response: `{took, hits: {total, max_score, hits[]}}` — each hit has `_id` (`accession:filename`), `_score`, `_source`.

---

### Atom Recent-Filings Feed
**URL**: `https://www.sec.gov/cgi-bin/browse-edgar`  
**Auth**: User-Agent header  

| Params | Provides |
|---|---|
| `action=getcurrent` or `action=getcompany`, `type` (form type), `output=atom`, `count` (1–40), `CIK` (optional, 10-digit) | Atom 1.0 XML feed of recent filings — `<title>` (form, company, CIK), `<link>` (browse page), `<id>` (accession URN) |

XML only — no JSON variant. Useful for monitoring new filings without polling `/submissions` per company.
