// NCEI CDO v2 — https://www.ncei.noaa.gov/cdo-web/api/v2/
// Auth: HTTP header `token: <key>`. Free signup at /cdo-web/token.
// Limits: 5 req/sec, 10,000 req/day per token.
//
// Exercises all 7 documented endpoints in a single run.
import { timedFetch, pass, fail } from '../../lib/test-runner.js';

export const name = 'NOAA NCEI CDO v2';
export const tier = 'tier1';

const BASE = 'https://www.ncei.noaa.gov/cdo-web/api/v2';

// /data is the only endpoint that requires query params to return rows.
const ENDPOINTS = [
  { path: '/datasets',           qs: 'limit=1' },
  { path: '/datacategories',     qs: 'limit=1' },
  { path: '/datatypes',          qs: 'limit=1' },
  { path: '/locationcategories', qs: 'limit=1' },
  { path: '/locations',          qs: 'limit=1' },
  { path: '/stations',           qs: 'limit=1' },
  {
    path: '/data',
    qs: 'datasetid=GHCND&stationid=GHCND:USW00094728'
      + '&startdate=2024-01-01&enddate=2024-01-02&datatypeid=TMAX&limit=1',
  },
];

export async function run() {
  const t0 = Date.now();
  const token = process.env.NCEI_CDO_TOKEN;
  if (!token) return fail(name, 0, 'NCEI_CDO_TOKEN not set in env');
  const headers = { token };

  try {
    const results = {};
    for (const { path, qs } of ENDPOINTS) {
      const r = await timedFetch(`${BASE}${path}?${qs}`, { headers });
      if (!r.ok) return fail(name, r.ms, `${path} HTTP ${r.status}`, r.status);
      const count = r.body?.metadata?.resultset?.count;
      const rows = Array.isArray(r.body?.results) ? r.body.results.length : 0;
      // For endpoints other than /data, we just need the response to be well-formed;
      // /data is also expected to return at least one row given the query above.
      if (path === '/data' && rows === 0) {
        return fail(name, r.ms, '/data returned 0 rows for known-good query');
      }
      if (count === undefined) {
        return fail(name, r.ms, `${path} response missing metadata.resultset.count`);
      }
      results[path] = { count, ms: r.ms };
    }
    return pass(name, Date.now() - t0, results);
  } catch (e) {
    return fail(name, Date.now() - t0, e);
  }
}
