// List active weekly circulars for a postal code.
// Sample: Burlington NC 27217 (Dollar Tree Church Street Plaza trade area)
import { pass, fail } from '../../lib/test-runner.js';
import { listFlyers, normalizeFlyerMeta } from '../../lib/flipp.js';

export const name = 'Flipp Flyers';
export const tier = 'tier1';

const POSTAL_CODE = '27217';

export async function run() {
  const t0 = Date.now();
  try {
    const { ms, refreshedAt, flyers } = await listFlyers(POSTAL_CODE);

    if (flyers.length === 0) return fail(name, ms, 'flyers array empty');

    const sample = flyers[0];
    if (typeof sample.id !== 'number') return fail(name, ms, 'flyer missing numeric id');
    if (!sample.merchant || !sample.valid_to) return fail(name, ms, 'flyer missing merchant or valid_to');

    const dg = flyers.find(f => f.merchant_id === 2063);
    const normalized = normalizeFlyerMeta(sample, POSTAL_CODE);

    return pass(name, Date.now() - t0, {
      postalCode: POSTAL_CODE,
      refreshedAt,
      flyerCount: flyers.length,
      sampleFlyer: {
        id: normalized.id,
        merchant: normalized.merchant,
        merchantId: normalized.merchantId,
        validTo: normalized.validTo,
        categories: normalized.categories.slice(0, 3),
      },
      dollarGeneralFlyerId: dg?.id ?? null,
    }, dg ? undefined : 'Dollar General flyer not in market this week — flyer-items test may skip');
  } catch (e) {
    return fail(name, Date.now() - t0, e);
  }
}
