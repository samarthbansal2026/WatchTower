// Multi-state WZDx feed sampler — hits 5 state Work Zone Data Exchange feeds
// directly (no key required), confirms each returns a valid GeoJSON FeatureCollection.
//
// Sources of these URLs: the federal WZDx Feed Registry at
// https://data.transportation.gov/d/69qe-yiui (only `needapikey: false` rows).
import { timedFetch, pass, fail } from '../../lib/test-runner.js';

export const name = 'WZDx State Feeds';
export const tier = 'tier1';

const FEEDS = [
  { state: 'MD', org: 'Maryland SHA (via RITIS)', url: 'https://filter.ritis.org/wzdx_v4.1/mdot.geojson' },
  { state: 'NY', org: '511NY',                    url: 'https://511ny.org/api/wzdx' },
  { state: 'WA', org: 'WSDOT',                    url: 'https://wzdx.wsdot.wa.gov/api/v4/WorkZoneFeed' },
  { state: 'DE', org: 'Delaware DOT (e-dot)',     url: 'https://wzdx.e-dot.com/del_dot_feed_wzdx_v4.1.geojson' },
  { state: 'LA', org: 'Louisiana DOTD (e-dot)',   url: 'https://wzdx.e-dot.com/la_dot_d_feed_wzdx_v4.1.geojson' },
  { state: 'ID', org: '511 Idaho',                url: 'https://511.idaho.gov/api/wzdx' },
];

export async function run() {
  const t0 = Date.now();
  const results = {};
  let anyOk = false;

  for (const f of FEEDS) {
    try {
      const r = await timedFetch(f.url, {
        timeoutMs: 20000,
        headers: { 'User-Agent': 'watchtower-wzdx-tester/1.0 (work.samarthbansal@gmail.com)' },
      });
      if (!r.ok) {
        results[f.state] = { ok: false, status: r.status, ms: r.ms };
        continue;
      }
      // Some feeds serve JSON with the wrong content-type (octet-stream / text).
      // timedFetch returns a raw string in that case — parse it manually here.
      let body = r.body;
      if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch { /* fall through */ }
      }
      if (body?.type !== 'FeatureCollection' || !Array.isArray(body.features)) {
        results[f.state] = { ok: false, error: 'not a FeatureCollection', ms: r.ms };
        continue;
      }
      results[f.state] = {
        ok: true,
        ms: r.ms,
        events: body.features.length,
        version: body.feed_info?.version || body.road_event_feed_info?.version,
        publisher: body.feed_info?.publisher || body.road_event_feed_info?.publisher,
      };
      anyOk = true;
    } catch (e) {
      results[f.state] = { ok: false, error: e.message || String(e) };
    }
  }

  if (!anyOk) return fail(name, Date.now() - t0, 'all state feeds failed');
  return pass(name, Date.now() - t0, results);
}
