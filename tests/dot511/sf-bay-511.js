// 511 SF Bay open data — api.511.org
// Free api_key (1-time email verification); 60 req/hour default.
// Tests 3 representative endpoints across the traffic and transit domains.
import { timedFetch, pass, fail, skip } from '../../lib/test-runner.js';

export const name = '511 SF Bay';
export const tier = 'tier2';

const BASE = 'https://api.511.org';

export async function run() {
  const t0 = Date.now();
  const key = process.env.SF_BAY_511_KEY;
  if (!key) return skip(name, 'SF_BAY_511_KEY not set — get key at https://511.org/open-data/token');

  try {
    // 1. Traffic events (incidents, construction, special events)
    const r1 = await timedFetch(
      `${BASE}/traffic/events?api_key=${key}&format=json&limit=5`
    );
    if (!r1.ok) return fail(name, r1.ms, `events HTTP ${r1.status}`, r1.status);
    // Body sometimes returned as text/plain with a BOM. Re-parse as needed.
    let evBody = r1.body;
    if (typeof evBody === 'string') {
      const cleaned = evBody.replace(/^﻿/, '');
      try { evBody = JSON.parse(cleaned); } catch { /* */ }
    }
    if (!Array.isArray(evBody?.events)) {
      return fail(name, r1.ms, 'events missing events[]');
    }

    // 2. Transit operators (master list)
    const r2 = await timedFetch(`${BASE}/transit/operators?api_key=${key}&format=json`);
    if (!r2.ok) return fail(name, r2.ms, `operators HTTP ${r2.status}`, r2.status);
    let opBody = r2.body;
    if (typeof opBody === 'string') {
      opBody = JSON.parse(opBody.replace(/^﻿/, ''));
    }
    if (!Array.isArray(opBody)) {
      return fail(name, r2.ms, 'operators response not an array');
    }

    return pass(name, Date.now() - t0, {
      trafficEventsTotal: evBody.events.length,
      trafficSample: evBody.events[0] && {
        id: evBody.events[0].id,
        eventType: evBody.events[0].event_type,
        headline: evBody.events[0].headline?.slice(0, 80),
      },
      transitOperators: opBody.length,
      sampleOperators: opBody.slice(0, 4).map(o => o.Name || o.name),
    });
  } catch (e) {
    return fail(name, Date.now() - t0, e);
  }
}
