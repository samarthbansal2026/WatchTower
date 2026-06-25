/**
 * discover-eventbrite-venues.js
 *
 * For each store in dollartree.js:
 *   1. Scrapes Eventbrite's web search for events near the store lat/lon
 *   2. Resolves each event to its venue via GET /events/{id}/?expand=venue
 *   3. Filters to venues within RADIUS_MILES using Haversine
 *   4. Deduplicates by venue ID and prints a summary
 *
 * Usage:
 *   node --env-file=.env scripts/discover-eventbrite-venues.js
 *
 * Output: prints the eventbriteVenueIds arrays ready to paste into dollartree.js.
 * Does NOT modify dollartree.js automatically — review and paste.
 */

import { timedFetch } from '../lib/test-runner.js';
import stores from '../lib/stores.js';

const TOKEN        = process.env.EVENTBRITE_PRIVATE_TOKEN;
const BASE         = 'https://www.eventbriteapi.com/v3';
const RADIUS_MILES = 20;
const EB_WEB       = 'https://www.eventbrite.com';

const filterId = process.argv.find(a => a.startsWith('--id='))?.slice(5)
  ?? (process.argv.includes('--id') ? process.argv[process.argv.indexOf('--id') + 1] : null);

const targetStores = filterId ? stores.filter(s => s.id === filterId) : stores;

if (!TOKEN) {
  console.error('EVENTBRITE_PRIVATE_TOKEN not set');
  process.exit(1);
}

function haversineMiles(lat1, lon1, lat2, lon2) {
  const R = 3958.8;
  const toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

// Extract numeric event IDs from Eventbrite HTML (pattern: /e/anything-DIGITS)
function extractEventIds(html) {
  const ids = new Set();
  for (const m of html.matchAll(/\/e\/[a-z0-9-]+-(\d{8,})/gi)) {
    ids.add(m[1]);
  }
  return [...ids];
}

// Fetch Dallas (or other city) listing pages — geo URL often 404s; city slug works.
async function scrapeEventIds(lat, lon, page = 1, stateSlug = 'tx--dallas') {
  const geoUrl = `${EB_WEB}/d/events/?location.latitude=${lat}&location.longitude=${lon}`
    + `&location.within=${RADIUS_MILES}mi&page=${page}`;
  const cityUrl = `${EB_WEB}/d/${stateSlug}/all-events/${page > 1 ? `?page=${page}` : ''}`;

  for (const url of [geoUrl, cityUrl]) {
    const r = await timedFetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; watchtower-discovery/1.0)' },
      timeoutMs: 20000,
    });
    if (!r.ok || typeof r.body !== 'string') continue;
    const ids = [...new Set([...r.body.matchAll(/\/e\/[a-z0-9-]+-(\d{10,})/gi)].map(m => m[1]))];
    if (ids.length) return ids;
  }
  return [];
}

// Resolve an event ID to its venue details via API
async function resolveVenue(eventId) {
  const r = await timedFetch(`${BASE}/events/${eventId}/?expand=venue`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
    timeoutMs: 30000,
  });
  if (!r.ok || !r.body?.venue) return null;
  const v = r.body.venue;
  const lat = parseFloat(v.latitude);
  const lon = parseFloat(v.longitude);
  if (isNaN(lat) || isNaN(lon)) return null;
  return {
    id:   v.id,
    name: v.name,
    city: v.address?.city,
    state: v.address?.region,
    lat,
    lon,
  };
}

// Throttled batch: resolve event IDs to venues, N at a time
async function resolveVenuesBatch(eventIds, concurrency = 5) {
  const venues = new Map(); // id → venue
  for (let i = 0; i < eventIds.length; i += concurrency) {
    const chunk = eventIds.slice(i, i + concurrency);
    const results = await Promise.all(chunk.map(resolveVenue));
    for (const v of results) {
      if (v && !venues.has(v.id)) venues.set(v.id, v);
    }
    // small pause to avoid hitting rate limit (1000 req/hr = ~1 req/3.6s)
    if (i + concurrency < eventIds.length) await new Promise(r => setTimeout(r, 300));
  }
  return [...venues.values()];
}

async function discoverForStore(store) {
  console.error(`\n[${store.id}] Scraping Eventbrite near (${store.lat}, ${store.lng})...`);

  // Scrape pages 1–5 to get a good sample of event IDs
  const pages = await Promise.all([1, 2, 3, 4, 5].map(p => scrapeEventIds(store.lat, store.lng, p, store.eventbriteCitySlug)));
  const allIds = [...new Set(pages.flat())];
  console.error(`[${store.id}] Found ${allIds.length} unique event IDs across 5 pages`);

  if (!allIds.length) {
    console.error(`[${store.id}] No event IDs found — check if Eventbrite returned HTML`);
    return [];
  }

  // Resolve to venues (batched, throttled)
  console.error(`[${store.id}] Resolving venues via API...`);
  const venues = await resolveVenuesBatch(allIds);
  console.error(`[${store.id}] Resolved ${venues.length} unique venues`);

  // Filter to within RADIUS_MILES
  const nearby = venues
    .map(v => ({ ...v, distanceMi: parseFloat(haversineMiles(store.lat, store.lng, v.lat, v.lon).toFixed(2)) }))
    .filter(v => v.distanceMi <= RADIUS_MILES)
    .sort((a, b) => a.distanceMi - b.distanceMi);

  console.error(`[${store.id}] ${nearby.length} venues within ${RADIUS_MILES} miles`);
  return nearby;
}

async function main() {
  if (!targetStores.length) {
    console.error(filterId ? `No store with id "${filterId}"` : 'No stores found');
    process.exit(1);
  }

  const results = {};

  for (const store of targetStores) {
    const venues = await discoverForStore(store);
    results[store.id] = venues;
  }

  // Print paste-ready output for each store
  console.log('\n\n========== RESULTS — paste into store file ==========\n');
  for (const store of targetStores) {
    const venues = results[store.id];
    console.log(`// ${store.name}`);
    console.log(`eventbriteVenueIds: [`);
    for (const v of venues) {
      const label = [v.name, v.city, v.state].filter(Boolean).join(', ');
      console.log(`  { id: '${v.id}', name: '${label.replace(/'/g, "\\'")}', distanceMi: ${v.distanceMi} },`);
    }
    console.log(`],\n`);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
