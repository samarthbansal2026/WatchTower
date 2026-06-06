// NOAA SWPC — Space Weather Prediction Center
// https://services.swpc.noaa.gov/  — no auth, static + dynamic JSON files
// Most "endpoints" are flat JSON files served from /products/ and /json/.
import { timedFetch, pass, fail } from '../../lib/test-runner.js';

export const name = 'NOAA SWPC';
export const tier = 'tier1';

export async function run() {
  const t0 = Date.now();
  try {
    // Planetary K-index (geomagnetic activity), past 7 days
    const url = 'https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json';
    const r = await timedFetch(url);
    if (!r.ok) return fail(name, r.ms, `HTTP ${r.status}`, r.status);
    if (!Array.isArray(r.body) || r.body.length === 0) {
      return fail(name, r.ms, 'expected non-empty array');
    }
    const latest = r.body[r.body.length - 1];
    if (!latest.time_tag || latest.Kp === undefined) {
      return fail(name, r.ms, 'rows missing time_tag/Kp');
    }
    return pass(name, r.ms, {
      totalRows: r.body.length,
      latest,
    });
  } catch (e) {
    return fail(name, Date.now() - t0, e);
  }
}
