import { timedFetch, pass, fail } from '../../lib/test-runner.js';

export const name = 'Open-Meteo Geocoding';
export const tier = 'tier1';

export async function run() {
  const t0 = Date.now();
  try {
    // Search by city name
    const searchUrl = 'https://geocoding-api.open-meteo.com/v1/search?name=San+Francisco&count=5&language=en&format=json';
    const r = await timedFetch(searchUrl);
    if (!r.ok) return fail(name, r.ms, `HTTP ${r.status}`, r.status);
    if (!Array.isArray(r.body?.results) || r.body.results.length === 0) {
      return fail(name, r.ms, 'no results returned for "San Francisco"');
    }

    const top = r.body.results[0];
    if (!top.latitude || !top.longitude) return fail(name, r.ms, 'missing lat/lon in result');

    return pass(name, Date.now() - t0, {
      query: 'San Francisco',
      resultCount: r.body.results.length,
      topResult: {
        name: top.name,
        country: top.country,
        admin1: top.admin1,
        latitude: top.latitude,
        longitude: top.longitude,
        elevation: top.elevation,
        timezone: top.timezone,
        population: top.population,
      },
    });
  } catch (e) {
    return fail(name, Date.now() - t0, e);
  }
}
