import { timedFetch, pass, fail } from '../../lib/test-runner.js';

export const name = 'Open-Meteo Climate Change';
export const tier = 'tier1';

export async function run() {
  const t0 = Date.now();
  try {
    const lat = 37.7749, lon = -122.4194;
    // Climate models: daily data 1950–2050; request a small window to keep response fast
    const url = `https://climate-api.open-meteo.com/v1/climate?latitude=${lat}&longitude=${lon}&start_date=2030-01-01&end_date=2030-01-07&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&models=EC_Earth3P_HR&timezone=America/Los_Angeles`;
    const r = await timedFetch(url, { timeoutMs: 30000 });
    if (!r.ok) return fail(name, r.ms, `HTTP ${r.status}`, r.status);
    if (!r.body?.daily?.temperature_2m_max) return fail(name, r.ms, 'missing daily temperature projection');

    const d = r.body.daily;
    return pass(name, Date.now() - t0, {
      model: 'EC_Earth3P_HR',
      projectedDays: d.time.length,
      sample: d.time.map((date, i) => ({
        date,
        high_c: d.temperature_2m_max[i],
        low_c: d.temperature_2m_min[i],
        precip_mm: d.precipitation_sum[i],
      })),
    });
  } catch (e) {
    return fail(name, Date.now() - t0, e);
  }
}
