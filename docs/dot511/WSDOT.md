# WSDOT — Washington State DOT Traveler Information

- **Service**: Washington State's full traveler-info API — alerts, cameras, traffic flow stations, mountain passes, ferries, weather, toll rates, border crossings, commercial vehicle restrictions.
- **Homepage**: <https://wsdot.wa.gov/traffic/api/>
- **Base URL**: `https://wsdot.com/Traffic/api`
- **Auth**: `?AccessCode=<your-code>` query parameter. Free; instant signup.
- **Cost**: Free.
- **Rate limits**: Unpublished; comfortably above casual use.

## Tested on
2026-06-05 — `PASS` (4 endpoints) in ~13.6 s.

## Endpoints

WSDOT exposes its data through a per-resource pattern: `/{Resource}/{Resource}REST.svc/Get{Resource}AsJson`.

| Resource | Endpoint | Tested? | Live count |
|---|---|---|---:|
| Highway Alerts        | `/HighwayAlerts/HighwayAlertsREST.svc/GetAlertsAsJson` | ✓ | 189 |
| Highway Cameras       | `/HighwayCameras/HighwayCamerasREST.svc/GetCamerasAsJson` | ✓ | 1,681 |
| Traffic Flow          | `/TrafficFlow/TrafficFlowREST.svc/GetTrafficFlowsAsJson` | ✓ | 1,465 |
| Mountain Pass Conditions | `/MountainPassConditions/MountainPassConditionsREST.svc/GetMountainPassConditionsAsJson` | ✓ | 16 |
| Travel Times          | `/TravelTimes/TravelTimesREST.svc/GetTravelTimesAsJson` | ⨯ | — |
| Border Crossings      | `/BorderCrossings/BorderCrossingsREST.svc/GetBorderCrossingsAsJson` | ⨯ | — |
| Bridge Clearances     | `/Bridges/ClearanceREST.svc/GetClearancesAsJson` | ⨯ | — |
| Commercial Vehicle Restrictions | `/CVRestrictions/CVRestrictionsREST.svc/GetCommercialVehicleRestrictionsAsJson` | ⨯ | — |
| Toll Rates            | `/TollRates/TollRatesREST.svc/GetTollRatesAsJson` | ⨯ | — |
| Weather Information   | `/WeatherInformation/WeatherInformationREST.svc/GetCurrentWeatherInformationAsJson` | ⨯ | — |
| Weather Stations      | `/WeatherStations/WeatherStationsREST.svc/GetCurrentStationsAsJson` | ⨯ | — |
| ScanWeb (more weather) | `/api/Scanweb` (different base) | ⨯ | — |

Each "Get…AsJson" endpoint has companion `AsXml`, `AsRss`, and `AsKml` variants.

Ferries live on a separate host: `http://www.wsdot.wa.gov/ferries/api/{fares|schedule|terminals|vessels}/rest/...`. WZDx is on a third host: `https://wzdx.wsdot.wa.gov/api/v4/WorkZoneFeed` (also exercised in `wzdx-states.js`).

## Sample request (Node.js)

```js
const KEY = process.env.WSDOT_ACCESS_CODE;
const url = `https://wsdot.com/Traffic/api/HighwayAlerts/HighwayAlertsREST.svc/GetAlertsAsJson?AccessCode=${KEY}`;
const alerts = await fetch(url).then(r => r.json());
for (const a of alerts.slice(0, 3)) {
  console.log(a.AlertID, a.EventCategory, '—', a.HeadlineDescription);
}
```

## Sample response (truncated)

```json
[
  {
    "AlertID": 12345,
    "County": "King",
    "EndRoadwayLocation": { "Description": "Spokane St", "Direction": "EB", "MilePost": 162.5, "RoadName": "I-90" },
    "StartRoadwayLocation": { "Description": "Bellevue Way", "Direction": "EB", "MilePost": 10.2, "RoadName": "I-90" },
    "EventCategory": "Construction",
    "EventStatus": "Active",
    "EndTime": "/Date(1781040000000-0700)/",
    "StartTime": "/Date(1780041600000-0700)/",
    "HeadlineDescription": "Multiple weekend lane closures on I-90 EB",
    "Priority": "Medium",
    "Region": "Northwest"
  }
]
```

## Gotchas

- **Dates are .NET-style** `"/Date(epoch_ms±tz)/"`. Parse with a regex: `/\/Date\((\d+)/.exec(s)?.[1]` → `Number(...)` → `new Date(ms)`.
- **The host is `wsdot.com` for REST, `wsdot.wa.gov` for the docs/landing page.** Don't mix — the `.wa.gov` host returns 404 for the REST paths.
- **No top-level wrapper.** Responses are raw JSON arrays (no `{ "items": [...] }` envelope). Some endpoints return strings as content-type `text/html` (parsed as a string by strict JSON clients) — defensive re-parse if you see that.
- **`Get…AsJson` vs `GetCurrent…AsJson`**: weather endpoints use the longer name; alerts/cameras use the short one. Easy to confuse.
- **One AccessCode covers everything** including WZDx and ferries — you don't need separate keys per subservice.

## Test file

`tests/dot511/wsdot.js`
