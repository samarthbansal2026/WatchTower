# SEC EDGAR — Full-Text Search

- **Service**: Elasticsearch-backed full-text search over the contents of EDGAR filings (including exhibits) since 2001. Powers the search UI at <https://efts.sec.gov/LATEST/search-index>.
- **Base URL**: `https://efts.sec.gov/LATEST/search-index`
- **Auth**: `User-Agent` header (required).

## Tested on
2026-06-05 — `PASS` in ~3.8 s. Query: `"artificial intelligence"` in 10-Ks filed during 2024 — **2,436 matching filings**.

## Endpoint

```text
GET https://efts.sec.gov/LATEST/search-index?q={query}&forms={form-list}&dateRange=custom&startdt=YYYY-MM-DD&enddt=YYYY-MM-DD
```

## Query parameters

| Param | Meaning |
|---|---|
| `q` | the search expression (quoted phrases, AND/OR/NOT) |
| `forms` | comma-separated form types (`10-K`, `10-Q`, `8-K`, `13F-HR`, `S-1`, …) |
| `dateRange` | `custom` (then provide start/end) or `1y`/`5y`/`10y` |
| `startdt`, `enddt` | `YYYY-MM-DD` |
| `ciks` | comma-separated 10-digit CIKs (zero-padded) to restrict the search |
| `from`, `size` | Elasticsearch-style pagination (`from`/`size`; default size 10) |
| `category` | `form-type`, `custom`, etc. |
| `entityName` | company-name filter |
| `locationCode` | state/country of the filer (`CA`, `DE`, `BM`, …) |

## Response shape (Elasticsearch-flavored)

```json
{
  "took": 18,
  "hits": {
    "total":     { "value": 2436, "relation": "eq" },
    "max_score": 18.141886,
    "hits": [
      {
        "_id":    "0001493152-24-021767:form10-ka.htm",
        "_score": 18.14,
        "_source": {
          "ciks":          ["0001498148"],
          "display_names": ["Artificial Intelligence Technology Solutions Inc.  (AITX)  (CIK 0001498148)"],
          "form":          "10-K/A",
          "file_date":     "2024-05-29",
          "adsh":          "0001493152-24-021767",
          "file_type":     "10-K/A",
          "items":         "",
          ...
        }
      },
      ...
    ]
  }
}
```

`_id` is the **accession number** + ":" + **filename** of the matched document/exhibit.

## Sample request (Node.js)

```js
const UA = 'my-app me@example.com';

const params = new URLSearchParams({
  q: '"artificial intelligence"',
  forms: '10-K',
  dateRange: 'custom',
  startdt: '2024-01-01',
  enddt: '2024-12-31',
});
const url = `https://efts.sec.gov/LATEST/search-index?${params}`;
const j = await fetch(url, { headers: { 'User-Agent': UA } }).then(r => r.json());

console.log(`${j.hits.total.value} matching 10-Ks`);
for (const h of j.hits.hits.slice(0, 5)) {
  console.log(`  ${h._source.file_date}  ${h._source.display_names[0]}`);
}
```

## Linking to the filing

The matched document URL is reconstructible from `_id`:

```
https://www.sec.gov/Archives/edgar/data/{CIK-no-padding}/{accession-no-dashes}/{filename}
```

## Gotchas

- **Different host** (`efts.sec.gov`) than the rest of the EDGAR APIs. Don't mix base URLs.
- **`_id` is `accession:filename`** — not just the accession. The colon-delimited filename is the matched document (10-K body, an exhibit, etc.).
- **Default page size is 10**; max is 100. For more, paginate with `from=10&size=10` etc.
- **Quoted-phrase queries (`"…"`) work**; bare multi-word queries default to OR-of-tokens. Wrap in quotes for precision.
- **No JSON wrapper for errors** — bad queries return HTML error pages with HTTP 200. Validate `body.hits` before using.
- **Indexed since 2001 only** — earlier filings exist on EDGAR but aren't searchable.
- **`display_names`** is an array (multi-filer filings exist) — typical UI usage is `display_names[0]`.

## Test file

`tests/sec-edgar/full-text-search.js`
