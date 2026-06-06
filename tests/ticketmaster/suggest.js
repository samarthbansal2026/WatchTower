// Ticketmaster Discovery v2 — /suggest autocomplete
// Returns up to 3 best matches per entity type (events / attractions / venues).
import { timedFetch, pass, fail } from '../../lib/test-runner.js';

export const name = 'TM Suggest';
export const tier = 'tier2';

const BASE = 'https://app.ticketmaster.com/discovery/v2';

export async function run() {
  const t0 = Date.now();
  const key = process.env.TICKETMASTER_CONSUMER_KEY;
  if (!key) return fail(name, 0, 'TICKETMASTER_CONSUMER_KEY not set');

  try {
    const r = await timedFetch(
      `${BASE}/suggest.json?keyword=tay&countryCode=US&apikey=${key}`
    );
    if (!r.ok) return fail(name, r.ms, `HTTP ${r.status}`, r.status);
    const emb = r.body?._embedded;
    if (!emb) return fail(name, r.ms, 'no _embedded in suggest response');

    return pass(name, r.ms, {
      attractions: emb.attractions?.length ?? 0,
      events:      emb.events?.length      ?? 0,
      venues:      emb.venues?.length      ?? 0,
      products:    emb.products?.length    ?? 0,
      topAttraction: emb.attractions?.[0]?.name,
      topEvent: emb.events?.[0]?.name,
    });
  } catch (e) {
    return fail(name, Date.now() - t0, e);
  }
}
