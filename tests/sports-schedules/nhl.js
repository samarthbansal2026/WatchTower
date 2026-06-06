import { timedFetch, pass, fail } from '../../lib/test-runner.js';

export const name = 'NHL Web API';
export const tier = 'tier1';

const BASE = 'https://api-web.nhle.com/v1';

export async function run() {
  const t0 = Date.now();
  try {
    // Full season schedule for a single team — all 82 regular season games with venue + time
    // To get league-wide schedule, fetch all 32 teams or paginate /v1/schedule/{date} weekly.
    const r = await timedFetch(`${BASE}/club-schedule-season/BOS/20252026`);
    if (!r.ok) return fail(name, r.ms, `schedule HTTP ${r.status}`, r.status);
    if (!Array.isArray(r.body?.games)) return fail(name, r.ms, 'missing games array');

    const regularSeason = r.body.games.filter(g => g.gameType === 2);
    if (regularSeason.length === 0) return fail(name, r.ms, 'no regular season games found');

    const g = regularSeason[0];
    if (!g.startTimeUTC) return fail(name, r.ms, 'game missing startTimeUTC');
    if (!g.venue?.default) return fail(name, r.ms, 'game missing venue');
    if (!g.awayTeam?.abbrev || !g.homeTeam?.abbrev) return fail(name, r.ms, 'game missing team abbrevs');

    return pass(name, Date.now() - t0, {
      team: 'BOS',
      season: '2025-26',
      totalGames: r.body.games.length,
      regularSeasonGames: regularSeason.length,
      sampleGame: {
        startTimeUTC: g.startTimeUTC,
        away: g.awayTeam.abbrev,
        home: g.homeTeam.abbrev,
        venue: g.venue.default,
        gameState: g.gameState,
      },
    });
  } catch (e) {
    return fail(name, Date.now() - t0, e);
  }
}
