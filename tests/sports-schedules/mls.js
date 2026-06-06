import { timedFetch, pass, fail } from '../../lib/test-runner.js';

export const name = 'MLS ESPN';
export const tier = 'tier1';

// BallDontLie MLS matches require a paid tier (returns 401 on free key).
// ESPN unofficial scoreboard API covers MLS with venue, game times, and teams at no cost.
const BASE = 'https://site.api.espn.com/apis/site/v2/sports/soccer/usa.1';

export async function run() {
  const t0 = Date.now();
  try {
    // Full 2025 regular season — date range covers Opening Weekend through Decision Day
    const r = await timedFetch(
      `${BASE}/scoreboard?dates=20260222-20261101&limit=400`,
      { timeoutMs: 20000 }
    );
    if (!r.ok) return fail(name, r.ms, `scoreboard HTTP ${r.status}`, r.status);
    if (!Array.isArray(r.body?.events)) return fail(name, r.ms, 'missing events array');
    if (r.body.events.length === 0) return fail(name, r.ms, 'no events returned for 2025 season range');

    const e = r.body.events[0];
    const comp = e.competitions?.[0];
    if (!comp) return fail(name, r.ms, 'event missing competitions');

    const venue = comp.venue?.fullName;
    const teams = comp.competitors?.map(t => ({ name: t.team.displayName, homeAway: t.homeAway }));
    if (!venue) return fail(name, r.ms, 'competition missing venue');
    if (!teams?.length) return fail(name, r.ms, 'competition missing teams');

    return pass(name, Date.now() - t0, {
      season: 2026,
      eventsReturned: r.body.events.length,
      sampleGame: {
        date: e.date,
        name: e.name,
        venue,
        away: teams.find(t => t.homeAway === 'away')?.name,
        home: teams.find(t => t.homeAway === 'home')?.name,
        status: comp.status?.type?.name,
      },
    });
  } catch (e) {
    return fail(name, Date.now() - t0, e);
  }
}
