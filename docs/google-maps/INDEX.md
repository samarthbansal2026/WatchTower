# Google Maps — Places API catalog

Google Maps Platform umbrella. WatchTower covers the **Places API (New)** REST surface for store review intel.

| API | Auth | Test file | Docs | Status |
|-----|------|-----------|------|--------|
| Text Search (New) | API key + billing | `tests/google-maps/text-search.js` | [Text-Search.md](Text-Search.md) | ✓ PASS ~1s |
| Place Details (New) | API key + billing | `tests/google-maps/place-details.js` | [Place-Details.md](Place-Details.md) | ✓ PASS ~0.6s |

**Key**: `GOOGLE_PLACES_API_KEY` — enable **Places API (New)** at [Google Cloud Console](https://console.cloud.google.com/google/maps-apis). Billing required; `reviews` field triggers Enterprise + Atmosphere SKU.

**Client**: `lib/google-places.js` — shared by tests and `stores/store-intel.js`.

**First store wired**: Cavender's Boot City Dallas (`stores/cavenders.js` → `googlePlacesQuery`).

Other Maps Platform APIs (Directions, Geocoding legacy, Routes, etc.) not covered yet.
