# Flipp — Index

- **Service**: Digital weekly circular / flyer platform (Wishabi backend)
- **Homepage**: https://flipp.com
- **Base URL**: `https://backflipp.wishabi.com/flipp` (unofficial — same JSON backend as flipp.com)
- **Auth**: None
- **Cost**: Free (consumer-facing endpoints)
- **Rate limits**: Not documented; use ~400ms between flyer-item fetches when hydrating multiple circulars

## Retail use case

Given a store ZIP code, list nearby retailer weekly ads and extract **brand-level promotions** (name, brand, price, validity). Useful for competitive intel: which national brands Dollar General, Family Dollar, Walmart, etc. are pushing in a trade area. Dollar Tree is listed on Flipp (merchant_id 2479) but **does not publish circulars** in most US markets.

## Sub-APIs

| Name | Endpoint | Auth | Test file | Doc | Status |
|---|---|---|---|---|---|
| Flyers (list by ZIP) | `GET /flyers?postal_code={zip}` | None | [flyers.js](../../tests/flipp/flyers.js) | [Flyers.md](Flyers.md) | ✓ PASS ~340ms |
| Flyer Items (circular detail) | `GET /flyers/{flyer_id}` | None | [flyer-items.js](../../tests/flipp/flyer-items.js) | [Flyer-Items.md](Flyer-Items.md) | ✓ PASS ~2400ms |
| Item Search | `GET /items/search?postal_code={zip}&q={query}` | None | [item-search.js](../../tests/flipp/item-search.js) | [Item-Search.md](Item-Search.md) | ✓ PASS ~780ms |
| Item Detail | `GET /items/{item_id}` | None | [item-detail.js](../../tests/flipp/item-detail.js) | [Item-Detail.md](Item-Detail.md) | ✓ PASS ~3s |

## Not tested (deferred)

| Endpoint | Reason |
|---|---|
| `dam.flippenterprise.net/flyerkit/publications/{store}` | Retailer-hosted XML publications; requires per-store `access_token` from browser devtools; not stable for harness |
| `ads-flipp.com/flyer-locator-service/client_bidding` | NativeX ad bidding; partner credentials only |

## Integrations

| Consumer | Path | Output |
|---|---|---|
| Test harness | `node tests/run-all.js flipp` | `logs/flipp/{api}.json` |
| Forecast | `npm run forecast:cavenders` | `logs/{city}-{date}-raw.json` + `-clean.json` → `competition.flipp_competitor_circulars` |
| Past lookback | `npm run past7:cavenders` | Skipped — no historical circular archive |
| Store intel | `npm run intel` | `logs/store-intel-latest.json` → `intel.flipp` (summary only) |

## Shared client

`lib/flipp.js` — used by tests, forecast-7d, and store-intel.
