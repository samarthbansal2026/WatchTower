/**
 * lib/flipp.js — Unofficial Flipp (Wishabi) circular client
 *
 * Flipp has no public developer API. Retail sites and flipp.com load data from
 * backflipp.wishabi.com — JSON endpoints that list flyers by postal code and
 * return shoppable items (with brand names) per flyer.
 *
 * Endpoints (observed 2026-06):
 *   GET /flipp/flyers?locale=en-us&postal_code={zip}
 *   GET /flipp/flyers/{flyer_id}          → { items[], pages[] }
 *   GET /flipp/items/{item_id}            → { item } (richer detail)
 *   GET /flipp/items/search?locale=en-us&postal_code={zip}&q={query}
 *
 * Note: Dollar Tree (merchant_id 2479) is listed on Flipp but does not publish
 * weekly circulars in most markets. Competitors (Dollar General, Family Dollar,
 * Walmart, etc.) do.
 */

import { timedFetch } from './test-runner.js';

export const FLIPP_BASE = 'https://backflipp.wishabi.com/flipp';
const LOCALE = 'en-us';

/** Retailers relevant to discount-store competitive intel. */
export const TRACKED_MERCHANTS = {
  2479: 'Dollar Tree',
  2063: 'Dollar General',
  2150: 'Family Dollar',
  2175: 'Walmart',
  2040: 'Target',
  2264: 'CVS Pharmacy',
  2460: 'Walgreens',
};

/** Direct dollar-channel competitors — used by store-intel for a fast fetch. */
export const DISCOUNT_COMPETITOR_IDS = [2479, 2063, 2150];

const sleep = ms => new Promise(r => setTimeout(r, ms));

function qs(params) {
  return new URLSearchParams(params).toString();
}

/** List active flyers for a US/CA postal code. */
export async function listFlyers(postalCode, opts = {}) {
  const url = `${FLIPP_BASE}/flyers?${qs({ locale: opts.locale ?? LOCALE, postal_code: postalCode })}`;
  const r = await timedFetch(url, { timeoutMs: opts.timeoutMs ?? 20000 });
  if (!r.ok) throw new Error(`listFlyers ${postalCode} → HTTP ${r.status}`);
  const flyers = r.body?.flyers;
  if (!Array.isArray(flyers)) throw new Error(`listFlyers ${postalCode} → missing flyers array`);
  return { ms: r.ms, refreshedAt: r.body.refreshed_at ?? null, flyers };
}

/** All shoppable items on a flyer (includes brand, price, validity). */
export async function getFlyerItems(flyerId, opts = {}) {
  const url = `${FLIPP_BASE}/flyers/${flyerId}`;
  const r = await timedFetch(url, { timeoutMs: opts.timeoutMs ?? 30000 });
  if (!r.ok) throw new Error(`getFlyerItems ${flyerId} → HTTP ${r.status}`);
  const items = r.body?.items;
  if (!Array.isArray(items)) throw new Error(`getFlyerItems ${flyerId} → missing items array`);
  return { ms: r.ms, items, pages: r.body.pages ?? [], hasCorrections: r.body.has_corrections ?? false };
}

/** Full item detail (description, ttm_url, shipping, etc.). */
export async function getItem(itemId, opts = {}) {
  const url = `${FLIPP_BASE}/items/${itemId}`;
  const r = await timedFetch(url, { timeoutMs: opts.timeoutMs ?? 15000 });
  if (!r.ok) throw new Error(`getItem ${itemId} → HTTP ${r.status}`);
  return { ms: r.ms, item: r.body?.item ?? null };
}

/** Keyword / merchant search near a postal code. */
export async function searchItems(postalCode, query, opts = {}) {
  const url = `${FLIPP_BASE}/items/search?${qs({
    locale: opts.locale ?? LOCALE,
    postal_code: postalCode,
    q: query,
  })}`;
  const r = await timedFetch(url, { timeoutMs: opts.timeoutMs ?? 20000 });
  if (!r.ok) throw new Error(`searchItems ${postalCode} q=${query} → HTTP ${r.status}`);
  return {
    ms: r.ms,
    items: r.body?.items ?? [],
    ads: r.body?.ads ?? [],
    nativeAds: r.body?.native_ads ?? [],
    merchants: r.body?.merchants ?? [],
    relatedItems: r.body?.related_items ?? [],
  };
}

/** Extract 5-digit US ZIP from a store address string. */
export function zipFromAddress(address) {
  const m = address?.match(/\b(\d{5})(?:-\d{4})?\b/);
  return m?.[1] ?? null;
}

/** Straight-line distance in miles (for nearest-store lookup). */
export function haversineMiles(lat1, lon1, lat2, lon2) {
  const R = 3958.8;
  const toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

/** Nearest store in a registry that has a parseable ZIP in its address. */
export function nearestStoreWithZip(lat, lon, storeList) {
  const candidates = storeList
    .map(s => ({ ...s, postalCode: zipFromAddress(s.address) }))
    .filter(s => s.postalCode);
  if (!candidates.length) return null;
  return candidates
    .map(s => ({ ...s, distMi: haversineMiles(lat, lon, s.lat, s.lng) }))
    .sort((a, b) => a.distMi - b.distMi)[0];
}

/** True when a circular's validity overlaps [fromDate, toDate] (YYYY-MM-DD). */
export function circularOverlapsWindow(validFrom, validTo, fromDate, toDate) {
  const from = validFrom?.slice(0, 10);
  const to = validTo?.slice(0, 10);
  if (!from || !to) return false;
  return to >= fromDate && from <= toDate;
}

/** Normalize a raw flyer list entry. */
export function normalizeFlyerMeta(flyer, postalCode) {
  return {
    id: flyer.id,
    merchant: flyer.merchant?.trim() ?? '',
    merchantId: flyer.merchant_id,
    name: flyer.name,
    validFrom: flyer.valid_from,
    validTo: flyer.valid_to,
    categories: flyer.categories ?? [],
    thumbnailUrl: flyer.thumbnail_url,
    postalCode,
    premium: flyer.premium ?? false,
  };
}

/** Normalize a flyer item for storage / brand indexing. */
export function normalizeItem(raw, flyerMeta) {
  return {
    id: raw.id,
    flyerId: raw.flyer_id ?? flyerMeta.id,
    name: raw.name,
    brand: raw.brand ?? null,
    price: raw.price != null ? Number(raw.price) : null,
    discount: raw.discount ?? null,
    validFrom: raw.valid_from ?? flyerMeta.validFrom,
    validTo: raw.valid_to ?? flyerMeta.validTo,
    imageUrl: raw.cutout_image_url ?? raw.image_url ?? null,
    merchant: flyerMeta.merchant,
    merchantId: flyerMeta.merchantId,
  };
}

/** Group items by brand name (includes null-brand bucket). */
export function indexByBrand(items) {
  const byBrand = {};
  for (const item of items) {
    const key = item.brand?.trim() || '(store brand / unbranded)';
    (byBrand[key] ??= []).push(item);
  }
  return byBrand;
}

/** Rank brands by offer count across hydrated flyers. */
export function buildBrandSummary(flyers) {
  const map = new Map();

  for (const flyer of flyers) {
    for (const [brand, items] of Object.entries(flyer.byBrand ?? {})) {
      if (brand === '(store brand / unbranded)') continue;
      const entry = map.get(brand) ?? { brand, merchants: new Set(), items: [] };
      entry.merchants.add(flyer.merchant);
      entry.items.push(...items.map(i => ({
        name: i.name,
        price: i.price,
        merchant: i.merchant,
        flyerId: i.flyerId,
      })));
      map.set(brand, entry);
    }
  }

  return [...map.values()]
    .map(e => ({
      brand: e.brand,
      merchants: [...e.merchants].sort(),
      offerCount: e.items.length,
      sampleOffers: e.items.slice(0, 3),
    }))
    .sort((a, b) => b.offerCount - a.offerCount);
}

/**
 * Fetch flyers for a postal code, optionally filter merchants, hydrate items.
 * @param {string} postalCode
 * @param {{ merchantIds?: number[], merchantNames?: string[], delayMs?: number }} opts
 */
export async function fetchCircularsForZip(postalCode, opts = {}) {
  const { flyers, ms: listMs, refreshedAt } = await listFlyers(postalCode, opts);

  let selected = flyers.map(f => normalizeFlyerMeta(f, postalCode));

  if (opts.merchantIds?.length) {
    const ids = new Set(opts.merchantIds);
    selected = selected.filter(f => ids.has(f.merchantId));
  }
  if (opts.merchantNames?.length) {
    const names = opts.merchantNames.map(n => n.toLowerCase());
    selected = selected.filter(f => names.some(n => f.merchant.toLowerCase().includes(n)));
  }

  const delayMs = opts.delayMs ?? 400;
  const hydrated = [];
  let itemsMs = 0;

  for (const meta of selected) {
    const { items: rawItems, ms } = await getFlyerItems(meta.id, opts);
    itemsMs += ms;
    const items = rawItems.map(i => normalizeItem(i, meta));
    const byBrand = indexByBrand(items);
    const brandNames = Object.keys(byBrand).filter(b => b !== '(store brand / unbranded)');

    hydrated.push({
      ...meta,
      itemCount: items.length,
      brandedItemCount: items.filter(i => i.brand).length,
      brandCount: brandNames.length,
      brands: brandNames.sort(),
      byBrand,
      items,
    });

    if (delayMs > 0) await sleep(delayMs);
  }

  return {
    postalCode,
    refreshedAt,
    ms: listMs + itemsMs,
    flyerCount: flyers.length,
    trackedFlyerCount: hydrated.length,
    flyers: hydrated,
  };
}

/** Slim summary for store-intel (no full item arrays). */
export function summarizeCirculars(result) {
  const brandSummary = buildBrandSummary(result.flyers).slice(0, 15);
  const competitors = result.flyers.map(f => ({
    merchant: f.merchant,
    merchantId: f.merchantId,
    flyerId: f.id,
    validTo: f.validTo,
    itemCount: f.itemCount,
    brandedItemCount: f.brandedItemCount,
    brandCount: f.brandCount,
    topBrands: f.brands.slice(0, 8),
  }));

  return {
    postalCode: result.postalCode,
    refreshedAt: result.refreshedAt,
    flyerCount: result.flyerCount,
    trackedFlyerCount: result.trackedFlyerCount,
    dollarTreeHasFlyer: result.flyers.some(f => f.merchantId === 2479),
    competitors,
    topBrands: brandSummary,
  };
}

/**
 * Build forecast-7d raw payload for competitor circulars near lat/lon.
 * Uses nearest store ZIP from the registry; hydrates dollar-channel flyers only.
 */
export async function fetchCompetitorCircularsForLocation(lat, lon, storeList, windowFrom, windowTo, opts = {}) {
  const nearest = nearestStoreWithZip(lat, lon, storeList);
  if (!nearest?.postalCode) {
    return { ok: false, error: 'no store with ZIP in registry' };
  }

  const result = await fetchCircularsForZip(nearest.postalCode, {
    merchantIds: opts.merchantIds ?? DISCOUNT_COMPETITOR_IDS,
    delayMs: opts.delayMs ?? 300,
    timeoutMs: opts.timeoutMs,
  });

  const overlapping = result.flyers.filter(f =>
    circularOverlapsWindow(f.validFrom, f.validTo, windowFrom, windowTo),
  );

  const summary = summarizeCirculars({ ...result, flyers: overlapping });

  return {
    ok: true,
    nearestStore: {
      id: nearest.id,
      name: nearest.name,
      dist_mi: parseFloat(nearest.distMi.toFixed(2)),
    },
    postalCode: nearest.postalCode,
    refreshedAt: result.refreshedAt,
    ms: result.ms,
    marketFlyerCount: result.flyerCount,
    competitorFlyerCount: overlapping.length,
    dollarTreeHasFlyer: summary.dollarTreeHasFlyer,
    competitors: overlapping.map(f => ({
      merchant: f.merchant,
      merchant_id: f.merchantId,
      flyer_id: f.id,
      valid_from: f.validFrom,
      valid_to: f.validTo,
      item_count: f.itemCount,
      branded_item_count: f.brandedItemCount,
      items: f.items.map(i => ({
        id: i.id,
        name: i.name,
        brand: i.brand,
        price: i.price,
        valid_to: i.validTo,
      })),
    })),
    top_brands: buildBrandSummary(overlapping),
  };
}

/** Trim flipp raw block for forecast/past-7d clean logs (no per-item arrays). */
export function cleanFlippCompetitorData(data) {
  if (!data) return data;
  return {
    nearest_store: data.nearest_store ?? data.nearestStore,
    postal_code: data.postal_code ?? data.postalCode,
    dollar_tree_has_flyer: data.dollar_tree_has_flyer ?? data.dollarTreeHasFlyer,
    competitor_flyer_count: data.competitor_flyer_count ?? data.competitorFlyerCount,
    competitors: (data.competitors ?? []).map(c => ({
      merchant: c.merchant,
      valid_to: c.valid_to ?? c.validTo,
      item_count: c.item_count ?? c.itemCount,
      branded_item_count: c.branded_item_count ?? c.brandedItemCount,
      top_brands: [...new Set(
        (c.items ?? []).map(i => i.brand).filter(Boolean),
      )].slice(0, 8),
    })),
    top_brands: (data.top_brands ?? data.topBrands ?? []).slice(0, 15).map(b => ({
      brand: b.brand,
      offer_count: b.offerCount ?? b.offer_count,
      merchants: b.merchants,
    })),
  };
}
