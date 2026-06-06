// Sample store: Dollar Tree at 4720 N Pulaski Rd, Chicago IL (41.9675, -87.7267)
// bbox ~1 km around the store
import { timedFetch, pass, fail } from '../../lib/test-runner.js';

export const name = 'Overpass Nearby Amenities';
export const tier = 'tier1';

const INTERPRETER = 'https://overpass-api.de/api/interpreter';
const UA = 'watchtower/1.0 (work.samarthbansal@gmail.com)';

async function post(query, timeoutMs = 30000, retries = 2) {
  const opts = {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': UA },
    body: `data=${encodeURIComponent(query)}`,
    timeoutMs,
  };
  for (let i = 0; i <= retries; i++) {
    const r = await timedFetch(INTERPRETER, opts);
    if (r.status !== 429 && r.status !== 504) return r;
    if (i < retries) await new Promise(res => setTimeout(res, 6000));
  }
  return timedFetch(INTERPRETER, opts);
}

// ~0.009 deg ≈ 1 km at this latitude
const LAT = 41.9675;
const LON = -87.7267;
const D = 0.009;
const BBOX = `${LAT - D},${LON - D},${LAT + D},${LON + D}`;

// Competitors: variety/dollar stores; Anchors: pharmacy, supermarket, bank, fast_food
const QUERY = `
[out:json][timeout:25];
(
  node["shop"="variety_store"](${BBOX});
  node["shop"="dollar_store"](${BBOX});
  node["shop"="discount_store"](${BBOX});
  node["amenity"="pharmacy"](${BBOX});
  node["shop"="supermarket"](${BBOX});
  node["amenity"="bank"](${BBOX});
  node["amenity"="fast_food"](${BBOX});
  node["amenity"="restaurant"](${BBOX});
);
out body;
`.trim();

export async function run() {
  const t0 = Date.now();
  try {
    const r = await post(QUERY);
    if (!r.ok) return fail(name, r.ms, `HTTP ${r.status}`, r.status);

    const body = r.body;
    if (!body || !Array.isArray(body.elements)) {
      return fail(name, r.ms, 'missing elements array');
    }

    const byType = {};
    for (const el of body.elements) {
      const tag =
        el.tags?.shop || el.tags?.amenity || 'other';
      byType[tag] = (byType[tag] || 0) + 1;
    }

    return pass(name, r.ms, {
      total: body.elements.length,
      byCategory: byType,
      sample: body.elements.slice(0, 3).map(e => ({
        name: e.tags?.name,
        type: e.tags?.shop || e.tags?.amenity,
        lat: e.lat,
        lon: e.lon,
      })),
    });
  } catch (e) {
    return fail(name, Date.now() - t0, e);
  }
}
