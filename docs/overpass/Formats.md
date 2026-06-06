# Overpass API — Output Formats

- **Service**: Same interpreter query returned as JSON, XML, or CSV
- **Homepage**: https://wiki.openstreetmap.org/wiki/Overpass_API/Overpass_QL#Output_format
- **Base URL**: `https://overpass-api.de/api/interpreter`
- **Auth**: None
- **Cost**: Free

## Tested on
2026-06-06 — `PASS` in ~9000ms (3 sequential calls with 2 s gaps). All three formats returned 5 café nodes for a Chicago downtown bbox.

## Formats

### JSON — `[out:json]`
Default for programmatic use. Standard `{"version":0.6,"elements":[...]}` envelope.

### XML — `[out:xml]` (default when no `[out:]` directive)
OSM XML format. Content-Type: `application/osm3s+xml`. Starts with `<?xml version="1.0"...><osm ...>`.

### CSV — `[out:csv(...)]`
Custom column selection. Syntax:

```
[out:csv(name,amenity,::lat,::lon;true;",")]
```

- First arg: comma-separated field list. `::lat`, `::lon`, `::id`, `::type` are meta-columns.
- Second arg: `true` = include header row.
- Third arg: field separator (default `;`, shown here as `,`).

## Sample request (Node.js — CSV)

```js
const q = `[out:csv(name,amenity,::lat,::lon;true;",")][timeout:20];
node["amenity"="cafe"](41.878,-87.635,41.882,-87.630);
out 5;`;

const r = await fetch('https://overpass-api.de/api/interpreter', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'User-Agent': 'myapp/1.0 (contact@example.com)',
  },
  body: `data=${encodeURIComponent(q)}`,
});
const csv = await r.text();
```

## Sample CSV response

```
name,amenity,@lat,@lon
Intelligentsia Coffee,cafe,41.8791,-87.6338
Dollop Coffee,cafe,41.8785,-87.6331
```

## Gotchas
- **CSV meta-column names use `@` prefix in output, `::` prefix in query.** You write `::lat` in the query but the header row says `@lat`. Don't check for `::lat` in the response.
- **Space requests by ≥2 s.** Running JSON → XML → CSV back-to-back hits the 2-slot rate limit. The formats test uses explicit `setTimeout(2000)` between calls.
- **XML content-type is not `application/xml`.** It's `application/osm3s+xml`. The `timedFetch` helper won't auto-parse it as JSON — you get a string, which is correct.

## Test file
`tests/overpass/formats.js`
