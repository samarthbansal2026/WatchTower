// Ticketmaster Discovery v2 — /events endpoints
// Auth: apikey query parameter (consumer key).
// Tests: /events (search) → /events/{id} (detail) → /events/{id}/images
import { timedFetch, pass, fail } from '../../lib/test-runner.js';

export const name = 'TM Events';
export const tier = 'tier2';

const BASE = 'https://app.ticketmaster.com/discovery/v2';

export async function run() {
  const t0 = Date.now();
  const key = process.env.TICKETMASTER_CONSUMER_KEY;
  if (!key) return fail(name, 0, 'TICKETMASTER_CONSUMER_KEY not set');

  try {
    // 1. Search: first page of US events sorted by date, size 5
    const r1 = await timedFetch(
      `${BASE}/events.json?countryCode=US&size=5&sort=date,asc&apikey=${key}`
    );
    if (!r1.ok) return fail(name, r1.ms, `events search HTTP ${r1.status}`, r1.status);
    const events = r1.body?._embedded?.events;
    if (!Array.isArray(events) || events.length === 0) {
      return fail(name, r1.ms, 'events search returned no events');
    }
    const eventId = events[0].id;

    // 2. Detail
    const r2 = await timedFetch(`${BASE}/events/${eventId}.json?apikey=${key}`);
    if (!r2.ok) return fail(name, r2.ms, `event detail HTTP ${r2.status}`, r2.status);
    if (r2.body?.id !== eventId) return fail(name, r2.ms, 'event detail id mismatch');

    // 3. Images
    const r3 = await timedFetch(`${BASE}/events/${eventId}/images.json?apikey=${key}`);
    if (!r3.ok) return fail(name, r3.ms, `event images HTTP ${r3.status}`, r3.status);
    if (!Array.isArray(r3.body?.images)) {
      return fail(name, r3.ms, 'event images missing images[]');
    }

    return pass(name, Date.now() - t0, {
      totalEvents: r1.body.page?.totalElements,
      pageSize: events.length,
      firstEvent: {
        id: eventId,
        name: events[0].name,
        date: events[0].dates?.start?.localDate,
        venue: events[0]._embedded?.venues?.[0]?.name,
      },
      detailMatched: r2.body.id === eventId,
      imageCount: r3.body.images.length,
    });
  } catch (e) {
    return fail(name, Date.now() - t0, e);
  }
}
