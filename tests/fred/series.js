import { timedFetch, pass, fail, skip } from '../../lib/test-runner.js';

export const name = 'FRED Series Metadata';
export const tier = 'tier2';

const KEY = process.env.FRED_API_KEY;
const BASE = 'https://api.stlouisfed.org/fred';

const SERIES = [
  { id: 'UNRATE',   label: 'Unemployment Rate' },
  { id: 'CPIAUCSL', label: 'CPI All Urban Consumers' },
  { id: 'FEDFUNDS', label: 'Effective Fed Funds Rate' },
  { id: 'DGS10',    label: '10-Year Treasury' },
  { id: 'GDPC1',    label: 'Real GDP' },
  { id: 'HOUST',    label: 'Housing Starts' },
  { id: 'UMCSENT',  label: 'Consumer Sentiment' },
  { id: 'M2SL',     label: 'M2 Money Supply' },
  { id: 'T10Y2Y',   label: 'Yield Curve Spread' },
  { id: 'CIVPART',  label: 'Labor Force Participation' },
];

export async function run() {
  if (!KEY) return skip(name, 'FRED_API_KEY not set');

  const t0 = Date.now();
  try {
    const results = [];
    for (const { id, label } of SERIES) {
      const url = `${BASE}/series?series_id=${id}&api_key=${KEY}&file_type=json`;
      const r = await timedFetch(url);
      if (!r.ok) return fail(name, Date.now() - t0, `HTTP ${r.status} for ${id}`, r.status);
      if (!r.body?.seriess?.[0]) return fail(name, Date.now() - t0, `No series data for ${id}`);
      const s = r.body.seriess[0];
      results.push({ id, label, frequency: s.frequency_short, units: s.units_short, lastUpdated: s.last_updated });
    }
    return pass(name, Date.now() - t0, results.slice(0, 4));
  } catch (e) {
    return fail(name, Date.now() - t0, e);
  }
}
