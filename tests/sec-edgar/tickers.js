// SEC EDGAR — ticker → CIK lookup
// https://www.sec.gov/files/company_tickers.json — static JSON updated nightly.
// SEC requires a descriptive User-Agent on every request.
import { timedFetch, pass, fail } from '../../lib/test-runner.js';

export const name = 'EDGAR Tickers';
export const tier = 'tier1';

const UA = 'watchtower-api-tester (work.samarthbansal@gmail.com)';

export async function run() {
  const t0 = Date.now();
  try {
    const r = await timedFetch('https://www.sec.gov/files/company_tickers.json', {
      headers: { 'User-Agent': UA },
    });
    if (!r.ok) return fail(name, r.ms, `HTTP ${r.status}`, r.status);
    // Body is an object keyed by index ("0", "1", …), each value is {cik_str, ticker, title}.
    let body = r.body;
    if (typeof body === 'string') body = JSON.parse(body);
    const rows = Object.values(body);
    if (rows.length === 0 || !rows[0].ticker) {
      return fail(name, r.ms, 'unexpected shape');
    }
    const aapl = rows.find(x => x.ticker === 'AAPL');
    return pass(name, r.ms, {
      totalCompanies: rows.length,
      aapl,
    });
  } catch (e) {
    return fail(name, Date.now() - t0, e);
  }
}
