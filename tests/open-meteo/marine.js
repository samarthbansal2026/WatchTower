import { timedFetch, pass, fail } from '../../lib/test-runner.js';

export const name = 'Open-Meteo Marine Weather';
export const tier = 'tier1';

export async function run() {
  const t0 = Date.now();
  try {
    const lat = 37.75, lon = -122.68; // offshore San Francisco
    const url = `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lon}&hourly=wave_height,wave_direction,wave_period,sea_surface_temperature&daily=wave_height_max,wind_wave_height_max&timezone=America/Los_Angeles`;
    const r = await timedFetch(url, { timeoutMs: 30000 });
    if (!r.ok) return fail(name, r.ms, `HTTP ${r.status}`, r.status);
    if (!r.body?.hourly?.wave_height) return fail(name, r.ms, 'missing hourly wave_height');

    const h = r.body.hourly;
    const d = r.body.daily;
    return pass(name, Date.now() - t0, {
      location: { lat, lon },
      timezone: r.body.timezone,
      hourlyPoints: h.time.length,
      firstHour: {
        time: h.time[0],
        wave_height_m: h.wave_height[0],
        wave_direction_deg: h.wave_direction[0],
        wave_period_s: h.wave_period[0],
        sst_c: h.sea_surface_temperature[0],
      },
      dailyMaxWave_m: d?.wave_height_max?.[0],
    });
  } catch (e) {
    return fail(name, Date.now() - t0, e);
  }
}
