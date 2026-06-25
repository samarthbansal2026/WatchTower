# Google Places Text Search (New) — find a business by name

- **Service**: Resolve a text query (business name + address) to place candidates with IDs
- **Homepage**: https://developers.google.com/maps/documentation/places/web-service/text-search
- **Base URL**: `https://places.googleapis.com/v1/places:searchText`
- **Auth**: API key (`GOOGLE_PLACES_API_KEY`) — Places API (New) enabled, billing on
- **Cost**: Per-request SKU (Essentials / Pro depending on field mask)
- **Rate limits**: Google Cloud quotas per project

## Tested on
2026-06-24 — `PASS` in ~1s. Cavender's Boot City Dallas: `ChIJKXS7pladToYRKHaSWQOms-w`, 4.4★ (572 ratings).

## Endpoints tested

```
POST https://places.googleapis.com/v1/places:searchText
X-Goog-Api-Key: {key}
X-Goog-FieldMask: places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount
```

## Sample request (Node.js)

```js
const r = await fetch('https://places.googleapis.com/v1/places:searchText', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': process.env.GOOGLE_PLACES_API_KEY,
    'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress',
  },
  body: JSON.stringify({
    textQuery: "Cavender's Boot City 2475 N Stemmons Freeway Dallas TX",
    locationBias: {
      circle: {
        center: { latitude: 32.8043, longitude: -96.8378 },
        radius: 500,
      },
    },
  }),
});
```

## Sample response (truncated)

```json
{
  "places": [
    {
      "id": "ChIJ…",
      "displayName": { "text": "Cavender's Boot City", "languageCode": "en" },
      "formattedAddress": "2475 N Stemmons Fwy, Dallas, TX 75207, USA",
      "rating": 4.5,
      "userRatingCount": 1200
    }
  ]
}
```

## Gotchas
- **Field mask is mandatory.** Omitting `X-Goog-FieldMask` returns 400 — there is no default field list.
- **No spaces in field mask.** Use `places.id,places.displayName` not `places.id, places.displayName`.
- **Legacy Places API is deprecated.** Use `places.googleapis.com/v1/` (New), not `maps.googleapis.com/maps/api/place/`.
- **Geo URL bias uses meters** for `locationBias.circle.radius` (we use 500 m).
- **Result order is not stable** across identical requests — cache `places[0].id` in store config after verifying the match.
- **`rating` / `userRatingCount` in search** trigger higher SKUs than IDs-only; request only fields you need.

## Test file
`tests/google-maps/text-search.js`
