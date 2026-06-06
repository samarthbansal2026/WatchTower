# Ticketmaster Discovery — Suggest (autocomplete)

- **Service**: Single autocomplete endpoint that returns top matches across *all* entity types (events, attractions, venues, products) in one call. Ideal for typeahead search bars.
- **Base URL**: `https://app.ticketmaster.com/discovery/v2`
- **Auth**: `apikey` query parameter
- **Cost**: Free (shares the Discovery 5,000 calls/day quota)

## Tested on
2026-06-05 — `PASS` in ~1.0 s.

## Endpoint

```text
GET /suggest.json
    ?keyword=<text>
    [&countryCode=US]
    [&locale=en-us]
    [&latlong=lat,lon&radius=N&unit=miles|km]
    [&marketId=27]
    [&source=ticketmaster|universe|frontgate|tmr]
    [&includeTest=no|yes|only]
```

Returns up to ~5 hits in each of: `attractions`, `events`, `venues`, `products` — all in one response.

## Sample request (Node.js)

```js
const KEY = process.env.TICKETMASTER_CONSUMER_KEY;
const url = `https://app.ticketmaster.com/discovery/v2/suggest.json`
  + `?keyword=tay&countryCode=US&apikey=${KEY}`;
const j = await fetch(url).then(r => r.json());
console.log('top attraction:', j._embedded.attractions[0].name);   // "Taylor Swift"
console.log('top event:     ', j._embedded.events[0].name);
```

## Sample response (truncated)

```json
{
  "_embedded": {
    "attractions": [
      { "id": "K8vZ9175Tr0", "name": "Taylor Swift", "type": "attraction" }
    ],
    "events": [
      { "id": "G5dV...", "name": "Tay & Travis Honeymoon Staycation with Cruel Summer" }
    ],
    "venues": [
      { "id": "KovZ...", "name": "Taylor Theatre", "city": { "name": "Springfield" } }
    ],
    "products": [
      { "id": "P...",  "name": "Taylor Swift VIP Package" }
    ]
  }
}
```

## Gotchas

- **All four lists may be empty independently.** Always guard each array.
- **`keyword` is matched against names, aliases, and tags** — not just exact-prefix. Short keywords (`"tay"`) catch a lot.
- **`countryCode` strongly biases ranking** — without it you get global noise.
- **No pagination.** This endpoint deliberately returns a small top-N; for full results use the entity-specific search endpoints (`/events`, `/attractions`, …).
- **Products** appear here but the Discovery API has no `/products` resource — you discover them through suggest only.

## Test file

`tests/ticketmaster/suggest.js`
