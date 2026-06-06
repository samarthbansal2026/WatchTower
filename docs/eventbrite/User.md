# Eventbrite User & Organizations — current user profile and org list

- **Service**: Eventbrite v3 REST API
- **Homepage**: https://www.eventbrite.com/platform/api
- **Base URL**: `https://www.eventbriteapi.com/v3`
- **Auth**: OAuth 2.0 Bearer token — `Authorization: Bearer {EVENTBRITE_PRIVATE_TOKEN}`
- **Cost**: Free for personal/developer use
- **Rate limits**: 1,000 calls/hour, 48,000/day per token

## Tested on
2026-06-05 — `PASS` in ~1.7 s.

## Endpoints

### `GET /users/me/`
Returns the authenticated user's profile.

### `GET /users/me/organizations/`
Returns a paginated list of organizations the user owns or is a member of. Returns an empty `organizations` array (not 404) for pure attendee accounts with no org.

## Sample request (Node.js)

```js
const TOKEN = process.env.EVENTBRITE_PRIVATE_TOKEN;
const BASE  = 'https://www.eventbriteapi.com/v3';

const me   = await fetch(`${BASE}/users/me/`, { headers: { Authorization: `Bearer ${TOKEN}` } }).then(r => r.json());
const orgs = await fetch(`${BASE}/users/me/organizations/`, { headers: { Authorization: `Bearer ${TOKEN}` } }).then(r => r.json());

console.log(me.id, me.name);
console.log(orgs.organizations.length, 'org(s)');
```

## Sample response (truncated)

```json
{
  "id": "3004384139494",
  "name": "SAMARTH BANSAL",
  "first_name": "SAMARTH",
  "last_name": "BANSAL",
  "emails": [{ "email": "user@example.com", "verified": true, "primary": true }],
  "is_public": false
}
```

Organizations:
```json
{
  "organizations": [],
  "pagination": { "object_count": 0, "page_count": 0, "has_more_items": false }
}
```

## Gotchas

- `GET /users/me/owned_events/` is **not** listed here because it returns 404 (`"user_id does not exist"`) for any account that has never created an event. Despite the `me` alias working everywhere else, this endpoint uses a separate "organizer" identity that doesn't exist until you create your first event. See `Events.md` for how to work around this.
- Many other `GET /users/me/{resource}/` paths (saved_events, liked_events, followed_organizers, attending_events) return 404 "path does not exist" — they are absent from the v3 API entirely.
- `is_public: false` is the default; the profile won't appear in Eventbrite's public directory.

## Test file
`tests/eventbrite/user.js`
