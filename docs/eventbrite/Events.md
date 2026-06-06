# Eventbrite Events — event detail and attendee orders

- **Service**: Eventbrite v3 REST API
- **Homepage**: https://www.eventbrite.com/platform/api
- **Base URL**: `https://www.eventbriteapi.com/v3`
- **Auth**: OAuth 2.0 Bearer token
- **Cost**: Free
- **Rate limits**: 1,000 calls/hour, 48,000/day

## Tested on
2026-06-05 — `PASS` in ~3.5 s.

## Endpoints

### `GET /events/{id}/`
Single event by ID. Use `?expand=venue,ticket_classes,organizer,ticket_availability` to get the full picture in one call.

### `GET /users/me/orders/`
Events the authenticated user has purchased tickets for (as an attendee). Returns `{ orders: [], pagination: {...} }` for accounts with no purchases — does NOT return 404 on empty.

## How to find an event ID

**There is no public event search endpoint.** `GET /events/search/` was permanently removed in December 2019. Event IDs must be obtained through one of:

1. **Your organizer account**: `GET /users/me/owned_events/` (requires organizer status — see gotchas)
2. **Your organization**: `GET /organizations/{id}/events/`
3. **A known venue**: `GET /venues/{id}/events/` (see `Venues.md`)
4. **Eventbrite's web UI**: event URLs end in the numeric ID, e.g. `eventbrite.com/e/name-tickets-1979795173659`
5. **Webhooks**: Eventbrite can POST event IDs to your endpoint when events are created/updated

## Sample request (Node.js)

```js
const TOKEN   = process.env.EVENTBRITE_PRIVATE_TOKEN;
const BASE    = 'https://www.eventbriteapi.com/v3';
const eventId = '1979795173659'; // obtain from venue, org, or web URL

const event = await fetch(
  `${BASE}/events/${eventId}/?expand=venue,ticket_classes,ticket_availability`,
  { headers: { Authorization: `Bearer ${TOKEN}` } }
).then(r => r.json());

console.log(event.name.text, event.status);
console.log('Venue:', event.venue?.name);
console.log('Tickets available:', event.ticket_availability?.has_available_tickets);

// Attendee orders
const orders = await fetch(`${BASE}/users/me/orders/`, { headers: { Authorization: `Bearer ${TOKEN}` } }).then(r => r.json());
console.log('Your orders:', orders.pagination.object_count);
```

## Sample response (truncated)

```json
{
  "id": "1979795173659",
  "name": { "text": "Typographics Conference 2026", "html": "..." },
  "status": "live",
  "start": { "timezone": "America/New_York", "local": "2026-06-26T10:00:00" },
  "end":   { "timezone": "America/New_York", "local": "2026-06-27T18:00:00" },
  "url": "https://www.eventbrite.com/e/typographics-conference-2026-tickets-1979795173659",
  "capacity": null,
  "organizer_id": "14077440081",
  "venue": {
    "id": "9985158",
    "name": "The Cooper Union Foundation Building",
    "address": { "localized_address_display": "7 East 7th Street, New York, NY 10003" }
  },
  "ticket_classes": [
    {
      "id": "3413825868",
      "name": "Sponsor Rep",
      "free": false,
      "cost": { "display": "$550.00", "currency": "USD" },
      "on_sale_status": "AVAILABLE"
    }
  ],
  "ticket_availability": {
    "has_available_tickets": true,
    "minimum_ticket_price": { "display": "0.00 USD" },
    "maximum_ticket_price": { "display": "588.73 USD" },
    "is_sold_out": false
  }
}
```

## Gotchas

- **`GET /users/me/owned_events/` returns 404 for attendee accounts.** Despite `GET /users/me/` working for all accounts, `owned_events` uses a different "organizer" identity internally. Accounts that have never created an event return `404 "user_id does not exist"`. This is a misleading error — the user exists, but their organizer profile does not. Only organizer accounts (those who have published at least one event) can use this endpoint.
- **No search endpoint exists.** `GET /events/search/` returned `404 NOT_FOUND`. Removed December 2019; Eventbrite has not replaced it in v3. You cannot do proximity or keyword search.
- **Latency is high and variable.** Simple calls range from 1 s to 30 s on the same token. Always set `timeoutMs: 30000` or higher.
- **`capacity` is often `null`.** Organizers are not required to set capacity.
- **`expand` must be in the query string**, not headers. Missing it means venue, ticket_classes etc. return just the ID, not the nested object.

## Test file
`tests/eventbrite/events.js`
