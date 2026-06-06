/**
 * Tests GET /events/{id}/orders/
 *
 * IMPORTANT: This endpoint returns 403 NOT_AUTHORIZED for any event the token
 * owner does not manage. That is the expected, documented behavior — not a bug.
 * The sold-ticket count is only available to the event organizer.
 *
 * This test verifies the endpoint is live and the auth failure contract is correct:
 *   - Status 403
 *   - Body contains { error: "NOT_AUTHORIZED", status_code: 403 }
 *
 * In store-intel.js the orders call is attempted but 403s are handled gracefully —
 * we fall back to ticket_availability.has_available_tickets as the crowd-size proxy.
 */
import { timedFetch, pass, fail, skip } from '../../lib/test-runner.js';

export const name = 'Eventbrite Orders (auth contract)';
export const tier = 'tier2';

const TOKEN = process.env.EVENTBRITE_PRIVATE_TOKEN;
const BASE  = 'https://www.eventbriteapi.com/v3';
const ANCHOR_EVENT_ID = '1979795173659'; // Typographics 2026 — not owned by us

function headers() { return { Authorization: `Bearer ${TOKEN}` }; }

export async function run() {
  if (!TOKEN) return skip(name, 'EVENTBRITE_PRIVATE_TOKEN not set');

  const t0 = Date.now();
  try {
    const r = await timedFetch(`${BASE}/events/${ANCHOR_EVENT_ID}/orders/`, {
      headers: headers(),
      timeoutMs: 30000,
    });

    // 403 is the CORRECT response for non-owned events — verify the contract
    if (r.status === 403) {
      const err = r.body?.error;
      const desc = r.body?.error_description;
      if (err !== 'NOT_AUTHORIZED') {
        return fail(name, r.ms, `expected error=NOT_AUTHORIZED, got: ${err}`);
      }
      return pass(name, Date.now() - t0, {
        note:             'orders endpoint exists and returns correct 403 for non-owned events',
        status:           403,
        error:            err,
        error_description: desc,
        workaround:       'Use ticket_availability.has_available_tickets from GET /events/{id}/?expand=ticket_availability instead',
      });
    }

    // If 200, the token owner actually created this event — still valid
    if (r.ok) {
      const orders = r.body?.orders ?? [];
      return pass(name, Date.now() - t0, {
        note:        'token owner has organizer access to this event',
        orderCount:  r.body?.pagination?.object_count ?? orders.length,
        sampleOrder: orders[0] ? { id: orders[0].id, status: orders[0].status } : null,
      });
    }

    return fail(name, r.ms, `unexpected HTTP ${r.status}`, r.status);
  } catch (e) {
    return fail(name, Date.now() - t0, e);
  }
}
