# Ticketmaster Discovery — Classifications

- **Service**: Browse TM's taxonomy of entity types — Sports → Football → NFL → AFC, Music → Pop, etc. Used to *filter* event/attraction searches by category.
- **Base URL**: `https://app.ticketmaster.com/discovery/v2`
- **Auth**: `apikey` query parameter
- **Cost**: Free (shares the Discovery 5,000 calls/day quota)

## Tested on
2026-06-05 — `PASS` (5 endpoints) in ~2.7 s.

## Taxonomy

```
segment (top-level: Music | Sports | Arts & Theatre | Film | Miscellaneous)
  └── genre (e.g. Pop, Football, Comedy)
        └── subGenre (e.g. K-Pop, NFL, Stand-Up)
              └── type / subType (rare; only some categories)
```

There are ~17 segments. Each is identified by an opaque ID like `KZFzniwnSyZfZ7v7n1`. Use those IDs as `segmentId=`, `genreId=`, `subGenreId=` on event / attraction / venue searches.

## Endpoints

| Endpoint | Purpose |
|---|---|
| `GET /classifications.json` | Top-level list. Each row is a segment with nested genres → subgenres in `_embedded`. |
| `GET /classifications/{id}.json` | Detail for any classification (segment/genre/subgenre share one ID space). |
| `GET /classifications/segments/{id}.json` | Detail for a segment specifically. |
| `GET /classifications/genres/{id}.json` | Detail for a genre. |
| `GET /classifications/subgenres/{id}.json` | Detail for a sub-genre. |

The 4 type-specific detail endpoints are interchangeable with `/classifications/{id}` — they exist so a client that knows the type can be explicit (and for stricter type-error responses).

## Sample request (Node.js)

```js
const KEY = process.env.TICKETMASTER_CONSUMER_KEY;
const url = `https://app.ticketmaster.com/discovery/v2/classifications.json?apikey=${KEY}`;
const j = await fetch(url).then(r => r.json());
for (const c of j._embedded.classifications) {
  const seg = c.segment;
  console.log(seg.name, '—', seg._embedded?.genres?.map(g => g.name).join(', '));
}
```

## Sample response (truncated)

```json
{
  "_embedded": {
    "classifications": [
      {
        "family": false,
        "segment": {
          "id": "KZFzniwnSyZfZ7v7n1",
          "name": "Miscellaneous",
          "_embedded": {
            "genres": [
              {
                "id": "KnvZfZ7vAAa",
                "name": "Casino/Gaming",
                "_embedded": {
                  "subgenres": [
                    { "id": "KZazBEonSMnZfZ7vFnt", "name": "Casino/Gaming" }
                  ]
                }
              }
            ]
          }
        }
      }
    ]
  },
  "page": { "size": 20, "totalElements": 17, "totalPages": 1, "number": 0 }
}
```

## Gotchas

- **Each row of `_embedded.classifications` wraps a single segment**, with its genres and subgenres nested inside `segment._embedded`. There is no top-level `genres[]` / `subGenres[]` on the row — don't look there.
- **One ID space, multiple resource types.** `/classifications/{id}` works whether `id` is a segment, genre, or subgenre ID — it returns whichever object exists.
- **`KZFzBErXgnZfdwnZ7v7nJ` ("Undefined") shows up everywhere** as a placeholder when an event/attraction hasn't been categorized. Treat as "unknown".
- **The `subType` and `type` taxonomies** exist mainly for ticketing internals (e.g. group, individual, season). Most consumer apps can ignore them.

## Test file

`tests/ticketmaster/classifications.js`
