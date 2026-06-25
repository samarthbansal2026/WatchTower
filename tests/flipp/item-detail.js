// Two-step: list flyers → pick one item id → richer item detail (description, buy URL).
import { pass, fail, skip } from '../../lib/test-runner.js';
import { listFlyers, getFlyerItems, getItem } from '../../lib/flipp.js';

export const name = 'Flipp Item Detail';
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

    const { items, ms: itemsMs } = await getFlyerItems(dgFlyer.id);
    const branded = items.find(i => i.brand && i.id);
    if (!branded) {
      return skip(name, `no branded items on DG flyer ${dgFlyer.id}`);
    }

    const { item, ms: detailMs } = await getItem(branded.id);
    if (!item) return fail(name, listMs + itemsMs + detailMs, 'empty item response');

    const required = ['id', 'name', 'merchant', 'merchant_id', 'flyer_id'];
    for (const key of required) {
      if (!(key in item)) return fail(name, listMs + itemsMs + detailMs, `item missing field: ${key}`);
    }

    return pass(name, Date.now() - t0, {
      postalCode: POSTAL_CODE,
      flyerId: dgFlyer.id,
      itemId: item.id,
      name: item.name,
      brand: item.brand,
      merchant: item.merchant,
      currentPrice: item.current_price ?? null,
      description: item.description ?? null,
      ttmUrl: item.ttm_url ?? null,
      validTo: item.valid_to ?? item.flyer_valid_to,
    });
  } catch (e) {
    return fail(name, Date.now() - t0, e);
  }
}
