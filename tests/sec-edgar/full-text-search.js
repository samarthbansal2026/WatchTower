// SEC EDGAR — Full-Text Search
// https://efts.sec.gov/LATEST/search-index — backs the website search UI.
// Covers filings since 2001 (including exhibits).
import { timedFetch, pass, fail } from '../../lib/test-runner.js';

export const name = 'EDGAR FTS';
export const tier = 'tier1';

const UA = 'watchtower-api-tester (work.samarthbansal@gmail.com)';

export async function run() {
  const t0 = Date.now();
  try {
    const params = new URLSearchParams({
      q: '"artificial intelligence"',
      forms: '10-K',
      dateRange: 'custom',
      startdt: '2024-01-01',
      enddt: '2024-12-31',
    });
    const url = `https://efts.sec.gov/LATEST/search-index?${params}`;
    const r = await timedFetch(url, { headers: { 'User-Agent': UA } });
    if (!r.ok) return fail(name, r.ms, `HTTP ${r.status}`, r.status);
    let body = r.body;
    if (typeof body === 'string') body = JSON.parse(body);
    const hits = body?.hits;
    if (!hits || !Array.isArray(hits.hits)) {
      return fail(name, r.ms, 'no hits in response');
    }
    const sample = hits.hits[0];
    return pass(name, r.ms, {
      total: hits.total?.value,
      returned: hits.hits.length,
      maxScore: hits.max_score,
      sample: sample && {
        accession: sample._id,
        company: sample._source?.display_names?.[0],
        form: sample._source?.form,
        filedAt: sample._source?.file_date,
      },
    });
  } catch (e) {
    return fail(name, Date.now() - t0, e);
  }
}
