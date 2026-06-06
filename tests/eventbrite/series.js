/**
 * Tests GET /series/{id}/events/
 *
 * For recurring events (is_series_parent: true on the event detail), the series
 * ID is the event's own ID — there is no separate series_id field in the response.
 * This returns all individual occurrences (past + upcoming).
 *
 * Store-intel use: if a venue near us hosts a recurring series, every future date
 * in the series is a crowd event — we can plan staffing weeks in advance.
 *
 * Anchor: Knicks Watch Party at The Ainsworth (series parent ID 1990640694905)
 * Confirmed: is_series_parent true; 7 upcoming dates as of 2026-06-05.
 */
import { timedFetch, pass, fail, skip } from '../../lib/test-runner.js';

export const name = 'Eventbrite Series Events';
export const tier = 'tier2';

const TOKEN = process.env.EVENTBRITE_PRIVATE_TOKEN;
const BASE  = 'https://www.eventbriteapi.com/v3';
// Knicks Watch Party — series parent; is_series_parent: true confirmed
const ANCHOR_SERIES_ID = '1990640694905';

function headers() { return { Authorization: `Bearer ${TOKEN}` }; }

export async function run() {
  if (!TOKEN) return skip(name, 'EVENTBRITE_PRIVATE_TOKEN not set');

  const t0 = Date.now();
  try {
    const r = await timedFetch(`${BASE}/series/${ANCHOR_SERIES_ID}/events/`, {
      headers: headers(),
      timeoutMs: 30000,
    });
    if (!r.ok) return fail(name, r.ms, `HTTP ${r.status}`, r.status);
    if (!('events' in r.body)) return fail(name, r.ms, 'response missing events array');

    const all      = r.body.events ?? [];
    const now      = new Date();
    const upcoming = all
      .filter(e => e.start?.utc && new Date(e.start.utc) > now)
      .sort((a, b) => new Date(a.start.utc) - new Date(b.start.utc));
    const past     = all.filter(e => e.start?.utc && new Date(e.start.utc) <= now);

    return pass(name, Date.now() - t0, {
      seriesId:      ANCHOR_SERIES_ID,
      totalOccurrences: r.body.pagination?.object_count ?? all.length,
      upcomingCount: upcoming.length,
      pastCount:     past.length,
      nextDates:     upcoming.slice(0, 5).map(e => ({
        id:     e.id,
        start:  e.start?.local,
        status: e.status,
      })),
    });
  } catch (e) {
    return fail(name, Date.now() - t0, e);
  }
}
