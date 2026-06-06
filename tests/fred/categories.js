import { timedFetch, pass, fail, skip } from '../../lib/test-runner.js';

export const name = 'FRED Categories';
export const tier = 'tier2';

const KEY = process.env.FRED_API_KEY;
const BASE = 'https://api.stlouisfed.org/fred';

export async function run() {
  if (!KEY) return skip(name, 'FRED_API_KEY not set');

  const t0 = Date.now();
  try {
    // Root category tree
    const rootR = await timedFetch(`${BASE}/category/children?category_id=0&api_key=${KEY}&file_type=json`);
    if (!rootR.ok) return fail(name, Date.now() - t0, `HTTP ${rootR.status} on root children`, rootR.status);
    if (!Array.isArray(rootR.body?.categories)) return fail(name, Date.now() - t0, 'No categories in root response');
    const rootCats = rootR.body.categories;

    // Drill into "Money, Banking, & Finance" (id=32991) — always exists
    const mbfR = await timedFetch(`${BASE}/category/children?category_id=32991&api_key=${KEY}&file_type=json`);
    if (!mbfR.ok) return fail(name, Date.now() - t0, `HTTP ${mbfR.status} on MBF children`, mbfR.status);

    // Get series in leaf category 115: "Treasury Constant Maturity" (child of Interest Rates)
    // Parent categories have 0 direct series — must query leaf nodes.
    const seriesR = await timedFetch(`${BASE}/category/series?category_id=115&api_key=${KEY}&file_type=json&limit=5`);
    if (!seriesR.ok) return fail(name, Date.now() - t0, `HTTP ${seriesR.status} on category series`, seriesR.status);
    if (!Array.isArray(seriesR.body?.seriess) || seriesR.body.seriess.length === 0) {
      return fail(name, Date.now() - t0, 'No series in category 115');
    }

    return pass(name, Date.now() - t0, {
      rootCategories: rootCats.length,
      rootSample: rootCats.slice(0, 3).map(c => ({ id: c.id, name: c.name })),
      treasurySeriesCount: seriesR.body.count,
      treasurySeriesSample: seriesR.body.seriess.slice(0, 3).map(s => ({ id: s.id, title: s.title })),
    });
  } catch (e) {
    return fail(name, Date.now() - t0, e);
  }
}
