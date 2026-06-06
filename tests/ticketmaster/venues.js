// Ticketmaster Discovery v2 — /venues endpoints
import { timedFetch, pass, fail } from '../../lib/test-runner.js';

export const name = 'TM Venues';
export const tier = 'tier2';

const BASE = 'https://app.ticketmaster.com/discovery/v2';

export async function run() {
  const t0 = Date.now();
  const key = process.env.TICKETMASTER_CONSUMER_KEY;
  if (!key) return fail(name, 0, 'TICKETMASTER_CONSUMER_KEY not set');

  try {
    // 1. Search: Madison Square Garden
    const r1 = await timedFetch(
      `${BASE}/venues.json?keyword=Madison+Square+Garden&countryCode=US&size=5&apikey=${key}`
    );
    if (!r1.ok) return fail(name, r1.ms, `venues search HTTP ${r1.status}`, r1.status);
    const list = r1.body?._embedded?.venues;
    if (!Array.isArray(list) || list.length === 0) {
      return fail(name, r1.ms, 'venues search returned no results');
    }
    const venueId = list[0].id;

    // 2. Detail
    const r2 = await timedFetch(`${BASE}/venues/${venueId}.json?apikey=${key}`);
    if (!r2.ok) return fail(name, r2.ms, `venue detail HTTP ${r2.status}`, r2.status);
    if (r2.body?.id !== venueId) return fail(name, r2.ms, 'venue id mismatch');

    return pass(name, Date.now() - t0, {
      hits: list.length,
      total: r1.body.page?.totalElements,
      first: {
        id: venueId,
        name: list[0].name,
        city: list[0].city?.name,
        state: list[0].state?.stateCode,
      },
      detail: {
        timezone: r2.body.timezone,
        postalCode: r2.body.postalCode,
        address: r2.body.address?.line1,
        location: r2.body.location && { lat: r2.body.location.latitude, lon: r2.body.location.longitude },
      },
    });
  } catch (e) {
    return fail(name, Date.now() - t0, e);
  }
}
