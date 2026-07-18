/**
 * resolve-eventbrite-venues.js
 *
 * Takes hard-coded event ID lists scraped from Eventbrite's web search
 * (WebFetch was used since event IDs are JS-rendered, not in raw HTML),
 * resolves each to its venue via GET /events/{id}/?expand=venue,
 * filters to within RADIUS_MILES of each store, and prints paste-ready output.
 */

import { timedFetch } from '../lib/test-runner.js';
import stores from '../stores/portfolio.js';

const TOKEN        = process.env.EVENTBRITE_PRIVATE_TOKEN;
const BASE         = 'https://www.eventbriteapi.com/v3';
const RADIUS_MILES = 20;

if (!TOKEN) { console.error('EVENTBRITE_PRIVATE_TOKEN not set'); process.exit(1); }

// Event IDs scraped via WebFetch for each store (keyed by store.id)
const SCRAPED = {
  'nyc-herald-square': [
    '1987019434618','1115002686049','1990602196756','1987692698368','1990560533139',
    '1983188270503','1989917921069','1988215270395','807554155217','58030740507',
    '56339550111','515714214097','531490210527','1021859959647','745466338887',
    '387235069517','1988019005361','1988899516995','1991005661530','1989683053574',
    '1987845403112','1986488413319','1990654731890','1414932203309','1985805175737',
    '1535652510999','1988480929990','497852368837','767105612537','574624416097',
    '1046678763357',
  ],
  'burlington-nc-church-st': [
    '1987011174913','1990583297227','1989837654991','1988563367563','1976761031458',
    '1990785345559','1990390009097','1985087010686','1414932203309','1985805175737',
    '1535652510999','1988480929990','497852368837','767105612537','574624416097',
    '1046678763357','1976777404430','1986220518037','1982825851498','1987542387785',
    '1990485685267','1986215000534','1985599733253','1989406145334','1979179295551',
  ],
  'orlando-fl-intl-drive': [
    '1986326111871','1990385403321','1989964055057','1983620337828','1990420548441',
    '1987699116565','1987855708937','1989422089022','1990294215576','1984478388280',
    '1988212119972','1989212490106','1989347205042','1990665764890','1988451938275',
    '1980742202247','1990055990037','1989393190586','1425613471269','1535652510999',
    '1988480929990','943064209437','767105612537','1985906147747','574624416097',
    '1046678763357',
  ],
};

function haversineMiles(lat1, lon1, lat2, lon2) {
  const R = 3958.8;
  const toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

async function resolveVenue(eventId) {
  const r = await timedFetch(`${BASE}/events/${eventId}/?expand=venue`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
    timeoutMs: 30000,
  });
  if (!r.ok) return null;
  const v = r.body?.venue;
  if (!v?.id) return null;
  const lat = parseFloat(v.latitude);
  const lon = parseFloat(v.longitude);
  if (isNaN(lat) || isNaN(lon)) return null;
  return { id: v.id, name: v.name, city: v.address?.city, state: v.address?.region, lat, lon };
}

async function resolveAll(eventIds) {
  const venues = new Map();
  // 5 at a time with a short pause to stay under 1000 req/hr
  for (let i = 0; i < eventIds.length; i += 5) {
    const chunk = eventIds.slice(i, i + 5);
    const results = await Promise.all(chunk.map(resolveVenue));
    for (const v of results) {
      if (v && !venues.has(v.id)) venues.set(v.id, v);
    }
    if (i + 5 < eventIds.length) await new Promise(r => setTimeout(r, 300));
  }
  return [...venues.values()];
}

async function main() {
  for (const store of stores) {
    const eventIds = SCRAPED[store.id] ?? [];
    console.error(`\n[${store.id}] Resolving ${eventIds.length} events → venues...`);

    const venues = await resolveAll(eventIds);
    console.error(`[${store.id}] ${venues.length} unique venues found`);

    const nearby = venues
      .map(v => ({
        ...v,
        distanceMi: parseFloat(haversineMiles(store.lat, store.lng, v.lat, v.lon).toFixed(2)),
      }))
      .filter(v => v.distanceMi <= RADIUS_MILES)
      .sort((a, b) => a.distanceMi - b.distanceMi);

    console.error(`[${store.id}] ${nearby.length} venues within ${RADIUS_MILES} miles`);

    // Print paste-ready block
    console.log(`\n// ${store.name} (${store.lat}, ${store.lng})`);
    console.log(`eventbriteVenueIds: [`);
    for (const v of nearby) {
      const label = [v.name, v.city, v.state].filter(Boolean).join(', ').replace(/'/g, "\\'");
      console.log(`  { id: '${v.id}', name: '${label}', distanceMi: ${v.distanceMi} },`);
    }
    console.log(`],`);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
