# SEC EDGAR — API Catalog

EDGAR is the SEC's filing & disclosure system. All programmatic surfaces are **free, public, no key required** — but every request **must carry a descriptive `User-Agent` header** (or the SEC will 403 it). The fair-access cap is **10 req/sec per IP**; exceed it and your IP is blocked for ~10 minutes.

## Working APIs

All tested 2026-06-05. All endpoints share auth (`User-Agent` header), rate limits, and `data.sec.gov` / `www.sec.gov` hosts.

| # | API | Returns | Test file | Docs |
|---|---|---|---|---|
| 1 | **Ticker → CIK lookup**       | static map: ticker → CIK + title | `tests/sec-edgar/tickers.js`        | [Tickers.md](Tickers.md) |
| 2 | **Submissions**               | all filings for a company (column-oriented arrays) | `tests/sec-edgar/submissions.js`    | [Submissions.md](Submissions.md) |
| 3 | **XBRL Company Facts + Concept** | every tagged disclosure (all facts) or one tag for one company | `tests/sec-edgar/xbrl-company.js`   | [XBRL-Company.md](XBRL-Company.md) |
| 4 | **XBRL Frames**               | one fact across every reporting entity for a period | `tests/sec-edgar/xbrl-frames.js`    | [XBRL-Frames.md](XBRL-Frames.md) |
| 5 | **Full-Text Search**          | text search over filings since 2001 | `tests/sec-edgar/full-text-search.js` | [Full-Text-Search.md](Full-Text-Search.md) |
| 6 | **Atom recent-filings feed**  | XML/Atom stream of latest filings | `tests/sec-edgar/atom-feed.js`      | [Atom-Feed.md](Atom-Feed.md) |

## Shared properties (every EDGAR endpoint)

- **Auth**: none — but `User-Agent` is **mandatory**. Format SEC asks for: `"Org / project name email@example.com"`. Missing or default UAs (`curl/`, `Node`, blank) → 403.
- **Rate limit**: 10 req/sec per IP, **hard**. Over → 403 and a ~10-minute IP block.
- **Hosts**:
  - `data.sec.gov` — modern JSON APIs (submissions, XBRL)
  - `www.sec.gov` — bulk files, ticker map, Atom feeds, legacy
  - `efts.sec.gov` — full-text search (the new ElasticSearch-backed UI backend)
- **Update latency**: submissions ~1 s; XBRL ~1 min.
- **CIK format**: must be the integer left-zero-padded to 10 digits (`'0000320193'`) in *URL paths*. Inside JSON bodies, the same CIK is sometimes a number (`320193`) and sometimes a 10-char string — be ready for both.
- **Cost**: free.

## Architectural overview

```
ticker  ──▶  company_tickers.json   ──▶  CIK
                                        │
                          ┌─────────────┼─────────────┐
                          ▼             ▼             ▼
                /submissions/CIK*.json  /api/xbrl/companyfacts/CIK*.json  /api/xbrl/companyconcept/CIK*/us-gaap/{tag}.json
                (every filing)           (every XBRL fact)                  (one tag, one company)

                                     ┌──────────────────────┐
                                     ▼                      ▼
                       /api/xbrl/frames/us-gaap/...  efts.sec.gov/search-index
                       (one tag, all companies)      (text query → filings)

                                     ▼
                       cgi-bin/browse-edgar?output=atom
                       (recent-filings stream)
```

## Not exercised here (but exists)

| Surface | Notes |
|---|---|
| **Bulk ZIP archives** | `https://www.sec.gov/Archives/edgar/{submissions.zip,xbrl/companyfacts.zip}` — nightly snapshots, multi-GB. Use these if you need the entire corpus rather than paging. |
| **EDGAR Online (paid)** | An unrelated commercial product from a third party. Not the same as data.sec.gov. |
| **Form filings index files** | `https://www.sec.gov/Archives/edgar/full-index/{year}/QTR{1-4}/{form|company}.idx` — directory of every filing by quarter. Legacy text format. |
| **Insider-trading feeds (Form 4)** | Same submissions/Atom endpoints, just filter `forms=4`. |

## Recurring gotchas

- **User-Agent is non-negotiable.** A polite UA gets answered; anything else gets 403. The format the SEC asks for: `"YourOrg ProjectName user@email"`.
- **Padding the CIK is non-negotiable.** `data.sec.gov/submissions/CIK320193.json` → 404; you need `CIK0000320193.json`.
- **Tags drift.** Apple stopped using `us-gaap:Revenues` after 2018 and migrated to `RevenueFromContractWithCustomerExcludingAssessedTax`. If you hard-code a tag, you'll get truncated history.
- **Submissions "recent" is column-oriented.** `filings.recent.form[i]` aligns with `filings.recent.filingDate[i]`, `filings.recent.accessionNumber[i]`, etc. — don't iterate as objects; iterate by index across parallel arrays.
- **Submissions caps at 1,000 recent rows.** Older filings live in `filings.files[]` (paginated JSON shards under `data.sec.gov/submissions/CIK…submissions-{n}.json`).
- **XBRL company-facts can be megabytes.** Apple's response is ~5 MB. Always set a long timeout (90 s+) and consider streaming/caching.
- **Frames are *period-and-type-specific*.** `CY2023Q4I.json` is the instantaneous (balance-sheet) frame; for income statements use `CY2023Q4.json` (no trailing `I`). Mix them up → empty `data[]`.
- **Full-text search lives on a different host** (`efts.sec.gov`) and a different shape (Elasticsearch-style `hits.hits[]._source`).
- **Atom is XML, not JSON.** No JSON variant. If you need structured access, parse with an XML library.

## Token storage

No tokens. The only "config" is the User-Agent string, which lives in each test file.

## How to run

```bash
node tests/run-all.js sec-edgar
```
