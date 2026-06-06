// Two-step: lat/lon → FIPS tract (Census geocoder), then ACS 5-year estimates.
// Sample: Dollar Tree at 4720 N Pulaski Rd, Chicago IL (41.9675, -87.7267)
// Variables: total population, median household income, poverty rate, housing units
// Requires CENSUS_API_KEY — free at https://api.census.gov/data/key_signup.html
import { timedFetch, pass, fail, skip } from '../../lib/test-runner.js';

export const name = 'Census ACS Demographics';
export const tier = 'tier1';

const LAT = 41.9675;
const LON = -87.7267;

// Step 1: Census geocoder — lat/lon → state/county/tract FIPS
const GEO_URL =
  `https://geocoding.geo.census.gov/geocoder/geographies/coordinates` +
  `?x=${LON}&y=${LAT}&benchmark=Public_AR_Current&vintage=Current_Current&format=json`;

// ACS 5-year variables for neighborhood profile:
//   B01003_001E = total population
//   B19013_001E = median household income
//   B17001_002E = population below poverty level
//   B25001_001E = total housing units
const ACS_VARS = 'B01003_001E,B19013_001E,B17001_002E,B25001_001E';

export async function run() {
  const apiKey = process.env.CENSUS_API_KEY;
  if (!apiKey) return skip(name, 'CENSUS_API_KEY not set — get one free at https://api.census.gov/data/key_signup.html');

  // Step 1: geocode to FIPS
  let state, county, tract;
  {
    const t0 = Date.now();
    try {
      const r = await timedFetch(GEO_URL, { timeoutMs: 20000 });
      if (!r.ok) return fail(name, r.ms, `geocoder HTTP ${r.status}`, r.status);

      const geographies = r.body?.result?.geographies;
      const tractInfo = geographies?.['Census Tracts']?.[0];
      if (!tractInfo) return fail(name, r.ms, 'no census tract in geocoder response');

      state = tractInfo.STATE;
      county = tractInfo.COUNTY;
      tract = tractInfo.TRACT;
    } catch (e) {
      return fail(name, Date.now() - t0, e);
    }
  }

  // Step 2: ACS 5-year estimates for the tract
  const acsUrl =
    `https://api.census.gov/data/2022/acs/acs5` +
    `?get=${ACS_VARS}&for=tract:${tract}&in=state:${state}+county:${county}&key=${apiKey}`;

  {
    const t0 = Date.now();
    try {
      const r = await timedFetch(acsUrl, { timeoutMs: 20000 });
      if (!r.ok) return fail(name, r.ms, `ACS HTTP ${r.status}`, r.status);

      // Response is a 2-row array: [headers, values]
      const data = r.body;
      // Census returns HTTP 200 with HTML "Missing Key" body on bad/missing key
      if (typeof data === 'string' && data.includes('Missing Key')) {
        return fail(name, r.ms, 'ACS returned HTML "Missing Key" — check CENSUS_API_KEY');
      }
      if (!Array.isArray(data) || data.length < 2) {
        return fail(name, r.ms, `unexpected ACS response shape: ${JSON.stringify(data).slice(0, 80)}`);
      }

      const [headers, values] = data;
      const get = (varName) => {
        const idx = headers.indexOf(varName);
        return idx >= 0 ? Number(values[idx]) : null;
      };

      const population = get('B01003_001E');
      const medianIncome = get('B19013_001E');
      const belowPoverty = get('B17001_002E');
      const housingUnits = get('B25001_001E');

      if (population === null) return fail(name, r.ms, 'could not find population variable');

      return pass(name, r.ms, {
        location: { lat: LAT, lon: LON },
        fips: { state, county, tract },
        tractProfile: {
          population,
          medianHouseholdIncome: medianIncome,
          belowPovertyCount: belowPoverty,
          povertyRate: population > 0 ? `${((belowPoverty / population) * 100).toFixed(1)}%` : null,
          housingUnits,
        },
      });
    } catch (e) {
      return fail(name, Date.now() - t0, e);
    }
  }
}
