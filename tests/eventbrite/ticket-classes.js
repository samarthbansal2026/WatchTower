/**
 * Tests GET /events/{id}/ticket_classes/
 *
 * Returns each ticket tier for an event: name, cost, quantity sold, on_sale_status.
 * Works for any accessible event — does NOT require organizer ownership.
 * This is the key demographic signal: cheap/free GA = mass crowd; $500 VIP = affluent.
 */
import { timedFetch, pass, fail, skip } from '../../lib/test-runner.js';

export const name = 'Eventbrite Ticket Classes';
export const tier = 'tier2';

const TOKEN = process.env.EVENTBRITE_PRIVATE_TOKEN;
const BASE  = 'https://www.eventbriteapi.com/v3';
// Typographics Conference 2026 — 11 ticket tiers, mix of paid + free
const ANCHOR_EVENT_ID = '1979795173659';

function headers() { return { Authorization: `Bearer ${TOKEN}` }; }

export async function run() {
  if (!TOKEN) return skip(name, 'EVENTBRITE_PRIVATE_TOKEN not set');

  const t0 = Date.now();
  try {
    const r = await timedFetch(`${BASE}/events/${ANCHOR_EVENT_ID}/ticket_classes/`, {
      headers: headers(),
      timeoutMs: 30000,
    });
    if (!r.ok) return fail(name, r.ms, `HTTP ${r.status}`, r.status);

    const classes = r.body?.ticket_classes ?? [];
    if (!classes.length) return fail(name, r.ms, 'ticket_classes returned empty array');

    const free    = classes.filter(t => t.free);
    const paid    = classes.filter(t => !t.free && t.cost?.value);
    const onSale  = classes.filter(t => t.on_sale_status === 'AVAILABLE');
    const prices  = paid.map(t => t.cost.value / 100);

    return pass(name, Date.now() - t0, {
      eventId:         ANCHOR_EVENT_ID,
      totalTiers:      classes.length,
      freeTiers:       free.length,
      paidTiers:       paid.length,
      availableTiers:  onSale.length,
      priceRangeUsd:   prices.length ? { min: Math.min(...prices), max: Math.max(...prices) } : null,
      sampleClasses:   classes.slice(0, 3).map(t => ({
        name:         t.name,
        free:         t.free,
        cost:         t.cost?.display ?? 'free',
        on_sale:      t.on_sale_status,
        quantity_sold: t.quantity_sold ?? null,
      })),
    });
  } catch (e) {
    return fail(name, Date.now() - t0, e);
  }
}
