/**
 * lib/google-places.js — Google Places API (New)
 *
 * https://places.googleapis.com/v1/
 * Requires GOOGLE_PLACES_API_KEY with Places API (New) enabled + billing.
 */

import { timedFetch } from './test-runner.js';

export const PLACES_BASE = 'https://places.googleapis.com/v1';

export function placesHeaders(apiKey, fieldMask) {
  return {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': apiKey,
    'X-Goog-FieldMask': fieldMask,
  };
}

/** POST /places:searchText — resolve a business name + address to place candidates. */
export async function searchText({ textQuery, lat, lng, radiusM = 500, fieldMask, apiKey }) {
  const body = { textQuery };
  if (lat != null && lng != null) {
    body.locationBias = {
      circle: {
        center: { latitude: lat, longitude: lng },
        radius: radiusM,
      },
    };
  }
  return timedFetch(`${PLACES_BASE}/places:searchText`, {
    method: 'POST',
    headers: placesHeaders(apiKey, fieldMask),
    body: JSON.stringify(body),
    timeoutMs: 20000,
  });
}

/** GET /places/{placeId} — details including up to 5 reviews. */
export async function getPlaceDetails(placeId, fieldMask, apiKey) {
  const id = placeId.startsWith('places/') ? placeId.slice('places/'.length) : placeId;
  return timedFetch(`${PLACES_BASE}/places/${id}`, {
    headers: placesHeaders(apiKey, fieldMask),
    timeoutMs: 20000,
  });
}

export function normalizeReview(review) {
  if (!review) return null;
  return {
    rating: review.rating ?? null,
    text: review.text?.text ?? review.originalText?.text ?? null,
    languageCode: review.text?.languageCode ?? review.originalText?.languageCode ?? null,
    publishTime: review.publishTime ?? null,
    relativeTime: review.relativePublishTimeDescription ?? null,
    author: review.authorAttribution?.displayName ?? null,
    authorUri: review.authorAttribution?.uri ?? null,
    authorPhotoUri: review.authorAttribution?.photoUri ?? null,
  };
}

export function normalizePlaceDetails(body) {
  const reviews = (body.reviews ?? []).map(normalizeReview).filter(Boolean);
  return {
    placeId: body.id ?? null,
    name: body.displayName?.text ?? null,
    formattedAddress: body.formattedAddress ?? null,
    rating: body.rating ?? null,
    userRatingCount: body.userRatingCount ?? null,
    googleMapsUri: body.googleMapsUri ?? null,
    reviewCount: reviews.length,
    reviews,
  };
}

/**
 * Resolve place_id (if needed) then fetch rating + reviews.
 * Pass either placeId or textQuery (+ optional lat/lng bias).
 */
export async function fetchPlaceReviews({ placeId, textQuery, lat, lng, apiKey }) {
  let resolvedId = placeId ?? null;
  let searchMs = 0;

  if (!resolvedId) {
    if (!textQuery) throw new Error('placeId or textQuery required');
    const searchMask = 'places.id,places.displayName,places.formattedAddress,places.location';
    const r = await searchText({
      textQuery,
      lat,
      lng,
      fieldMask: searchMask,
      apiKey,
    });
    searchMs = r.ms;
    if (!r.ok) {
      const msg = r.body?.error?.message ?? `HTTP ${r.status}`;
      throw new Error(`text search failed: ${msg}`);
    }
    const places = r.body?.places;
    if (!Array.isArray(places) || places.length === 0) {
      throw new Error('text search returned no places');
    }
    resolvedId = places[0].id;
  }

  const detailsMask = 'id,displayName,formattedAddress,rating,userRatingCount,reviews,googleMapsUri';
  const r2 = await getPlaceDetails(resolvedId, detailsMask, apiKey);
  if (!r2.ok) {
    const msg = r2.body?.error?.message ?? `HTTP ${r2.status}`;
    throw new Error(`place details failed: ${msg}`);
  }

  return {
    ms: searchMs + r2.ms,
    endpoint: `${PLACES_BASE}/places/${resolvedId}`,
    ...normalizePlaceDetails(r2.body),
  };
}
