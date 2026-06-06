import { timedFetch, pass, fail } from '../../lib/test-runner.js';

export const name = 'Open-Meteo Ensemble Forecast';
export const tier = 'tier1';

export async function run() {
  const t0 = Date.now();
  try {
    const lat = 37.7749, lon = -122.4194;
    // ICON ensemble: 40 members, up to 7.5 days
    const url = `https://ensemble-api.open-meteo.com/v1/ensemble?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,precipitation&models=icon_seamless&timezone=America/Los_Angeles`;
    const r = await timedFetch(url, { timeoutMs: 30000 });
    if (!r.ok) return fail(name, r.ms, `HTTP ${r.status}`, r.status);

    const body = r.body;
    // Ensemble returns temperature_2m as array of member arrays OR single array
    const hourlyKeys = Object.keys(body.hourly ?? {});
    const tempKey = hourlyKeys.find(k => k.startsWith('temperature_2m'));
    if (!tempKey) return fail(name, r.ms, `no temperature_2m key in hourly; keys: ${hourlyKeys.slice(0, 8).join(', ')}`);

    const members = hourlyKeys.filter(k => k.startsWith('temperature_2m'));
    return pass(name, Date.now() - t0, {
      model: 'icon_seamless',
      memberCount: members.length,
      timePoints: body.hourly.time?.length,
      firstHour: body.hourly.time?.[0],
      sampleMember0: body.hourly[members[0]]?.slice(0, 3),
    });
  } catch (e) {
    return fail(name, Date.now() - t0, e);
  }
}
