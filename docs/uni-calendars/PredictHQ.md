# PredictHQ Academic Events — Aggregated graduation, exams, and session dates for US universities

- **Service**: PredictHQ demand intelligence platform
- **Homepage**: https://www.predicthq.com/events/academic-events
- **API Docs**: https://docs.predicthq.com/api/events/search-events
- **Base URL**: `https://api.predicthq.com/v1/events/`
- **Auth**: Bearer token — `Authorization: Bearer <token>`
- **Cost**: Free tier available (signup at predicthq.com); paid plans for higher volume and additional fields
- **Rate limits**: Not documented publicly; no throttling observed in testing

## Tested on
2026-06-05 — `PASS` in ~11 s (3 label queries, parallel).

## Coverage
1,000+ graduation ceremonies, 895+ exam sessions, 2,800+ academic session events across US institutions for AY 2025-26 and AY 2026-27. Events are sourced and verified by PredictHQ from official university calendars. Each event includes predicted attendance (`phq_attendance`), geolocation, venue, and PHQ label classification.

## Endpoints tested

### `GET /v1/events/`
Search events across all categories. Filter to academic events with demand-signal labels.

**Key query parameters:**

| Param | Value / Format | Notes |
|---|---|---|
| `category` | `academic` | Required to scope to university events |
| `country` | `US` | ISO 3166-1 alpha-2 |
| `start.gte` | `YYYY-MM-DD` | Inclusive lower bound on `start` date |
| `start.lte` | `YYYY-MM-DD` | Inclusive upper bound |
| `phq_label` | `graduation`, `exam`, `academic-session`, `holiday` | Filter by event sub-type (see label table below) |
| `sort` | `start` | Chronological order |
| `limit` | integer (max 500) | Default 10 |
| `offset` | integer | Pagination |

**Academic labels observed in US data (AY 2025-27):**

| Label | Count (AY 2025-27) | Example title |
|---|---|---|
| `graduation` | 1,036 | "Louisiana Tech University - Winter Graduation" |
| `exam` | 895 | "Winter Exams" |
| `academic-session` | 2,836 | "Spring Session", "Winter Session" |
| `holiday` | (in academic category) | Institutional closure days |

## Sample request (Node.js)
```js
// Get upcoming US graduation events, sorted by date
const params = new URLSearchParams({
  category:    'academic',
  country:     'US',
  'start.gte': '2025-08-01',
  'start.lte': '2027-08-01',
  phq_label:   'graduation',
  sort:        'start',
  limit:       '50',
});
const res = await fetch(
  `https://api.predicthq.com/v1/events/?${params}`,
  { headers: { Authorization: `Bearer ${process.env.PREDICTHQ_TOKEN}` } }
);
const { count, overflow, results } = await res.json();
```

## Sample response (truncated)
```json
{
  "count": 1036,
  "overflow": false,
  "next": "https://api.predicthq.com/v1/events/?...&offset=3",
  "results": [
    {
      "id": "Gg4oUxpoVAfdvAKhoT",
      "title": "Arkansas Tech University - Summer Graduation",
      "category": "academic",
      "rank": 61,
      "local_rank": 61,
      "phq_attendance": 3500,
      "start": "2026-08-01T15:00:00Z",
      "start_local": "2026-08-01T10:00:00",
      "end": "2026-08-01T15:00:00Z",
      "timezone": "America/Chicago",
      "location": [-93.13243, 35.29526],
      "geo": {
        "geometry": { "coordinates": [-93.13243, 35.29526], "type": "Point" },
        "address": {
          "country_code": "US",
          "formatted_address": "1604 N Coliseum Dr, Russellville, AR 72801, USA",
          "postcode": "72801",
          "locality": "Russellville",
          "region": "Arkansas"
        }
      },
      "country": "US",
      "state": "active",
      "phq_labels": [{ "label": "graduation", "weight": 1 }],
      "entities": [
        {
          "entity_id": "aRGsjptemYVdnpPFiNH7pv",
          "name": "Tucker Coliseum",
          "type": "venue",
          "formatted_address": "1604 N Coliseum Dr, Russellville, AR 72801, USA"
        }
      ]
    }
  ]
}
```

## Gotchas

- **`label=` does not work — use `phq_label=`.** A `label` query param returns HTTP 400. The correct param is `phq_label`.
- **`overflow: true` means your result set is capped.** PredictHQ caps count at 5000 on broad queries (e.g. all academic events without a label filter). Adding `phq_label` brings counts well under 5000 so overflow is false.
- **`phq_labels` is the response field; `phq_label` is the query param.** Different spelling — don't confuse them.
- **`start_local` is the venue-timezone local time; `start` is UTC.** For demand-shift analysis near campuses use `start_local`.
- **`sort=start` is not the default.** Without it, results come back in relevance order, which is not useful for time-series work.
- **Labels are LLM-generated and updated regularly.** The set (`graduation`, `exam`, `academic-session`, `holiday`) was current as of 2026-06-05 but may expand. Use the Get Event Counts API for the authoritative live label list.
- **No "move-in" label exists.** Move-in/residence hall open events are not a distinct PredictHQ academic label. Use 25Live feeds for that signal.
- **"homecoming" title search returns 0 results.** Homecoming events appear to be classified under a different label or rolled into `academic-session` — they are not currently queryable by keyword via the events endpoint.
- **`phq_attendance` is a model estimate**, not a reported headcount. Useful for relative demand comparison; treat as an order-of-magnitude signal.
- **Free tier limits are not published.** The free plan worked for all test queries but PredictHQ's terms reserve the right to restrict access. High-volume (all US academic events, paginated) may require a paid plan.

## Test file
`tests/uni-calendars/predicthq.js`
