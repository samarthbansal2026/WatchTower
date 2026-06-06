# Ticketmaster Discovery — Attractions

- **Service**: Search the catalog of *who/what performs* — artists, sports teams, packages, plays.
- **Base URL**: `https://app.ticketmaster.com/discovery/v2`
- **Auth**: `apikey` query parameter
- **Cost**: Free (shares the Discovery 5,000 calls/day quota)

## Tested on
2026-06-05 — `PASS` in ~1.2 s.

## Endpoints

| Endpoint | Purpose |
|---|---|
| `GET /attractions.json` | Search. Filter by `keyword`, `id` (multi), `classificationId`, `segmentId`, `genreId`, `subGenreId`, `source`, `locale`, `includeTest`. |
| `GET /attractions/{id}.json` | Detail for one attraction. Includes `upcomingEvents._total` count and source breakdowns. |

## Sample request (Node.js)

```js
const KEY = process.env.TICKETMASTER_CONSUMER_KEY;
const url = `https://app.ticketmaster.com/discovery/v2/attractions.json`
  + `?keyword=${encodeURIComponent('Taylor Swift')}&size=5&apikey=${KEY}`;
const j = await fetch(url).then(r => r.json());
console.log(j._embedded.attractions[0]);
```

## Sample response (truncated)

```json
{
  "_embedded": {
    "attractions": [
      {
        "id": "K8vZ9175Tr0",
        "name": "Taylor Swift",
        "type": "attraction",
        "url": "https://www.ticketmaster.com/taylor-swift-tickets/artist/K8vZ9175Tr0",
        "classifications": [{
          "segment": { "name": "Music" },
          "genre": { "name": "Pop" },
          "subGenre": { "name": "Pop" }
        }],
        "upcomingEvents": {
          "_total": 1,
          "ticketmaster": 1
        },
        "externalLinks": {
          "wiki":      [{ "url": "https://en.wikipedia.org/wiki/Taylor_Swift" }],
          "twitter":   [{ "url": "https://twitter.com/taylorswift13" }],
          "instagram": [{ "url": "https://www.instagram.com/taylorswift" }]
        }
      }
    ]
  },
  "page": { "size": 5, "totalElements": 48, "totalPages": 10, "number": 0 }
}
```

## Gotchas

- **Multiple entries per real artist.** Taylor Swift has 48 attraction rows — different sources, regions, parent/child relationships. Use `source=ticketmaster` to keep it sane.
- **`upcomingEvents._total: 0` doesn't mean the artist is inactive** — it can mean their tour hasn't gone on sale yet. Cross-check via `/events?attractionId={id}`.
- **`externalLinks`** are best-effort; many attractions have none.
- The `aliases[]` array is the canonical list of alternate names — useful for fuzzy search.

## Test file

`tests/ticketmaster/attractions.js`
