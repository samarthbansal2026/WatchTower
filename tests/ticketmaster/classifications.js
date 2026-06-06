// Ticketmaster Discovery v2 — /classifications endpoints
// Tests: search → classification detail → genre, segment, subgenre detail endpoints.
// A classification = segment → genre → subgenre → type.
import { timedFetch, pass, fail } from '../../lib/test-runner.js';

export const name = 'TM Classifications';
export const tier = 'tier2';

const BASE = 'https://app.ticketmaster.com/discovery/v2';

export async function run() {
  const t0 = Date.now();
  const key = process.env.TICKETMASTER_CONSUMER_KEY;
  if (!key) return fail(name, 0, 'TICKETMASTER_CONSUMER_KEY not set');

  try {
    // 1. Search
    const r1 = await timedFetch(`${BASE}/classifications.json?size=20&apikey=${key}`);
    if (!r1.ok) return fail(name, r1.ms, `cls search HTTP ${r1.status}`, r1.status);
    const list = r1.body?._embedded?.classifications;
    if (!Array.isArray(list) || list.length === 0) {
      return fail(name, r1.ms, 'no classifications returned');
    }
    // Each row has .segment with embedded .genres[*] which each embed .subgenres[*].
    let seg = null, gen = null, sub = null;
    for (const c of list) {
      if (!seg && c.segment?.id) seg = c.segment;
      const genres = c.segment?._embedded?.genres;
      if (Array.isArray(genres)) {
        for (const g of genres) {
          if (!gen && g.id) gen = g;
          const subs = g._embedded?.subgenres;
          if (Array.isArray(subs)) {
            for (const s of subs) if (!sub && s.id) sub = s;
          }
        }
      }
      if (seg && gen && sub) break;
    }
    if (!seg || !gen || !sub) {
      return fail(name, r1.ms, 'list missing usable segment/genre/subGenre');
    }

    // 2. Classification by id (the "id" of a classification IS the segment/genre/subGenre id)
    const r2 = await timedFetch(`${BASE}/classifications/${seg.id}.json?apikey=${key}`);
    if (!r2.ok) return fail(name, r2.ms, `cls detail HTTP ${r2.status}`, r2.status);

    // 3. /classifications/segments/{id}
    const r3 = await timedFetch(`${BASE}/classifications/segments/${seg.id}.json?apikey=${key}`);
    if (!r3.ok) return fail(name, r3.ms, `segment HTTP ${r3.status}`, r3.status);

    // 4. /classifications/genres/{id}
    const r4 = await timedFetch(`${BASE}/classifications/genres/${gen.id}.json?apikey=${key}`);
    if (!r4.ok) return fail(name, r4.ms, `genre HTTP ${r4.status}`, r4.status);

    // 5. /classifications/subgenres/{id}
    const r5 = await timedFetch(`${BASE}/classifications/subgenres/${sub.id}.json?apikey=${key}`);
    if (!r5.ok) return fail(name, r5.ms, `subgenre HTTP ${r5.status}`, r5.status);

    return pass(name, Date.now() - t0, {
      searchTotal: r1.body.page?.totalElements,
      probed: { segment: seg.name, genre: gen.name, subGenre: sub.name },
      detailNames: {
        classification: r2.body?.segment?.name || r2.body?.genre?.name || r2.body?.subGenre?.name,
        segment: r3.body?.name,
        genre: r4.body?.name,
        subgenre: r5.body?.name,
      },
    });
  } catch (e) {
    return fail(name, Date.now() - t0, e);
  }
}
