# AllEvents.in — Index

**Status**: Source identified 2026-07-01, not yet built out as a full integration (no test suite / lib helper yet — see [`../ticketmaster/INDEX.md`](../ticketmaster/INDEX.md) and [`../eventbrite/INDEX.md`](../eventbrite/INDEX.md) for the target shape once this gets a proper build-out).

**Why**: Ticketmaster and Eventbrite have effectively no India event coverage. AllEvents.in is the first India-events source found that server-renders real, location-scoped `schema.org/Event` JSON-LD (no auth/key needed), rather than a JS-only shell or a generic city-wide carousel.

**URL pattern**: `https://allevents.in/<city>/<neighborhood>` e.g. `https://allevents.in/new-delhi/connaught%20place`

**What it returns**: event name, `startDate`/`endDate`, venue name + full street address + lat/lon, ticket price (`offers.lowPrice`/`priceCurrency`), event URL — all in a server-rendered `<script type="application/ld+json">` block, extractable via plain curl.

**Ruled out alternatives** (tested 2026-07-01, curl + inspecting `application/ld+json` for `schema.org/Event`, not substring-matching):

| Source | Result |
|---|---|
| Zomato ("Local, Connaught Place") | JS-only SPA shell, zero `Event` schema |
| District by Zomato (ex-Insider.in) | Zero `Event` schema server-side, client/geolocation-gated |
| BookMyShow | Individual event pages have real `Event` schema, but category/location listing pages all return the same generic Delhi-NCR carousel — not usable for discovery |
| Townscript | 5.6KB empty shell |
| 10times.com | Official API deprecated; direct site is Cloudflare-blocked (403 challenge) |

**Next step to make this a real integration**: build a `tests/allevents-in/` fetch + a proper doc split (like Ticketmaster's Events/Venues/Attractions), once this is prioritized.
