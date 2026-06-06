import { timedFetch, pass, fail, skip } from '../../lib/test-runner.js';

export const name = 'Eventbrite Taxonomy (categories / subcategories / formats)';
export const tier = 'tier2';

const TOKEN = process.env.EVENTBRITE_PRIVATE_TOKEN;
const BASE  = 'https://www.eventbriteapi.com/v3';

function headers() {
  return { Authorization: `Bearer ${TOKEN}` };
}

export async function run() {
  if (!TOKEN) return skip(name, 'EVENTBRITE_PRIVATE_TOKEN not set');

  const t0 = Date.now();
  try {
    const [cats, subcats, fmts] = await Promise.all([
      timedFetch(`${BASE}/categories/`,    { headers: headers(), timeoutMs: 30000 }),
      timedFetch(`${BASE}/subcategories/`, { headers: headers(), timeoutMs: 30000 }),
      timedFetch(`${BASE}/formats/`,       { headers: headers(), timeoutMs: 30000 }),
    ]);

    if (!cats.ok)    return fail(name, cats.ms,    `categories HTTP ${cats.status}`,    cats.status);
    if (!subcats.ok) return fail(name, subcats.ms, `subcategories HTTP ${subcats.status}`, subcats.status);
    if (!fmts.ok)    return fail(name, fmts.ms,    `formats HTTP ${fmts.status}`,       fmts.status);

    const catList    = cats.body?.categories    ?? [];
    const subcatList = subcats.body?.subcategories ?? [];
    const fmtList    = fmts.body?.formats        ?? [];

    if (!catList.length)  return fail(name, Date.now() - t0, 'categories returned empty array');
    if (!fmtList.length)  return fail(name, Date.now() - t0, 'formats returned empty array');

    return pass(name, Date.now() - t0, {
      categoryCount:    catList.length,
      subcategoryCount: subcatList.length,
      formatCount:      fmtList.length,
      sampleCategories: catList.slice(0, 5).map(c => ({ id: c.id, name: c.name })),
      sampleFormats:    fmtList.slice(0, 5).map(f => ({ id: f.id, name: f.name })),
    });
  } catch (e) {
    return fail(name, Date.now() - t0, e);
  }
}
