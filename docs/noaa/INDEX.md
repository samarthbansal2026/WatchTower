# NOAA — API Catalog

NOAA is an umbrella for **dozens** of operational data services. As of 2026-06-05 this catalog covers **13 working test suites** across **9 distinct NOAA service families**.

## Working APIs

| # | Service | Auth | Latency | Test file | Docs |
|---|---|---|---:|---|---|
| 1  | **NWS** — forecast (`api.weather.gov`) | none (UA req.) | ~70 ms | `tests/noaa/nws.js` | [NWS.md](NWS.md) |
| 2  | **NWS** — alerts + observations | none (UA req.) | ~1.8 s | `tests/noaa/nws-alerts.js` | [NWS.md](NWS.md) |
| 3  | **NCEI Access** — climate data subset | none | ~4 s | `tests/noaa/ncei-access.js` | [NCEI-Access.md](NCEI-Access.md) |
| 4  | **NCEI CDO v2** — all 7 endpoints | token | ~28 s | `tests/noaa/cdo.js` | [NCEI-CDO.md](NCEI-CDO.md) |
| 5  | **CO-OPS** — Tides & Currents | none | ~1.5 s | `tests/noaa/tides.js` | [Tides-Currents.md](Tides-Currents.md) |
| 6  | **AWC** — Aviation Weather (METAR/TAF) | none | ~1–15 s | `tests/noaa/aviation.js` | [Aviation-Weather.md](Aviation-Weather.md) |
| 7  | **SWPC** — Space Weather (Kp, solar wind) | none | ~60 ms | `tests/noaa/swpc.js` | [SWPC.md](SWPC.md) |
| 8  | **NWPS** — National Water Prediction Service | none | ~1.6 s | `tests/noaa/nwps.js` | [NWPS.md](NWPS.md) |
| 9  | **NGS** — Geodesy (geoid heights) | none | ~1.6 s | `tests/noaa/ngs-geoid.js` | [NGS.md](NGS.md) |
| 10 | **NGS** — NCAT + OPUS siblings | none | ~2 s | `tests/noaa/ngs-siblings.js` | [NGS.md](NGS.md) |
| 11 | **NHC** — National Hurricane Center (ArcGIS REST) | none | ~2.2 s | `tests/noaa/nhc.js` | [NHC.md](NHC.md) |
| 12 | **MapServices** — Watches/Warnings/Radar (replaces NowCoast) | none | ~2.5 s | `tests/noaa/mapservices.js` | [MapServices.md](MapServices.md) |
| 13 | **ERDDAP CoastWatch** — gridded ocean/satellite data | none | ~40 s (cold) | `tests/noaa/erddap.js` | [ERDDAP.md](ERDDAP.md) |

## Coverage by NOAA line office

- **NWS (National Weather Service)** — #1, #2, #6, #7, #11 *(NHC is part of NWS)*, #12
- **NCEI / former NCDC (National Centers for Environmental Information)** — #3, #4
- **NOS (National Ocean Service)** — #5 (CO-OPS), #9, #10 (NGS), #13 (CoastWatch sits on NESDIS data)
- **NWS Office of Water Prediction** — #8

## What overlaps

- **Daily climate observations** can be pulled from either **NCEI Access** (no token) or **CDO v2** (token). Same underlying GHCN data, different URL/auth styles.
- **Hourly weather observations** for airports come from both **AWC** (`/metar`, last 15 days) and **NWS** (`/stations/{id}/observations`, real-time only).
- **Active alerts** are accessible via **NWS** (`/alerts/active`, native JSON) and **MapServices** (`WWA/watch_warn_adv`, ArcGIS REST + GeoJSON). Use NWS for individual alerts; MapServices for map-tile / spatial-query use cases.
- **NWPS** gauges include `usgsId` to cross-link with USGS NWIS — useful when you need both NOAA forecasts and USGS historical flow.
- **NHC tropical products** live on the same MapServices host as the WWA layer — they're partitioned into `/tropical/` vs `/eventdriven/` folders.

## Service migration notes (2023–2026)

- **NowCoast** retired its `/arcgis/rest/services/` endpoint on 2023-04-19. Successor: **`mapservices.weather.noaa.gov`** (see #12).
- **NCDC → NCEI** rename (2015) — both `www.ncdc.noaa.gov` and `www.ncei.noaa.gov` still resolve for the CDO v2 host. New code should use `ncei`.

## Partially covered

- **NGS** has 7 sub-APIs; **3 are tested** (GEOID, NCAT-LLH/USNG, OPUS-meta). Untested: GRAV-D, Data Explorer, NCN, VDatum, NCAT-SPC (server-side 500 on our probe).
- **NHC MapServer** has 400 layers; we test the catalog + one feature query.
- **MapServices** has 4 folders (`radar`, `WWA`, `water`, `Utilities`); we test WWA.
- **ERDDAP CoastWatch** hosts thousands of datasets; we test one (`noaacrwsstDaily`).

## Not yet tested (deliberately excluded for now)

| Service | Why deferred |
|---|---|
| NWS NDFD legacy XML/REST | Being replaced by api.weather.gov; lower priority |
| READY Web API (Air Resources Lab) | Niche; HYSPLIT trajectories |
| MDL Data API (`data-api.mdl.nws.noaa.gov`) | Experimental NWS Meteorological Development Lab |
| OneStop catalog search (`data.noaa.gov`) | Metadata discovery, no data |
| Fisheries InPort (`fisheries.noaa.gov/inport`) | Metadata catalog, XML-first |
| SPC / CPC | Mostly file-based, no JSON REST |
| NESDIS / NOMADS | GRIB on S3; no REST surface |

## Token storage

Only one token is required so far — `NCEI_CDO_TOKEN` in `.env`. Get one at <https://www.ncei.noaa.gov/cdo-web/token>.

## How to run

```bash
node --env-file=.env tests/run-all.js
```

Latest full run: **13/13 PASS** (one transient ERDDAP 502 cleared on retry).
