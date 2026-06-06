/**
 * Tests event detail and attendee orders.
 *
 * Note: GET /v3/users/me/owned_events/ requires an organizer account (i.e., the
 * token owner must have created at least one event). It returns 404 "user_id does
 * not exist" for pure attendee accounts. This test avoids that path.
 *
 * Event ID discovery: tries the anchor venue first; falls back to a hardcoded
 * known-live event ID if the venue call returns 5xx (Eventbrite's venue events
 * endpoint occasionally 502s under load).
 */
import { timedFetch, pass, fail, skip } from '../../lib/test-runner.js';

export const name = 'Eventbrite Event Detail & Orders';
export const tier = 'tier2';

const TOKEN = process.env.EVENTBRITE_PRIVATE_TOKEN;
const BASE  = 'https://www.eventbriteapi.com/v3';
// Cooper Union Foundation Building, NYC — venue with recurring events
const ANCHOR_VENUE_ID = '9985158';
// Typographics Conference 2026 — fallback if venue events call 5xxs
const FALLBACK_EVENT_ID = '1979795173659';

function headers() {
  return { Authorization: `Bearer ${TOKEN}` };
}

export async function run() {
  if (!TOKEN) return skip(name, 'EVENTBRITE_PRIVATE_TOKEN not set');

  const t0 = Date.now();
  try {
    // 1. Discover a live event ID: try anchor venue, fall back to known event
    let eventId = FALLBACK_EVENT_ID;
    const venueEvents = await timedFetch(`${BASE}/venues/${ANCHOR_VENUE_ID}/events/`, { headers: headers(), timeoutMs: 30000 });
    if (venueEvents.ok) {
      const first = venueEvents.body?.events?.[0];
      if (first) eventId = first.id;
    }
    // non-2xx on venue events is non-fatal here — we fall back to FALLBACK_EVENT_ID

    // 2. Event detail — full expand
    const detail = await timedFetch(
      `${BASE}/events/${eventId}/?expand=venue,ticket_classes,organizer,ticket_availability`,
      { headers: headers(), timeoutMs: 30000 },
    );
    if (!detail.ok) return fail(name, detail.ms, `event detail HTTP ${detail.status}`, detail.status);

    const e = detail.body;
    if (!e.id || !e.name) return fail(name, detail.ms, 'event detail missing id or name');

    // 3. Orders (attendee tickets purchased by this account — valid even if empty)
    const orders = await timedFetch(`${BASE}/users/me/orders/`, { headers: headers(), timeoutMs: 30000 });
    if (!orders.ok) return fail(name, orders.ms, `orders HTTP ${orders.status}`, orders.status);
    if (!('orders' in orders.body)) return fail(name, orders.ms, 'orders response missing orders array');

    return pass(name, Date.now() - t0, {
      eventId:     e.id,
      eventName:   e.name?.text,
      status:      e.status,
      start:       e.start?.local,
      url:         e.url,
      venue:       e.venue ? { id: e.venue.id, name: e.venue.name } : null,
      capacity:    e.capacity,
      ticketClassCount: (e.ticket_classes ?? []).length,
      hasAvailableTickets: e.ticket_availability?.has_available_tickets,
      ordersCount: orders.body.pagination?.object_count ?? 0,
    });
  } catch (e) {
    return fail(name, Date.now() - t0, e);
  }
}
