# Ticketmaster Discovery — Venues

- **Service**: Search the venue catalog (arenas, theaters, stadiums) and get a single venue's address / lat-lon / timezone.
- **Base URL**: `https://app.ticketmaster.com/discovery/v2`
- **Auth**: `apikey` query parameter
- **Cost**: Free (shares the Discovery 5,000 calls/day quota)

## Tested on
2026-06-05 — `PASS` in ~1.0 s.

## Endpoints

| Endpoint | Purpose |
|---|---|
| `GET /venues.json` | Search. Filter by `keyword`, `id` (multi), `countryCode`, `stateCode`, `latlong+radius`, `marketId`, `dmaId`, `source`, `includeTest`. |
| `GET /venues/{id}.json` | Detail for one venue. |

## Sample request (Node.js)

```js
const KEY = process.env.TICKETMASTER_CONSUMER_KEY;
const url = `https://app.ticketmaster.com/discovery/v2/venues.json`
  + `?keyword=${encodeURIComponent('Madison Square Garden')}&countryCode=US&apikey=${KEY}`;
const j = await fetch(url).then(r => r.json());
console.log(j._embedded.venues[0]);
```

## Sample response (truncated)

```json
{
  "_embedded": {
    "venues": [
      {
        "id": "KovZpZA7AAEA",
        "name": "Madison Square Garden",
        "type": "venue",
        "url": "https://www.ticketmaster.com/madison-square-garden-tickets-new-york/venue/483329",
        "timezone": "America/New_York",
        "postalCode": "10001",
        "city": { "name": "New York" },
        "state": { "name": "New York", "stateCode": "NY" },
        "country": { "name": "United States Of America", "countryCode": "US" },
        "address": { "line1": "7th Ave & 32nd Street" },
        "location": { "longitude": "-73.99160060", "latitude": "40.74970620" },
        "boxOfficeInfo": {
          "phoneNumberDetail": "...",
          "openHoursDetail": "..."
        }
      }
    ]
  },
  "page": { "size": 5, "totalElements": 37, "totalPages": 8, "number": 0 }
}
```

## Gotchas

- **Lat/lon are strings**, not numbers (e.g. `"40.74970620"`). `parseFloat()` before doing math.
- **A "venue" can be a subsection.** "Madison Square Garden", "MSG Hulu Theater at MSG", "MSG Sphere" are distinct rows even though geographically co-located. Use `id`, not name, when joining to events.
- **`stateCode` is US-style two-letter** — not present for non-US venues. Fall back to `state.name`.
- **`postalCode` is null** for many venues outside the US.
- A venue's full event calendar is *not* part of `/venues/{id}` — query `/events?venueId={id}` separately.

## Test file

`tests/ticketmaster/venues.js`
