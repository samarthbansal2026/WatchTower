# 25Live Academic Calendars — CollegeNET public event feeds for 500+ US universities

- **Service**: CollegeNET 25Live Publisher — campus scheduling software that lets institutions publish public calendar feeds
- **Homepage**: https://25livepub.collegenet.com/
- **Base URL**: `https://25livepub.collegenet.com/calendars`
- **Auth**: none
- **Cost**: free (public publisher feeds; institution pays CollegeNET for the scheduling software)
- **Rate limits**: not documented; no throttling observed across 4 parallel requests

## Tested on
2026-06-05 — `PASS` in ~4 s (4 feeds, parallel).

## Coverage
500+ US colleges and universities across all states. Institutions vary — flagship universities, liberal arts colleges, community colleges, professional schools. Each institution's feed depth varies: some publish only registrar-level dates (classes begin/end, finals, commencement); others include residence hall open dates, add/drop deadlines, and all institutional closures.

**Confirmed feeds used in test:**

| Institution | State | Type | Webname |
|---|---|---|---|
| Fort Hays State University | KS | Public regional | `fhsu-academic-calendar` |
| University of Alaska Fairbanks | AK | Public research | `uaf-academic-calendar` |
| College of Lake County | IL | Community college | `clc-academic-calendar` |
| Taylor University | IN | Private liberal arts | `taylor-academic-calendar` |

Browse all feeds: https://25livepub.collegenet.com/calendars

## Endpoints tested

### `GET /calendars/{webname}.json`
Returns all events for the given calendar. Filter by date range with query params.

**Query params:**

| Param | Format | Notes |
|---|---|---|
| `startdate` | `YYYYMMDD` | Inclusive lower bound |
| `enddate` | `YYYYMMDD` | Inclusive upper bound |
| `months` | integer | Alternative to enddate |
| `search` | string | Keyword filter |

## Sample request (Node.js)
```js
// Get AY 2025-26 + AY 2026-27 for UAF
const url = 'https://25livepub.collegenet.com/calendars/uaf-academic-calendar.json'
          + '?startdate=20250801&enddate=20270801';
const res = await fetch(url);
const events = await res.json(); // array
```

## Sample response (truncated)
```json
[
  {
    "eventID": 1231049621,
    "template": "Academic Calendar",
    "title": "Residence halls open to first-year students only, 8 a.m.",
    "description": "",
    "location": "Residence halls",
    "startDateTime": "2025-08-21T08:00:00",
    "endDateTime": "2025-08-21T17:00:00",
    "dateTimeFormatted": "Thursday, August 21, 2025, 8 – 5pm AKDT",
    "allDay": false,
    "canceled": false,
    "customFields": [...]
  },
  {
    "eventID": 1231049624,
    "title": "First day of instruction; add/drop period begins",
    "startDateTime": "2025-08-25T00:00:00",
    "canceled": false
  }
]
```

## Event types / demand signals

| Signal | Example titles | Notes |
|---|---|---|
| **Move-in** | "Residence halls open to first-year students only", "Residence halls open to all students" | Only present for residential campuses |
| **Graduation** | "University Commencement Exercises", "Spring Commencement", "Graduate Hooding Ceremony", "Fall Commencement" | All institutions have at least one |
| **Finals** | "Final Examinations", "Final Exams", "Final Exam Week" | Consistent across all tested feeds |
| **Breaks** | "Winter Break - University Closed", "Spring break (no classes)", "Thanksgiving Recess", "Thanksgiving Holiday (No Classes)" | Title wording varies widely |
| **Classes start** | "Classes Begin", "First day of instruction; add/drop period begins" | |

## Gotchas

- **Webname is institution-specific** and not derivable from the institution name. You must discover it from the catalog at https://25livepub.collegenet.com/calendars or by finding the institution's embedded calendar widget.
- **Not all 500+ feeds are academic calendars.** The catalog mixes general events, sports, arts, and specialized sub-calendars. Filter by "academic" in the name when browsing.
- **Response is a bare array**, not a wrapper object with `data:`. `JSON.parse` gives you the array directly.
- **`canceled: true` events are included** in the response. Always filter them out.
- **Move-in events only appear for residential campuses.** Community colleges and fully-commuter institutions won't have them. UAF has them; CLC and Taylor do not.
- **Event title wording is not standardized** across institutions — "Finals" vs "Final Examinations" vs "Final Exam Week". Use regex matching, not exact string comparison.
- **`graduation` signal sometimes fires on deadline events** ("Deadline to apply for fall 2025 graduation") rather than the ceremony itself. Check `startDateTime` context if you need the ceremony date specifically.
- **Date range is inclusive on both ends.** Querying `startdate=20250801&enddate=20270801` returns events whose `startDateTime` falls within that window.
- **Feeds update in real time** as institutions add/modify events in 25Live. Expect results to change as the new AY approaches.
- **No CORS issues.** Fetches work from Node.js without any special headers.

## Test file
`tests/uni-calendars/25live.js`
