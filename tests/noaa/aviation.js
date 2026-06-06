// NOAA Aviation Weather Center Data API — aviationweather.gov/api/data
// No auth required. Endpoints: metar, taf, airsigmet, pirep, gairmet, stationinfo, etc.
import { timedFetch, pass, fail } from '../../lib/test-runner.js';

export const name = 'NOAA Aviation Wx';
export const tier = 'tier1';

export async function run() {
  const t0 = Date.now();
  try {
    // METAR for Kansas City Intl (KMCI) and JFK
    const url = 'https://aviationweather.gov/api/data/metar?ids=KMCI,KJFK&format=json&hours=1';
    const r = await timedFetch(url);
    if (!r.ok) return fail(name, r.ms, `HTTP ${r.status}`, r.status);
    if (!Array.isArray(r.body) || r.body.length === 0) {
      return fail(name, r.ms, 'expected non-empty METAR array');
    }
    const m = r.body[0];
    if (!m.icaoId || !m.rawOb) {
      return fail(name, r.ms, 'METAR missing icaoId/rawOb');
    }
    return pass(name, r.ms, {
      reports: r.body.length,
      stations: [...new Set(r.body.map(x => x.icaoId))],
      latest: { id: m.icaoId, obsTime: m.obsTime, raw: m.rawOb?.slice(0, 80) },
    });
  } catch (e) {
    return fail(name, Date.now() - t0, e);
  }
}
