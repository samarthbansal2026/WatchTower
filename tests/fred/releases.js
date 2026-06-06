import { timedFetch, pass, fail, skip } from '../../lib/test-runner.js';

export const name = 'FRED Releases';
export const tier = 'tier2';

const KEY = process.env.FRED_API_KEY;
const BASE = 'https://api.stlouisfed.org/fred';

export async function run() {
  if (!KEY) return skip(name, 'FRED_API_KEY not set');

  const t0 = Date.now();
  try {
    // All releases (paginated; pull first page)
    const relR = await timedFetch(`${BASE}/releases?api_key=${KEY}&file_type=json&limit=10&sort_order=desc`);
    if (!relR.ok) return fail(name, Date.now() - t0, `HTTP ${relR.status} on releases`, relR.status);
    if (!Array.isArray(relR.body?.releases)) return fail(name, Date.now() - t0, 'No releases in response');
    const releases = relR.body.releases;

    // Upcoming release dates (next 5 across all releases)
    const datesR = await timedFetch(`${BASE}/releases/dates?api_key=${KEY}&file_type=json&limit=5&include_release_dates_with_no_data=true`);
    if (!datesR.ok) return fail(name, Date.now() - t0, `HTTP ${datesR.status} on release dates`, datesR.status);

    // Release detail for Employment Situation (id=50) — the biggest monthly release
    const detailR = await timedFetch(`${BASE}/release?release_id=50&api_key=${KEY}&file_type=json`);
    if (!detailR.ok) return fail(name, Date.now() - t0, `HTTP ${detailR.status} on release detail`, detailR.status);
    const rel = detailR.body?.releases?.[0];
    if (!rel) return fail(name, Date.now() - t0, 'No release detail returned');

    return pass(name, Date.now() - t0, {
      totalReleases: relR.body.count,
      recentSample: releases.slice(0, 3).map(r => ({ id: r.id, name: r.name })),
      employmentSituation: { id: rel.id, name: rel.name, link: rel.link },
      upcomingDates: datesR.body.release_dates?.slice(0, 3),
    });
  } catch (e) {
    return fail(name, Date.now() - t0, e);
  }
}
