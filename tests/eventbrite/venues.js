/**
 * Tests venue detail and venue event listing.
 *
 * Uses The Cooper Union Foundation Building (NYC, ID 9985158) as a concrete anchor
 * since it has recurring events and is a stable reference.
 *
 * Gotcha: GET /venues/{id}/events/ does NOT accept page_size or status query params —
 * both return ARGUMENTS_ERROR 400. Call it bare with no query string.
 */
import { timedFetch, pass, fail, skip } from '../../lib/test-runner.js';

export const name = 'Eventbrite Venues';
export const tier = 'tier2';

const TOKEN = process.env.EVENTBRITE_PRIVATE_TOKEN;
const BASE  = 'https://www.eventbriteapi.com/v3';
// The Cooper Union Foundation Building, 7 East 7th Street, New York, NY
const ANCHOR_VENUE_ID = '9985158';

function headers() {
  return { Authorization: `Bearer ${TOKEN}` };
}

export async function run() {
  if (!TOKEN) return skip(name, 'EVENTBRITE_PRIVATE_TOKEN not set');

  const t0 = Date.now();
  try {
    // 1. Venue detail
    const vDetail = await timedFetch(`${BASE}/venues/${ANCHOR_VENUE_ID}/`, { headers: headers(), timeoutMs: 30000 });
    if (!vDetail.ok) return fail(name, vDetail.ms, `venue detail HTTP ${vDetail.status}`, vDetail.status);
    const v = vDetail.body;
    if (!v.id || !v.name) return fail(name, vDetail.ms, 'venue detail missing id or name');

    // 2. Events at venue — no query params (page_size / status cause 400 ARGUMENTS_ERROR)
    const vEvents = await timedFetch(`${BASE}/venues/${ANCHOR_VENUE_ID}/events/`, { headers: headers(), timeoutMs: 30000 });
    if (!vEvents.ok) return fail(name, vEvents.ms, `venue events HTTP ${vEvents.status}`, vEvents.status);
    if (!('events' in vEvents.body)) return fail(name, vEvents.ms, 'venue events missing events array');

    const evList = vEvents.body.events ?? [];

    return pass(name, Date.now() - t0, {
      venueId:    v.id,
      venueName:  v.name,
      address:    v.address?.localized_address_display,
      lat:        v.latitude,
      lng:        v.longitude,
      capacity:   v.capacity,
      eventsAtVenueCount: vEvents.body.pagination?.object_count ?? evList.length,
      sampleEvents: evList.slice(0, 3).map(e => ({
        id:    e.id,
        name:  e.name?.text,
        start: e.start?.local,
      })),
    });
  } catch (e) {
    return fail(name, Date.now() - t0, e);
  }
}
