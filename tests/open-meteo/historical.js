import { timedFetch, pass, fail } from '../../lib/test-runner.js';

export const name = 'Open-Meteo Historical Weather';
export const tier = 'tier1';

export async function run() {
  const t0 = Date.now();
  try {
    const lat = 37.7749, lon = -122.4194;
    const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=2024-01-01&end_date=2024-01-07&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max&temperature_unit=fahrenheit&timezone=America/Los_Angeles`;
    const r = await timedFetch(url, { timeoutMs: 30000 });
    if (!r.ok) return fail(name, r.ms, `HTTP ${r.status}`, r.status);
    if (!r.body?.daily?.temperature_2m_max) return fail(name, r.ms, 'missing daily temperature data');

    const daily = r.body.daily;
    return pass(name, Date.now() - t0, {
      dateRange: `${daily.time[0]} → ${daily.time[daily.time.length - 1]}`,
      days: daily.time.length,
      sample: daily.time.slice(0, 3).map((d, i) => ({
        date: d,
        high: `${daily.temperature_2m_max[i]}°F`,
        low: `${daily.temperature_2m_min[i]}°F`,
        precip_mm: daily.precipitation_sum[i],
      })),
    });
  } catch (e) {
    return fail(name, Date.now() - t0, e);
  }
}
