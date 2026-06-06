# NBA BallDontLie — Full season schedule (paginated)

- **Service**: BallDontLie NBA API
- **Homepage**: https://www.balldontlie.io/
- **Base URL**: `https://api.balldontlie.io/v1/`
- **Auth**: API key in `Authorization` header (raw key, no `Bearer` prefix)
- **Cost**: Free tier; signup at balldontlie.io
- **Rate limits**: Very aggressive — bursting 3+ requests triggers 429. Add delays between paginated fetches.

## Tested on
2026-06-05 — `PASS` in ~1.8s

## Endpoints tested

| Endpoint | Description |
|----------|-------------|
| `GET /v1/games?seasons[]=2024&per_page=100` | Full 2024-25 season schedule, paginated |

## Full season schedule — key fields per game

```
datetime      ISO-8601 UTC game start time
home_team     { full_name, city, conference, division }
visitor_team  { full_name, city, conference, division }
status        "Final" / "TBD" / in-progress time string
postseason    boolean
```

> **No venue field.** BallDontLie NBA does not expose arena names. The home team's city is the implicit venue. For venue names, use the ESPN unofficial API instead: `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=YYYYMMDD`

## Pagination

Uses cursor-based pagination via `meta.next_cursor`. Fetch all pages:

```js
let cursor = null;
const allGames = [];
do {
  const url = `https://api.balldontlie.io/v1/games?seasons[]=2024&per_page=100`
    + (cursor ? `&cursor=${cursor}` : '');
  const res = await fetch(url, { headers: { Authorization: API_KEY } });
  const data = await res.json();
  allGames.push(...data.data);
  cursor = data.meta?.next_cursor ?? null;
  if (cursor) await new Promise(r => setTimeout(r, 500)); // respect rate limit
} while (cursor);
```

## Sample request (Node.js)
```js
const res = await fetch('https://api.balldontlie.io/v1/games?seasons[]=2024&per_page=100', {
  headers: { Authorization: process.env.BALLDONTLIE_API_KEY }
});
const data = await res.json();
// data.data[] = games, data.meta.next_cursor = next page token
```

## Sample response (one game, truncated)
```json
{
  "data": [{
    "id": 15907438,
    "datetime": "2024-10-22T23:30:00.000Z",
    "date": "2024-10-22",
    "season": 2024,
    "status": "Final",
    "postseason": false,
    "home_team": { "full_name": "Boston Celtics", "city": "Boston", "abbreviation": "BOS" },
    "visitor_team": { "full_name": "New York Knicks", "city": "New York", "abbreviation": "NYK" },
    "home_team_score": 132,
    "visitor_team_score": 109
  }],
  "meta": { "next_cursor": 15907537, "per_page": 100 }
}
```

## Gotchas
- `Authorization` header is raw key — **not** `Bearer <key>`.
- 429 rate limiting is aggressive; always add 300–500ms between paginated pages.
- Season `2024` = 2024-25 season (uses start year).
- No venue field on NBA endpoint. For venues, use ESPN unofficial API instead.
- `GET /v1/teams` returns 45 teams including defunct historical franchises — filter by non-blank `conference` for active teams only.

## Test file
`tests/sports-schedules/nba.js`
