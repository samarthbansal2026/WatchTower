// SEC EDGAR — XBRL frames
// One financial fact across ALL reporting entities, for one period.
// Path pattern: /api/xbrl/frames/us-gaap/{Tag}/USD/CY{Y}Q{q}I.json
//   - CY{Y}Q{q}I  → instantaneous (balance-sheet) value at end of quarter
//   - CY{Y}Q{q}   → cumulative through quarter (income/cash-flow)
import { timedFetch, pass, fail } from '../../lib/test-runner.js';

export const name = 'EDGAR XBRL Frames';
export const tier = 'tier1';

const UA = 'watchtower-api-tester (work.samarthbansal@gmail.com)';

export async function run() {
  const t0 = Date.now();
  try {
    // Assets reported at end of CY2023Q4 (a recent, settled period with broad coverage)
    const url = 'https://data.sec.gov/api/xbrl/frames/us-gaap/Assets/USD/CY2023Q4I.json';
    const r = await timedFetch(url, { headers: { 'User-Agent': UA }, timeoutMs: 30000 });
    if (!r.ok) return fail(name, r.ms, `HTTP ${r.status}`, r.status);
    let body = r.body;
    if (typeof body === 'string') body = JSON.parse(body);
    if (!body?.data || !Array.isArray(body.data)) {
      return fail(name, r.ms, 'missing data[] in response');
    }
    // Sort by value desc to find biggest reporter
    const top = [...body.data].sort((a, b) => b.val - a.val).slice(0, 3).map(d => ({
      cik: d.cik, name: d.entityName, val: d.val,
    }));
    return pass(name, r.ms, {
      tag: body.tag,
      period: body.ccp,
      uom: body.uom,
      reportingEntities: body.data.length,
      top3ByAssets: top,
    });
  } catch (e) {
    return fail(name, Date.now() - t0, e);
  }
}
