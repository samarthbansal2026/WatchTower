import { timedFetch, pass, fail } from '../../lib/test-runner.js';

export const name = 'Open-Meteo Satellite Radiation';
export const tier = 'tier1';

export async function run() {
  const t0 = Date.now();
  try {
    // Frankfurt, Germany — within EUMETSAT coverage
    const lat = 50.1109, lon = 8.6821;
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=direct_radiation,diffuse_radiation,direct_normal_irradiance,global_tilted_irradiance,shortwave_radiation&timezone=Europe/Berlin`;
    const r = await timedFetch(url, { timeoutMs: 30000 });
    if (!r.ok) return fail(name, r.ms, `HTTP ${r.status}`, r.status);
    if (!r.body?.hourly?.shortwave_radiation) return fail(name, r.ms, 'missing hourly shortwave_radiation');

    const h = r.body.hourly;
    // Find first non-null daytime value
    const firstNonNull = h.shortwave_radiation.findIndex(v => v !== null && v > 0);
    return pass(name, Date.now() - t0, {
      location: { lat, lon, label: 'Frankfurt, Germany' },
      hourlyPoints: h.time.length,
      sampleDaytime: firstNonNull >= 0 ? {
        time: h.time[firstNonNull],
        shortwave_radiation_Wm2: h.shortwave_radiation[firstNonNull],
        direct_radiation_Wm2: h.direct_radiation[firstNonNull],
        diffuse_radiation_Wm2: h.diffuse_radiation[firstNonNull],
        dni_Wm2: h.direct_normal_irradiance[firstNonNull],
      } : 'all zeros (nighttime window)',
    });
  } catch (e) {
    return fail(name, Date.now() - t0, e);
  }
}
