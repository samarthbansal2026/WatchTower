# FRED Categories — Taxonomy Browser

- **Service**: Federal Reserve Bank of St. Louis — FRED API
- **Homepage**: https://fred.stlouisfed.org/docs/api/fred/category.html
- **Base URL**: `https://api.stlouisfed.org/fred`
- **Auth**: API key (query param `api_key=`)
- **Cost**: Free
- **Rate limits**: Not documented

## Tested on
2026-06-06 — `PASS` in ~1500ms (3 requests: root children, Money/Banking children, Treasury leaf series).

## Endpoints

### `GET /fred/category`
Get metadata for a single category by ID.

### `GET /fred/category/children`
Get child categories. Use `category_id=0` for the root (returns 8 top-level categories).

**Params**: `category_id`, `api_key`, `file_type=json`

**Root categories returned** (as of 2026-06):
- 32991 — Money, Banking, & Finance
- 10 — Population, Employment, & Labor Markets
- 32992 — National Accounts
- 1 — Production & Business Activity
- 32455 — Prices
- 32263 — International Data
- 3008 — U.S. Regional Data
- 33060 — Academic Data

### `GET /fred/category/series`
Get series in a leaf category.

**Params**: `category_id`, `api_key`, `file_type=json`, `limit`, `offset`, `sort_order`, `order_by`

## Sample request (Node.js)

```js
// Get root categories
const r = await fetch(
  'https://api.stlouisfed.org/fred/category/children?category_id=0&api_key=YOUR_KEY&file_type=json'
);
const { categories } = await r.json();
// categories[0] = { id: 32991, name: 'Money, Banking, & Finance', parent_id: 0 }
```

## Sample response (truncated)

```json
{
  "categories": [
    { "id": 32991, "name": "Money, Banking, & Finance", "parent_id": 0 },
    { "id": 10,    "name": "Population, Employment, & Labor Markets", "parent_id": 0 },
    { "id": 32992, "name": "National Accounts", "parent_id": 0 }
  ]
}
```

## Gotchas

- **Parent categories hold 0 direct series.** Only leaf nodes have series. E.g., `category_id=22` ("Interest Rates") returns `count: 0` for series; you must drill into children like `115` (Treasury Constant Maturity).
- **Leaf category discovery requires recursive walk.** There's no "get all leaf categories" endpoint; you must traverse the tree manually via `category/children`.

## Test file
`tests/fred/categories.js`
