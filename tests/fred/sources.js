import { timedFetch, pass, fail, skip } from '../../lib/test-runner.js';

export const name = 'FRED Sources';
export const tier = 'tier2';

const KEY = process.env.FRED_API_KEY;
const BASE = 'https://api.stlouisfed.org/fred';

export async function run() {
  if (!KEY) return skip(name, 'FRED_API_KEY not set');

  const t0 = Date.now();
  try {
    // All sources
    const srcR = await timedFetch(`${BASE}/sources?api_key=${KEY}&file_type=json`);
    if (!srcR.ok) return fail(name, Date.now() - t0, `HTTP ${srcR.status} on sources`, srcR.status);
    if (!Array.isArray(srcR.body?.sources)) return fail(name, Date.now() - t0, 'No sources in response');
    const sources = srcR.body.sources;

    // Detail for Federal Reserve Board (source id=1)
    const fedR = await timedFetch(`${BASE}/source?source_id=1&api_key=${KEY}&file_type=json`);
    if (!fedR.ok) return fail(name, Date.now() - t0, `HTTP ${fedR.status} on Fed source`, fedR.status);
    const fed = fedR.body?.sources?.[0];
    if (!fed) return fail(name, Date.now() - t0, 'No Fed source detail');

    // Releases for Federal Reserve Board source
    const fedRelR = await timedFetch(`${BASE}/source/releases?source_id=1&api_key=${KEY}&file_type=json&limit=5`);
    if (!fedRelR.ok) return fail(name, Date.now() - t0, `HTTP ${fedRelR.status} on Fed releases`, fedRelR.status);

    return pass(name, Date.now() - t0, {
      totalSources: sources.length,
      sourcesSample: sources.slice(0, 5).map(s => ({ id: s.id, name: s.name })),
      fedSource: { id: fed.id, name: fed.name, link: fed.link },
      fedReleaseCount: fedRelR.body.count,
    });
  } catch (e) {
    return fail(name, Date.now() - t0, e);
  }
}
