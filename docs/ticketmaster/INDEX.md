# Ticketmaster — API Catalog

Ticketmaster offers ~10 distinct APIs under <https://developer.ticketmaster.com>. Only the **Discovery API v2** is openly accessible with a free signup key — everything else requires a signed distribution / partner agreement.

## Working APIs (Discovery v2)

All tested 2026-06-05. All endpoints share the same auth, host, rate limits.

| # | Group | Endpoints | Test file | Docs |
|---|---|---|---|---|
| 1 | Events           | `/events`, `/events/{id}`, `/events/{id}/images` | `tests/ticketmaster/events.js` | [Events.md](Events.md) |
| 2 | Attractions      | `/attractions`, `/attractions/{id}` | `tests/ticketmaster/attractions.js` | [Attractions.md](Attractions.md) |
| 3 | Venues           | `/venues`, `/venues/{id}` | `tests/ticketmaster/venues.js` | [Venues.md](Venues.md) |
| 4 | Classifications  | `/classifications`, `/classifications/{id}`, `/classifications/segments/{id}`, `/classifications/genres/{id}`, `/classifications/subgenres/{id}` | `tests/ticketmaster/classifications.js` | [Classifications.md](Classifications.md) |
| 5 | Suggest (autocomplete) | `/suggest` | `tests/ticketmaster/suggest.js` | [Suggest.md](Suggest.md) |

Total: **13 distinct REST endpoints**, **5 test files**, **5/5 PASS**.

## Shared properties (all Discovery v2)

- **Host**: `https://app.ticketmaster.com/discovery/v2`
- **Auth**: `apikey=<your-consumer-key>` query parameter on every request
- **Format**: append `.json` to the resource path (`.xml` also supported)
- **Rate limits**: **5,000 calls/day, 5 req/sec** per key. Limits are per-app, not per-IP.
- **Deep paging cap**: `size * page < 1000`. For deeper traversal use date/keyword filters to narrow the set.
- **Response shape**: HAL-like — collection responses wrap results in `_embedded.<type>[]`, paging info in `page`, links in `_links`.

## Not open / not tested (and why)

A self-signup developer account on `developer.ticketmaster.com` gives you a Consumer Key + Consumer Secret. The Key alone unlocks Discovery. The Secret is the OAuth client secret for everything below — **but having the secret is not enough**; each of these APIs is *separately* gated by a business-side approval (merchant agreement, distribution partnership, broker account, etc.) before the OAuth flow will actually mint a usable token.

| API | Auth flow | Why we can't test it |
|---|---|---|
| **Commerce API** (cart, checkout, ticket reservation) | OAuth2 `client_credentials` | Needs a Ticketmaster merchant agreement + PCI-compliant integration; payment lives behind a separate onboarding. |
| **Partner API** (full distribution: search, hold, reserve, purchase) | OAuth2 `client_credentials` | Closed program — restricted to companies with a signed distribution relationship with TM. |
| **Publish API** (sell *on* Ticketmaster as primary) | OAuth2 `client_credentials` | Requires venue / promoter account approval. |
| **TradeDesk Inventory API** (broker inventory management) | OAuth2 `client_credentials` via `app.ticketmaster.com/tradedeskapi/login` | Requires **TM1 / TDPOS** broker credentials, not regular dev portal credentials. |
| **Distributed Commerce / Inventory Status (DCISS)** | OAuth2 `client_credentials` | Partner-restricted real-time inventory feed. |
| **Availability API** (real-time seat availability) | OAuth2 `client_credentials` | Partner-restricted; comes bundled with Commerce/Partner agreements. |
| **Top Picks API** (personalized recommendations) | OAuth2 `client_credentials` | Partner-restricted. |
| **Season Ticketing API** | OAuth2 `client_credentials` | Closed beta — STH management for venues. |
| **Presence API** (transfer / forward tickets in a user's account) | OAuth2 `authorization_code` (per-user) | Closed beta; the only TM API where the *user* signs in, but app approval is still required upstream. |
| **Open Ticketing Service** | OAuth2 `client_credentials` | Separate onboarding for small organizers. |
| **Discovery Feed 2.0** (bulk feed mirror of Discovery) | `apikey` + entitlement | Requires application + approval beyond the standard Discovery key. |
| **International Discovery API** | n/a | **Deprecated.** TM no longer accepts new keys — use Discovery instead. |

### What would change with partner credentials?

Even with a partner OAuth approval, the Discovery API itself doesn't gain new capabilities — it's the same public-catalog data. What approval unlocks is **user-scoped and transactional surface**: holding a ticket, completing a purchase, reading or transferring tickets in a fan's account, real-time seat maps. None of that is reachable from a regular dev account no matter what we send.

### Why there's no "Sign in with Ticketmaster" here

There is no public, self-serve `authorization_code` OAuth flow on TM equivalent to "Log in with Google / Spotify / GitHub". The user-OAuth surface (Presence) exists but is gated upstream by partnership approval. So this folder will stay Discovery-only until a real partner agreement exists.

## Token storage

In `.env` (gitignored):

```bash
TICKETMASTER_CONSUMER_KEY=...      # used as ?apikey= on Discovery
TICKETMASTER_CONSUMER_SECRET=...   # unused by Discovery; would pair with the Key in an OAuth2
                                   # client_credentials flow if/when a partner API is approved
```

For future partner integrations the flow would be:

```text
POST https://app.ticketmaster.com/<api>/login   (or the per-API token endpoint)
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials
&client_id=<CONSUMER_KEY>
&client_secret=<CONSUMER_SECRET>
```

We do **not** have a shared OAuth helper in `lib/` yet — first Tier-3 / partner integration to land will add `lib/oauth.js`.

## How to run

```bash
node --env-file=.env tests/run-all.js ticketmaster
```
