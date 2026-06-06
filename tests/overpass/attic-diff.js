// Compares shop count at a location between 12 months ago and today using
// Overpass attic (historical) data. Detects openings and closures.
// Sample: Dollar Tree at 41.9675, -87.7267 Chicago IL
import { timedFetch, pass, fail } from '../../lib/test-runner.js';

export const name = 'Overpass Attic (Historical Diff)';
export const tier = 'tier1';

const INTERPRETER = 'https://overpass-api.de/api/interpreter';
const UA = 'watchtower/1.0 (work.samarthbansal@gmail.com)';

async function post(query, timeoutMs = 45000, retries = 2) {
  const opts = {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': UA },
    body: `data=${encodeURIComponent(query)}`,
    timeoutMs,
  };
  for (let i = 0; i <= retries; i++) {
    const r = await timedFetch(INTERPRETER, opts);
    if (r.status !== 429 && r.status !== 504) return r;
    if (i < retries) await new Promise(res => setTimeout(res, 8000));
  }
  return timedFetch(INTERPRETER, opts);
}

const LAT = 41.9675;
const LON = -87.7267;
const D = 0.009;
const BBOX = `${LAT - D},${LON - D},${LAT + D},${LON + D}`;

// One year ago snapshot — shops only (nodes + ways)
function shopQuery(date) {
  const dateClause = date ? `[date:"${date}"]` : '';
  return `
[out:json][timeout:30]${dateClause};
(
  node["shop"](${BBOX});
  way["shop"](${BBOX});
  node["amenity"="restaurant"](${BBOX});
  node["amenity"="fast_food"](${BBOX});
);
out count;
`.trim();
}

export async function run() {
  // Past date: one year ago
  const pastDate = new Date();
  pastDate.setFullYear(pastDate.getFullYear() - 1);
  const pastISO = pastDate.toISOString().slice(0, 10) + 'T00:00:00Z';

  let pastCount, currentCount, pastMs, currentMs;

  // Query past
  {
    const t0 = Date.now();
    try {
      const r = await post(shopQuery(pastISO));
      if (!r.ok) return fail(name, r.ms, `past query HTTP ${r.status}`, r.status);
      const body = r.body;
      // `out count;` returns elements with type="count" and tag "total"
      const countEl = Array.isArray(body?.elements)
        ? body.elements.find(e => e.type === 'count')
        : null;
      pastCount = countEl?.tags?.total != null ? Number(countEl.tags.total) : null;
      if (pastCount === null) return fail(name, r.ms, 'could not parse past count');
      pastMs = r.ms;
    } catch (e) {
      return fail(name, Date.now() - t0, e);
    }
  }

  // Query current (no date = latest)
  {
    const t0 = Date.now();
    try {
      const r = await post(shopQuery(null));
      if (!r.ok) return fail(name, r.ms, `current query HTTP ${r.status}`, r.status);
      const body = r.body;
      const countEl = Array.isArray(body?.elements)
        ? body.elements.find(e => e.type === 'count')
        : null;
      currentCount = countEl?.tags?.total != null ? Number(countEl.tags.total) : null;
      if (currentCount === null) return fail(name, r.ms, 'could not parse current count');
      currentMs = r.ms;
    } catch (e) {
      return fail(name, Date.now() - t0, e);
    }
  }

  const delta = currentCount - pastCount;
  return pass(name, pastMs + currentMs, {
    pastDate: pastISO,
    pastCount,
    currentCount,
    delta,
    trend: delta > 0 ? 'growing' : delta < 0 ? 'shrinking' : 'stable',
  });
}
