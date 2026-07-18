/**
 * stores/store-intel.js — Live Store Intelligence
 *
 * Pulls real-time context from 3 public APIs for every store in portfolio.js
 * and produces an actionable preparation report per store.
 *
 *   API                   Signal                  Store action
 *   ──────────────────    ──────────────────────  ─────────────────────────────────────
 *   NOAA NWS              7-day weather forecast  Stock umbrellas, fans, hot beverages
 *   Ticketmaster          Events within 5 mi      Pre-stock snacks; expect crowd surge
 *   DOT WZDx (state)      Active road work zones  Exterior signage; delivery reroute
 *
 * Usage:
 *   node --env-file=.env stores/store-intel.js
 *
 * Credentials required (in .env):
 *   TICKETMASTER_CONSUMER_KEY   — https://developer.ticketmaster.com
 *   EVENTBRITE_PRIVATE_TOKEN    — https://www.eventbrite.com/account-settings/apps
 *
 * All other APIs (NWS, WZDx) are auth-free. User-Agent header is mandatory for NWS.
 */

import stores from './portfolio.js';
import { timedFetch } from '../lib/test-runner.js';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT     = join(dirname(fileURLToPath(import.meta.url)), '..');
const LOGS_DIR = join(ROOT, 'logs');

// ─── Config ───────────────────────────────────────────────────────────────────

const UA       = 'retailabs-watchtower';
const TM_KEY   = process.env.TICKETMASTER_CONSUMER_KEY;
const EB_TOKEN = process.env.EVENTBRITE_PRIVATE_TOKEN;
const EB_BASE  = 'https://www.eventbriteapi.com/v3';
const RADIUS_MI = 5;
const FORECAST_PERIODS = 6;  // ~3 days (day + night pairs)
const EVENT_DAYS = 7;

// ─── Utils ────────────────────────────────────────────────────────────────────

// WZDx registry stores full lowercase state names; our store objects use 2-letter codes.
const STATE_NAMES = {
  AL: 'alabama',     AK: 'alaska',      AZ: 'arizona',     AR: 'arkansas',
  CA: 'california',  CO: 'colorado',    CT: 'connecticut',  DE: 'delaware',
  FL: 'florida',     GA: 'georgia',     HI: 'hawaii',       ID: 'idaho',
  IL: 'illinois',    IN: 'indiana',     IA: 'iowa',         KS: 'kansas',
  KY: 'kentucky',    LA: 'louisiana',   ME: 'maine',        MD: 'maryland',
  MA: 'massachusetts', MI: 'michigan',  MN: 'minnesota',    MS: 'mississippi',
  MO: 'missouri',    MT: 'montana',     NE: 'nebraska',     NV: 'nevada',
  NH: 'new hampshire', NJ: 'new jersey', NM: 'new mexico',  NY: 'new york',
  NC: 'north carolina', ND: 'north dakota', OH: 'ohio',     OK: 'oklahoma',
  OR: 'oregon',      PA: 'pennsylvania', RI: 'rhode island', SC: 'south carolina',
  SD: 'south dakota', TN: 'tennessee',  TX: 'texas',        UT: 'utah',
  VT: 'vermont',     VA: 'virginia',    WA: 'washington',   WV: 'west virginia',
  WI: 'wisconsin',   WY: 'wyoming',
};
// Reverse: 'new york' → 'NY'
const NAME_TO_CODE = Object.fromEntries(Object.entries(STATE_NAMES).map(([k, v]) => [v, k]));

/** Straight-line distance between two lat/lng points, in km. */
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const toMi = km => (km / 1.60934).toFixed(1);
const kmRadius = RADIUS_MI * 1.60934;

// ─── API: Weather ─────────────────────────────────────────────────────────────

/**
 * Fetches NWS 7-day forecast for a store coordinate.
 * Two-step: /points → gridpoints forecast URL → periods array.
 */
async function fetchWeather(store) {
  const pointsUrl = `https://api.weather.gov/points/${store.lat},${store.lng}`;
  log('WEATHER', 'GET', pointsUrl);

  const r1 = await timedFetch(pointsUrl, {
    headers: { 'User-Agent': UA, Accept: 'application/geo+json' },
    timeoutMs: 12000,
  });
  logResponse('WEATHER', r1.status, r1.ms);

  if (!r1.ok) return { ok: false, ms: r1.ms, error: `points → HTTP ${r1.status}` };

  const forecastUrl = r1.body?.properties?.forecast;
  if (!forecastUrl) return { ok: false, ms: r1.ms, error: 'points response missing properties.forecast' };

  log('WEATHER', 'GET', forecastUrl);
  const r2 = await timedFetch(forecastUrl, {
    headers: { 'User-Agent': UA, Accept: 'application/geo+json' },
    timeoutMs: 15000,
  });
  logResponse('WEATHER', r2.status, r2.ms);

  if (!r2.ok) return { ok: false, ms: r1.ms + r2.ms, error: `forecast → HTTP ${r2.status}` };

  const periods = r2.body?.properties?.periods;
  if (!Array.isArray(periods) || periods.length === 0) {
    return { ok: false, ms: r1.ms + r2.ms, error: 'forecast returned no periods' };
  }

  return {
    ok: true,
    ms: r1.ms + r2.ms,
    city: r1.body.properties.relativeLocation?.properties?.city,
    periods: periods.slice(0, FORECAST_PERIODS),
    endpoints: { points: pointsUrl, forecast: forecastUrl },
  };
}

// ─── API: Events ──────────────────────────────────────────────────────────────

/**
 * Fetches Ticketmaster events within RADIUS_MI of the store, in the next EVENT_DAYS.
 */
async function fetchEvents(store) {
  if (!TM_KEY) {
    return { ok: false, skipped: true, reason: 'TICKETMASTER_CONSUMER_KEY not set in .env' };
  }

  const startDT = new Date().toISOString().slice(0, 19) + 'Z';
  const endDT   = new Date(Date.now() + EVENT_DAYS * 864e5).toISOString().slice(0, 19) + 'Z';

  const params = new URLSearchParams({
    latlong:       `${store.lat},${store.lng}`,
    radius:        String(RADIUS_MI),
    unit:          'miles',
    sort:          'date,asc',
    size:          '10',
    startDateTime: startDT,
    endDateTime:   endDT,
    apikey:        TM_KEY,
  });

  const url     = `https://app.ticketmaster.com/discovery/v2/events.json?${params}`;
  const safeUrl = url.replace(TM_KEY, '[KEY]');
  log('EVENTS ', 'GET', safeUrl);

  let res = await timedFetch(url, { timeoutMs: 15000 });
  logResponse('EVENTS ', res.status, res.ms);

  // Retry once on 5xx — Ticketmaster occasionally returns transient 502s.
  if (res.status >= 500) {
    console.log(`  ${C.dim}[EVENTS ] retrying after ${res.status}...${C.reset}`);
    res = await timedFetch(url, { timeoutMs: 15000 });
    logResponse('EVENTS ', res.status, res.ms);
  }

  if (!res.ok) return { ok: false, ms: res.ms, error: `HTTP ${res.status}` };

  const raw    = res.body?._embedded?.events ?? [];
  const events = raw.map(e => {
    const venue   = e._embedded?.venues?.[0];
    const vLat    = parseFloat(venue?.location?.latitude  ?? store.lat);
    const vLng    = parseFloat(venue?.location?.longitude ?? store.lng);
    const distKm  = haversineKm(store.lat, store.lng, vLat, vLng);
    return {
      name:          e.name,
      date:          e.dates?.start?.localDate,
      time:          e.dates?.start?.localTime?.slice(0, 5),
      venue:         venue?.name,
      distKm,
      distMi:        toMi(distKm),
      segment:       e.classifications?.[0]?.segment?.name,
      venueUpcoming: venue?.upcomingEvents?._total ?? null,  // total events at this venue
    };
  });

  return {
    ok:       true,
    ms:       res.ms,
    total:    res.body.page?.totalElements ?? raw.length,
    events,
    endpoint: safeUrl,
  };
}

// ─── API: Work Zones (WZDx) ───────────────────────────────────────────────────

/**
 * Fetches the federal WZDx feed registry once, returning a map of state → feed URL
 * for feeds that require no API key.
 */
async function buildStateWzdxMap() {
  const url = 'https://data.transportation.gov/resource/69qe-yiui.json?$limit=500';
  log('WZDX  ', 'GET', url + '  (registry — runs once for all stores)');

  const res = await timedFetch(url, { headers: { 'User-Agent': UA }, timeoutMs: 15000 });
  logResponse('WZDX  ', res.status, res.ms);

  if (!res.ok || !Array.isArray(res.body)) return {};

  // Registry uses full lowercase state names; convert to 2-letter codes for easy lookup.
  const map = {};
  for (const feed of res.body) {
    const feedUrl = feed.url?.url ?? feed.url;  // Socrata wraps URL as { url: "..." }
    if (!feed.active || feed.needapikey !== false || !feed.state || !feedUrl) continue;
    const code = NAME_TO_CODE[feed.state.toLowerCase()];
    if (code && !map[code]) map[code] = feedUrl;
  }
  return map;
}

/**
 * Fetches the state WZDx GeoJSON feed and returns work zones within RADIUS_MI.
 */
async function fetchWorkZones(store, stateMap) {
  const feedUrl = stateMap[store.state];
  if (!feedUrl) {
    return { ok: false, skipped: true, reason: `No public WZDx feed registered for ${store.state}` };
  }

  log('WZDX  ', 'GET', feedUrl);
  const res = await timedFetch(feedUrl, { headers: { 'User-Agent': UA }, timeoutMs: 20000 });
  logResponse('WZDX  ', res.status, res.ms);

  // Some feeds return JSON with wrong content-type (octet-stream) — parse manually.
  let body = res.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { /* fall through */ }
  }

  if (!res.ok) return { ok: false, ms: res.ms, error: `HTTP ${res.status}` };
  if (body?.type !== 'FeatureCollection' || !Array.isArray(body.features)) {
    return { ok: false, ms: res.ms, error: 'response is not a GeoJSON FeatureCollection' };
  }

  const nearby = body.features.filter(f => {
    const coords = f.geometry?.coordinates;
    if (!coords || !f.geometry) return false;
    const pts = f.geometry.type === 'LineString' ? coords : [coords];
    return pts.some(([lng, lat]) => haversineKm(store.lat, store.lng, lat, lng) <= kmRadius);
  }).map(f => {
    const p = f.properties;
    return {
      road:   (p?.core_details?.road_names ?? p?.road_names ?? [])[0]
              ?? p?.core_details?.description?.split(' - ')[0]  // FL feed uses description
              ?? 'Unknown road',
      type:   p?.core_details?.event_type ?? 'work-zone',
      impact: p?.vehicle_impact ?? p?.restrictions?.[0]?.type ?? 'unknown',
      start:  (p?.start_date ?? p?.start_date_time ?? '').slice(0, 10),
      end:    (p?.end_date   ?? p?.end_date_time   ?? '').slice(0, 10),
    };
  });

  return {
    ok:           true,
    ms:           res.ms,
    totalInState: body.features.length,
    nearby,
    endpoint:     feedUrl,
  };
}

// ─── API: NWS Active Alerts ───────────────────────────────────────────────────

/**
 * Fetches active NWS watches/warnings/advisories for the store's exact point.
 * Same no-auth API as fetchWeather; different endpoint.
 */
async function fetchAlerts(store) {
  const url = `https://api.weather.gov/alerts/active?point=${store.lat},${store.lng}`;
  log('ALERTS', 'GET', url);

  const res = await timedFetch(url, {
    headers: { 'User-Agent': UA, Accept: 'application/geo+json' },
    timeoutMs: 12000,
  });
  logResponse('ALERTS', res.status, res.ms);

  if (!res.ok) return { ok: false, ms: res.ms, error: `HTTP ${res.status}` };
  if (!Array.isArray(res.body?.features)) return { ok: false, ms: res.ms, error: 'missing features[]' };

  const alerts = res.body.features.map(f => ({
    event:    f.properties.event,
    severity: f.properties.severity,   // Extreme / Severe / Moderate / Minor / Unknown
    urgency:  f.properties.urgency,    // Immediate / Expected / Future
    headline: f.properties.headline,
    expires:  f.properties.expires,
  }));

  return { ok: true, ms: res.ms, alerts, endpoint: url };
}

// ─── API: NHC Tropical Development ───────────────────────────────────────────

const NHC_GTWO = 'https://mapservices.weather.noaa.gov/tropical/rest/services/tropical/NHC_tropical_weather/MapServer/2/query?where=1%3D1&outFields=*&f=geojson';
// Only show storm risk within this distance — Atlantic storms can threaten the East Coast from far out.
const HURRICANE_WARN_KM = 2500;

/**
 * Queries NHC tropical development areas (GTWO layer) and returns any
 * Atlantic or Gulf disturbances within HURRICANE_WARN_KM of the store.
 * Relevant June–November; returns empty outside season.
 */
async function fetchHurricaneRisk(store) {
  log('NHC   ', 'GET', NHC_GTWO);

  const res = await timedFetch(NHC_GTWO, { timeoutMs: 15000 });
  logResponse('NHC   ', res.status, res.ms);

  if (!res.ok) return { ok: false, ms: res.ms, error: `HTTP ${res.status}` };
  if (res.body?.type !== 'FeatureCollection') return { ok: false, ms: res.ms, error: 'not a FeatureCollection' };

  const nearby = (res.body.features ?? [])
    .filter(f => {
      // Atlantic/Gulf disturbances only — Pacific doesn't affect continental US stores.
      if (!['Atlantic', 'Gulf'].includes(f.properties?.basin)) return false;
      const [lng, lat] = f.geometry?.coordinates ?? [];
      if (!lat || !lng) return false;
      return haversineKm(store.lat, store.lng, lat, lng) <= HURRICANE_WARN_KM;
    })
    .map(f => {
      const [lng, lat] = f.geometry.coordinates;
      return {
        basin:    f.properties.basin,
        distKm:   Math.round(haversineKm(store.lat, store.lng, lat, lng)),
        prob2day: f.properties.prob2day,
        risk2day: f.properties.risk2day,   // Low / Medium / High
        prob7day: f.properties.prob7day,
        risk7day: f.properties.risk7day,
        name:     f.properties.STORMNAME ?? null,
      };
    });

  return { ok: true, ms: res.ms, nearby, endpoint: NHC_GTWO };
}

// ─── API: Eventbrite ──────────────────────────────────────────────────────────

/**
 * Discovers upcoming events near the store via pre-configured venue IDs.
 * Chain: venue IDs → venue events → ticket_classes + organizer events + series dates.
 * Skips gracefully if token or venue IDs are missing.
 */
async function fetchEventbriteIntel(store) {
  if (!EB_TOKEN) {
    return { ok: false, skipped: true, reason: 'EVENTBRITE_PRIVATE_TOKEN not set' };
  }
  if (!store.eventbriteVenueIds?.length) {
    return { ok: false, skipped: true, reason: 'no eventbriteVenueIds configured for this store' };
  }

  const hdrs = { Authorization: `Bearer ${EB_TOKEN}` };
  const t0   = Date.now();
  const now  = new Date();

  // Step 1: events for each venue in parallel — bare URL (no query params)
  const venueResults = await Promise.allSettled(
    store.eventbriteVenueIds.map(async ({ id: venueId, name: venueName }) => {
      const url = `${EB_BASE}/venues/${venueId}/events/`;
      log('EVBRITE', 'GET', url);
      const r = await timedFetch(url, { headers: hdrs, timeoutMs: 30000 });
      logResponse('EVBRITE', r.status, r.ms);
      if (!r.ok) return { venueId, venueName, events: [] };
      return { venueId, venueName, events: r.body.events ?? [] };
    })
  );

  // Deduplicate by event ID, keep only upcoming
  const eventMap = new Map();
  for (const res of venueResults) {
    if (res.status !== 'fulfilled') continue;
    const { venueName, events } = res.value;
    for (const e of events) {
      if (!e.id || eventMap.has(e.id)) continue;
      if (e.start?.utc && new Date(e.start.utc) < now) continue;
      eventMap.set(e.id, { ...e, _venueName: venueName });
    }
  }

  const upcoming = [...eventMap.values()].sort(
    (a, b) => new Date(a.start.utc) - new Date(b.start.utc)
  );

  if (!upcoming.length) {
    return { ok: true, ms: Date.now() - t0, venueCount: store.eventbriteVenueIds.length, totalUpcoming: 0, events: [] };
  }

  // Step 2: enrich up to 5 nearest events in parallel
  const enriched = await Promise.allSettled(
    upcoming.slice(0, 5).map(async evt => {
      const [ticketRes, orgRes, seriesRes] = await Promise.allSettled([
        timedFetch(`${EB_BASE}/events/${evt.id}/ticket_classes/`, { headers: hdrs, timeoutMs: 30000 }),
        evt.organizer_id
          ? timedFetch(`${EB_BASE}/organizers/${evt.organizer_id}/events/`, { headers: hdrs, timeoutMs: 30000 })
          : Promise.resolve(null),
        evt.is_series_parent
          ? timedFetch(`${EB_BASE}/series/${evt.id}/events/`, { headers: hdrs, timeoutMs: 30000 })
          : Promise.resolve(null),
      ]);

      let ticketClasses = null;
      if (ticketRes.status === 'fulfilled' && ticketRes.value?.ok) {
        const classes = ticketRes.value.body?.ticket_classes ?? [];
        const paid    = classes.filter(t => !t.free && t.cost?.value);
        const prices  = paid.map(t => t.cost.value / 100);
        ticketClasses = {
          total:      classes.length,
          free:       classes.filter(t => t.free).length,
          paid:       paid.length,
          available:  classes.filter(t => t.on_sale_status === 'AVAILABLE').length,
          priceRange: prices.length ? { min: Math.min(...prices), max: Math.max(...prices) } : null,
        };
      }

      let organizerUpcoming = null;
      if (orgRes.status === 'fulfilled' && orgRes.value?.ok) {
        const orgEvts     = orgRes.value.body?.events ?? [];
        organizerUpcoming = orgEvts.filter(e => e.start?.utc && new Date(e.start.utc) > now).length;
      }

      let seriesDates = null;
      if (seriesRes.status === 'fulfilled' && seriesRes.value?.ok) {
        seriesDates = (seriesRes.value.body?.events ?? [])
          .filter(e => e.start?.utc && new Date(e.start.utc) > now)
          .map(e => e.start.local)
          .slice(0, 5);
      }

      return {
        id:               evt.id,
        name:             evt.name?.text,
        start:            evt.start?.local,
        venue:            evt._venueName,
        capacity:         evt.capacity ?? null,
        isSoldOut:        evt.ticket_availability?.is_sold_out ?? null,
        hasTickets:       evt.ticket_availability?.has_available_tickets ?? null,
        isSeriesParent:   evt.is_series_parent ?? false,
        ticketClasses,
        organizerUpcoming,
        seriesDates,
      };
    })
  );

  return {
    ok:            true,
    ms:            Date.now() - t0,
    venueCount:    store.eventbriteVenueIds.length,
    totalUpcoming: upcoming.length,
    events:        enriched.filter(r => r.status === 'fulfilled').map(r => r.value),
  };
}

// ─── Assessment ───────────────────────────────────────────────────────────────

/**
 * Turns raw API results into plain-English store preparation actions.
 * Returns an array of { level: 'HIGH'|'MEDIUM'|'LOW', category, action } objects.
 */
function buildAssessment(weather, events, zones, alerts, hurricane, ebrite) {
  const actions = [];

  // Active NWS alerts — highest priority; surface before forecast
  if (alerts?.ok) {
    for (const a of alerts.alerts) {
      const sev = a.severity;
      const level = (sev === 'Extreme' || sev === 'Severe') ? 'CRITICAL' : sev === 'Moderate' ? 'HIGH' : 'MEDIUM';
      actions.push({
        level,
        category: 'Alert',
        action: `${a.event} (${sev}, ${a.urgency}) — ${a.headline}`,
      });
    }
  }

  // Hurricane / tropical development risk
  if (hurricane?.ok && hurricane.nearby?.length) {
    for (const s of hurricane.nearby) {
      const name   = s.name ? `Storm ${s.name}` : 'Tropical disturbance';
      const level  = s.risk7day === 'High' ? 'CRITICAL' : s.risk7day === 'Medium' ? 'HIGH' : 'MEDIUM';
      actions.push({
        level,
        category: 'Hurricane',
        action: `${name} in the ${s.basin} (${s.distKm}km away) — 7-day development risk: ${s.risk7day} (${s.prob7day}). Monitor NHC; prepare emergency stock if risk escalates.`,
      });
    }
  }

  // Weather forecast
  if (weather.ok) {
    for (const p of weather.periods.slice(0, 4)) {
      const s  = p.shortForecast?.toLowerCase() ?? '';
      const t  = p.temperature;
      const tu = p.temperatureUnit;

      if (/hurricane|tornado|severe/.test(s)) {
        actions.push({ level: 'CRITICAL', category: 'Weather', action: `${p.name}: ${p.shortForecast} — activate emergency stock (batteries, water, flashlights, candles)` });
      } else if (/rain|shower|storm|thunder/.test(s)) {
        actions.push({ level: 'HIGH', category: 'Weather', action: `${p.name}: ${p.shortForecast} — move umbrellas/ponchos to entrance end-cap; expect 15–30% foot-traffic drop` });
      } else if (/snow|blizzard|ice|sleet|freezing/.test(s)) {
        actions.push({ level: 'HIGH', category: 'Weather', action: `${p.name}: ${p.shortForecast} — stock ice melt, gloves, hand warmers near entrance` });
      } else if (tu === 'F' && t >= 95) {
        actions.push({ level: 'MEDIUM', category: 'Weather', action: `${p.name}: ${t}°F — stock cold beverages, portable fans, and sunscreen prominently` });
      } else if (tu === 'F' && t <= 25) {
        actions.push({ level: 'MEDIUM', category: 'Weather', action: `${p.name}: ${t}°F — front hot-beverage accessories, gloves, and thermal socks` });
      } else if (/sunny|clear/.test(s) && p.isDaytime) {
        actions.push({ level: 'LOW', category: 'Weather', action: `${p.name}: ${p.shortForecast} — good traffic day; ensure full floor coverage and end-cap promotions are visible` });
      }
    }
  }

  // Events
  if (events.ok && events.events?.length) {
    for (const e of events.events.slice(0, 5)) {
      const level = e.distKm < 1 ? 'HIGH' : e.distKm < 3 ? 'MEDIUM' : 'LOW';
      const cap   = e.venueUpcoming ? ` | venue has ${e.venueUpcoming} upcoming events` : '';
      actions.push({
        level,
        category: 'Event',
        action: `${e.date} ${e.time ?? ''}  "${e.name}" @ ${e.venue} (${e.distMi} mi${cap}) — pre-stock snacks, drinks, party supplies; crowd expected ${level === 'HIGH' ? '1–2 hrs before showtime' : 'day-of'}`,
      });
    }
  }

  // Work zones
  if (zones.ok && zones.nearby?.length) {
    for (const z of zones.nearby.slice(0, 3)) {
      const end = z.end ? ` (until ${z.end})` : '';
      actions.push({
        level: 'MEDIUM',
        category: 'Traffic',
        action: `Work zone on ${z.road}${end} — post exterior signage; notify delivery drivers of alternate route`,
      });
    }
  }

  // Eventbrite nearby events
  if (ebrite?.ok && ebrite.events?.length) {
    for (const e of ebrite.events.slice(0, 5)) {
      const soldOut  = e.isSoldOut === true;
      const massGA   = e.ticketClasses && e.ticketClasses.free > 0 && (e.ticketClasses.priceRange === null || e.ticketClasses.priceRange?.max < 30);
      const highEnd  = e.ticketClasses?.priceRange?.min >= 100;
      const level    = soldOut ? 'HIGH' : massGA ? 'MEDIUM' : 'LOW';

      let detail = soldOut ? 'SOLD OUT — high crowd turnout expected' : e.hasTickets === false ? 'tickets unavailable' : '';
      if (e.ticketClasses) {
        const pr = e.ticketClasses.priceRange;
        const prStr = pr ? `$${pr.min}–$${pr.max}` : 'free';
        detail += (detail ? '; ' : '') + `${e.ticketClasses.total} ticket tier(s), price range ${prStr}`;
        if (highEnd) detail += ' — affluent crowd, stock premium items';
        else if (massGA) detail += ' — mass crowd, stock snacks/drinks heavily';
      }
      if (e.isSeriesParent && e.seriesDates?.length) {
        detail += `; recurring series (${e.seriesDates.length} more dates: ${e.seriesDates.slice(0, 2).join(', ')}…)`;
      }
      if (e.organizerUpcoming != null) {
        detail += `; promoter has ${e.organizerUpcoming} upcoming events`;
      }

      actions.push({
        level,
        category: 'Eventbrite',
        action: `${e.start?.slice(0, 10) ?? '?'}  "${e.name}" @ ${e.venue} — ${detail}`,
      });
    }
  }

  return actions;
}

// ─── Printer ──────────────────────────────────────────────────────────────────

const C = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  dim:    '\x1b[2m',
  red:    '\x1b[31m',
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
  cyan:   '\x1b[36m',
  bgCyan: '\x1b[46m',
  black:  '\x1b[30m',
};

const LEVEL_COLOR = {
  CRITICAL: C.red,
  HIGH:     C.red,
  MEDIUM:   C.yellow,
  LOW:      C.green,
};

function log(tag, method, url) {
  console.log(`  ${C.dim}[${tag}]${C.reset} ${C.dim}${method}${C.reset} ${url}`);
}

function logResponse(tag, status, ms) {
  const ok    = status >= 200 && status < 300;
  const color = ok ? C.green : C.red;
  console.log(`  ${C.dim}[${tag}]${C.reset} ${color}← ${status}${C.reset} ${C.dim}in ${ms}ms${C.reset}`);
}

function printReport(store, weather, events, zones, alerts, hurricane, ebrite) {
  const line = '─'.repeat(68);
  console.log(`\n${C.bold}${C.bgCyan}${C.black}  STORE INTEL  ${C.reset}${C.bold}  ${store.name}${C.reset}`);
  console.log(`${C.dim}  ${store.address}  |  ${store.lat}, ${store.lng}  |  ${store.format}${C.reset}`);
  console.log(`${C.dim}  Est. Revenue: ${store.estimatedAnnualRevenue ?? 'n/a'}  |  Margin: ${store.estimatedMargin ?? 'n/a'}${C.reset}`);
  console.log(`${C.dim}${line}${C.reset}`);

  // ── Active Alerts ──
  console.log(`\n${C.cyan}${C.bold}  🚨  ACTIVE ALERTS  ${C.reset}${C.dim}(NWS · ${alerts?.ok ? `${alerts.ms}ms` : 'error'})${C.reset}`);
  if (!alerts?.ok) {
    console.log(`     ${C.red}✗ ${alerts?.error ?? 'failed'}${C.reset}`);
  } else if (!alerts.alerts.length) {
    console.log(`     ${C.dim}No active watches, warnings, or advisories.${C.reset}`);
  } else {
    for (const a of alerts.alerts) {
      const sev = a.severity;
      const col = (sev === 'Extreme' || sev === 'Severe') ? C.red : sev === 'Moderate' ? C.yellow : C.dim;
      console.log(`     ${col}▲ ${a.event}${C.reset}  ${C.dim}(${sev} · ${a.urgency} · expires ${a.expires?.slice(0, 16)})${C.reset}`);
      console.log(`       ${C.dim}${a.headline}${C.reset}`);
    }
  }

  // ── Hurricane Risk (only show if there's data) ──
  if (hurricane?.ok && hurricane.nearby?.length) {
    console.log(`\n${C.cyan}${C.bold}  🌀  HURRICANE / TROPICAL RISK  ${C.reset}${C.dim}(NHC · ${hurricane.ms}ms)${C.reset}`);
    for (const s of hurricane.nearby) {
      const col = s.risk7day === 'High' ? C.red : s.risk7day === 'Medium' ? C.yellow : C.dim;
      const name = s.name ? `Storm ${s.name}` : 'Tropical disturbance';
      console.log(`     ${col}▲ ${name}${C.reset}  ${C.dim}${s.distKm}km away · 2-day: ${s.risk2day} (${s.prob2day}) · 7-day: ${s.risk7day} (${s.prob7day})${C.reset}`);
    }
  }

  // ── Weather Forecast ──
  console.log(`\n${C.cyan}${C.bold}  ☁  WEATHER FORECAST  ${C.reset}${C.dim}(NOAA NWS · ${weather.ok ? `${weather.ms}ms` : 'error'})${C.reset}`);
  if (!weather.ok) {
    console.log(`     ${C.red}✗ ${weather.error ?? weather.reason}${C.reset}`);
  } else {
    for (const p of weather.periods) {
      const icon = p.isDaytime ? '☀ ' : '🌙';
      const name = p.name.padEnd(18);
      const temp = `${String(p.temperature).padStart(3)}°${p.temperatureUnit}`;
      console.log(`     ${icon}${name}  ${temp}  ${p.shortForecast}`);
    }
  }

  // ── Events ──
  console.log(`\n${C.cyan}${C.bold}  🎟  EVENTS  ${C.reset}${C.dim}(Ticketmaster · ${RADIUS_MI}mi · next ${EVENT_DAYS} days · ${events.ok ? `${events.ms}ms` : events.skipped ? 'skipped' : 'error'})${C.reset}`);
  if (events.skipped) {
    console.log(`     ${C.yellow}⚠  ${events.reason}${C.reset}`);
  } else if (!events.ok) {
    console.log(`     ${C.red}✗ ${events.error}${C.reset}`);
  } else if (!events.events?.length) {
    console.log(`     ${C.dim}No events within ${RADIUS_MI} mi in the next ${EVENT_DAYS} days.${C.reset}`);
  } else {
    console.log(`     ${C.dim}${events.total} total; showing top ${Math.min(events.events.length, 5)}:${C.reset}`);
    for (const e of events.events.slice(0, 5)) {
      const name    = e.name.slice(0, 36).padEnd(36);
      const venue   = (e.venue ?? '').slice(0, 22).padEnd(22);
      const upcoming = e.venueUpcoming != null ? `  ${C.dim}(venue: ${e.venueUpcoming} upcoming)${C.reset}` : '';
      console.log(`     ${e.date}  ${(e.time ?? '').padEnd(5)}  ${name}  ${venue}  ${e.distMi}mi${upcoming}`);
    }
  }

  // ── Eventbrite ──
  const ebMs = ebrite?.ok ? `${ebrite.ms}ms` : ebrite?.skipped ? 'skipped' : 'error';
  console.log(`\n${C.cyan}${C.bold}  🎫  EVENTBRITE  ${C.reset}${C.dim}(Eventbrite v3 · venue discovery · ${ebMs})${C.reset}`);
  if (ebrite?.skipped) {
    console.log(`     ${C.yellow}⚠  ${ebrite.reason}${C.reset}`);
  } else if (!ebrite?.ok) {
    console.log(`     ${C.red}✗ ${ebrite?.error ?? 'failed'}${C.reset}`);
  } else if (!ebrite.events?.length) {
    console.log(`     ${C.dim}No upcoming events found across ${ebrite.venueCount} configured venue(s).${C.reset}`);
  } else {
    console.log(`     ${C.dim}${ebrite.totalUpcoming} upcoming events across ${ebrite.venueCount} venue(s); showing top ${ebrite.events.length}:${C.reset}`);
    for (const e of ebrite.events) {
      const eName   = (e.name ?? '').slice(0, 32).padEnd(32);
      const eVenue  = (e.venue ?? '').slice(0, 24).padEnd(24);
      const soldTag = e.isSoldOut ? ` ${C.red}SOLD OUT${C.reset}` : '';
      const serTag  = e.isSeriesParent && e.seriesDates?.length ? ` ${C.dim}[series ×${e.seriesDates.length + 1}]${C.reset}` : '';
      const prStr   = e.ticketClasses?.priceRange
        ? `$${e.ticketClasses.priceRange.min}–$${e.ticketClasses.priceRange.max}`
        : e.ticketClasses?.free > 0 ? 'free' : '';
      console.log(`     ${e.start?.slice(0, 10) ?? '?'}  ${eName}  ${eVenue}  ${prStr}${soldTag}${serTag}`);
    }
  }

  // ── Work zones ──
  const wzMs = zones.ok ? `${zones.ms}ms` : zones.skipped ? 'skipped' : 'error';
  console.log(`\n${C.cyan}${C.bold}  🚧  WORK ZONES  ${C.reset}${C.dim}(WZDx · ${store.state} feed · ${RADIUS_MI}mi · ${wzMs})${C.reset}`);
  if (zones.skipped) {
    console.log(`     ${C.yellow}⚠  ${zones.reason}${C.reset}`);
  } else if (!zones.ok) {
    console.log(`     ${C.red}✗ ${zones.error}${C.reset}`);
  } else if (!zones.nearby?.length) {
    console.log(`     ${C.dim}No active work zones within ${RADIUS_MI} mi.  (${zones.totalInState} total in ${store.state})${C.reset}`);
  } else {
    console.log(`     ${C.dim}${zones.nearby.length} zone(s) nearby of ${zones.totalInState} statewide:${C.reset}`);
    for (const z of zones.nearby.slice(0, 5)) {
      const road   = z.road.slice(0, 35).padEnd(35);
      const endStr = z.end ? ` until ${z.end}` : '';
      console.log(`     • ${road}  ${z.type}${endStr}`);
    }
  }

  // ── Assessment ──
  const actions = buildAssessment(weather, events, zones, alerts, hurricane, ebrite);
  console.log(`\n${C.bold}  ⚡  PREPARATION ASSESSMENT${C.reset}`);
  if (!actions.length) {
    console.log(`     ${C.green}✓ No significant impact factors this week. Normal operations.${C.reset}`);
  } else {
    for (const a of actions) {
      const col = LEVEL_COLOR[a.level] ?? '';
      console.log(`     ${col}[${a.level.padEnd(8)}]${C.reset}  ${C.bold}${a.category.padEnd(9)}${C.reset}  ${a.action}`);
    }
  }

  console.log(`\n${C.dim}${line}${C.reset}`);
}

// ─── Logger ───────────────────────────────────────────────────────────────────

function writeLog(runTs, results) {
  mkdirSync(LOGS_DIR, { recursive: true });

  const log = {
    _sources: {
      weather:    'NOAA NWS — step 1: https://api.weather.gov/points/{lat},{lng}  →  step 2: {properties.forecast URL returned by step 1}',
      events:     'Ticketmaster Discovery v2 — https://app.ticketmaster.com/discovery/v2/events.json?latlong={lat},{lng}&radius={mi}&…',
      workZones:  'DOT WZDx — state feed URL resolved from https://data.transportation.gov/resource/69qe-yiui.json',
      alerts:     'NOAA NWS — https://api.weather.gov/alerts/active?point={lat},{lng}',
      hurricane:  `NHC GTWO ArcGIS — ${NHC_GTWO}`,
      eventbrite: 'Eventbrite v3 — venue IDs from store config → GET /venues/{id}/events/ → /events/{id}/ticket_classes/ + /organizers/{id}/events/ + /series/{id}/events/',
    },
    run: {
      timestamp: runTs.toISOString(),
      radiusMi:  RADIUS_MI,
      eventDays: EVENT_DAYS,
    },
    stores: results.map(({ store, weather, events, zones, alerts, hurricane, ebrite, assessment }) => ({
      id:               store.id,
      name:             store.name,
      address:          store.address,
      lat:              store.lat,
      lng:              store.lng,
      state:            store.state,
      estimatedRevenue: store.estimatedAnnualRevenue,
      intel: {
        weather: {
          ok:        weather.ok,
          ms:        weather.ms        ?? null,
          city:      weather.city      ?? null,
          error:     weather.error     ?? null,
          endpoints: weather.endpoints ?? null,
          periods:   weather.periods   ?? [],
        },
        events: {
          ok:       events.ok,
          ms:       events.ms      ?? null,
          skipped:  events.skipped ?? false,
          reason:   events.reason  ?? null,
          error:    events.error   ?? null,
          total:    events.total   ?? null,
          endpoint: events.endpoint ?? null,
          events:   events.events  ?? [],
        },
        workZones: {
          ok:           zones.ok,
          ms:           zones.ms           ?? null,
          skipped:      zones.skipped       ?? false,
          reason:       zones.reason        ?? null,
          error:        zones.error         ?? null,
          totalInState: zones.totalInState  ?? null,
          endpoint:     zones.endpoint      ?? null,
          nearby:       zones.nearby        ?? [],
        },
        alerts: {
          ok:       alerts?.ok       ?? false,
          ms:       alerts?.ms       ?? null,
          error:    alerts?.error    ?? null,
          endpoint: alerts?.endpoint ?? null,
          alerts:   alerts?.alerts   ?? [],
        },
        hurricane: {
          ok:       hurricane?.ok       ?? false,
          ms:       hurricane?.ms       ?? null,
          error:    hurricane?.error    ?? null,
          endpoint: hurricane?.endpoint ?? null,
          nearby:   hurricane?.nearby   ?? [],
        },
        eventbrite: {
          ok:            ebrite?.ok            ?? false,
          ms:            ebrite?.ms            ?? null,
          skipped:       ebrite?.skipped        ?? false,
          reason:        ebrite?.reason         ?? null,
          error:         ebrite?.error          ?? null,
          venueCount:    ebrite?.venueCount     ?? null,
          totalUpcoming: ebrite?.totalUpcoming  ?? null,
          events:        ebrite?.events         ?? [],
        },
      },
      assessment,
    })),
  };

  const ts     = runTs.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const tsFile = join(LOGS_DIR, `store-intel-${ts}.json`);
  const latest = join(LOGS_DIR, 'store-intel-latest.json');

  writeFileSync(tsFile, JSON.stringify(log, null, 2));
  writeFileSync(latest, JSON.stringify(log, null, 2));

  console.log(`\n${C.dim}  Logs written:${C.reset}`);
  console.log(`${C.dim}    logs/store-intel-${ts}.json  (this run)${C.reset}`);
  console.log(`${C.dim}    logs/store-intel-latest.json   (always the latest run)${C.reset}`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const runTs = new Date();
  const now   = runTs.toISOString().slice(0, 16).replace('T', ' ');

  console.log(`\n${C.bold}${C.cyan}`);
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║              Live Store Intelligence                  ║');
  console.log(`║        ${now} UTC                          ║`);
  console.log('║                                                       ║');
  console.log('║  Signals:  NWS Alerts · Weather · Events (TM)        ║');
  console.log('║            NHC Tropical · Road Work (WZDx)           ║');
  console.log('║            Eventbrite (venue events + enrichment)    ║');
  console.log('╚═══════════════════════════════════════════════════════╝');
  console.log(C.reset);

  // WZDx registry fetched once — shared across all stores
  const stateMap = await buildStateWzdxMap();
  const statesWithFeeds = Object.keys(stateMap).sort();
  console.log(`${C.dim}  WZDx registry loaded: ${statesWithFeeds.length} public state feeds (${statesWithFeeds.join(', ')})${C.reset}\n`);

  const allResults = [];

  for (const store of stores) {
    console.log(`\n${C.dim}${'═'.repeat(68)}${C.reset}`);
    console.log(`${C.dim}  Fetching intel for: ${store.name}${C.reset}\n`);

    // All 6 signals run in parallel — a failure in one does not block the others.
    const [weatherResult, eventsResult, zonesResult, alertsResult, hurricaneResult, ebriteResult] = await Promise.allSettled([
      fetchWeather(store),
      fetchEvents(store),
      fetchWorkZones(store, stateMap),
      fetchAlerts(store),
      fetchHurricaneRisk(store),
      fetchEventbriteIntel(store),
    ]);

    const unwrap = r => r.status === 'fulfilled' ? r.value : { ok: false, error: r.reason?.message ?? String(r.reason) };
    const weather    = unwrap(weatherResult);
    const events     = unwrap(eventsResult);
    const zones      = unwrap(zonesResult);
    const alerts     = unwrap(alertsResult);
    const hurricane  = unwrap(hurricaneResult);
    const ebrite     = unwrap(ebriteResult);
    const assessment = buildAssessment(weather, events, zones, alerts, hurricane, ebrite);

    allResults.push({ store, weather, events, zones, alerts, hurricane, ebrite, assessment });
    printReport(store, weather, events, zones, alerts, hurricane, ebrite);
  }

  writeLog(runTs, allResults);
  console.log(`\n${C.bold}${C.green}  All stores processed.${C.reset}\n`);
}

main().catch(err => {
  console.error(`\n${C.red}Fatal:${C.reset}`, err);
  process.exit(1);
});
