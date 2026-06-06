import { timedFetch, pass, fail } from '../../lib/test-runner.js';

export const name = 'Open-Meteo Seasonal Forecast';
export const tier = 'tier1';

export async function run() {
  const t0 = Date.now();
  try {
    const lat = 37.7749, lon = -122.4194;
    // Default: ECMWF SEAS5, 50 ensemble members, daily up to ~7 months out
    const url = `https://seasonal-api.open-meteo.com/v1/seasonal?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,precipitation_sum&timezone=America/Los_Angeles`;
    const r = await timedFetch(url, { timeoutMs: 30000 });
    if (!r.ok) return fail(name, r.ms, `HTTP ${r.status}`, r.status);
    // Response has member columns: temperature_2m_max, temperature_2m_max_member01, …
    const keys = Object.keys(r.body?.daily ?? {});
    const tempKey = keys.find(k => k === 'temperature_2m_max');
    if (!tempKey) return fail(name, r.ms, `missing temperature_2m_max; keys: ${keys.slice(0,6).join(', ')}`);

    const daily = r.body.daily;
    const memberCount = keys.filter(k => k.startsWith('temperature_2m_max_member')).length;
    return pass(name, Date.now() - t0, {
      ensembleMembers: memberCount,
      days: daily.time.length,
      firstDay: daily.time[0],
      lastDay: daily.time[daily.time.length - 1],
      ensembleMeanFirstDay: daily.temperature_2m_max[0],
    });
  } catch (e) {
    return fail(name, Date.now() - t0, e);
  }
}
