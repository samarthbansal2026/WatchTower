# Flipp — Item Detail

- **Service**: Rich single-item view from a weekly circular
- **Homepage**: https://flipp.com
- **Base URL**: `https://backflipp.wishabi.com/flipp`
- **Auth**: None
- **Cost**: Free
- **Rate limits**: Not documented

## Tested on
2026-06-24 — `PASS` in ~3s (includes list + flyer hydrate steps). Dollar General item near Burlington NC: brand, description, buy-online URL.

## Endpoints tested

```
GET https://backflipp.wishabi.com/flipp/items/{item_id}
```

Returns `{ item: { ... } }` with more fields than the bulk `/flyers/{id}` list (description, `ttm_url`, shipping/return policies).

## Sample request (Node.js)

```js
const { items } = await fetch(
  'https://backflipp.wishabi.com/flipp/flyers/7999277'
).then(r => r.json());

const detail = await fetch(
  `https://backflipp.wishabi.com/flipp/items/${items[0].id}`
).then(r => r.json());
```

## Sample response (truncated)

```json
{
  "item": {
    "id": 1022185296,
    "flyer_id": 7999277,
    "name": "Forever Pals® Puppy Pads Odor Control or XL",
    "brand": "Forever Pals®",
    "merchant": "Dollar General",
    "merchant_id": 2063,
    "current_price": "14.0",
    "description": "…",
    "ttm_url": "https://www.dollargeneral.com/dg/…",
    "valid_to": "2026-06-27T23:59:59-04:00"
  }
}
```

## Gotchas
- **Item IDs come from `/flyers/{id}`** — there is no search-by-id discovery endpoint.
- **`current_price` is a string** on this endpoint (unlike numeric `price` on the flyer list).
- **`ttm_url` may point to the retailer's e-commerce site** — useful for price verification; not all items have one.
- **Skip when DG has no flyer** — same weekly rotation caveat as flyer-items test.

## Test file
`tests/flipp/item-detail.js`
