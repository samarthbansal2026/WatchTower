// Google Places API (New) — Place Details (reviews)
// GET https://places.googleapis.com/v1/places/{placeId}
import { pass, fail, skip } from '../../lib/test-runner.js';
import { fetchPlaceReviews } from '../../lib/google-places.js';

export const name = 'Google Places Place Details';
export const tier = 'tier2';

const CAVENDERS_QUERY = "Cavender's Boot City 2475 N Stemmons Freeway Dallas TX";
const LAT = 32.8043;
const LON = -96.8378;

export async function run() {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return skip(name, 'GOOGLE_PLACES_API_KEY not set');

  const t0 = Date.now();
  try {
    const data = await fetchPlaceReviews({
      textQuery: process.env.GOOGLE_PLACES_TEST_PLACE_ID ? undefined : CAVENDERS_QUERY,
      placeId: process.env.GOOGLE_PLACES_TEST_PLACE_ID || undefined,
      lat: LAT,
      lng: LON,
      apiKey,
    });

    if (!data.placeId) return fail(name, data.ms, 'no placeId in response');
    if (data.rating == null && data.userRatingCount == null) {
      return fail(name, data.ms, 'missing rating and userRatingCount');
    }
    if (!Array.isArray(data.reviews)) return fail(name, data.ms, 'reviews not an array');

    const first = data.reviews[0];
    if (data.reviews.length > 0) {
      if (first.rating == null) return fail(name, data.ms, 'review missing rating');
      if (!first.author) return fail(name, data.ms, 'review missing author attribution (required by Google ToS)');
    }

    return pass(name, Date.now() - t0, {
      placeId: data.placeId,
      name: data.name,
      formattedAddress: data.formattedAddress,
      rating: data.rating,
      userRatingCount: data.userRatingCount,
      reviewCount: data.reviewCount,
      googleMapsUri: data.googleMapsUri,
      sampleReview: first
        ? {
            rating: first.rating,
            relativeTime: first.relativeTime,
            author: first.author,
            text: (first.text ?? '').slice(0, 200),
          }
        : null,
    }, data.reviewCount === 0 ? 'place has ratings but no review text returned' : undefined);
  } catch (e) {
    return fail(name, Date.now() - t0, e);
  }
}
