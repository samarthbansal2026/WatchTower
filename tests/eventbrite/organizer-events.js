/**
 * Tests GET /organizers/{id}/events/
 *
 * Returns all events (past + upcoming) for a given organizer.
 * Organizer ID is discovered from any event detail: event.organizer_id
 *
 * Store-intel use: once we find an event near the store via venue discovery,
 * we check the organizer's full calendar — a promoter with 20 upcoming events
 * means recurring crowd patterns, not a one-off.
 *
 * Gotcha: only the bare endpoint works. Adding status=, order_by=, or page_size=
 * causes 400 ARGUMENTS_ERROR. Filter/sort the result in JS.
 */
import { timedFetch, pass, fail, skip } from '../../lib/test-runner.js';

export const name = 'Eventbrite Organizer Events';
export const tier = 'tier2';

const TOKEN = process.env.EVENTBRITE_PRIVATE_TOKEN;
const BASE  = 'https://www.eventbriteapi.com/v3';
// Organizer for Typographics Conference — 16 total events confirmed
const ANCHOR_ORGANIZER_ID = '14077440081';

function headers() { return { Authorization: `Bearer ${TOKEN}` }; }

export async function run() {
  if (!TOKEN) return skip(name, 'EVENTBRITE_PRIVATE_TOKEN not set');

  const t0 = Date.now();
  try {
    // Bare request — no query params; filter in JS
    const r = await timedFetch(`${BASE}/organizers/${ANCHOR_ORGANIZER_ID}/events/`, {
      headers: headers(),
      timeoutMs: 30000,
    });
    if (!r.ok) return fail(name, r.ms, `HTTP ${r.status}`, r.status);
    if (!('events' in r.body)) return fail(name, r.ms, 'response missing events array');

    const all       = r.body.events ?? [];
    const now       = new Date();
    const upcoming  = all.filter(e => e.start?.utc && new Date(e.start.utc) > now)
                         .sort((a, b) => new Date(a.start.utc) - new Date(b.start.utc));

    return pass(name, Date.now() - t0, {
      organizerId:     ANCHOR_ORGANIZER_ID,
      totalEvents:     r.body.pagination?.object_count ?? all.length,
      upcomingCount:   upcoming.length,
      nextEvents:      upcoming.slice(0, 3).map(e => ({
        id:    e.id,
        name:  e.name?.text,
        start: e.start?.local,
        status: e.status,
      })),
    });
  } catch (e) {
    return fail(name, Date.now() - t0, e);
  }
}
