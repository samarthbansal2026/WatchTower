import { timedFetch, pass, fail } from '../../lib/test-runner.js';

export const name = 'Open-Meteo Air Quality';
export const tier = 'tier1';

export async function run() {
  const t0 = Date.now();
  try {
    const lat = 37.7749, lon = -122.4194;
    const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&hourly=pm10,pm2_5,ozone,nitrogen_dioxide,carbon_monoxide,us_aqi&timezone=America/Los_Angeles`;
    const r = await timedFetch(url, { timeoutMs: 30000 });
    if (!r.ok) return fail(name, r.ms, `HTTP ${r.status}`, r.status);
    if (!r.body?.hourly?.pm2_5) return fail(name, r.ms, 'missing hourly pm2_5');

    const h = r.body.hourly;
    return pass(name, Date.now() - t0, {
      location: { lat, lon },
      hourlyPoints: h.time.length,
      currentHour: {
        time: h.time[0],
        pm2_5: h.pm2_5[0],
        pm10: h.pm10[0],
        ozone: h.ozone[0],
        no2: h.nitrogen_dioxide[0],
        co: h.carbon_monoxide[0],
        us_aqi: h.us_aqi[0],
      },
    });
  } catch (e) {
    return fail(name, Date.now() - t0, e);
  }
}
