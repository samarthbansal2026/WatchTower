# OpenStreetMap Overpass API — Index

- **Service**: Read-only query API for OpenStreetMap data
- **Homepage**: https://overpass-api.de / https://wiki.openstreetmap.org/wiki/Overpass_API
- **Auth**: None
- **Cost**: Free (public instance, community-operated)
- **Rate limit**: 2 concurrent slots per IP; requests queued or 429 if slots exhausted

## Retail use case

Overpass is ideal for understanding what's **around a store location**: competitors, anchors, transit access, active construction, and neighborhood change over time (via attic/historical queries).

## Sub-APIs

| Name | Endpoint | Auth | Test file | Doc | Status |
|---|---|---|---|---|---|
| Status & Timestamp | `/api/status`, `/api/timestamp` | none | [status.js](../../tests/overpass/status.js) | [Status.md](Status.md) | ✓ PASS |
| Nearby Amenities | `/api/interpreter` | none | [nearby-amenities.js](../../tests/overpass/nearby-amenities.js) | [NearbyAmenities.md](NearbyAmenities.md) | ✓ PASS |
| Construction Activity | `/api/interpreter` | none | [construction.js](../../tests/overpass/construction.js) | [Construction.md](Construction.md) | ✓ PASS |
| Transit Proximity | `/api/interpreter` | none | [transit.js](../../tests/overpass/transit.js) | [Transit.md](Transit.md) | ✓ PASS |
| Attic (Historical Diff) | `/api/interpreter` | none | [attic-diff.js](../../tests/overpass/attic-diff.js) | [AtticDiff.md](AtticDiff.md) | ✓ PASS |
| Output Formats | `/api/interpreter` | none | [formats.js](../../tests/overpass/formats.js) | [Formats.md](Formats.md) | ✓ PASS |

## Gotchas (global)

- **User-Agent is required.** Requests without it get HTTP 406. Node.js `fetch` defaults are rejected — add `'User-Agent': 'app/1.0 (contact@example.com)'` to every request.
- **Rate limit is 2 concurrent slots.** Running tests in parallel will trigger 429. Space sequential tests by ~2–10 s.
- **504s are transient.** The public instance occasionally overloads; a single retry is sufficient.
- **Overpass accepts both GET and POST.** GET puts the query in `?data=`; POST sends it as form body `data=`. POST is safer for large queries.
- **All interpreter queries need `[out:json]`** to get JSON back; default is XML.
