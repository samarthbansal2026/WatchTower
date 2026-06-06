# NOAA NWPS — National Water Prediction Service

- **Service**: NWS Office of Water Prediction — river/stream gauges, observed stage & flow, forecast hydrographs, flood categories, crest history.
- **Homepage**: <https://water.noaa.gov/about/api>
- **Swagger UI**: <https://api.water.noaa.gov/nwps/v1/docs/>
- **Base URL**: `https://api.water.noaa.gov/nwps/v1`
- **Auth**: **None.** Public.
- **Cost**: Free.
- **Rate limits**: Unpublished.

## Tested on
2026-06-05 — `PASS` in ~1.6 s.

## Endpoints

| Path | Returns |
|---|---|
| `GET /gauges` | List all gauges (large; supports `bbox`, `state` query filters) |
| `GET /gauges/{lid}` | Single gauge: metadata + latest observed + next forecast + flood thresholds + historic crests |
| `GET /gauges/{lid}/stageflow` | Time series of observed + forecast stage and flow |
| `GET /gauges/{lid}/stageflow/observed` | Observed time series only |
| `GET /gauges/{lid}/stageflow/forecast` | Forecast time series only |
| `GET /reaches/{reachId}` | NWM (National Water Model) reach data — keyed by reachId, not LID |
| `GET /reaches/{reachId}/streamflow` | NWM streamflow time series (medium/short/long range) |
| `GET /products/{productId}` | NWS text products (RVF/AHD/etc.) |

`lid` is the 5-char NWS location identifier (e.g. `MROI2` = Meredosia, IL). The `usgsId` field on a gauge cross-references it to USGS NWIS.

## Endpoint tested

```text
GET /nwps/v1/gauges/MROI2
```

Returns ~1 KB JSON with name, lat/lon, RFC/WFO, observed status, forecast status, flood categories, and historic crests.

## Sample request (Node.js)

```js
const res = await fetch('https://api.water.noaa.gov/nwps/v1/gauges/MROI2');
const g = await res.json();
console.log(`${g.name}: ${g.status.observed.primary} ${g.status.observed.primaryUnit}`);
// "Illinois River at Meredosia: 3.39 ft"
```

## Sample response (truncated)

```json
{
  "lid": "MROI2",
  "usgsId": "05585500",
  "reachId": "3598258",
  "name": "Illinois River at Meredosia",
  "rfc": { "abbreviation": "NCRFC", "name": "North Central River Forecast Center" },
  "state": { "abbreviation": "IL", "name": "Illinois" },
  "latitude": 39.83119,
  "longitude": -90.55985,
  "status": {
    "observed": {
      "primary": 3.39, "primaryUnit": "ft",
      "secondary": 12.2, "secondaryUnit": "kcfs",
      "floodCategory": "no_flooding",
      "validTime": "2026-06-04T21:30:00Z"
    },
    "forecast": { ... }
  },
  "flood": {
    "categories": {
      "major":    { "stage": 24, "flow": -9999 },
      "moderate": { "stage": 22, "flow": -9999 },
      "minor":    { "stage": 17, "flow": -9999 },
      "action":   { "stage": 14, "flow": -9999 }
    },
    "crests": { "historic": [ { "occurredTime": "2015-07-02T08:30:00Z", "stage": 28.86, ... } ] }
  }
}
```

## Gotchas

- **Two ID systems.** Most metadata is keyed on `lid` (NWS). NWM streamflow is keyed on `reachId`. USGS gauges expose a `usgsId` to cross-link.
- **`-9999` means "no value".** Used in flow thresholds when the category is gaged on stage only.
- **Floods are categorical.** `floodCategory` is one of: `no_flooding`, `action`, `minor`, `moderate`, `major`.
- **CloudFront sits in front.** Occasional `503 Service Unavailable` on the root `/nwps/v1/` path; the gauge endpoints still answer. Retry with backoff.
- The Swagger UI page returns an empty shell to scrapers — explore it in a real browser.
- US-only.

## Test file

`tests/noaa/nwps.js`
