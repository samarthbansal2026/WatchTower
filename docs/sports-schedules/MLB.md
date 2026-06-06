# MLB Stats API — Official full-season schedule and game data

- **Service**: Major League Baseball official stats API
- **Homepage**: https://statsapi.mlb.com/docs/
- **Base URL**: `https://statsapi.mlb.com/api/v1/`
- **Auth**: None
- **Cost**: Free
- **Rate limits**: Not published; no observed throttling

## Tested on
2026-06-05 — `PASS` in ~2.7s

## Endpoints tested

| Endpoint | Description |
|----------|-------------|
| `GET /api/v1/schedule?sportId=1&season=2025&gameType=R` | Full regular season — all 2464 games in one response |

## Other endpoints (untested)
- `gameType=P` — postseason, `gameType=S` — spring training, `gameType=A` — All-Star
- `/api/v1/game/{gamePk}/feed/live` — live play-by-play
- `/api/v1/standings?leagueId=103,104` — AL and NL standings
- `/api/v1/teams/{teamId}/schedule?season=2025` — per-team schedule

## Full season schedule — key fields per game

```
gameDate      ISO-8601 UTC game start time
venue.name    Stadium name (e.g. "Tokyo Dome", "Fenway Park")
teams.away.team.name   Away team name
teams.home.team.name   Home team name
status.abstractGameState  "Preview" / "Live" / "Final"
gamePk        Unique game ID for live feed
```

## Sample request (Node.js)
```js
const res = await fetch(
  'https://statsapi.mlb.com/api/v1/schedule?sportId=1&season=2025&gameType=R'
);
const data = await res.json();
// data.totalGames == 2464
// data.dates[] → each date → .games[] → { gameDate, venue, teams }
for (const day of data.dates) {
  for (const game of day.games) {
    console.log(game.gameDate, game.venue.name,
      game.teams.away.team.name, '@', game.teams.home.team.name);
  }
}
```

## Sample response (one game, truncated)
```json
{
  "totalGames": 2464,
  "dates": [{
    "date": "2025-03-18",
    "games": [{
      "gamePk": 778498,
      "gameDate": "2025-03-18T10:10:00Z",
      "venue": { "id": 2397, "name": "Tokyo Dome" },
      "teams": {
        "away": { "team": { "id": 119, "name": "Los Angeles Dodgers" } },
        "home": { "team": { "id": 112, "name": "Chicago Cubs" } }
      },
      "status": { "abstractGameState": "Final" }
    }]
  }]
}
```

## Gotchas
- `sportId=1` is required to filter to MLB — the API covers minor leagues too.
- Single call returns all 2464 regular season games across 184 game days (~2.7s).
- `gameType=R` for regular season; omit to get all types in one shot.
- `gameDate` is UTC — convert to local time for display.
- Neutral-site games (e.g. Tokyo Series, London Series) show the actual venue name, not a home team's park.
- A `copyright` field is present at the top level of every response.

## Test file
`tests/sports-schedules/mlb.js`
