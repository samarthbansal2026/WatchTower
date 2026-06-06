// Ticketmaster Discovery v2 — /attractions endpoints (artists, teams, plays, packages)
import { timedFetch, pass, fail } from '../../lib/test-runner.js';

export const name = 'TM Attractions';
export const tier = 'tier2';

const BASE = 'https://app.ticketmaster.com/discovery/v2';

export async function run() {
  const t0 = Date.now();
  const key = process.env.TICKETMASTER_CONSUMER_KEY;
  if (!key) return fail(name, 0, 'TICKETMASTER_CONSUMER_KEY not set');

  try {
    // 1. Search: Taylor Swift
    const r1 = await timedFetch(
      `${BASE}/attractions.json?keyword=Taylor+Swift&size=5&apikey=${key}`
    );
    if (!r1.ok) return fail(name, r1.ms, `attractions search HTTP ${r1.status}`, r1.status);
    const list = r1.body?._embedded?.attractions;
    if (!Array.isArray(list) || list.length === 0) {
      return fail(name, r1.ms, 'attractions search returned no results');
    }
    const attId = list[0].id;

    // 2. Detail
    const r2 = await timedFetch(`${BASE}/attractions/${attId}.json?apikey=${key}`);
    if (!r2.ok) return fail(name, r2.ms, `attraction detail HTTP ${r2.status}`, r2.status);
    if (r2.body?.id !== attId) return fail(name, r2.ms, 'attraction id mismatch');

    return pass(name, Date.now() - t0, {
      hits: list.length,
      total: r1.body.page?.totalElements,
      first: { id: attId, name: list[0].name, type: list[0].type },
      detailName: r2.body.name,
      detailUpcomingEvents: r2.body.upcomingEvents?._total,
    });
  } catch (e) {
    return fail(name, Date.now() - t0, e);
  }
}
