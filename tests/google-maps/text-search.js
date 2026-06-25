// Google Places API (New) — Text Search
// POST https://places.googleapis.com/v1/places:searchText
import { pass, fail, skip } from '../../lib/test-runner.js';
import { searchText } from '../../lib/google-places.js';

export const name = 'Google Places Text Search';
export const tier = 'tier2';

const CAVENDERS_QUERY = "Cavender's Boot City 2475 N Stemmons Freeway Dallas TX";
const LAT = 32.8043;
const LON = -96.8378;

export async function run() {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return skip(name, 'GOOGLE_PLACES_API_KEY not set');

  const t0 = Date.now();
  try {
    const fieldMask = 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount';
    const r = await searchText({
      textQuery: CAVENDERS_QUERY,
      lat: LAT,
      lng: LON,
      fieldMask,
      apiKey,
    });

    if (!r.ok) {
      const msg = r.body?.error?.message ?? `HTTP ${r.status}`;
      return fail(name, r.ms, msg, r.status);
    }

    const places = r.body?.places;
    if (!Array.isArray(places) || places.length === 0) {
      return fail(name, r.ms, 'places array empty');
    }

    const top = places[0];
    if (!top.id) return fail(name, r.ms, 'first place missing id');
    if (!top.displayName?.text) return fail(name, r.ms, 'first place missing displayName.text');

    return pass(name, Date.now() - t0, {
      query: CAVENDERS_QUERY,
      resultCount: places.length,
      top: {
        id: top.id,
        name: top.displayName.text,
        address: top.formattedAddress ?? null,
        rating: top.rating ?? null,
        userRatingCount: top.userRatingCount ?? null,
        lat: top.location?.latitude ?? null,
        lon: top.location?.longitude ?? null,
      },
    });
  } catch (e) {
    return fail(name, Date.now() - t0, e);
  }
}
