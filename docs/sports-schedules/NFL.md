# NFL BallDontLie — Full season schedule with venues (paginated)

- **Service**: BallDontLie NFL API
- **Homepage**: https://www.balldontlie.io/
- **Base URL**: `https://api.balldontlie.io/nfl/v1/`
- **Auth**: API key in `Authorization` header (raw key, no `Bearer` prefix)
- **Cost**: Free tier
- **Rate limits**: Shared with NBA tier — same 429 risk on burst requests

## Tested on
2026-06-05 — `PASS` in ~750ms

## Endpoints tested

| Endpoint | Description |
|----------|-------------|
| `GET /nfl/v1/games?seasons[]=2024&per_page=100` | Full 2024 season schedule, paginated |

## Full season schedule — key fields per game

```
date        ISO-8601 UTC game start time
week        Week number (1–18 regular season, 19+ = postseason)
venue       Stadium name string (e.g. "GEHA Field at Arrowhead Stadium")
home_team   { full_name, location, conference, division, abbreviation }
visitor_team  same shape as home_team
status      "Final" / "Scheduled" / etc.
postseason  boolean
summary     One-line human-readable result description
```

## Pagination

Cursor-based, same pattern as NBA. A full 2024 season (272 regular season + 11 playoff games) fits in ~3 pages at 100/page.

```js
let cursor = null;
const allGames = [];
do {
  const url = `https://api.balldontlie.io/nfl/v1/games?seasons[]=2024&per_page=100`
    + (cursor ? `&cursor=${cursor}` : '');
  const res = await fetch(url, { headers: { Authorization: API_KEY } });
  const data = await res.json();
  allGames.push(...data.data);
  cursor = data.meta?.next_cursor ?? null;
  if (cursor) await new Promise(r => setTimeout(r, 500));
} while (cursor);
```

Filter by week: `?seasons[]=2024&weeks[]=1` for a single week.

## Sample request (Node.js)
```js
const res = await fetch('https://api.balldontlie.io/nfl/v1/games?seasons[]=2024&per_page=100', {
  headers: { Authorization: process.env.BALLDONTLIE_API_KEY }
});
const data = await res.json();
```

## Sample response (one game, truncated)
```json
{
  "data": [{
    "id": 7001,
    "date": "2024-09-06T00:20:00.000Z",
    "season": 2024,
    "week": 1,
    "postseason": false,
    "status": "Final",
    "venue": "GEHA Field at Arrowhead Stadium",
    "summary": "Chiefs hold off Ravens 27-20 when review overturns TD on final play of NFL's season opener",
    "home_team": { "full_name": "Kansas City Chiefs", "abbreviation": "KC", "conference": "AFC" },
    "visitor_team": { "full_name": "Baltimore Ravens", "abbreviation": "BAL", "conference": "AFC" },
    "home_team_score": 27,
    "visitor_team_score": 20
  }],
  "meta": { "next_cursor": 7001, "per_page": 1 }
}
```

## Gotchas
- NFL base path is `api.balldontlie.io/nfl/v1/` — **not** `nfl.balldontlie.io/v1/` (that 404s).
- Venue is a plain string, not an object — unlike NHL's `{ default: "…" }`.
- `weeks[]` filter lets you fetch one game week at a time — useful for current-week lookups.
- Postseason weeks start at 19 (Wild Card = 19, Divisional = 20, Conference = 21, Super Bowl = 22).

## Test file
`tests/sports-schedules/nfl.js`
