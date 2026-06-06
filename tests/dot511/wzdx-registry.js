// US DOT — WZDx Feed Registry (Socrata Open Data)
// https://data.transportation.gov/d/69qe-yiui — national directory of state Work Zone Data Exchange feeds.
// No auth required. Returns one row per registered feed with state, URL, format, key-required flag.
import { timedFetch, pass, fail } from '../../lib/test-runner.js';

export const name = 'WZDx Registry';
export const tier = 'tier1';

const URL = 'https://data.transportation.gov/resource/69qe-yiui.json?$limit=500';

export async function run() {
  const t0 = Date.now();
  try {
    const r = await timedFetch(URL);
    if (!r.ok) return fail(name, r.ms, `HTTP ${r.status}`, r.status);
    if (!Array.isArray(r.body) || r.body.length === 0) {
      return fail(name, r.ms, 'registry returned non-array or empty');
    }
    const active = r.body.filter(x => x.active);
    const noKey = active.filter(x => x.needapikey === false);
    const needKey = active.filter(x => x.needapikey === true);
    const states = [...new Set(active.map(x => x.state))].sort();
    return pass(name, r.ms, {
      totalFeeds: r.body.length,
      active: active.length,
      activeNoKey: noKey.length,
      activeNeedsKey: needKey.length,
      uniqueStates: states.length,
      sampleStates: states.slice(0, 12),
    });
  } catch (e) {
    return fail(name, Date.now() - t0, e);
  }
}
