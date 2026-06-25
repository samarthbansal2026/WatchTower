# Flipp — Flyers (list by postal code)

- **Service**: Weekly circular catalog localized to a postal code
- **Homepage**: https://flipp.com/flyers
- **Base URL**: `https://backflipp.wishabi.com/flipp`
- **Auth**: None
- **Cost**: Free
- **Rate limits**: Not documented

## Tested on
2026-06-24 — `PASS` in ~340ms. Burlington NC 27217: 56 active flyers; Dollar General flyer id 7999277.

## Endpoints tested

```
GET https://backflipp.wishabi.com/flipp/flyers?locale=en-us&postal_code={zip}
```

## Sample request (Node.js)

```js
const url = `https://backflipp.wishabi.com/flipp/flyers?locale=en-us&postal_code=27217`;
const { flyers, refreshed_at } = await fetch(url).then(r => r.json());
```

## Sample response (truncated)

```json
{
  "refreshed_at": "2026-06-24 00:45:51 -0400",
  "flyers": [
    {
      "id": 7999277,
      "merchant": "Dollar General",
      "merchant_id": 2063,
      "valid_from": "2026-06-21T00:00:00-04:00",
      "valid_to": "2026-06-27T23:59:59-04:00",
      "categories": ["All Flyers", "General Merchandise"],
      "thumbnail_url": "http://f.wishabi.net/flyers/7999277/web_organic/…jpg"
    }
  ]
}
```

## Gotchas
- **Not a documented public API.** Endpoints are reverse-engineered from flipp.com network traffic. URLs or response shapes could change without notice.
- **`locale` matters.** Use `en-us` for US ZIP codes, `en-ca` for Canadian postal codes.
- **Flyer IDs rotate weekly.** Do not hardcode flyer IDs in production — list first, then hydrate.
- **Dollar Tree (2479) appears in search/merchant metadata but rarely has flyers.** Competitor circulars are the actionable signal.
- **`merchant` strings may have trailing whitespace** (e.g. `"Costco "`). Trim before display.

## Test file
`tests/flipp/flyers.js`
