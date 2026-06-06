# NOAA NWS — National Weather Service API

- **Service**: National Weather Service (NWS) public API
- **Homepage**: <https://www.weather.gov/documentation/services-web-api>
- **Base URL**: `https://api.weather.gov`
- **Auth**: **None.** A descriptive `User-Agent` header IS required (NWS asks for an app identifier + contact, e.g. `myapp (you@example.com)`). Requests without a UA may be rejected.
- **Coverage**: United States only (incl. territories). Outside the US the `/points/` endpoint returns 404.
- **Cost**: Free.
- **Rate limits**: No published hard quota; NWS asks consumers to be reasonable, cache responses, and back off on `429`. Responses include `Cache-Control` hints.

## Tested on
2026-06-05 — `PASS` in ~440 ms.

## Flow (2-step lookup)

The NWS API doesn't take lat/lon directly on the forecast endpoint. You first hit `/points/{lat},{lon}` to discover the *forecast URL* for the grid cell that covers that point, then fetch the forecast.

```text
GET /points/{lat},{lon}              → properties.forecast (URL)
GET <that forecast URL>              → properties.periods[] (the actual forecast)
```

## Endpoints tested

| Endpoint | Purpose | Tested in |
|---|---|---|
| `GET /points/38.8894,-77.0352` | Resolve grid cell + forecast URL for Washington, DC | `tests/noaa/nws.js` |
| `GET /gridpoints/LWX/{x,y}/forecast` | 7-day forecast (14 periods, day + night) | `tests/noaa/nws.js` |
| `GET /alerts/active/count` | Nationwide count of currently active alerts | `tests/noaa/nws-alerts.js` |
| `GET /alerts/active?point={lat,lon}` | Active alerts for a point (GeoJSON FeatureCollection) | `tests/noaa/nws-alerts.js` |
| `GET /stations/{stationId}/observations/latest` | Latest METAR-derived observation | `tests/noaa/nws-alerts.js` |

Other useful endpoints not exercised but documented by NWS:

- `GET /gridpoints/{office}/{x,y}/forecast/hourly` — hourly forecast
- `GET /alerts/active/zone/{zoneId}` and `/area/{state}` — alternate filtering
- `GET /stations` — station catalog (filter by `state`)
- `GET /products/types` and `/products/{id}` — raw NWS text products

### Sub-endpoint notes

- `?limit=N` is **not** accepted on `/alerts/active`. Use filters like `point=`, `area=`, `zone=`, `status=`, `severity=`, `urgency=`, `event=`.
- `/stations/{id}/observations/latest` returns the same GeoJSON Feature shape as `/observations/{ts}` — properties include `temperature.value` (°C), `windSpeed.value` (km/h), `textDescription`, etc. Values are `null` if the station didn't report that element.

## Sample request (Node.js)

```js
const UA = 'my-app (me@example.com)';

const points = await fetch(
  'https://api.weather.gov/points/38.8894,-77.0352',
  { headers: { 'User-Agent': UA, Accept: 'application/geo+json' } }
).then(r => r.json());

const forecast = await fetch(points.properties.forecast, {
  headers: { 'User-Agent': UA, Accept: 'application/geo+json' },
}).then(r => r.json());

console.log(forecast.properties.periods[0]);
// { name: 'Tonight', temperature: 64, temperatureUnit: 'F',
//   shortForecast: 'Mostly Clear', windSpeed: '5 mph', ... }
```

## Sample response (truncated)

```json
{
  "properties": {
    "updated": "2026-06-05T...Z",
    "periods": [
      {
        "number": 1,
        "name": "Tonight",
        "startTime": "2026-06-05T20:00:00-04:00",
        "endTime": "2026-06-06T06:00:00-04:00",
        "isDaytime": false,
        "temperature": 64,
        "temperatureUnit": "F",
        "windSpeed": "5 mph",
        "windDirection": "SW",
        "shortForecast": "Mostly Clear",
        "detailedForecast": "Mostly clear, with a low around 64..."
      }
      // ... 13 more periods
    ]
  }
}
```

## Gotchas

- **Content-Type is `application/geo+json`**, not `application/json`. Generic `if (ct === 'application/json')` checks will skip the JSON parser — match on `\bjson\b` instead.
- **User-Agent is mandatory.** A missing or default UA (`curl/...`, `node`) can be 403'd.
- **US-only.** Passing non-US coordinates to `/points/` returns 404, not an empty result.
- **Two requests per forecast.** Cache the points response — the grid mapping for a given lat/lon doesn't change.
- The forecast URL embedded in `properties.forecast` is fully qualified; don't try to re-build it from `gridId`, `gridX`, `gridY` yourself.

## Test files

- `tests/noaa/nws.js` — forecast flow (points + gridpoints/forecast)
- `tests/noaa/nws-alerts.js` — alerts count, alerts at point, latest observation at KDCA
