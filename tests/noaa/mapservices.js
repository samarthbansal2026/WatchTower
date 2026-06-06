// NOAA MapServices — mapservices.weather.noaa.gov (formerly NowCoast)
// ArcGIS REST. Folders: eventdriven (radar, water, WWA), tropical (NHC), static, raster.
// No auth. JSON / GeoJSON / PBF.
import { timedFetch, pass, fail } from '../../lib/test-runner.js';

export const name = 'NOAA MapServices';
export const tier = 'tier1';

const HOST = 'https://mapservices.weather.noaa.gov';

export async function run() {
  const t0 = Date.now();
  try {
    // 1. Root folder listing
    const r1 = await timedFetch(`${HOST}/eventdriven/rest/services?f=json`);
    if (!r1.ok) return fail(name, r1.ms, `root HTTP ${r1.status}`, r1.status);
    if (!Array.isArray(r1.body?.folders)) {
      return fail(name, r1.ms, 'expected folders[] in root response');
    }

    // 2. Total count of active warnings (no features returned).
    const wwaBase = `${HOST}/eventdriven/rest/services/WWA/watch_warn_adv/MapServer/1/query`;
    const r2 = await timedFetch(`${wwaBase}?where=1%3D1&returnCountOnly=true&f=json`);
    if (!r2.ok) return fail(name, r2.ms, `count HTTP ${r2.status}`, r2.status);
    if (typeof r2.body?.count !== 'number') {
      return fail(name, r2.ms, 'count response missing numeric count');
    }

    // 3. Sample 5 actual warning records.
    const r3 = await timedFetch(`${wwaBase}?where=1%3D1`
      + '&outFields=event,prod_type,phenom,sig,wfo'
      + '&returnGeometry=false&resultRecordCount=5&f=json');
    if (!r3.ok) return fail(name, r3.ms, `sample HTTP ${r3.status}`, r3.status);
    if (!Array.isArray(r3.body?.features) || r3.body.features.length === 0) {
      return fail(name, r3.ms, 'no features returned');
    }

    return pass(name, Date.now() - t0, {
      folders: r1.body.folders,
      activeWarnings: r2.body.count,
      sample: r3.body.features[0].attributes,
    });
  } catch (e) {
    return fail(name, Date.now() - t0, e);
  }
}
