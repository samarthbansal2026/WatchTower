import { timedFetch, pass, fail, skip } from '../../lib/test-runner.js';

export const name = 'FRED Observations';
export const tier = 'tier2';

const KEY = process.env.FRED_API_KEY;
const BASE = 'https://api.stlouisfed.org/fred';

// Key macro indicators to pull the latest 3 observations for each
const SERIES = [
  'UNRATE',    // Unemployment Rate (monthly)
  'CPIAUCSL',  // CPI All Urban Consumers (monthly)
  'FEDFUNDS',  // Effective Federal Funds Rate (monthly)
  'DGS10',     // 10-Year Treasury (daily)
  'GDPC1',     // Real GDP (quarterly)
  'HOUST',     // Housing Starts (monthly)
  'UMCSENT',   // Consumer Sentiment (monthly)
  'PCEPI',     // PCE Price Index (monthly)
  'CIVPART',   // Labor Force Participation Rate (monthly)
  'M2SL',      // M2 Money Supply (monthly)
  'T10Y2Y',    // 10Y-2Y Yield Curve (daily)
  'DCOILWTICO',// WTI Crude Oil Price (daily)
];

export async function run() {
  if (!KEY) return skip(name, 'FRED_API_KEY not set');

  const t0 = Date.now();
  try {
    const sample = {};
    for (const id of SERIES) {
      const url = `${BASE}/series/observations?series_id=${id}&api_key=${KEY}&file_type=json&sort_order=desc&limit=3`;
      const r = await timedFetch(url);
      if (!r.ok) return fail(name, Date.now() - t0, `HTTP ${r.status} for ${id}`, r.status);
      if (!Array.isArray(r.body?.observations)) return fail(name, Date.now() - t0, `No observations for ${id}`);
      const obs = r.body.observations.filter(o => o.value !== '.');
      if (obs.length === 0) return fail(name, Date.now() - t0, `All missing values for ${id}`);
      sample[id] = { date: obs[0].date, value: obs[0].value };
    }
    return pass(name, Date.now() - t0, sample);
  } catch (e) {
    return fail(name, Date.now() - t0, e);
  }
}
