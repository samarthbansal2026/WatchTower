// SEC EDGAR — XBRL company endpoints
// 1. /api/xbrl/companyfacts/CIK{10}.json — every XBRL fact for one company
// 2. /api/xbrl/companyconcept/CIK{10}/us-gaap/{tag}.json — one tag for one company
import { timedFetch, pass, fail } from '../../lib/test-runner.js';

export const name = 'EDGAR XBRL Co.';
export const tier = 'tier1';

const UA = 'watchtower-api-tester (work.samarthbansal@gmail.com)';
const CIK = '0000320193'; // Apple

export async function run() {
  const t0 = Date.now();
  try {
    // 1. Company facts — everything (large)
    const r1 = await timedFetch(
      `https://data.sec.gov/api/xbrl/companyfacts/CIK${CIK}.json`,
      { headers: { 'User-Agent': UA }, timeoutMs: 90000 }
    );
    if (!r1.ok) return fail(name, r1.ms, `facts HTTP ${r1.status}`, r1.status);
    let facts = r1.body;
    if (typeof facts === 'string') facts = JSON.parse(facts);
    if (!facts?.facts) return fail(name, r1.ms, 'no facts in response');
    const taxonomies = Object.keys(facts.facts);
    const gaapConceptCount = Object.keys(facts.facts['us-gaap'] || {}).length;

    // 2. Single concept — Revenues
    const r2 = await timedFetch(
      `https://data.sec.gov/api/xbrl/companyconcept/CIK${CIK}/us-gaap/Revenues.json`,
      { headers: { 'User-Agent': UA } }
    );
    if (!r2.ok) return fail(name, r2.ms, `concept HTTP ${r2.status}`, r2.status);
    let concept = r2.body;
    if (typeof concept === 'string') concept = JSON.parse(concept);
    const usdUnits = concept?.units?.USD;
    if (!Array.isArray(usdUnits) || usdUnits.length === 0) {
      return fail(name, r2.ms, 'concept.units.USD missing');
    }
    const latest = usdUnits[usdUnits.length - 1];

    return pass(name, Date.now() - t0, {
      companyfacts: {
        taxonomies,
        usgaapConcepts: gaapConceptCount,
        entity: facts.entityName,
      },
      companyconcept: {
        tag: concept.tag,
        label: concept.label,
        usdDataPoints: usdUnits.length,
        latest: {
          end: latest.end,
          val: latest.val,
          fy: latest.fy,
          fp: latest.fp,
          form: latest.form,
        },
      },
    });
  } catch (e) {
    return fail(name, Date.now() - t0, e);
  }
}
