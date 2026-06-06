// SEC EDGAR — Atom feed of recent filings
// https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&...&output=atom
// XML/Atom only — no JSON variant. Lightweight string parse to confirm shape.
import { timedFetch, pass, fail } from '../../lib/test-runner.js';

export const name = 'EDGAR Atom';
export const tier = 'tier1';

const UA = 'watchtower-api-tester (work.samarthbansal@gmail.com)';

export async function run() {
  const t0 = Date.now();
  try {
    // Most-recent 10-K filings across all companies (form filter, no CIK).
    const url = 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&type=10-K&output=atom&count=10';
    const r = await timedFetch(url, { headers: { 'User-Agent': UA } });
    if (!r.ok) return fail(name, r.ms, `HTTP ${r.status}`, r.status);
    const xml = typeof r.body === 'string' ? r.body : '';
    if (!xml.startsWith('<?xml')) return fail(name, r.ms, 'not XML');
    if (!xml.includes('<feed')) return fail(name, r.ms, 'no <feed> element');
    const entries = xml.match(/<entry[\s>]/g) || [];
    // Pull the first <title> after <entry> for a sample
    const firstEntry = xml.split('<entry')[1] || '';
    const titleMatch = firstEntry.match(/<title[^>]*>([^<]+)<\/title>/);
    const updatedMatch = firstEntry.match(/<updated[^>]*>([^<]+)<\/updated>/);
    return pass(name, r.ms, {
      entries: entries.length,
      firstTitle: titleMatch?.[1],
      firstUpdated: updatedMatch?.[1],
    });
  } catch (e) {
    return fail(name, Date.now() - t0, e);
  }
}
