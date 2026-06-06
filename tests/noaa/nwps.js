// NOAA NWPS — National Water Prediction Service
// https://api.water.noaa.gov/nwps/v1/ — no auth, US river gauges + flood forecasts
import { timedFetch, pass, fail } from '../../lib/test-runner.js';

export const name = 'NOAA NWPS';
export const tier = 'tier1';

export async function run() {
  const t0 = Date.now();
  try {
    // Illinois River at Meredosia (LID = MROI2)
    const url = 'https://api.water.noaa.gov/nwps/v1/gauges/MROI2';
    const r = await timedFetch(url);
    if (!r.ok) return fail(name, r.ms, `HTTP ${r.status}`, r.status);
    if (!r.body?.lid || !r.body?.name) {
      return fail(name, r.ms, 'missing lid/name in gauge response');
    }
    const obs = r.body.status?.observed;
    return pass(name, r.ms, {
      lid: r.body.lid,
      name: r.body.name,
      state: r.body.state?.abbreviation,
      observed: obs && {
        stage: `${obs.primary} ${obs.primaryUnit}`,
        flow: `${obs.secondary} ${obs.secondaryUnit}`,
        flood: obs.floodCategory,
        at: obs.validTime,
      },
    });
  } catch (e) {
    return fail(name, Date.now() - t0, e);
  }
}
