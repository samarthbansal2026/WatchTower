import { timedFetch, pass, fail, skip } from '../../lib/test-runner.js';

export const name = 'NFL BallDontLie';
export const tier = 'tier2';

const KEY = process.env.BALLDONTLIE_API_KEY;
const BASE = 'https://api.balldontlie.io/nfl/v1';
const HEADERS = { Authorization: KEY };

export async function run() {
  if (!KEY) return skip(name, 'BALLDONTLIE_API_KEY not set');
  const t0 = Date.now();
  try {
    // First page of full 2024 season schedule (regular + postseason)
    const r = await timedFetch(`${BASE}/games?seasons[]=2025&per_page=100`, { headers: HEADERS });
    if (!r.ok) return fail(name, r.ms, `games HTTP ${r.status}`, r.status);
    if (!Array.isArray(r.body?.data)) return fail(name, r.ms, 'missing data array');

    const g = r.body.data[0];
    if (!g.date) return fail(name, r.ms, 'game missing date');
    if (!g.venue) return fail(name, r.ms, 'game missing venue');
    if (!g.home_team?.full_name || !g.visitor_team?.full_name) return fail(name, r.ms, 'game missing team names');

    // Count weeks to estimate season completeness
    const weeks = [...new Set(r.body.data.map(g => g.week))].sort((a, b) => a - b);

    return pass(name, Date.now() - t0, {
      season: 2025,
      firstPageGames: r.body.data.length,
      weeksInPage: weeks,
      nextCursor: r.body.meta?.next_cursor ?? null,
      sampleGame: {
        date: g.date,
        week: g.week,
        away: g.visitor_team.full_name,
        home: g.home_team.full_name,
        venue: g.venue,
        status: g.status,
      },
    });
  } catch (e) {
    return fail(name, Date.now() - t0, e);
  }
}
