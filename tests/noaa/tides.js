// NOAA CO-OPS Tides & Currents API — api.tidesandcurrents.noaa.gov
// No auth required. Two services live under this host:
//   * Data API:     /api/prod/datagetter        (observations & forecasts)
//   * Metadata API: /mdapi/prod/webapi/stations (station list/info)
import { timedFetch, pass, fail } from '../../lib/test-runner.js';

export const name = 'NOAA Tides & Currents';
export const tier = 'tier1';

export async function run() {
  const t0 = Date.now();
  try {
    // Latest water level at Boston, MA (station 8443970)
    const params = new URLSearchParams({
      date: 'latest',
      station: '8443970',
      product: 'water_level',
      datum: 'MLLW',
      time_zone: 'gmt',
      units: 'english',
      format: 'json',
      application: 'watchtower-api-tester',
    });
    const url = `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?${params}`;
    const r = await timedFetch(url);
    if (!r.ok) return fail(name, r.ms, `HTTP ${r.status}`, r.status);
    if (r.body?.error) return fail(name, r.ms, `API error: ${r.body.error.message}`);
    const arr = r.body?.data;
    if (!Array.isArray(arr) || arr.length === 0) {
      return fail(name, r.ms, 'no data array in response');
    }
    const sample = arr[arr.length - 1];
    return pass(name, r.ms, {
      station: r.body.metadata?.name || '8443970',
      latestReading: sample,
    });
  } catch (e) {
    return fail(name, Date.now() - t0, e);
  }
}
