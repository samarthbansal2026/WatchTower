# Google Places Place Details (New) — ratings and reviews

- **Service**: Full place profile including up to 5 user reviews (sorted by relevance)
- **Homepage**: https://developers.google.com/maps/documentation/places/web-service/place-details
- **Base URL**: `https://places.googleapis.com/v1/places/{placeId}`
- **Auth**: API key (`GOOGLE_PLACES_API_KEY`) — Places API (New) enabled, billing on
- **Cost**: `reviews` field → **Place Details Enterprise + Atmosphere** SKU (paid)
- **Rate limits**: Google Cloud quotas per project

## Tested on
2026-06-24 — `PASS` in ~0.6s. Cavender's: 4.4★, 572 ratings. `reviews[]` empty on our key (see Gotchas).

## Endpoints tested

```
GET https://places.googleapis.com/v1/places/{placeId}
X-Goog-Api-Key: {key}
X-Goog-FieldMask: id,displayName,formattedAddress,rating,userRatingCount,reviews,googleMapsUri
```

## Sample request (Node.js)

```js
import { fetchPlaceReviews } from '../../lib/google-places.js';

const data = await fetchPlaceReviews({
  textQuery: "Cavender's Boot City 2475 N Stemmons Freeway Dallas TX",
  lat: 32.8043,
  lng: -96.8378,
  apiKey: process.env.GOOGLE_PLACES_API_KEY,
});
// data.reviews — max 5, with author attribution required for display
```

## Sample response (truncated)

```json
{
  "id": "ChIJ…",
  "displayName": { "text": "Cavender's Boot City" },
  "formattedAddress": "2475 N Stemmons Fwy, Dallas, TX 75207, USA",
  "rating": 4.5,
  "userRatingCount": 1234,
  "googleMapsUri": "https://maps.google.com/?cid=…",
  "reviews": [
    {
      "rating": 5,
      "text": { "text": "Great boot selection…", "languageCode": "en" },
      "publishTime": "2025-03-15T12:00:00Z",
      "relativePublishTimeDescription": "3 months ago",
      "authorAttribution": {
        "displayName": "Jane D.",
        "uri": "https://www.google.com/maps/contrib/…",
        "photoUri": "https://lh3.googleusercontent.com/…"
      }
    }
  ]
}
```

## Gotchas
- **Maximum 5 reviews** per place — relevance-sorted, not necessarily newest.
- **Author attribution is mandatory** when displaying reviews (`displayName`, `uri`) per [Google attribution requirements](https://developers.google.com/maps/documentation/places/web-service/policies).
- **Two-step flow**: Text Search → `placeId` → Place Details. Cache `googlePlaceId` on the store object to skip search on repeat runs.
- **HTTP 403 / API not enabled**: Enable **Places API (New)** specifically — enabling legacy "Places API" alone may not work.
- **Billing must be active** even for free-tier credits; requests without billing return errors.
- **Error bodies are JSON** with `error.message` — check `r.body.error`, not just HTTP status.
- **`reviews` may be omitted entirely** even when `rating` / `userRatingCount` return. Observed on Cavender's Dallas (572 ratings, 0 review objects) — likely requires **Place Details Enterprise + Atmosphere** SKU enabled on the GCP project; the API returns 200 without the field rather than erroring.

## Test file
`tests/google-maps/place-details.js`
