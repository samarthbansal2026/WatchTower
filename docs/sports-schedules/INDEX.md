# Sports Schedules — API Index

Full season schedules with game times, venues, and opponents across 5 major leagues.

| League | API Source | Auth | Venue? | Schedule style | Test file | Doc | Status |
|--------|-----------|------|--------|----------------|-----------|-----|--------|
| MLB | statsapi.mlb.com (official) | None | ✓ | Single call — 2464 games | `tests/sports-schedules/mlb.js` | [MLB.md](MLB.md) | PASS ~2.7s |
| NBA | BallDontLie `/v1/` (free) | API key | ✗ | Cursor-paginated | `tests/sports-schedules/nba.js` | [NBA.md](NBA.md) | PASS ~1.8s |
| NFL | BallDontLie `/nfl/v1/` (free) | API key | ✓ | Cursor-paginated | `tests/sports-schedules/nfl.js` | [NFL.md](NFL.md) | PASS ~750ms |
| NHL | api-web.nhle.com (official) | None | ✓ | Per-team: 82 games/call | `tests/sports-schedules/nhl.js` | [NHL.md](NHL.md) | PASS ~600ms |
| MLS | ESPN unofficial scoreboard | None | ✓ | Date-range, limit=400 | `tests/sports-schedules/mls.js` | [MLS.md](MLS.md) | PASS ~1.4s |

## Venue coverage summary

- **MLB**: Full venue name per game (including neutral-site games like Tokyo Dome)
- **NBA**: No venue field on BallDontLie. Use ESPN scoreboard (`basketball/nba`) if venue is required.
- **NFL**: Full venue name per game (plain string, e.g. `"GEHA Field at Arrowhead Stadium"`)
- **NHL**: Full venue name per game via `venue.default` (e.g. `"TD Garden"`)
- **MLS**: Full venue name per game via `competitions[0].venue.fullName` (e.g. `"BMO Stadium"`)

## Notes
- BallDontLie rate-limits aggressively — add 300–500ms between paginated requests.
- BallDontLie NHL games and MLS matches require paid tiers (401 on free key). Use official NHL API and ESPN for those leagues.
- MLB is the only league with a true single-call full season endpoint (all 2464 games at once).
- For NHL league-wide schedule, either fetch per team via `/v1/club-schedule-season/{tricode}/{season}` or paginate weekly via `/v1/schedule/{date}` advancing by `nextStartDate`.
- ESPN covers all 5 leagues via `site.api.espn.com/apis/site/v2/sports/{sport}/{league}/scoreboard` with consistent venue + team shape — useful unified source despite being unofficial.
