// NOAA NGS — National Geodetic Survey GEOID API
// https://geodesy.noaa.gov/api/geoid/ght  — no auth, geoid height lookup
import { timedFetch, pass, fail } from '../../lib/test-runner.js';

export const name = 'NOAA NGS (Geoid)';
export const tier = 'tier1';

export async function run() {
  const t0 = Date.now();
  try {
    // Geoid height at 40 N, 80 W
    const url = 'https://geodesy.noaa.gov/api/geoid/ght?lat=40.0&lon=-80.0&model=14';
    const r = await timedFetch(url);
    if (!r.ok) return fail(name, r.ms, `HTTP ${r.status}`, r.status);
    if (typeof r.body?.geoidHeight !== 'number') {
      return fail(name, r.ms, 'no numeric geoidHeight in response');
    }
    return pass(name, r.ms, {
      model: r.body.geoidModel,
      lat: r.body.lat,
      lon: r.body.lon,
      geoidHeight_m: r.body.geoidHeight,
      error_m: r.body.error,
    });
  } catch (e) {
    return fail(name, Date.now() - t0, e);
  }
}
