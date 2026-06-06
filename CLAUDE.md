# CLAUDE.md — watchtower

## What this project is

A Node.js harness for **testing and documenting live public APIs** — one service at a time, exhaustively.

The deliverables for every service are:

1. A working Node.js test (or several) under `tests/<service>/` that hits the real live API and asserts a sane response shape.
2. A human-readable doc per API under `docs/<service>/` covering auth, endpoints, sample request/response, and gotchas.
3. A `docs/<service>/INDEX.md` catalog when the service has multiple distinct APIs (most do).

This is *not* an SDK or a client library. The tests are the validation; the docs are the takeaway.

---

## Per-service workflow (the rules of engagement)

When the user names a service ("let's do NOAA", "let's do Google Maps", "let's do Stripe"), follow this loop *every time*:

### 1. Discover ALL of the APIs first — don't stop at the obvious one

Most named services are **umbrellas** with many sub-APIs (e.g. NOAA had 9 distinct services; Google Cloud has 100+). Before writing a single test:

- Web-search for the full inventory: `"<service> public APIs list"`, `"<service> API catalog"`, `"<service> developer docs"`.
- Search across the service's known sub-organizations / line offices.
- Look at recent dates (use the current year in queries) to avoid hitting retired services as if they were live.
- If the service has an obvious "API directory" or developer portal, fetch it.

Present the discovered list to the user **before testing**. Ask which subset to cover if the list is huge.

### 2. Pause for any credentials before testing

If an API requires a key, OAuth client, or other secret:

- Tell the user the **exact URL** to get it (e.g. `https://www.ncei.noaa.gov/cdo-web/token`).
- Use `AskUserQuestion` so they can paste it inline.
- Store it in `.env` (gitignored) under a clearly named variable (`NCEI_CDO_TOKEN`, `STRIPE_SECRET_KEY`, etc.).
- Also add the variable to `.env.example` with a placeholder so future readers know it's needed.
- **Never** commit a real secret. Never hardcode a token in a test file or doc.

### 3. Test the API for real

For each distinct sub-API:

- Create `tests/<service>/<sub-api>.js` following the test file pattern below.
- Run it once with `node -e "import('./tests/<service>/<sub-api>.js').then(m => m.run()).then(r => console.log(JSON.stringify(r, null, 2)))"`.
- If it fails, **investigate** — read the raw response, fix the test, re-run. Don't drop the API on the first failure.
- Common silent failures to check for: `application/geo+json` not being parsed as JSON, ArcGIS field-name case sensitivity, services that return HTTP 200 with an error body, services that need a `User-Agent` header.

### 4. Document only what works

- For each PASS, write `docs/<service>/<API-Name>.md` using the template below.
- For documented-but-untestable sub-APIs (server bug, deprecated, deliberately deferred), still mention them in the parent doc / INDEX with a status note. Don't pretend they don't exist.

### 5. Build / update the catalog index

If the service has more than one sub-API, maintain `docs/<service>/INDEX.md` with a matrix of: name, auth, latency, test file, docs link, status.

### 6. Run the full suite at the end

`node --env-file=.env tests/run-all.js <service>` should report `N pass, 0 fail` before declaring the service done. Transient 5xx is fine on retry; record the latency.

---

## Layout

```
watchtower/
├── CLAUDE.md                       ← this file
├── package.json                    ESM, "type": "module"; dep: dotenv
├── .env                            REAL secrets (gitignored)
├── .env.example                    placeholders for required env vars
├── .gitignore                      node_modules/, .env
├── lib/
│   └── test-runner.js              shared helpers (see below)
├── tests/
│   ├── run-all.js                  recurses; filter by folder name or tier id
│   └── <service>/                  one folder per umbrella service
│       └── <sub-api>.js            one file per distinct API
└── docs/
    └── <service>/                  one folder per umbrella service
        ├── INDEX.md                catalog matrix (when >1 sub-API)
        └── <Sub-API>.md            one file per distinct API
```

### File naming

- Test files: kebab-case, no service prefix once inside the folder (`tests/noaa/nws.js`, not `tests/noaa/noaa-nws.js`).
- Doc files: PascalCase or hyphenated, dropping the service prefix (`docs/noaa/NWS.md`, not `docs/noaa/NOAA-NWS.md`).
- Index file is always `INDEX.md`.

---

## Test file pattern

Every `tests/<service>/<api>.js` must export:

```js
import { timedFetch, pass, fail } from '../../lib/test-runner.js';

export const name = 'Human-readable API name';   // e.g. 'NOAA NWS'
export const tier = 'tier1';                      // tier1 (no auth) / tier2 (key) / tier3 (oauth)

export async function run() {
  const t0 = Date.now();
  try {
    const r = await timedFetch('https://…', { /* headers, timeoutMs */ });
    if (!r.ok) return fail(name, r.ms, `HTTP ${r.status}`, r.status);
    if (!sane(r.body)) return fail(name, r.ms, 'unexpected response shape');
    return pass(name, r.ms, { /* a small, useful sample */ });
  } catch (e) {
    return fail(name, Date.now() - t0, e);
  }
}
```

Rules:

- Validate both `r.ok` AND the response shape. HTTP 200 is not proof the API worked — some services return errors as 200 with an error body.
- Keep the `sample` payload small (a representative slice, not the whole response).
- Default request timeout is 15 s. Bump explicitly (`{ timeoutMs: 90000 }`) for known-slow services (ERDDAP, NCEI Access, NCEI CDO).

---

## `lib/test-runner.js` helpers

- `timedFetch(url, opts)` — `fetch` + timing + auto-JSON parsing for any `*json*` content-type (handles `application/json`, `application/geo+json`, `application/ld+json`, …). Honors `opts.timeoutMs` (default 15000).
- `pass(name, ms, sample, notes?)` — success result.
- `fail(name, ms, error, status?)` — failure result.
- `skip(name, reason)` — use when a test is scaffolded but blocked on a missing credential. Reports as `SKIP` (yellow) in the suite, does not count as pass or fail. Use this instead of `fail` for missing env vars — failures should be real bugs, not "I haven't pasted the key yet."
- `printResultLine`, `printSummary` — used by `run-all.js`.

If you need a new shared helper, add it here, don't duplicate across tests.

---

## Doc template

Each `docs/<service>/<API>.md` should hit these sections, in this order:

```markdown
# <Service> <API> — <one-line subtitle>

- **Service**: what it is
- **Homepage**: <link to official docs>
- **Base URL**: `https://…`
- **Auth**: none / API key (where to get one) / OAuth (which flow)
- **Cost**: free / paid tiers
- **Rate limits**: documented limits + observed behavior

## Tested on
YYYY-MM-DD — `PASS` in ~Xms/s.

## Endpoints (or "Endpoints tested" + "Other endpoints")

## Sample request (Node.js)
```js
…
```

## Sample response (truncated)
```json
…
```

## Gotchas
- Anything non-obvious we hit. This is the most valuable section.

## Test file
`tests/<service>/<api>.js`
```

Doc voice: terse, factual, no marketing. The "Gotchas" section is what makes the doc worth keeping — surface every weirdness encountered while writing the test.

---

## Running

```bash
# Everything
node --env-file=.env tests/run-all.js

# Just one service
node --env-file=.env tests/run-all.js noaa

# A single test
node -e "import('./tests/noaa/nws.js').then(m=>m.run()).then(r=>console.log(JSON.stringify(r,null,2)))"
```

The harness exits 0 only if every test passes; CI-friendly.

---

## Conventions and lessons learned

### Workflow

- **One service per session.** The user names a top-level service; the session is complete when that service is fully covered. Don't preemptively jump to other services.
- **Exhaustive discovery up front.** Don't write the first test until you've inventoried all sub-APIs via web search. Skipping this step has burned us — early NOAA work covered 1 of 9 sub-APIs.
- **Pause for credentials, don't skip the API.** If a key is needed, ask for it rather than dropping the API to "untested".
- **Verify docs aren't stale.** Service URLs change. NowCoast retired its endpoint in 2023 and the *old* `nowcoast.noaa.gov/arcgis/...` URL still appears in tutorials — always probe live before trusting a doc page.
- **Tasks for >3 steps.** Use TaskCreate when a service has multiple sub-APIs to track which are done. Don't track trivial single-file work.

### Technical gotchas (collected from real failures)

- **Content-type `application/geo+json`** is JSON but not literally `application/json`. The `timedFetch` helper now matches `\bjson\b` so any `*+json` variant parses correctly. Don't regress this.
- **`User-Agent` is mandatory** on NWS / `api.weather.gov` AND Overpass API. Requests without it get HTTP 406 from Overpass (not 403 — different error than NWS). Identify yourself: `"app-name (contact@example.com)"`.
- **Overpass rate limit is 2 concurrent slots.** Running tests sequentially but quickly can still hit 429. Add retry-with-backoff (6 s, 2 retries) to all Overpass interpreter tests.
- **Overpass 429 and 504 are both transient.** Retry handles both equally. The public `overpass-api.de` server is community-operated and occasionally overloads.
- **Census ACS returns HTTP 200 with HTML "Missing Key" body on bad/absent API key.** The response is not JSON — check `typeof body === 'string' && body.includes('Missing Key')` before parsing.
- **Census geocoder `x`/`y` = longitude/latitude** (Cartesian). It is NOT `lat/lon` order. Swapping returns null geography silently.
- **ArcGIS REST field names are case-sensitive lowercase.** `outFields=Event` matches nothing where `event` does. Always inspect `/MapServer/{id}/query?…&resultRecordCount=1&outFields=*` first.
- **ArcGIS REST needs `f=json` (or `f=geojson`).** Without it you get an HTML viewer page.
- **HTTP 200 ≠ success.** CO-OPS, ArcGIS, some Google APIs return errors as 200 with an error body. Always read `body.error`/`body.message`.
- **Variable name ≠ dataset ID.** ERDDAP datasets expose their own variable names — pull `/info/{datasetID}` before constructing a griddap/tabledap query. Wrong variable returns HTTP 500.
- **ERDDAP cold-cache calls are slow** (30–60 s). Use `timeoutMs: 90000` for the first request to any dataset.
- **NCEI CDO v2 token header is literally `token`**, not `Authorization: Bearer`. Wrong header silently returns empty results (200 with `count: 0`).
- **CO-OPS request `datum=` is required** for `water_level` / `predictions`. Omitting it returns 200 with an error body.
- **Square brackets in ERDDAP griddap queries must be URL-encoded** (`%5B`, `%5D`). Most HTTP clients don't auto-encode.
- **NWS `/alerts/active` rejects `limit=`.** Filter with `point=`, `area=`, `zone=`, `severity=` instead.
- **Eventbrite `/events/search/` is gone.** Permanently removed December 2019 — returns 404. No proximity search exists in v3.
- **Eventbrite `owned_events` requires an organizer account.** Returns 404 "user_id does not exist" for pure attendee accounts that have never created an event. Use `/users/me/orders/` for attendees; `/organizations/{id}/events/` or venue-discovery for event IDs.
- **Eventbrite `/venues/{id}/events/` rejects `page_size` and `status`.** Both return 400 ARGUMENTS_ERROR. Call with no query params.
- **Eventbrite latency is highly variable (1–30 s).** Always set `timeoutMs: 30000` on all Eventbrite calls.
- **BallDontLie rate-limits very aggressively.** Even 3–4 rapid requests trigger 429. Space requests or use sequential calls.
- **BallDontLie `Authorization` header is a raw key, not `Bearer <key>`.** Applies to NBA, NFL, MLS, and all other BallDontLie sports.
- **BallDontLie NFL subdomain docs are wrong.** Docs say `nfl.balldontlie.io` but the real working base is `api.balldontlie.io/nfl/v1/`.
- **BallDontLie MLS matches are a paid add-on.** `GET /mls/v1/teams` is free; `GET /mls/v1/matches` returns 401 on free keys.
- **NHL schedule returns a week, not a day.** `/v1/schedule/{date}` returns `gameWeek[]` array covering ~7 days — find your target date in the array.
- **ESPN unofficial scoreboard covers all 5 major US sports** with consistent venue data: `site.api.espn.com/apis/site/v2/sports/{sport}/{league}/scoreboard`. No auth. Use `dates=YYYYMMDD-YYYYMMDD` for ranges.
- **ESPN MLS date format is `YYYYMMDD`**, not ISO `YYYY-MM-DD` — wrong format returns 0 events silently.
- **BallDontLie NBA has no venue field.** Use ESPN `basketball/nba` scoreboard if arena name is required.
- **Open-Meteo seasonal `models=ec46` is invalid.** The string "ec46" is rejected with a 400 MultiDomains error — omit `models=` entirely to get the default SEAS5 50-member ensemble.
- **Open-Meteo marine silently returns empty arrays for land coordinates.** No error is returned; wave_height is just empty. Use an ocean point.
- **Open-Meteo pollen variables** (air quality API) are populated for Europe only — nulls everywhere else with no error.
- **Open-Meteo has a different subdomain per API family**: `api.`, `archive-api.`, `seasonal-api.`, `ensemble-api.`, `marine-api.`, `air-quality-api.`, `flood-api.`, `climate-api.`, `geocoding-api.` — easy to mix up.

### Discovery patterns

- Check the *line offices* / sub-orgs of an umbrella (e.g. NOAA → NWS, NCEI, NOS, NMFS, …).
- Look for ArcGIS REST hosts at `mapservices.*.gov`, `services.*.com`, `gis.*.org`.
- Look for ERDDAP at `coastwatch.*.noaa.gov/erddap`, `*pfeg*/erddap`, similar.
- Look for legacy XML APIs that have a JSON successor (NDFD legacy → api.weather.gov).
- Use the web fetch tool on the OpenAPI / Swagger UI page when available.
- When `/api/v1/openapi.json` or `/swagger.json` exists, prefer it over scraping the docs.

### What NOT to do

- Don't generate a test that calls only one endpoint per service. Multi-endpoint smoke tests catch shape mismatches.
- Don't write a `docs/<API>.md` for an API that doesn't have a PASSING test. Either fix the test or note it as "not tested" in the parent doc.
- Don't fabricate response samples. Copy from a real call.
- Don't add new top-level dependencies without a reason. We're on Node 18+ `fetch`; `dotenv` is the only dep.
- Don't add TypeScript, ESLint, build steps, or frameworks. The scaffold is intentionally plain.
- Don't run `git init`, commit, or push unless explicitly asked. The repo currently isn't even under git.

---

## Service status (kept current; new services added here)

| Service | Folder | Tests | Status |
|---|---|---:|---|
| NOAA | `tests/noaa/` + `docs/noaa/` | 13 | ✓ All passing. See [docs/noaa/INDEX.md](docs/noaa/INDEX.md). |
| Ticketmaster | `tests/ticketmaster/` + `docs/ticketmaster/` | 5 | ✓ All passing. 13 Discovery v2 endpoints across 5 test files. See [docs/ticketmaster/INDEX.md](docs/ticketmaster/INDEX.md). |
| DOT 511 | `tests/dot511/` + `docs/dot511/` | 5 | ✓ 3 pass, 2 skip (key pending). WZDx federal registry, 6-state work-zone sampler, WSDOT. 511 SF Bay + 511NY scaffolded. See [docs/dot511/INDEX.md](docs/dot511/INDEX.md). |
| SEC EDGAR | `tests/sec-edgar/` + `docs/sec-edgar/` | 6 | ✓ All passing. Tickers, submissions, XBRL company facts + concept, XBRL frames, full-text search, Atom feed. No auth — User-Agent header mandatory. See [docs/sec-edgar/INDEX.md](docs/sec-edgar/INDEX.md). |
| Eventbrite | `tests/eventbrite/` + `docs/eventbrite/` | 4 | ✓ All passing. User/orgs, taxonomy, event detail + orders, venues. Bearer token auth. No public event search (removed Dec 2019). See [docs/eventbrite/INDEX.md](docs/eventbrite/INDEX.md). |
| Sports Schedules | `tests/sports-schedules/` + `docs/sports-schedules/` | 5 | ✓ All passing. MLB official (no auth, 2464 games single call), NBA + NFL BallDontLie (free key, cursor-paginated), NHL official (no auth, per-team 82-game endpoint), MLS via ESPN unofficial (no auth, venue included). See [docs/sports-schedules/INDEX.md](docs/sports-schedules/INDEX.md). |
| University Academic Calendars | `tests/uni-calendars/` + `docs/uni-calendars/` | 2 | ✓ All passing. 25Live (4 universities, no auth) + PredictHQ (1036 graduation / 895 exam / 2836 session events, Bearer token). See [docs/uni-calendars/INDEX.md](docs/uni-calendars/INDEX.md). |
| FRED / Federal Reserve | `tests/fred/` + `docs/fred/` | 7 | ✓ All passing. Series metadata + observations for 12 macro indicators (UNRATE, CPI, DGS10, GDPC1, …), categories, releases, search, sources, NY Fed reference rates (SOFR/EFFR/OBFR/TGCR/BGCR — no auth). See [docs/fred/INDEX.md](docs/fred/INDEX.md). |
| OpenStreetMap Overpass | `tests/overpass/` + `docs/overpass/` | 6 | ✓ All passing. Status/timestamp, nearby amenities, construction activity, transit proximity, attic historical diff, output formats (JSON/XML/CSV). No auth — User-Agent mandatory. See [docs/overpass/INDEX.md](docs/overpass/INDEX.md). |
| US Census ACS | `tests/census-acs/` + `docs/census-acs/` | 1 | ✓ All passing. Two-step: geocoder (no auth) → ACS 5-year demographics by census tract (population, median income, poverty rate, housing units). See [docs/census-acs/INDEX.md](docs/census-acs/INDEX.md). |
| Open-Meteo | `tests/open-meteo/` + `docs/open-meteo/` | 10 | ✓ All passing. Forecast (16-day), Historical (ERA5 to 1940), Seasonal (SEAS5, 50 members, 7 months), Ensemble (ICON 40-member), Marine, Air Quality, Flood (GloFAS), Satellite Radiation, Climate Change (CMIP6 1950–2050), Geocoding. All tier1, no auth. See [docs/open-meteo/INDEX.md](docs/open-meteo/INDEX.md). |

When you finish a new service, add a row here and a fresh INDEX.md under its folder.
