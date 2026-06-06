import { timedFetch, pass, fail, skip } from '../../lib/test-runner.js';

export const name = 'FRED Search';
export const tier = 'tier2';

const KEY = process.env.FRED_API_KEY;
const BASE = 'https://api.stlouisfed.org/fred';

export async function run() {
  if (!KEY) return skip(name, 'FRED_API_KEY not set');

  const t0 = Date.now();
  try {
    // Keyword search
    const searchR = await timedFetch(
      `${BASE}/series/search?search_text=consumer+price+index&api_key=${KEY}&file_type=json&limit=5`
    );
    if (!searchR.ok) return fail(name, Date.now() - t0, `HTTP ${searchR.status} on search`, searchR.status);
    if (!Array.isArray(searchR.body?.seriess)) return fail(name, Date.now() - t0, 'No seriess in search response');

    // Tag-based search — find series tagged "unemployment" and "monthly"
    const tagR = await timedFetch(
      `${BASE}/tags/series?tag_names=unemployment;monthly&api_key=${KEY}&file_type=json&limit=5`
    );
    if (!tagR.ok) return fail(name, Date.now() - t0, `HTTP ${tagR.status} on tag search`, tagR.status);
    if (!Array.isArray(tagR.body?.seriess)) return fail(name, Date.now() - t0, 'No seriess in tag search response');

    // Series updates — most recently updated series
    const updatesR = await timedFetch(
      `${BASE}/series/updates?api_key=${KEY}&file_type=json&limit=5`
    );
    if (!updatesR.ok) return fail(name, Date.now() - t0, `HTTP ${updatesR.status} on updates`, updatesR.status);

    return pass(name, Date.now() - t0, {
      keywordHits: searchR.body.count,
      keywordSample: searchR.body.seriess.slice(0, 2).map(s => ({ id: s.id, title: s.title })),
      tagHits: tagR.body.count,
      tagSample: tagR.body.seriess.slice(0, 2).map(s => ({ id: s.id, title: s.title })),
      recentlyUpdated: updatesR.body.seriess?.slice(0, 2).map(s => ({ id: s.id, lastUpdated: s.last_updated })),
    });
  } catch (e) {
    return fail(name, Date.now() - t0, e);
  }
}
