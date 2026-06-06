# MLS ESPN — Full season schedule with venues

- **Service**: ESPN unofficial scoreboard API (MLS)
- **Homepage**: https://github.com/pseudo-r/Public-ESPN-API (community reference)
- **Base URL**: `https://site.api.espn.com/apis/site/v2/sports/soccer/usa.1/`
- **Auth**: None
- **Cost**: Free (unofficial — no SLA, may change without notice)
- **Rate limits**: Not documented

> **BallDontLie MLS** — teams endpoint is free, but `matches` returns 401 on a free key (paid add-on required). ESPN is the recommended free alternative.

## Tested on
2026-06-05 — `PASS` in ~1.4s

## Endpoints tested

| Endpoint | Description |
|----------|-------------|
| `GET /scoreboard?dates=20250222-20251101&limit=400` | Full 2025 season schedule |

## Full season schedule — key fields per event

```
events[].date                  ISO-8601 UTC kickoff time
events[].name                  "Away Team at Home Team"
events[].competitions[0].venue.fullName   Stadium name
events[].competitions[0].competitors[]   [{team:{displayName}, homeAway}]
events[].competitions[0].status.type.name  "STATUS_FULL_TIME" / "STATUS_SCHEDULED" etc.
```

## Sample request (Node.js)
```js
// Full 2025 regular season (Opening Weekend through Decision Day)
const res = await fetch(
  'https://site.api.espn.com/apis/site/v2/sports/soccer/usa.1/scoreboard'
  + '?dates=20250222-20251101&limit=400'
);
const data = await res.json();
// data.events[] — up to 400 matches
for (const event of data.events) {
  const comp = event.competitions[0];
  const home = comp.competitors.find(t => t.homeAway === 'home').team.displayName;
  const away = comp.competitors.find(t => t.homeAway === 'away').team.displayName;
  console.log(event.date, away, '@', home, comp.venue.fullName);
}
```

## Sample response (one event, truncated)
```json
{
  "events": [{
    "date": "2025-02-22T21:45Z",
    "name": "Minnesota United FC at LAFC",
    "competitions": [{
      "venue": { "fullName": "BMO Stadium" },
      "competitors": [
        { "homeAway": "home", "team": { "displayName": "LAFC" } },
        { "homeAway": "away", "team": { "displayName": "Minnesota United FC" } }
      ],
      "status": { "type": { "name": "STATUS_FULL_TIME" } }
    }]
  }]
}
```

## Gotchas
- `limit=400` returns up to 400 events in one call — the 2025 MLS regular season has ~450 matches total (34 rounds × ~14 games). Paginate or split date range if you need all.
- Date format is `YYYYMMDD` or `YYYYMMDD-YYYYMMDD` for ranges — **not** ISO format.
- `usa.1` is the ESPN league slug for MLS. Other leagues: `usa.2` (USL), `eng.1` (Premier League).
- This is an unofficial API — no auth, no versioning guarantees, no official docs. It has been stable for years but can change without notice.
- ESPN also covers NBA (`basketball/nba`), NFL (`football/nfl`), NHL (`hockey/nhl`) with the same scoreboard pattern and venue data if you need a unified source.

## Test file
`tests/sports-schedules/mls.js`
