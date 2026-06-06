// NOAA NGS — sibling APIs to GEOID under geodesy.noaa.gov/api
// Tests NCAT (datum/coordinate conversion) and OPUS metadata.
import { timedFetch, pass, fail } from '../../lib/test-runner.js';

export const name = 'NOAA NGS (siblings)';
export const tier = 'tier1';

const BASE = 'https://geodesy.noaa.gov/api';

export async function run() {
  const t0 = Date.now();
  try {
    // 1. NCAT LLH: shift NAD83(2011) → NAD83(1986) at 40N, 80W
    const r1 = await timedFetch(
      `${BASE}/ncat/llh?lat=40.0&lon=-80.0&eht=0.0&inDatum=NAD83(2011)&outDatum=NAD83(1986)`
    );
    if (!r1.ok) return fail(name, r1.ms, `ncat/llh HTTP ${r1.status}`, r1.status);
    if (!r1.body?.destLat || !r1.body?.destLon) {
      return fail(name, r1.ms, 'ncat/llh missing destLat/destLon');
    }

    // 2. NCAT USNG: decode a U.S. National Grid coordinate into lat/lon
    const r2 = await timedFetch(
      `${BASE}/ncat/usng?usng=18SUJ2348316806&inDatum=NAD83(2011)`
    );
    if (!r2.ok) return fail(name, r2.ms, `ncat/usng HTTP ${r2.status}`, r2.status);
    if (!r2.body?.srcLat) {
      return fail(name, r2.ms, 'ncat/usng missing srcLat');
    }

    // 3. OPUS metadata: schema description
    const r3 = await timedFetch(`${BASE}/opus/meta`);
    if (!r3.ok) return fail(name, r3.ms, `opus/meta HTTP ${r3.status}`, r3.status);
    if (typeof r3.body !== 'object' || typeof r3.body?.lat !== 'string') {
      return fail(name, r3.ms, 'opus/meta unexpected shape');
    }

    return pass(name, Date.now() - t0, {
      ncatLLH: {
        from: r1.body.srcDatum,
        to: r1.body.destDatum,
        shiftLatArcSec: r1.body.deltaLat,
        shiftLonArcSec: r1.body.deltaLon,
      },
      ncatUSNG: {
        usng: '18SUJ2348316806',
        decodedLat: r2.body.srcLat,
        decodedLon: r2.body.srcLon,
      },
      opusMetaFields: Object.keys(r3.body).length,
    });
  } catch (e) {
    return fail(name, Date.now() - t0, e);
  }
}
