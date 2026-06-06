// NOAA ERDDAP — CoastWatch ERDDAP server
// https://coastwatch.noaa.gov/erddap — no auth, thousands of environmental datasets
// (SST, chlorophyll, currents, Coral Reef Watch DHW, marine met buoys, etc.)
//
// Two API styles:
//   /tabledap/{datasetID}.{format}?query   — tabular datasets
//   /griddap/{datasetID}.{format}?query    — gridded datasets
// Catalog discovery: /info/index.{format}
import { timedFetch, pass, fail } from '../../lib/test-runner.js';

export const name = 'NOAA ERDDAP';
export const tier = 'tier1';

const BASE = 'https://coastwatch.noaa.gov/erddap';

export async function run() {
  const t0 = Date.now();
  try {
    // 1. Catalog: list datasets (just confirm the catalog endpoint answers).
    const r1 = await timedFetch(`${BASE}/info/index.json?page=1&itemsPerPage=3`, { timeoutMs: 90000 });
    if (!r1.ok) return fail(name, r1.ms, `catalog HTTP ${r1.status}`, r1.status);
    if (!Array.isArray(r1.body?.table?.rows)) {
      return fail(name, r1.ms, 'catalog response missing table.rows');
    }

    // 2. griddap: one-point query against Coral Reef Watch daily SST at (25N, 80W)
    //    off Florida, on the latest available date.
    const sstUrl = `${BASE}/griddap/noaacrwsstDaily.json`
      + '?analysed_sst%5B(last)%5D%5B(25):1:(25)%5D%5B(-80):1:(-80)%5D';
    const r2 = await timedFetch(sstUrl, { timeoutMs: 90000 });
    if (!r2.ok) return fail(name, r2.ms, `griddap HTTP ${r2.status}`, r2.status);
    const rows = r2.body?.table?.rows;
    if (!Array.isArray(rows) || rows.length === 0) {
      return fail(name, r2.ms, 'no SST rows returned');
    }
    const cols = r2.body.table.columnNames;
    const obj = Object.fromEntries(cols.map((c, i) => [c, rows[0][i]]));

    return pass(name, Date.now() - t0, {
      dataset: 'noaacrwsstDaily',
      catalogResponseRows: r1.body.table.rows.length,
      sst: obj,
    });
  } catch (e) {
    return fail(name, Date.now() - t0, e);
  }
}
