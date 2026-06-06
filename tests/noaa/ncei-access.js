// NCEI Access Data Service — https://www.ncei.noaa.gov/access/services/data/v1
// No auth required. Returns JSON/CSV/etc. for NCEI datasets (daily-summaries, GSOM, GSOY, etc.).
import { timedFetch, pass, fail } from '../../lib/test-runner.js';

export const name = 'NOAA NCEI Access';
export const tier = 'tier1';

export async function run() {
  const t0 = Date.now();
  try {
    // Central Park, NY (USW00094728); 7 days of daily summaries; restrict columns to keep response small.
    const params = new URLSearchParams({
      dataset: 'daily-summaries',
      stations: 'USW00094728',
      startDate: '2024-01-01',
      endDate: '2024-01-07',
      dataTypes: 'TMAX,TMIN,PRCP',
      format: 'json',
      units: 'metric',
    });
    const url = `https://www.ncei.noaa.gov/access/services/data/v1?${params}`;
    const r = await timedFetch(url, { timeoutMs: 30000 });
    if (!r.ok) return fail(name, r.ms, `HTTP ${r.status}`, r.status);
    if (!Array.isArray(r.body) || r.body.length === 0) {
      return fail(name, r.ms, 'expected non-empty JSON array');
    }
    const row = r.body[0];
    if (!row.DATE || !row.STATION) {
      return fail(name, r.ms, 'rows missing DATE/STATION');
    }
    return pass(name, r.ms, {
      rows: r.body.length,
      station: row.STATION,
      firstDate: row.DATE,
      sampleRow: row,
    });
  } catch (e) {
    return fail(name, Date.now() - t0, e);
  }
}
