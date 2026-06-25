// Two-step: list flyers → hydrate one circular's shoppable items (brand + price).
// Sample: Dollar General weekly ad near Burlington NC 27217
import { pass, fail, skip } from '../../lib/test-runner.js';
import { listFlyers, getFlyerItems, normalizeFlyerMeta, normalizeItem } from '../../lib/flipp.js';

export const name = 'Flipp Flyer Items';
export const tier = 'tier1';

const POSTAL_CODE = '27217';
const DG_MERCHANT_ID = 2063;

export async function run() {
  const t0 = Date.now();
  try {
    const { flyers, ms: listMs } = await listFlyers(POSTAL_CODE);
    const dgFlyer = flyers.find(f => f.merchant_id === DG_MERCHANT_ID);
    if (!dgFlyer) {
      return skip(name, `no Dollar General flyer for postal code ${POSTAL_CODE} this week`);
    }

    const meta = normalizeFlyerMeta(dgFlyer, POSTAL_CODE);
    const { items: rawItems, ms: itemsMs } = await getFlyerItems(meta.id);
    if (rawItems.length === 0) return fail(name, listMs + itemsMs, 'flyer returned zero items');

    const items = rawItems.map(i => normalizeItem(i, meta));
    const branded = items.filter(i => i.brand);
    if (branded.length === 0) return fail(name, listMs + itemsMs, 'no items with brand field');

    const sample = branded[0];
    if (typeof sample.name !== 'string') return fail(name, listMs + itemsMs, 'item missing name');

    return pass(name, Date.now() - t0, {
      postalCode: POSTAL_CODE,
      flyerId: meta.id,
      merchant: meta.merchant,
      itemCount: items.length,
      brandedItemCount: branded.length,
      sampleItem: {
        id: sample.id,
        name: sample.name,
        brand: sample.brand,
        price: sample.price,
        validTo: sample.validTo,
      },
      brandSample: [...new Set(branded.map(i => i.brand))].slice(0, 8),
    });
  } catch (e) {
    return fail(name, Date.now() - t0, e);
  }
}
