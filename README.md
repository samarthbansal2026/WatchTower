# WatchTower

A Node.js harness for testing and documenting live public APIs, plus a set of
scripts that pull real-time store-context signals (weather, traffic, events,
social chatter) for a configured portfolio of retail store locations.

## Setup

```bash
npm install
cp .env.example .env   # fill in whichever keys you need — see below
```

Requires Node 18+.

## What's here

### API test harness

`tests/<service>/` holds one file per external API, each with a `run()` that
hits the live API and validates the response shape. `docs/<service>/` has the
matching human-readable docs (auth, endpoints, gotchas). See `CLAUDE.md` for
the full per-service workflow and the layout convention.

```bash
node --env-file=.env tests/run-all.js        # everything
node --env-file=.env tests/run-all.js noaa   # one service
```

### Store signal scripts

These pull data for the stores configured in `stores/portfolio.js` (or an
explicit `lat lon` on the CLI):

| Script | What it does |
|---|---|
| `forecast-7d.js` | Next-7-day outlook: weather, local events (Ticketmaster/Eventbrite/PredictHQ), nearby traffic/work zones |
| `past-7d.js` | Same signals, looking backward over the last 7 days |
| `social-7d.js` | 7-day social chatter (Reddit/Twitter/TikTok/Instagram) via SociaVault or RapidAPI |
| `stores/store-intel.js` | Combined preparation report per store (NWS alerts, weather, events) |

```bash
node --env-file=.env forecast-7d.js                  # all configured stores
node --env-file=.env forecast-7d.js 40.8002 -73.9388  # single lat/lon
node --env-file=.env social-7d.js --only=instagram --store=delhi-croma-odeon-cp
npm run intel
```

Output lands in `logs/<store>-<script>-<date>-{raw,clean}.json` (gitignored).

### `scripts/`

One-off helpers for discovering/resolving Eventbrite venue IDs to paste into
`stores/portfolio.js` — Eventbrite has no geo-search API, so venue IDs are
curated per store ahead of time.

### `watchtower-data-writer.py`

Reads the JSON files in `logs/` and writes directly-derivable fields into a
sibling `retailabs-erp` checkout's TypeScript data files. Requires
`../retailabs-erp` to exist next to this repo. Sections needing narrative or
forecasting judgment are left for human/LLM review — see the script's
docstring for the full read/write map.

## Environment variables

See `.env.example` for the full list with signup links. Most scripts degrade
gracefully (skip) rather than fail when a key is missing.

## Repo layout

```
watchtower/
├── lib/test-runner.js     shared fetch/pass/fail/skip helpers
├── tests/<service>/       API smoke tests
├── docs/<service>/        API docs (INDEX.md catalog + per-API pages)
├── stores/portfolio.js    configured store locations
├── scripts/               one-off Eventbrite venue-discovery helpers
├── forecast-7d.js         forward-looking store signals
├── past-7d.js             backward-looking store signals
├── social-7d.js           social chatter pull
└── watchtower-data-writer.py   writes raw signals into the ERP data layer
```
