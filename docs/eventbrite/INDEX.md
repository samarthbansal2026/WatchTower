# Eventbrite API — Index

**Base URL**: `https://www.eventbriteapi.com/v3`
**Auth**: `Authorization: Bearer {EVENTBRITE_PRIVATE_TOKEN}` on every request
**Rate limits**: 1,000 calls/hour · 48,000/day per token
**Latency**: Highly variable — 1 s to 30 s observed on the same token. Always use `timeoutMs: 30000`.

---

## Critical gotcha: no public event search

`GET /events/search/` was **permanently removed in December 2019**. There is no way to discover events by location, keyword, or category through the v3 API alone. All event retrieval flows through a known event ID, venue ID, or organizer/organization ID.

## Account type matters

| Capability | Attendee account | Organizer account |
|---|---|---|
| `/users/me/` | ✓ | ✓ |
| `/users/me/organizations/` | ✓ (empty) | ✓ |
| `/users/me/owned_events/` | ✗ 404 | ✓ |
| `/users/me/orders/` | ✓ | ✓ |
| `/events/{id}/` | ✓ | ✓ |
| `/venues/{id}/` | ✓ | ✓ |

A fresh API account is an **attendee account** by default. `owned_events` only works once the account has published at least one event.

---

## Sub-API catalog

| Sub-API | Test file | Doc | Auth | Latency | Status |
|---|---|---|---|---|---|
| User & Orgs | `tests/eventbrite/user.js` | [User.md](User.md) | Bearer | ~2 s | ✓ PASS |
| Taxonomy | `tests/eventbrite/taxonomy.js` | [Taxonomy.md](Taxonomy.md) | Bearer | ~1 s | ✓ PASS |
| Event Detail + Orders | `tests/eventbrite/events.js` | [Events.md](Events.md) | Bearer | ~4–30 s | ✓ PASS |
| Venues | `tests/eventbrite/venues.js` | [Venues.md](Venues.md) | Bearer | ~2 s | ✓ PASS |

### Other documented endpoints (not separately tested)

| Endpoint | Notes |
|---|---|
| `GET /organizations/{id}/events/` | Events for an org. Needs an org ID from `/users/me/organizations/`. |
| `GET /events/{id}/attendees/` | Attendee list. Requires organizer account + event ownership. |
| `GET /events/{id}/orders/` | Order list for an event. Requires organizer account + event ownership. |
| Webhooks | Eventbrite can POST event changes to your URL. Not testable without a public endpoint. |

---

## India / location-scoped discovery (worked around, 2026-07-01)

`GET /events/search/` was removed in Dec 2019 (see above), so there's no location-search call — but for India stores this can be worked around: scrape the **public discovery page** (`https://www.eventbrite.com/d/india--new-delhi/delhi/`, plain curl, no auth) for its server-rendered `schema.org/Event` JSON-LD to get real event IDs, then pull authoritative detail on each ID through the actual authenticated API (`GET /events/{id}/?expand=venue,ticket_availability`). Verified end-to-end for `delhi-croma-odeon-cp`: 18 events found on the discovery page citywide, 2 genuinely in Connaught Place within a 7-day window, both confirmed live via the real API with exact venue geo-coordinates (54 m from the store). Saved to `logs/croma-odeon-cp-eventbrite-2026-07-01-{raw,clean}.json`.

## How to get credentials

1. Log in at https://www.eventbrite.com
2. Account Settings → Developer Links → API Keys
3. Create a new app → copy the **Private Token**
4. Set `EVENTBRITE_PRIVATE_TOKEN=<token>` in `.env`

Public token and Client secret are not needed for these tests (private token covers all v3 calls).
