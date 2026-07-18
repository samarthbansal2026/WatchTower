# India Local Events — Source Survey

Ticketmaster and Eventbrite (see [`../ticketmaster/INDEX.md`](../ticketmaster/INDEX.md), [`../eventbrite/INDEX.md`](../eventbrite/INDEX.md)) have effectively no India event coverage, so for India stores (e.g. `delhi-croma-odeon-cp`) the Local Events subtab needs a different source. Survey done 2026-07-01 for the Connaught Place, New Delhi catchment. All tested by curl + inspecting server-rendered `application/ld+json` (`schema.org/Event`) blocks — not by naive HTML substring-matching, per the earlier false-positive lesson with Reliance Digital/Vijay Sales.

## Result: use AllEvents.in

| Source | URL pattern | Result |
|---|---|---|
| **AllEvents.in** ✅ | `https://allevents.in/new-delhi/connaught%20place` | **Works.** Server-renders real `schema.org/Event` JSON-LD — event name, exact `startDate`/`endDate`, venue name + full street address + lat/lon, ticket price (`offers.lowPrice`/`priceCurrency`), event URL. No auth, no key. |
| Zomato ("Local, Connaught Place, New Delhi") | `https://www.zomato.com/ncr/local-connaught-place-new-delhi/events` | Dead end — JS-only SPA shell. Zero `Event` schema; only breadcrumb/nav JSON present. |
| District by Zomato (formerly Insider.in) | `https://www.district.in/` | Dead end — homepage returns zero `Event` schema; listings are client-side/geolocation-gated, nothing server-rendered. |
| BookMyShow | `https://in.bookmyshow.com/explore/events-delhi-ncr`, `/explore/plays-events-delhi-ncr`, `/explore/comedy-shows-delhi-ncr` | Partial. Individual **event detail pages** (e.g. `/events/<slug>/<ET-id>`) do serve real `Event` schema. But every category/location **listing** page returns the identical generic Delhi-NCR carousel — filtering/location-scoping happens client-side, invisible to curl. Not usable as a discovery feed. |
| Townscript | `https://www.townscript.com/np/delhi` | Dead end — 5.6KB shell response, zero `Event` schema. |

## Notes on AllEvents.in

- No API key / auth needed for the public page; it's a straight GET.
- `?date=this-week` query param exists but did not change the result set on the 2026-07-01 pull — the CP-tagged event set appears to already be the full near-term set for this micro-location, not date-filtered separately.
- Confirmed genuinely local: all three events found on 2026-07-01 have lat/lon `28.613939, 77.209023` (Connaught Place) and full CP street addresses — unlike BookMyShow's one fully-verified event (Fred again.., Dec 2026) which was in Gurgaon, ~30km away and out of catchment.
- Store pulls saved to `logs/croma-odeon-cp-events-<date>-raw.json` (full scrape payload) and `-clean.json` (extracted event list), following the existing raw/clean convention used elsewhere in `logs/`.
