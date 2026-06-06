// NOAA / National Weather Service API — api.weather.gov
// No auth required; User-Agent header IS required by NWS policy.
// Flow: GET /points/{lat,lon} -> read properties.forecast -> GET that URL.
import { timedFetch, pass, fail } from '../../lib/test-runner.js';

export const name = 'NOAA NWS';
export const tier = 'tier1';

const UA = 'watchtower-api-tester (work.samarthbansal@gmail.com)';

export async function run() {
  const t0 = Date.now();
  try {
    // Step 1: point lookup. Using Washington, DC (US-only API).
    const pointsUrl = 'https://api.weather.gov/points/38.8894,-77.0352';
    const r1 = await timedFetch(pointsUrl, {
      headers: { 'User-Agent': UA, Accept: 'application/geo+json' },
    });
    if (!r1.ok) return fail(name, r1.ms, `points HTTP ${r1.status}`, r1.status);
    const forecastUrl = r1.body?.properties?.forecast;
    if (!forecastUrl) return fail(name, r1.ms, 'no properties.forecast in points response');

    // Step 2: fetch forecast.
    const r2 = await timedFetch(forecastUrl, {
      headers: { 'User-Agent': UA, Accept: 'application/geo+json' },
    });
    if (!r2.ok) return fail(name, r2.ms, `forecast HTTP ${r2.status}`, r2.status);
    const periods = r2.body?.properties?.periods;
    if (!Array.isArray(periods) || periods.length === 0) {
      return fail(name, r2.ms, 'no forecast periods in response');
    }

    const first = periods[0];
    return pass(name, Date.now() - t0, {
      location: r1.body.properties.relativeLocation?.properties?.city
        + ', ' + r1.body.properties.relativeLocation?.properties?.state,
      gridOffice: r1.body.properties.cwa,
      forecastPeriods: periods.length,
      first: { name: first.name, temp: `${first.temperature}°${first.temperatureUnit}`, short: first.shortForecast },
    });
  } catch (e) {
    return fail(name, Date.now() - t0, e);
  }
}
