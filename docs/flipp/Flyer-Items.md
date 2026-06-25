# Flipp — Flyer Items (circular detail + brands)

- **Service**: Shoppable items on a single weekly circular page
- **Homepage**: https://flipp.com
- **Base URL**: `https://backflipp.wishabi.com/flipp`
- **Auth**: None
- **Cost**: Free
- **Rate limits**: Not documented; responses can be large (200+ items)

## Tested on
2026-06-24 — `PASS` in ~2400ms (includes list step). Dollar General flyer 7999277 near Burlington NC: 236 items, 205 with `brand` populated.

## Endpoints tested

```
GET https://backflipp.wishabi.com/flipp/flyers/{flyer_id}
```

Returns `{ items: [...], pages: [...], has_corrections: boolean }`.

## Sample request (Node.js)

```js
// Step 1: find flyer id from list endpoint
const list = await fetch(
  'https://backflipp.wishabi.com/flipp/flyers?locale=en-us&postal_code=27217'
).then(r => r.json());
const dg = list.flyers.find(f => f.merchant_id === 2063);

// Step 2: hydrate items
const { items } = await fetch(
  `https://backflipp.wishabi.com/flipp/flyers/${dg.id}`
).then(r => r.json());
```

## Sample response (truncated)

```json
{
  "items": [
    {
      "id": 1022185296,
      "flyer_id": 7999277,
      "name": "Forever Pals® Puppy Pads Odor Control or XL",
      "brand": "Forever Pals®",
      "price": "14.0",
      "valid_from": "2026-06-21T00:00:00-04:00",
      "valid_to": "2026-06-27T23:59:59-04:00",
      "cutout_image_url": "http://f.wishabi.net/page_items/425048958/1782154873/extra_large.jpg"
    }
  ],
  "pages": [],
  "has_corrections": false
}
```

## Other endpoints

| Endpoint | Purpose | Doc |
|---|---|---|
| `GET /items/{item_id}` | Richer single-item detail (description, buy-online URL, policies) | [Item-Detail.md](Item-Detail.md) |

## Gotchas
- **`brand` is the key field for national-brand intel** but not every item has it. Walgreens circulars often return hundreds of items with `brand: null` — names/prices still present.
- **`price` is a string**, not a number (e.g. `"14.0"`). Parse with `Number()`.
- **Multi-brand strings** use pipe separators: `"Banana Boat® | Hawaiian Tropic®"`.
- **Coordinates (`left`, `top`, `bottom`, `right`)** are flyer-layout positions, not lat/lon — useful for rendering, not geospatial analysis.
- **Hydrating many flyers sequentially** can take several seconds; add delay between requests.

## Test file
`tests/flipp/flyer-items.js`
