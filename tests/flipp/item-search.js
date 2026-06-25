// Search shoppable deals across all circulars near a postal code.
import { pass, fail } from '../../lib/test-runner.js';
import { searchItems } from '../../lib/flipp.js';

export const name = 'Flipp Item Search';
export const tier = 'tier1';

const POSTAL_CODE = '10001';

export async function run() {
  const t0 = Date.now();
  try {
    const { ms, items, merchants } = await searchItems(POSTAL_CODE, '');

    if (!Array.isArray(items)) return fail(name, ms, 'items is not an array');
    if (items.length === 0) return fail(name, ms, 'search returned zero items');

    const sample = items[0];
    const required = ['flyer_item_id', 'name', 'merchant_name', 'valid_to'];
    for (const key of required) {
      if (!(key in sample)) return fail(name, ms, `item missing field: ${key}`);
    }

    const dgMerchant = merchants.find(m => m.name === 'Dollar Tree');

    return pass(name, Date.now() - t0, {
      postalCode: POSTAL_CODE,
      itemCount: items.length,
      merchantMatches: merchants.length,
      sampleItem: {
        id: sample.flyer_item_id ?? sample.id,
        name: sample.name,
        merchant: sample.merchant_name,
        price: sample.current_price ?? null,
        brandIds: sample.brand_ids ?? [],
        validTo: sample.valid_to,
      },
      dollarTreeListed: Boolean(dgMerchant),
      dollarTreeMerchantId: dgMerchant?.id ?? null,
    });
  } catch (e) {
    return fail(name, Date.now() - t0, e);
  }
}
