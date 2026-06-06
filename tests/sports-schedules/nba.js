import { timedFetch, pass, fail, skip } from '../../lib/test-runner.js';

export const name = 'NBA BallDontLie';
export const tier = 'tier2';

const KEY = process.env.BALLDONTLIE_API_KEY;
const BASE = 'https://api.balldontlie.io/v1';
const HEADERS = { Authorization: KEY };

export async function run() {
  if (!KEY) return skip(name, 'BALLDONTLIE_API_KEY not set');
  const t0 = Date.now();
  try {
    // First page of full 2024-25 regular season schedule
    const r = await timedFetch(`${BASE}/games?seasons[]=2025&per_page=100`, { headers: HEADERS });
    if (!r.ok) return fail(name, r.ms, `games HTTP ${r.status}`, r.status);
    if (!Array.isArray(r.body?.data)) return fail(name, r.ms, 'missing data array');
    if (!r.body?.meta?.next_cursor) return fail(name, r.ms, 'missing pagination cursor — cannot confirm full season');

    const g = r.body.data[0];
    if (!g.datetime) return fail(name, r.ms, 'game missing datetime');
    if (!g.home_team?.full_name || !g.visitor_team?.full_name) return fail(name, r.ms, 'game missing team names');
    // BallDontLie NBA does not include a venue field; home city is the implicit venue
    const venueNote = 'no venue field — home team arena inferred from home_team.city';

    return pass(name, Date.now() - t0, {
      season: '2025-26',
      firstPageGames: r.body.data.length,
      nextCursor: r.body.meta.next_cursor,
      sampleGame: {
        datetime: g.datetime,
        away: g.visitor_team.full_name,
        home: g.home_team.full_name,
        homeCity: g.home_team.city,
        status: g.status,
      },
      venueNote,
    });
  } catch (e) {
    return fail(name, Date.now() - t0, e);
  }
}
