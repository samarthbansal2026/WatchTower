// SEC EDGAR — submissions API
// https://data.sec.gov/submissions/CIK{10-digit-padded}.json
// Returns full filing history + metadata for one company. ~1s delay vs realtime.
import { timedFetch, pass, fail } from '../../lib/test-runner.js';

export const name = 'EDGAR Submissions';
export const tier = 'tier1';

const UA = 'watchtower-api-tester (work.samarthbansal@gmail.com)';

export async function run() {
  const t0 = Date.now();
  try {
    // Apple — CIK 320193, must be zero-padded to 10 digits.
    const cik = '0000320193';
    const r = await timedFetch(`https://data.sec.gov/submissions/CIK${cik}.json`, {
      headers: { 'User-Agent': UA },
    });
    if (!r.ok) return fail(name, r.ms, `HTTP ${r.status}`, r.status);
    let body = r.body;
    if (typeof body === 'string') body = JSON.parse(body);
    if (!body?.cik || !body.filings?.recent) {
      return fail(name, r.ms, 'missing cik or filings.recent');
    }
    const recent = body.filings.recent;
    // recent is column-oriented: parallel arrays for form, filingDate, accessionNumber, primaryDocument, etc.
    if (!Array.isArray(recent.form) || recent.form.length === 0) {
      return fail(name, r.ms, 'recent.form empty');
    }
    const i = recent.form.findIndex(f => f === '10-K');
    return pass(name, r.ms, {
      cik: body.cik,
      name: body.name,
      sic: body.sic,
      sicDescription: body.sicDescription,
      tickers: body.tickers,
      exchanges: body.exchanges,
      recentFilingCount: recent.form.length,
      latest: {
        form: recent.form[0],
        filingDate: recent.filingDate[0],
        accession: recent.accessionNumber[0],
      },
      latest10K: i >= 0 && {
        filingDate: recent.filingDate[i],
        accession: recent.accessionNumber[i],
        primaryDocument: recent.primaryDocument[i],
      },
    });
  } catch (e) {
    return fail(name, Date.now() - t0, e);
  }
}
