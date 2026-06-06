import { timedFetch, pass, fail } from '../../lib/test-runner.js';

export const name = 'MLB Stats API';
export const tier = 'tier1';

export async function run() {
  const t0 = Date.now();
  try {
    // Full regular-season schedule — single call returns all games
    const sched = await timedFetch(
      'https://statsapi.mlb.com/api/v1/schedule?sportId=1&season=2026&gameType=R',
      { timeoutMs: 20000 }
    );
    if (!sched.ok) return fail(name, sched.ms, `schedule HTTP ${sched.status}`, sched.status);
    if (typeof sched.body?.totalGames !== 'number') return fail(name, sched.ms, 'schedule: missing totalGames');
    if (!Array.isArray(sched.body?.dates)) return fail(name, sched.ms, 'schedule: missing dates array');

    const game = sched.body.dates[0]?.games?.[0];
    if (!game) return fail(name, sched.ms, 'schedule: no games found');

    // Validate shape: venue, game time, opponents
    if (!game.venue?.name) return fail(name, sched.ms, 'game missing venue.name');
    if (!game.gameDate) return fail(name, sched.ms, 'game missing gameDate');
    if (!game.teams?.away?.team?.name || !game.teams?.home?.team?.name)
      return fail(name, sched.ms, 'game missing team names');

    return pass(name, Date.now() - t0, {
      season: 2026,
      totalGames: sched.body.totalGames,
      dateDays: sched.body.dates.length,
      sampleGame: {
        date: game.gameDate,
        away: game.teams.away.team.name,
        home: game.teams.home.team.name,
        venue: game.venue.name,
      },
    });
  } catch (e) {
    return fail(name, Date.now() - t0, e);
  }
}
