# SEC EDGAR — Atom Recent-Filings Feed

- **Service**: XML/Atom stream of recent filings, filterable by form type, CIK, or both. The lowest-latency way to monitor *"a new 10-K just came in"* without polling the submissions endpoint per company.
- **Base URL**: `https://www.sec.gov/cgi-bin/browse-edgar`
- **Auth**: `User-Agent` header (required).
- **Format**: Atom 1.0 (XML). No JSON variant.

## Tested on
2026-06-05 — `PASS` in ~550 ms. 7 most-recent 10-K filings returned; latest from World Acceptance Corp.

## Endpoint

```text
GET https://www.sec.gov/cgi-bin/browse-edgar
    ?action=getcurrent          # stream of recent filings (alternative: getcompany)
    &type=10-K                  # form filter (any form code, partial match)
    &output=atom                # the magic that gives you XML instead of HTML
    &count=10                   # max entries (capped ~100)
    [&CIK=XXXXXXXXXX]           # optional, restricts to one filer
```

### `action` values

| Value | What it does |
|---|---|
| `getcurrent` | Latest filings across all companies (a stream) |
| `getcompany` | All filings for one CIK (paginated) |

### `output=atom` is required

Without it you get HTML — the same page the public browser shows. Always include it.

## Response shape (Atom)

```xml
<?xml version="1.0" encoding="ISO-8859-1" ?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Latest 10-K Filings</title>
  <updated>2026-06-05T03:00:00-04:00</updated>
  <entry>
    <title>10-K - WORLD ACCEPTANCE CORP (0000108385) (Filer)</title>
    <link rel="alternate" href="https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0000108385&..." />
    <summary type="html">...details...</summary>
    <updated>2026-06-04T17:00:45-04:00</updated>
    <category term="10-K" />
    <id>urn:tag:sec.gov,2008:accession-number=0001140361-26-023363</id>
  </entry>
  ... more entries
</feed>
```

## Sample request (Node.js)

```js
const UA = 'my-app me@example.com';
const url = 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&type=10-K&output=atom&count=20';
const xml = await fetch(url, { headers: { 'User-Agent': UA } }).then(r => r.text());

// Quick & dirty: count entries
const entries = xml.match(/<entry[\s>]/g) || [];
console.log(`${entries.length} entries`);

// For real use, parse with an XML library (xml2js, fast-xml-parser, ...).
```

## Polling pattern

The Atom feed is the recommended way to **watch for new filings** without hitting the submissions endpoint per CIK:

```text
1. GET feed every N seconds (respect 10 req/sec; 30s+ is polite)
2. For each <entry>, extract the accession number from <id>
3. Skip accession numbers you've already processed
4. For new ones, hit /submissions/CIK*.json or /Archives/... to fetch full data
```

## Gotchas

- **XML only.** No JSON variant of the Atom feed exists. Parse with a real XML lib if you need anything beyond entry counts / titles.
- **`output=atom` is mandatory.** Omit it and you get an HTML page that you'd then have to scrape.
- **Entry order is newest-first.** Polling clients should keep a watermark of the most recent accession seen, then stop when they hit it.
- **The `<id>` element holds the accession** in `urn:tag:sec.gov,2008:accession-number={accn}` format. The `<title>` contains the form, filer name, and CIK in a human-readable but inconsistent layout — parse `<id>` for machine fields.
- **`count` is advisory.** Asking for 100 sometimes returns fewer entries (some filings are filtered out as duplicates).
- **No date filter on `getcurrent`.** It's strictly "most recent". For historic queries, use `getcompany` + `dateb` (date before) + `datea` (date after).

## Test file

`tests/sec-edgar/atom-feed.js`
