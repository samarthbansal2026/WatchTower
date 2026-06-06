// Queries for active road + building construction near a sample store location.
// Uses Chicago Dollar Tree at 41.9675, -87.7267 with a wider ~2 km bbox.
import { timedFetch, pass, fail } from '../../lib/test-runner.js';

export const name = 'Overpass Construction Activity';
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

const LAT = 41.9675;
const LON = -87.7267;
const D = 0.018; // ~2 km
const BBOX = `${LAT - D},${LON - D},${LAT + D},${LON + D}`;

const QUERY = `
[out:json][timeout:25];
(
  way["highway"="construction"](${BBOX});
  way["building"="construction"](${BBOX});
  node["highway"="construction"](${BBOX});
  way["landuse"="construction"](${BBOX});
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

    const roads = body.elements.filter(e => e.tags?.highway === 'construction');
    const buildings = body.elements.filter(e => e.tags?.building === 'construction');
    const landuse = body.elements.filter(e => e.tags?.landuse === 'construction');

    return pass(name, r.ms, {
      total: body.elements.length,
      roadConstruction: roads.length,
      buildingConstruction: buildings.length,
      landuseConstruction: landuse.length,
      sample: body.elements.slice(0, 3).map(e => ({
        type: e.type,
        tags: e.tags,
      })),
    });
  } catch (e) {
    return fail(name, Date.now() - t0, e);
  }
}
