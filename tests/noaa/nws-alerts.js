// NOAA NWS — Alerts + Stations/Observations sub-endpoints of api.weather.gov
// Same host & auth requirements as the forecast endpoint (see noaa-nws.js).
import { timedFetch, pass, fail } from '../../lib/test-runner.js';

export const name = 'NOAA NWS Alerts/Obs';
export const tier = 'tier1';

const UA = 'watchtower-api-tester (work.samarthbansal@gmail.com)';
const HDR = { 'User-Agent': UA, Accept: 'application/geo+json' };

export async function run() {
  const t0 = Date.now();
  try {
    // 1. Active alerts — nationwide count
    const r1 = await timedFetch('https://api.weather.gov/alerts/active/count', { headers: HDR });
    if (!r1.ok) return fail(name, r1.ms, `alerts count HTTP ${r1.status}`, r1.status);
    if (typeof r1.body?.total !== 'number') {
      return fail(name, r1.ms, 'alerts count missing total');
    }

    // 2. Active alerts at a specific point (Reagan National DC) — confirms /alerts/active features endpoint
    const r2 = await timedFetch(
      'https://api.weather.gov/alerts/active?point=38.8512,-77.0402',
      { headers: HDR }
    );
    if (!r2.ok) return fail(name, r2.ms, `alerts list HTTP ${r2.status}`, r2.status);
    if (!Array.isArray(r2.body?.features)) {
      return fail(name, r2.ms, 'alerts list missing features[]');
    }

    // 3. Latest observation from KDCA (Reagan Washington National)
    const r3 = await timedFetch(
      'https://api.weather.gov/stations/KDCA/observations/latest',
      { headers: HDR }
    );
    if (!r3.ok) return fail(name, r3.ms, `KDCA obs HTTP ${r3.status}`, r3.status);
    const ob = r3.body?.properties;
    if (!ob?.timestamp) return fail(name, r3.ms, 'observation missing properties.timestamp');

    return pass(name, Date.now() - t0, {
      activeAlertsTotal: r1.body.total,
      sampleAlert: r2.body.features[0]?.properties?.event || '(none)',
      kdca: {
        at: ob.timestamp,
        text: ob.textDescription,
        temp_C: ob.temperature?.value,
        wind_kph: ob.windSpeed?.value,
      },
    });
  } catch (e) {
    return fail(name, Date.now() - t0, e);
  }
}
