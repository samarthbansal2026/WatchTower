# NHL Web API — Full team season schedule with venues

- **Service**: NHL official web API (unofficial reference: github.com/Zmalski/NHL-API-Reference)
- **Homepage**: https://github.com/Zmalski/NHL-API-Reference
- **Base URL**: `https://api-web.nhle.com/v1/`
- **Auth**: None
- **Cost**: Free
- **Rate limits**: Not published; no observed throttling

## Tested on
2026-06-05 — `PASS` in ~600ms

## Endpoints tested

| Endpoint | Description |
|----------|-------------|
| `GET /v1/club-schedule-season/{team}/{season}` | All 82 regular + pre/post season games for one team |
| `GET /v1/schedule/{date}` | League-wide week of games around a date |
| `GET /v1/standings/now` | Current season standings |

## Full season schedule — key fields per game

```
startTimeUTC       ISO-8601 UTC start time
venue.default      Arena name (e.g. "TD Garden")
awayTeam.abbrev    3-letter team code
homeTeam.abbrev    3-letter team code
gameType           2=regular, 3=playoffs, 1=preseason
gameState          "OFF" (final), "LIVE", "FUT" (scheduled)
```

## Per-team full season (82 games)

```js
// Team tricode list: BOS, TOR, NYR, MTL, etc.
const res = await fetch('https://api-web.nhle.com/v1/club-schedule-season/BOS/20242025');
const { games } = await res.json();
const regularSeason = games.filter(g => g.gameType === 2);
// regularSeason.length == 82
for (const g of regularSeason) {
  console.log(g.startTimeUTC, g.awayTeam.abbrev, '@', g.homeTeam.abbrev, g.venue.default);
}
```

## League-wide weekly schedule

`/v1/schedule/{date}` returns a `gameWeek[]` array covering ~7 days. Iterate the array and find your target date:

```js
const res = await fetch('https://api-web.nhle.com/v1/schedule/2025-04-01');
const data = await res.json();
const day = data.gameWeek.find(d => d.date === '2025-04-01');
// day.games[] — all games that day
```

For a full league-wide season schedule, paginate weekly from season start (typically first Tuesday of October) through the playoffs (mid-June), advancing by `nextStartDate` each call.

## Sample response — club-schedule-season (one game, truncated)
```json
{
  "games": [{
    "id": 2024020003,
    "season": 20242025,
    "gameType": 2,
    "gameDate": "2024-10-08",
    "startTimeUTC": "2024-10-08T20:30:00Z",
    "venue": { "default": "Climate Pledge Arena" },
    "awayTeam": { "id": 19, "abbrev": "STL", "commonName": { "default": "Blues" } },
    "homeTeam": { "id": 55, "abbrev": "SEA", "commonName": { "default": "Kraken" } },
    "gameState": "OFF"
  }]
}
```

## Gotchas
- Season is encoded `YYYYYYYY` (e.g. `20242025`) — not just the start year.
- `gameType: 2` = regular season; always filter on this unless you want pre/post season mixed in.
- `/v1/schedule/{date}` returns a **week**, not a day — find your target date in `gameWeek[]`.
- Club schedule returns 89 entries for BOS 2024-25 (82 regular + 4 preseason + 3 playoff games).
- BallDontLie NHL games endpoint returns 401 on free key — use the official NHL API instead.
- Team tricode list available at `/v1/standings/now` → `standings[].teamAbbrev.default`.

## Test file
`tests/sports-schedules/nhl.js`
