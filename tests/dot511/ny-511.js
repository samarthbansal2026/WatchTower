// 511NY — New York State 511 traffic + transit API
// https://511ny.org/developers/doc  —  free developer key, `key=` query param.
// Tests 3 representative endpoints (events, message signs, cameras).
import { timedFetch, pass, fail, skip } from '../../lib/test-runner.js';

export const name = '511NY';
export const tier = 'tier2';

const BASE = 'https://511ny.org/api';

export async function run() {
  const t0 = Date.now();
  const key = process.env.NY_511_KEY;
  if (!key) return skip(name, 'NY_511_KEY not set — get key at https://511ny.org/developers/help');

  try {
    // 1. Traffic events
    const r1 = await timedFetch(`${BASE}/getevents?key=${key}&format=json`, { timeoutMs: 30000 });
    if (!r1.ok) return fail(name, r1.ms, `events HTTP ${r1.status}`, r1.status);
    let events = r1.body;
    if (typeof events === 'string') {
      try { events = JSON.parse(events); } catch { /* */ }
    }
    if (!Array.isArray(events)) return fail(name, r1.ms, 'events not an array');

    // 2. Cameras
    const r2 = await timedFetch(`${BASE}/getcameras?key=${key}&format=json`, { timeoutMs: 30000 });
    if (!r2.ok) return fail(name, r2.ms, `cameras HTTP ${r2.status}`, r2.status);
    let cams = r2.body;
    if (typeof cams === 'string') {
      try { cams = JSON.parse(cams); } catch { /* */ }
    }
    if (!Array.isArray(cams)) return fail(name, r2.ms, 'cameras not an array');

    // 3. Message signs (DMS)
    const r3 = await timedFetch(`${BASE}/getmessagesigns?key=${key}&format=json`, { timeoutMs: 30000 });
    if (!r3.ok) return fail(name, r3.ms, `signs HTTP ${r3.status}`, r3.status);
    let signs = r3.body;
    if (typeof signs === 'string') {
      try { signs = JSON.parse(signs); } catch { /* */ }
    }
    if (!Array.isArray(signs)) return fail(name, r3.ms, 'signs not an array');

    return pass(name, Date.now() - t0, {
      events: events.length,
      cameras: cams.length,
      messageSigns: signs.length,
      sampleEvent: events[0] && {
        id: events[0].ID,
        roadway: events[0].RoadwayName,
        description: events[0].Description?.slice(0, 80),
        county: events[0].CountiesAffected,
      },
    });
  } catch (e) {
    return fail(name, Date.now() - t0, e);
  }
}
