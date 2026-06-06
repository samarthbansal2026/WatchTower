# FRED Series & Observations — St. Louis Fed Economic Data

- **Service**: Federal Reserve Bank of St. Louis — Federal Reserve Economic Data (FRED)
- **Homepage**: https://fred.stlouisfed.org/docs/api/fred/
- **Base URL**: `https://api.stlouisfed.org/fred`
- **Auth**: API key — free, register at https://fredaccount.stlouisfed.org/login/secure/ → My Account → API Keys. Pass as query param `api_key=`.
- **Cost**: Free, no tiers
- **Rate limits**: Not documented; practical experience: sequential calls at ~1/s are fine. No rate limit errors observed.

## Tested on
2026-06-06 — `PASS` in ~5500ms (12 series, 3 obs each).

## Endpoints

### `GET /fred/series`
Get metadata for a single series.

**Params**: `series_id`, `api_key`, `file_type=json`

**Response shape**: `{ seriess: [{ id, title, observation_start, observation_end, frequency, frequency_short, units, units_short, seasonal_adjustment, last_updated, popularity }] }`

### `GET /fred/series/observations`
Get actual data values for a series.

**Params**: `series_id`, `api_key`, `file_type=json`, `sort_order=asc|desc`, `limit`, `offset`, `observation_start`, `observation_end`

**Response shape**: `{ count, observations: [{ realtime_start, realtime_end, date, value }] }`

## Key macro series IDs

| Series ID | Description | Frequency | Units |
|---|---|---|---|
| `UNRATE` | Unemployment Rate | Monthly | % |
| `CPIAUCSL` | CPI All Urban Consumers | Monthly | Index 1982-84=100 |
| `FEDFUNDS` | Effective Fed Funds Rate | Monthly | % |
| `DGS10` | 10-Year Treasury CMT | Daily | % |
| `GDPC1` | Real GDP (chained 2017$) | Quarterly | Bil. Chained 2017$ |
| `HOUST` | Housing Starts: Total | Monthly | Thousands of Units |
| `UMCSENT` | U of Michigan Consumer Sentiment | Monthly | Index 1966:Q1=100 |
| `PCEPI` | PCE Price Index | Monthly | Index 2017=100 |
| `CIVPART` | Labor Force Participation Rate | Monthly | % |
| `M2SL` | M2 Money Supply | Monthly | Billions of $ |
| `T10Y2Y` | 10Y-2Y Treasury Yield Spread | Daily | % |
| `DCOILWTICO` | WTI Crude Oil Price | Daily | $/bbl |

## Sample request (Node.js)

```js
// Latest unemployment rate
const r = await fetch(
  'https://api.stlouisfed.org/fred/series/observations' +
  '?series_id=UNRATE&api_key=YOUR_KEY&file_type=json&sort_order=desc&limit=1'
);
const data = await r.json();
const latest = data.observations[0]; // { date: '2026-05-01', value: '4.3' }
```

## Sample response (truncated)

```json
{
  "realtime_start": "2026-06-05",
  "realtime_end": "2026-06-05",
  "observation_start": "1600-01-01",
  "observation_end": "9999-12-31",
  "units": "lin",
  "output_type": 1,
  "file_type": "json",
  "order_by": "observation_date",
  "sort_order": "desc",
  "count": 920,
  "offset": 0,
  "limit": 3,
  "observations": [
    { "realtime_start": "2026-06-05", "realtime_end": "2026-06-05", "date": "2026-05-01", "value": "4.3" },
    { "realtime_start": "2026-06-05", "realtime_end": "2026-06-05", "date": "2026-04-01", "value": "4.2" },
    { "realtime_start": "2026-06-05", "realtime_end": "2026-06-05", "date": "2026-03-01", "value": "4.2" }
  ]
}
```

## Gotchas

- **Missing values are `"."` strings**, not `null`. Filter `observations.filter(o => o.value !== '.')` before parsing as float.
- **Observations key is `seriess` (double-s)**, not `series`. Applies to all endpoints returning series arrays.
- **Series metadata endpoint key is also `seriess`** — `r.body.seriess[0]`, not `r.body.series`.
- **`observation_start`/`end` default to `1600-01-01` / `9999-12-31`** — these are just API defaults, not actual data bounds. The real data bounds are `observation_start` and `observation_end` in the series metadata.
- **`sort_order=desc` + `limit=N` is the idiom for getting the latest N values.** Default is ascending from the beginning of history.
- **ALFRED vintage data** is accessible via the same `series/observations` endpoint with `realtime_start` and `realtime_end` params — lets you pull what the data looked like on any past date.
- **`file_type=json` is required.** Without it the API returns XML.

## Test files
`tests/fred/series.js` — series metadata for 10 indicators  
`tests/fred/observations.js` — latest values for 12 macro series
