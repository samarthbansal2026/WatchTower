import { timedFetch, pass, fail } from '../../lib/test-runner.js';

export const name = 'Open-Meteo Flood';
export const tier = 'tier1';

export async function run() {
  const t0 = Date.now();
  try {
    // Sacramento River basin — a real river point within GloFAS coverage
    const lat = 38.5, lon = -121.5;
    const url = `https://flood-api.open-meteo.com/v1/flood?latitude=${lat}&longitude=${lon}&daily=river_discharge&forecast_days=16&timezone=America/Los_Angeles`;
    const r = await timedFetch(url, { timeoutMs: 30000 });
    if (!r.ok) return fail(name, r.ms, `HTTP ${r.status}`, r.status);
    if (!r.body?.daily?.river_discharge) return fail(name, r.ms, 'missing daily river_discharge');

    const d = r.body.daily;
    return pass(name, Date.now() - t0, {
      location: { lat, lon },
      days: d.time.length,
      firstDay: {
        date: d.time[0],
        river_discharge_m3s: d.river_discharge[0],
      },
      maxDischarge: Math.max(...d.river_discharge.filter(v => v !== null)),
    });
  } catch (e) {
    return fail(name, Date.now() - t0, e);
  }
}
