# US State DOT 511 Systems — API Catalog

There is **no single national 511 API.** Every US state runs its own traveler-info system with its own URL, schema, and key. The closest thing to a federal layer is the **WZDx Feed Registry** (work-zone data exchange), which catalogs each state's work-zone feed in a unified GeoJSON format.

This folder tests:

1. The **federal registry** (no auth) — gives the directory of state feeds.
2. A **multi-state WZDx sampler** that hits 6 state work-zone feeds directly (no auth).
3. **State-specific 511 APIs** (WSDOT, 511 SF Bay, 511NY) — each needs its own free key but exposes far more than just work zones (alerts, cameras, traffic flow, signs, transit, ferries, mountain passes).

## Working APIs

| # | API | Auth | Status | Test file | Docs |
|---|---|---|---|---|---|
| 1 | **WZDx Federal Registry** (USDOT) | none | ✓ 38 active feeds / 33 states | `tests/dot511/wzdx-registry.js` | [WZDx-Registry.md](WZDx-Registry.md) |
| 2 | **WZDx state sampler** (MD/NY/WA/DE/LA/ID) | none | ✓ ~10k work zones | `tests/dot511/wzdx-states.js` | [WZDx-State-Feeds.md](WZDx-State-Feeds.md) |
| 3 | **WSDOT** (Washington Traveler Info) | free access code | ✓ 189 alerts, 1681 cameras, 1465 flow stations, 16 passes | `tests/dot511/wsdot.js` | [WSDOT.md](WSDOT.md) |
| 4 | **511 SF Bay** (Open Data) | free key | ⏸ scaffolded, awaiting key | `tests/dot511/sf-bay-511.js` | (added on first PASS) |
| 5 | **511NY** | free key | ⏸ scaffolded, awaiting key | `tests/dot511/ny-511.js` | (added on first PASS) |

## What WZDx covers vs what state APIs cover

| Data type | WZDx (federal-style) | State 511 APIs |
|---|---|---|
| Work zones (construction) | ✓ standardized GeoJSON | ✓ via state-specific schema |
| Crashes / accidents       | ⨯ | ✓ |
| Weather impacts / closures | ⨯ | ✓ |
| Cameras                   | ⨯ | ✓ |
| Traffic flow / speeds     | ⨯ | ✓ |
| Variable message signs    | ⨯ | ✓ |
| Mountain passes           | ⨯ | ✓ (WSDOT) |
| Toll rates                | ⨯ | ✓ (WSDOT, NY, others) |
| Ferries                   | ⨯ | ✓ (WSDOT) |
| Transit                   | ⨯ | ✓ (511 SF Bay, others) |
| Border crossings          | ⨯ | ✓ (WSDOT) |

WZDx is great for *consistent national coverage of one narrow data class*. For everything else you have to deal with state-by-state APIs.

## Coverage matrix (33 states with active WZDx feeds)

Pulled live from the WZDx Feed Registry, 2026-06-05.

Arizona, California, Colorado, Delaware, Florida, Hawaii, Idaho, Illinois (×2), Indiana, Iowa, Kansas, Kentucky, Louisiana, Maryland, Michigan, Minnesota, Missouri (×2), Montana, Nebraska, New Jersey, New Mexico, New York, North Carolina, North Dakota, Ohio, Oklahoma, Pennsylvania, South Carolina, South Dakota, Tennessee, Texas (Austin only), Utah, Virginia, Washington, Wisconsin.

States **without** a WZDx feed in the registry today: AL, AK, AR, CT, GA, ME, MA, MS, NV, NH, OR, RI, VT, WV, WY, DC.

## State-by-state API gateway pages

Most state 511 systems sit behind a "developers" page on their public site. Quick list (free key required unless noted):

| State | Portal |
|---|---|
| Alaska         | <https://511.alaska.gov/developers/> |
| Arizona        | <https://www.az511.com/developers/doc> |
| California (SF Bay) | <https://511.org/open-data> |
| Georgia        | <https://511ga.org/developers/doc> |
| Idaho          | <https://511.idaho.gov/developers/doc> |
| Illinois (Gettingaround Illinois) | <https://www.gettingaroundillinois.com/api/> |
| Iowa           | <https://511ia.org/developers/doc> |
| Louisiana      | <https://www.511la.org/developers/doc> |
| Michigan       | <https://mdotjboss.state.mi.us/MiDrive/help/api> |
| Minnesota      | <https://511mn.org/developers/doc> |
| New Jersey     | <https://511nj.org/developers/doc> |
| New York       | <https://511ny.org/developers/help> |
| North Carolina | <https://drivenc.gov/developers/> |
| Pennsylvania   | <https://www.511pa.com/developers/doc> |
| Texas (Austin) | <https://data.austintexas.gov/> *(Socrata)* |
| Utah           | <https://utah.commuterlink.com/api> |
| Virginia       | <https://511virginia.org/developers/> |
| Washington     | <https://wsdot.wa.gov/traffic/api/> |

Many of the "511XX.org" sites share a vendor stack (Arcadis / Iteris / CARS) so their API shapes are nearly identical — once you've used one, the others are quick.

## Federal layer alternatives we noticed

- **WZDx Feed Registry** (tested here) — work zones only.
- **NREL TransAtlas** — alt-fuel infrastructure, not real-time traffic.
- **BTS / FHWA aggregated data** — historical, not real-time.
- **data.transportation.gov** (Socrata) — the federal open-data portal; WZDx registry is one of many datasets there.
- **Road511.com** — third-party commercial aggregator; normalizes 65 jurisdictions plus FHWA into a single REST contract. Not USDOT-affiliated. Not free.

## Recurring gotchas across DOT feeds

- **Content-Type lies.** WZDx feeds from `wzdx.e-dot.com` (DE, LA) serve JSON as `application/octet-stream`. The harness's `\bjson\b` content-type check skips parsing — every test in this folder defensively re-parses string bodies.
- **No User-Agent → 403.** Some state feeds (Utah, Iowa, Wisconsin, Missouri direct hosts) block default Node/curl UAs. Even browser UAs got rejected from outside-the-state IPs in our test — likely IP geofencing or Akamai bot rules. The federal registry shows them as `active: true, needapikey: false`, but practical access can require either an in-state IP or a UA whitelist request to the state DOT.
- **Schema versions vary.** WZDx is in flux — v3.0, v4.0, v4.1, v4.2 all appear in the wild. The shape of `feed_info` vs `road_event_feed_info` changed between major versions. Always read the version field before mapping fields.
- **"Active" in the registry ≠ reachable.** The `active: true` flag in the registry means "the state intends this feed to be live"; it does not guarantee the URL responds today. ~20% of registered feeds we probed returned 403/503/timeout.
- **Per-jurisdiction quirks** — Oklahoma embeds the access token in the URL even though `needapikey=false`; Texas is one Austin-only city feed; some Missouri feeds duplicate (state + St. Charles County).

## Token storage

In `.env` (gitignored):

```bash
WSDOT_ACCESS_CODE=         # signup: https://wsdot.wa.gov/traffic/api/
SF_BAY_511_KEY=            # signup: https://511.org/open-data/token
NY_511_KEY=                # signup: https://511ny.org/developers/help
```

## How to run

```bash
node --env-file=.env tests/run-all.js dot511
```
