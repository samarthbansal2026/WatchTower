# Eventbrite Venues — venue detail and venue event list

- **Service**: Eventbrite v3 REST API
- **Homepage**: https://www.eventbrite.com/platform/api
- **Base URL**: `https://www.eventbriteapi.com/v3`
- **Auth**: OAuth 2.0 Bearer token
- **Cost**: Free
- **Rate limits**: 1,000 calls/hour, 48,000/day

## Tested on
2026-06-05 — `PASS` in ~2 s. Anchor venue: The Cooper Union Foundation Building (ID `9985158`), 3 events listed.

## Endpoints

### `GET /venues/{id}/`
Full venue detail: name, address, lat/lng, capacity.

### `GET /venues/{id}/events/`
All events hosted at this venue. Returns `{ events: [], pagination: {...} }`.

**No query parameters are accepted.** Passing `page_size=` or `status=` causes `400 ARGUMENTS_ERROR`. Call bare.

## How to find a venue ID

Venue IDs are embedded in event objects (available after fetching an event via `GET /events/{id}/?expand=venue`). There is no venue search endpoint.

## Sample request (Node.js)

```js
const TOKEN   = process.env.EVENTBRITE_PRIVATE_TOKEN;
const BASE    = 'https://www.eventbriteapi.com/v3';
const venueId = '9985158';

const [venue, vEvents] = await Promise.all([
  fetch(`${BASE}/venues/${venueId}/`,         { headers: { Authorization: `Bearer ${TOKEN}` } }).then(r => r.json()),
  fetch(`${BASE}/venues/${venueId}/events/`,  { headers: { Authorization: `Bearer ${TOKEN}` } }).then(r => r.json()),
]);

console.log(venue.name, venue.address.localized_address_display);
console.log(venue.latitude, venue.longitude);
for (const e of vEvents.events) console.log(e.id, e.name?.text, e.start?.local);
```

## Sample response (truncated)

Venue detail:
```json
{
  "id": "9985158",
  "name": "The Cooper Union Foundation Building",
  "address": {
    "address_1": "7 East 7th Street",
    "city": "New York",
    "region": "NY",
    "postal_code": "10003",
    "country": "US",
    "localized_address_display": "7 East 7th Street, New York, NY 10003"
  },
  "latitude": "40.7292862",
  "longitude": "-73.99060539999999",
  "capacity": null
}
```

Venue events:
```json
{
  "pagination": { "object_count": 3, "page_size": 50, "has_more_items": false },
  "events": [
    { "id": "1203784514889", "name": { "text": "Typographics Conference 2025" }, "start": { "local": "2025-06-27T09:30:00" } },
    { "id": "1987199093984", "name": { "text": "Paper Grocery Signs with John Downer" }, "start": { "local": "2026-06-22T10:00:00" } },
    { "id": "1979795173659", "name": { "text": "Typographics Conference 2026" }, "start": { "local": "2026-06-26T10:00:00" } }
  ]
}
```

## Gotchas

- **`page_size` and `status` are not accepted** on `/venues/{id}/events/`. Both return `400 ARGUMENTS_ERROR "Unknown parameter"`. Call the endpoint with no query string.
- **Venue IDs are not discoverable** through the API without first knowing an event ID or having organizer access. There is no venue search.
- **`capacity` is null** unless the organizer explicitly set it.
- **`latitude`/`longitude` are strings**, not numbers, in venue detail — coerce before arithmetic: `parseFloat(venue.latitude)`.
- **Venue events include past events** in the listing alongside future ones. Filter by `start.utc` if you only want upcoming.

## Test file
`tests/eventbrite/venues.js`
