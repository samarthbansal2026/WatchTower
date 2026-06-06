// Queries transit stops within 500m of a store using Overpass `around` filter.
// Sample: Dollar Tree at 41.9675, -87.7267 Chicago IL
import { timedFetch, pass, fail } from '../../lib/test-runner.js';

export const name = 'Overpass Transit Proximity';
export const tier = 'tier1';

const INTERPRETER = 'https://overpass-api.de/api/interpreter';
const UA = 'watchtower/1.0 (work.samarthbansal@gmail.com)';

async function post(query, timeoutMs = 30000, retries = 2) {
  const opts = {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': UA },
    body: `data=${encodeURIComponent(query)}`,
    timeoutMs,
  };
  for (let i = 0; i <= retries; i++) {
    const r = await timedFetch(INTERPRETER, opts);
    if (r.status !== 429 && r.status !== 504) return r;
    if (i < retries) await new Promise(res => setTimeout(res, 6000));
  }
  return timedFetch(INTERPRETER, opts);
}

const LAT = 41.9675;
const LON = -87.7267;
const RADIUS = 500; // meters

// Bus stops, subway/metro stations, train stops within walking distance
const QUERY = `
[out:json][timeout:25];
(
  node["highway"="bus_stop"](around:${RADIUS},${LAT},${LON});
  node["public_transport"="stop_position"](around:${RADIUS},${LAT},${LON});
  node["railway"="station"](around:${RADIUS},${LAT},${LON});
  node["railway"="subway_entrance"](around:${RADIUS},${LAT},${LON});
  node["amenity"="bus_station"](around:${RADIUS},${LAT},${LON});
);
out body;
`.trim();

export async function run() {
  const t0 = Date.now();
  try {
    const r = await post(QUERY);
    if (!r.ok) return fail(name, r.ms, `HTTP ${r.status}`, r.status);

    const body = r.body;
    if (!body || !Array.isArray(body.elements)) {
      return fail(name, r.ms, 'missing elements array');
    }

    const busStops = body.elements.filter(e => e.tags?.highway === 'bus_stop');
    const trainStations = body.elements.filter(
      e => e.tags?.railway === 'station' || e.tags?.railway === 'subway_entrance'
    );

    return pass(name, r.ms, {
      total: body.elements.length,
      busStops: busStops.length,
      trainStations: trainStations.length,
      sample: body.elements.slice(0, 5).map(e => ({
        name: e.tags?.name,
        type: e.tags?.highway || e.tags?.railway || e.tags?.public_transport,
        lat: e.lat,
        lon: e.lon,
      })),
    });
  } catch (e) {
    return fail(name, Date.now() - t0, e);
  }
}
