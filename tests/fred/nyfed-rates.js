import { timedFetch, pass, fail } from '../../lib/test-runner.js';

export const name = 'NY Fed Reference Rates';
export const tier = 'tier1';

// Per-rate endpoints (last/N) return 400 — only the combined latest endpoint works.
const URL = 'https://markets.newyorkfed.org/api/rates/all/latest.json';

const EXPECTED_TYPES = ['SOFR', 'EFFR', 'OBFR', 'TGCR', 'BGCR'];

export async function run() {
  const t0 = Date.now();
  try {
    const r = await timedFetch(URL);
    if (!r.ok) return fail(name, r.ms, `HTTP ${r.status}`, r.status);
    if (!Array.isArray(r.body?.refRates)) return fail(name, r.ms, 'No refRates array in response');

    const byType = Object.fromEntries(r.body.refRates.map(e => [e.type, e]));

    for (const t of EXPECTED_TYPES) {
      if (!byType[t]) return fail(name, r.ms, `Missing rate type: ${t}`);
    }

    const sample = {};
    for (const t of EXPECTED_TYPES) {
      const e = byType[t];
      sample[t] = {
        date: e.effectiveDate,
        rate: e.percentRate ?? e.average30day,
      };
    }
    return pass(name, r.ms, sample);
  } catch (e) {
    return fail(name, Date.now() - t0, e);
  }
}
