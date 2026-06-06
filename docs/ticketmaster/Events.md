# Ticketmaster Discovery — Events

- **Service**: Search live + upcoming events globally and pull details for a specific event.
- **Homepage**: <https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/>
- **Base URL**: `https://app.ticketmaster.com/discovery/v2`
- **Auth**: `apikey` query parameter (Consumer Key from your TM dev account)
- **Cost**: Free (5,000 calls/day, 5 req/sec)

## Tested on
2026-06-05 — `PASS` in ~1.9 s.

## Endpoints

| Endpoint | Purpose |
|---|---|
| `GET /events.json` | Search events. Filterable by `keyword`, `countryCode`, `city`, `postalCode`, `latlong+radius`, `startDateTime/endDateTime`, `classificationId`, `attractionId`, `venueId`, `segmentId`, `genreId`, `subGenreId`, `marketId`, `dmaId`, `source` (`ticketmaster`/`universe`/`frontgate`/`tmr`), `includeTBA`, `includeTBD`, `sort` (`name,asc`/`date,asc`/`relevance,desc`/…). |
| `GET /events/{id}.json` | Detail for one event. |
| `GET /events/{id}/images.json` | Just the images array for one event (cheaper than the full detail). |

The event `id` looks like `LvZ18_HjYlpOc4ZZvBcXg` — opaque, returned by the search endpoint.

## Useful query parameters

| Param | Notes |
|---|---|
| `size`   | Results per page (default 20, max 199). |
| `page`   | 0-based. `size * page < 1000`. |
| `locale` | e.g. `en-us`, `en-gb`, `*` for all. |
| `includeTest` | `yes`/`no`/`only` — filter out TM's test events. |
| `geoPoint` | A geohash prefix — alternative to `latlong+radius`. |

## Sample request (Node.js)

```js
const KEY = process.env.TICKETMASTER_CONSUMER_KEY;
const url = `https://app.ticketmaster.com/discovery/v2/events.json`
  + `?countryCode=US&size=5&sort=date,asc&apikey=${KEY}`;
const j = await fetch(url).then(r => r.json());
for (const e of j._embedded.events) {
  console.log(e.dates.start.localDate, '—', e.name, '@', e._embedded.venues[0].name);
}
```

## Sample response (truncated)

```json
{
  "_embedded": {
    "events": [
      {
        "id": "LvZ18_HjYlpOc4ZZvBcXg",
        "name": "Bay Breakers Season Ticket",
        "type": "event",
        "url": "https://www.ticketmaster.com/event/LvZ18_HjYlpOc4ZZvBcXg",
        "dates": {
          "start": { "localDate": "2025-03-08", "dateTBD": false },
          "timezone": "America/Los_Angeles",
          "status": { "code": "onsale" }
        },
        "classifications": [{ "segment": { "name": "Sports" }, "genre": { "name": "Baseball" } }],
        "priceRanges": [{ "type": "standard", "currency": "USD", "min": 100, "max": 500 }],
        "_embedded": {
          "venues": [{ "name": "Grape Bowl", "city": { "name": "Lodi" }, "state": { "stateCode": "CA" } }]
        }
      }
    ]
  },
  "_links": { "self": {…}, "next": {…} },
  "page": { "size": 5, "totalElements": 10000, "totalPages": 2000, "number": 0 }
}
```

## Gotchas

- **`page.totalElements` is capped at 10,000** for many queries — it's not the true global count, it's "as much as the index will surface for this filter." Narrow the filter to see fewer/more.
- **Deep paging is hard-capped** at `size * page < 1000`. For "scrape everything" use case, slide a date window (`startDateTime/endDateTime`) and re-page.
- **Empty responses omit `_embedded`** entirely. Always guard `body._embedded?.events`.
- **Status `code` values**: `onsale`, `offsale`, `canceled`, `postponed`, `rescheduled`. Don't assume "scheduled".
- **Some events have `dates.start.dateTBD: true`** — they have no firm date. Use `includeTBA=no&includeTBD=no` to exclude.
- **The Consumer Secret is NOT used** for Discovery v2; only the Consumer Key. Secret is reserved for OAuth flows in partner APIs.

## Test file

`tests/ticketmaster/events.js`
