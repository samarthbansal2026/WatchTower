# Eventbrite Taxonomy — categories, subcategories, formats

- **Service**: Eventbrite v3 REST API
- **Homepage**: https://www.eventbrite.com/platform/api
- **Base URL**: `https://www.eventbriteapi.com/v3`
- **Auth**: OAuth 2.0 Bearer token
- **Cost**: Free
- **Rate limits**: 1,000 calls/hour, 48,000/day

## Tested on
2026-06-05 — `PASS` in ~1 s (3 parallel requests).

## Endpoints

| Endpoint | Returns |
|---|---|
| `GET /categories/` | 21 top-level event categories |
| `GET /subcategories/` | 50 subcategories (each linked to a parent category) |
| `GET /formats/` | 20 event format types |

These lists are essentially static reference data — they change rarely and can be cached.

## Sample request (Node.js)

```js
const TOKEN = process.env.EVENTBRITE_PRIVATE_TOKEN;
const BASE  = 'https://www.eventbriteapi.com/v3';
const h     = { Authorization: `Bearer ${TOKEN}` };

const [cats, fmts] = await Promise.all([
  fetch(`${BASE}/categories/`, { headers: h }).then(r => r.json()),
  fetch(`${BASE}/formats/`,    { headers: h }).then(r => r.json()),
]);

for (const c of cats.categories.slice(0, 5)) console.log(c.id, c.name);
for (const f of fmts.formats.slice(0,   5)) console.log(f.id, f.name);
```

## Sample response (truncated)

Categories:
```json
{
  "categories": [
    { "id": "103", "name": "Music" },
    { "id": "101", "name": "Business & Professional" },
    { "id": "110", "name": "Food & Drink" },
    { "id": "113", "name": "Community & Culture" },
    { "id": "105", "name": "Performing & Visual Arts" }
  ]
}
```

Formats:
```json
{
  "formats": [
    { "id": "1",  "name": "Conference" },
    { "id": "2",  "name": "Seminar or Talk" },
    { "id": "3",  "name": "Tradeshow, Consumer Show, or Expo" },
    { "id": "5",  "name": "Festival or Fair" },
    { "id": "10", "name": "Concert or Performance" }
  ]
}
```

## Gotchas

- All three endpoints require a Bearer token even though the data is public reference information (not user-specific).
- Response latency varies widely — seen anywhere from 1 s to 20 s on the same token in the same session. This is an Eventbrite-side variability, not a network issue. Set `timeoutMs: 30000`.

## Test file
`tests/eventbrite/taxonomy.js`
