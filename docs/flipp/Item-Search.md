# Flipp — Item Search

- **Service**: Cross-flyer search for deals near a postal code
- **Homepage**: https://flipp.com
- **Base URL**: `https://backflipp.wishabi.com/flipp`
- **Auth**: None
- **Cost**: Free
- **Rate limits**: Not documented

## Tested on
2026-06-24 — `PASS` in ~780ms. NYC 10001 empty query: 150 items returned.

## Endpoints tested

```
GET https://backflipp.wishabi.com/flipp/items/search?locale=en-us&postal_code={zip}&q={query}
```

## Query examples

| Query | Behavior |
|---|---|
| `q=` (empty) | Top deals across all nearby circulars |
| `q=milk` | Items matching "milk" at any retailer |
| `q=Dollar General` | Filter to a merchant name |
| `q=Dollar General AND milk` | Merchant + keyword (documented in community examples) |

## Sample request (Node.js)

```js
const params = new URLSearchParams({
  locale: 'en-us',
  postal_code: '10001',
  q: '',
});
const data = await fetch(
  `https://backflipp.wishabi.com/flipp/items/search?${params}`
).then(r => r.json());
```

## Sample response (truncated)

```json
{
  "items": [
    {
      "flyer_item_id": 1022180167,
      "name": "Clover Valley Chocolate Chip Cookies Original, Chewy or Chunky",
      "merchant_name": "Dollar General",
      "merchant_id": 2063,
      "current_price": 2.75,
      "brand_ids": ["160"],
      "valid_to": "2026-06-27T23:59:59-04:00"
    }
  ],
  "ads": [],
  "native_ads": [],
  "merchants": [],
  "facets": { "filters": [] }
}
```

## Gotchas
- **Empty `q=` returns a curated top-deals set**, not every item in every circular. For exhaustive brand extraction, use the flyers list + `/flyers/{id}` hydrate path instead.
- **`ads` and `native_ads` arrays are usually empty** on this endpoint for unauthenticated consumer queries. Brand placements appear as regular `items` with optional `brand_ids`.
- **Merchant-specific search may return zero `items`** but still populate `merchants[]` or `related_items[]` when the retailer has no active indexed flyer.
- **`brand_ids` are opaque numeric strings** — there is no public brand-name lookup API; use the `brand` field from `/flyers/{id}` items instead.

## Test file
`tests/flipp/item-search.js`
