// NOAA NHC — National Hurricane Center / Central Pacific Hurricane Center
// ArcGIS REST service: mapservices.weather.noaa.gov/tropical/...
// No auth. JSON / GeoJSON / PBF. Layer 2 = Seven-Day Current Location (storm centers).
import { timedFetch, pass, fail } from '../../lib/test-runner.js';

export const name = 'NOAA NHC';
export const tier = 'tier1';

const SERVICE = 'https://mapservices.weather.noaa.gov/tropical/rest/services/tropical/NHC_tropical_weather/MapServer';

export async function run() {
  const t0 = Date.now();
  try {
    // 1. Service metadata
    const r1 = await timedFetch(`${SERVICE}?f=json`);
    if (!r1.ok) return fail(name, r1.ms, `service HTTP ${r1.status}`, r1.status);
    if (typeof r1.body?.currentVersion !== 'number' || !Array.isArray(r1.body?.layers)) {
      return fail(name, r1.ms, 'service metadata missing currentVersion/layers');
    }
    const layerCount = r1.body.layers.length;

    // 2. Query Seven-Day Current Location (layer 2): all active storms.
    //    May be empty off-season — that's fine, response shape is what we validate.
    const q = '/2/query?where=1%3D1&outFields=*&f=geojson';
    const r2 = await timedFetch(`${SERVICE}${q}`);
    if (!r2.ok) return fail(name, r2.ms, `query HTTP ${r2.status}`, r2.status);
    if (r2.body?.type !== 'FeatureCollection') {
      return fail(name, r2.ms, 'expected GeoJSON FeatureCollection');
    }

    return pass(name, Date.now() - t0, {
      service: 'NHC_tropical_weather MapServer',
      arcgisVersion: r1.body.currentVersion,
      totalLayers: layerCount,
      sevenDayCenters: r2.body.features.length,
      sampleStorm: r2.body.features[0]?.properties?.STORMNAME || '(no active storms)',
    });
  } catch (e) {
    return fail(name, Date.now() - t0, e);
  }
}
