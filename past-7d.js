/**
 * past-7d.js — 7-day look-back: what actually happened (no forecast).
 *
 * Mirrors forecast-7d.js in structure but pulls observed/historical data:
 *   - Weather: NWS station observations + Open-Meteo archive (ERA5/reanalysis)
 *   - Events:  Eventbrite venue-based (past events from known venue IDs), sports APIs
 *   - Mobility: WZDx feeds are live-only; omitted (noted in output)
 *
 * Usage:
 *   node --env-file=.env past-7d.js [lat] [lon]
 *   node --env-file=.env past-7d.js 40.7128 -74.0060   # New York City
 *
 * Location defaults to Chicago, IL.
 * All sports schedules are league-wide — filter downstream by venue proximity.
 */

import { timedFetch } from './lib/test-runner.js';
import stores from './stores/dollartree.js';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const LAT = parseFloat(process.argv[2] ?? process.env.LAT ?? '41.8781');
const LON = parseFloat(process.argv[3] ?? process.env.LON ?? '-87.6298');

const now = new Date();
const minus7 = new Date(now);
minus7.setDate(minus7.getDate() - 7);

const TODAY          = now.toISOString().slice(0, 10);
const MINUS7         = minus7.toISOString().slice(0, 10);
const TODAY_COMPACT  = TODAY.replace(/-/g, '');
const MINUS7_COMPACT = MINUS7.replace(/-/g, '');
const MINUS7_ISO     = minus7.toISOString().split('.')[0] + 'Z';
const NOW_ISO        = now.toISOString().split('.')[0] + 'Z';

const UA = 'watchtower-past-7d';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function inWindow(dateStr) {
  if (!dateStr) return false;
  const d = dateStr.slice(0, 10);
  return d >= MINUS7 && d <= TODAY;
}

function wrap(source, data) {
  return { source, ok: true, data };
}

function skipped(source, reason) {
  return { source, ok: true, skipped: true, reason, data: null };
}

function errored(source, error) {
  return { source, ok: false, error: String(error), data: null };
}

// ---------------------------------------------------------------------------
// WEATHER — observed / reanalysis
// ---------------------------------------------------------------------------

async function fetchNwsObservations() {
  const source = 'noaa-nws-observations';
  try {
    // Step 1: resolve the nearest observation stations for this lat/lon
    const r1 = await timedFetch(`https://api.weather.gov/points/${LAT},${LON}`, {
      headers: { 'User-Agent': UA, Accept: 'application/geo+json' },
    });
    if (!r1.ok) return errored(source, `points HTTP ${r1.status}`);

    const stationsUrl = r1.body?.properties?.observationStations;
    if (!stationsUrl) return errored(source, 'no observationStations in points response');

    const r2 = await timedFetch(stationsUrl, {
      headers: { 'User-Agent': UA, Accept: 'application/geo+json' },
    });
    if (!r2.ok) return errored(source, `stations HTTP ${r2.status}`);

    const stationId = r2.body?.features?.[0]?.properties?.stationIdentifier;
    const stationName = r2.body?.features?.[0]?.properties?.name;
    if (!stationId) return errored(source, 'no stations found near location');

    // Step 2: fetch observations for the past 7 days from that station
    const r3 = await timedFetch(
      `https://api.weather.gov/stations/${stationId}/observations?start=${MINUS7_ISO}&end=${NOW_ISO}&limit=500`,
      { headers: { 'User-Agent': UA, Accept: 'application/geo+json' }, timeoutMs: 20000 }
    );
    if (!r3.ok) return errored(source, `observations HTTP ${r3.status}`);

    const features = r3.body?.features ?? [];

    // Aggregate hourly readings into daily summaries
    const byDate = {};
    for (const f of features) {
      const props = f.properties;
      const ts = props?.timestamp;
      if (!ts) continue;
      const date = ts.slice(0, 10);
      if (date < MINUS7 || date > TODAY) continue;

      if (!byDate[date]) {
        byDate[date] = { temps_c: [], wind_speeds_kmh: [], precip_mm: 0, conditions: [] };
      }

      const tempC = props.temperature?.value;
      const windKmh = props.windSpeed?.value;
      const precipMm = props.precipitationLastHour?.value;
      const textDesc = props.textDescription;

      if (tempC != null) byDate[date].temps_c.push(tempC);
      if (windKmh != null) byDate[date].wind_speeds_kmh.push(windKmh);
      if (precipMm != null) byDate[date].precip_mm += precipMm;
      if (textDesc) byDate[date].conditions.push(textDesc);
    }

    function toF(c) { return c == null ? null : parseFloat((c * 9 / 5 + 32).toFixed(1)); }
    function avg(arr) { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null; }

    const daily = Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({
        date,
        temp_high_f:      toF(Math.max(...v.temps_c)),
        temp_low_f:       toF(Math.min(...v.temps_c)),
        temp_avg_f:       toF(avg(v.temps_c)),
        wind_avg_mph:     avg(v.wind_speeds_kmh) != null ? parseFloat((avg(v.wind_speeds_kmh) * 0.621371).toFixed(1)) : null,
        precip_mm:        parseFloat(v.precip_mm.toFixed(2)),
        dominant_condition: v.conditions.length
          ? Object.entries(
              v.conditions.reduce((m, c) => { m[c] = (m[c] ?? 0) + 1; return m; }, {})
            ).sort((a, b) => b[1] - a[1])[0][0]
          : null,
        observation_count: v.temps_c.length,
      }));

    return wrap(source, {
      station_id:   stationId,
      station_name: stationName,
      location: {
        city:  r1.body.properties.relativeLocation?.properties?.city,
        state: r1.body.properties.relativeLocation?.properties?.state,
        lat: LAT, lon: LON,
      },
      observation_count: features.length,
      daily,
    });
  } catch (e) {
    return errored(source, e);
  }
}

async function fetchOpenMeteoHistorical() {
  const source = 'open-meteo-historical';
  try {
    // Use forecast API with past_days=7 — returns blended observed+reanalysis up to today
    const url = `https://api.open-meteo.com/v1/forecast`
      + `?latitude=${LAT}&longitude=${LON}`
      + `&hourly=temperature_2m,precipitation,weather_code,relative_humidity_2m,apparent_temperature,wind_speed_10m`
      + `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,weather_code,wind_speed_10m_max,sunrise,sunset`
      + `&temperature_unit=fahrenheit&wind_speed_unit=mph`
      + `&timezone=auto&past_days=7&forecast_days=0`;
    const r = await timedFetch(url, { timeoutMs: 20000 });
    if (!r.ok) return errored(source, `HTTP ${r.status}`);

    const d = r.body.daily;
    const h = r.body.hourly;

    const daily = (d.time ?? []).map((date, i) => ({
      date,
      temp_high_f:            d.temperature_2m_max?.[i],
      temp_low_f:             d.temperature_2m_min?.[i],
      precipitation_mm:       d.precipitation_sum?.[i],
      precipitation_prob_pct: d.precipitation_probability_max?.[i],
      weather_code:           d.weather_code?.[i],
      wind_speed_max_mph:     d.wind_speed_10m_max?.[i],
      sunrise:                d.sunrise?.[i],
      sunset:                 d.sunset?.[i],
    }));

    const hourly = (h.time ?? []).map((time, i) => ({
      time,
      temp_f:           h.temperature_2m?.[i],
      feels_like_f:     h.apparent_temperature?.[i],
      precipitation_mm: h.precipitation?.[i],
      weather_code:     h.weather_code?.[i],
      humidity_pct:     h.relative_humidity_2m?.[i],
      wind_speed_mph:   h.wind_speed_10m?.[i],
    }));

    return wrap(source, { timezone: r.body.timezone, daily, hourly });
  } catch (e) {
    return errored(source, e);
  }
}

async function fetchOpenMeteoAirQualityHistorical() {
  const source = 'open-meteo-air-quality';
  try {
    const url = `https://air-quality-api.open-meteo.com/v1/air-quality`
      + `?latitude=${LAT}&longitude=${LON}`
      + `&hourly=pm2_5,pm10,ozone,nitrogen_dioxide,carbon_monoxide,us_aqi`
      + `&timezone=auto&past_days=7&forecast_days=0`;
    const r = await timedFetch(url, { timeoutMs: 60000 });
    if (!r.ok) return errored(source, `HTTP ${r.status}`);

    const h = r.body.hourly;
    const byDate = {};
    (h.time ?? []).forEach((t, i) => {
      const date = t.slice(0, 10);
      if (!byDate[date]) byDate[date] = { max_aqi: null, max_pm2_5: null, hours: [] };
      const aqi = h.us_aqi?.[i];
      const pm  = h.pm2_5?.[i];
      if (aqi != null && (byDate[date].max_aqi == null || aqi > byDate[date].max_aqi)) byDate[date].max_aqi = aqi;
      if (pm  != null && (byDate[date].max_pm2_5 == null || pm > byDate[date].max_pm2_5)) byDate[date].max_pm2_5 = pm;
      byDate[date].hours.push({
        time: t,
        us_aqi: aqi,
        pm2_5:  pm,
        pm10:   h.pm10?.[i],
        ozone:  h.ozone?.[i],
        no2:    h.nitrogen_dioxide?.[i],
        co:     h.carbon_monoxide?.[i],
      });
    });

    const daily = Object.entries(byDate).map(([date, v]) => ({
      date,
      max_us_aqi:  v.max_aqi,
      max_pm2_5:   v.max_pm2_5,
      aqi_category: v.max_aqi == null ? null
        : v.max_aqi > 300 ? 'Hazardous'
        : v.max_aqi > 200 ? 'Very Unhealthy'
        : v.max_aqi > 150 ? 'Unhealthy'
        : v.max_aqi > 100 ? 'Unhealthy for Sensitive Groups'
        : v.max_aqi > 50  ? 'Moderate'
        : 'Good',
      hourly: v.hours,
    }));

    return wrap(source, { timezone: r.body.timezone, daily });
  } catch (e) {
    return errored(source, e);
  }
}

async function fetchOpenMeteoFloodHistorical() {
  const source = 'open-meteo-flood';
  try {
    const url = `https://flood-api.open-meteo.com/v1/flood`
      + `?latitude=${LAT}&longitude=${LON}`
      + `&daily=river_discharge,river_discharge_mean,river_discharge_max,river_discharge_min`
      + `&past_days=7&forecast_days=0&timezone=auto`;
    let r;
    try {
      r = await timedFetch(url, { timeoutMs: 60000 });
    } catch {
      return wrap(source, { note: 'No river/flood coverage at this location (not a GloFAS grid point)', daily: [] });
    }
    if (!r.ok) return errored(source, `HTTP ${r.status}`);

    const d = r.body.daily;
    if (!d?.river_discharge) {
      return wrap(source, { note: 'No river coverage at this location', daily: [] });
    }

    const daily = (d.time ?? []).map((date, i) => ({
      date,
      river_discharge_m3s:      d.river_discharge?.[i],
      river_discharge_mean_m3s: d.river_discharge_mean?.[i],
      river_discharge_max_m3s:  d.river_discharge_max?.[i],
      river_discharge_min_m3s:  d.river_discharge_min?.[i],
    }));

    return wrap(source, { daily });
  } catch (e) {
    return errored(source, e);
  }
}

// ---------------------------------------------------------------------------
// EVENTS — past occurrences
// ---------------------------------------------------------------------------

const EB_CATEGORIES = {
  '101': 'Business & Professional', '102': 'Science & Technology',
  '103': 'Music',                   '104': 'Film, Media & Entertainment',
  '105': 'Performing & Visual Arts','106': 'Fashion & Beauty',
  '107': 'Health & Wellness',       '108': 'Sports & Fitness',
  '109': 'Travel & Outdoor',        '110': 'Food & Drink',
  '111': 'Charity & Causes',        '112': 'Government & Politics',
  '113': 'Community & Culture',     '114': 'Religion & Spirituality',
  '115': 'Family & Education',      '116': 'Seasonal & Holiday',
  '117': 'Home & Lifestyle',        '118': 'Auto, Boat & Air',
  '119': 'Hobbies & Special Interest','120': 'School Activities',
  '199': 'Other',
};

const EB_FORMATS = {
  '1':   'Conference',              '2':  'Seminar or Talk',
  '3':   'Tradeshow or Expo',       '4':  'Convention',
  '5':   'Festival or Fair',        '6':  'Concert or Performance',
  '7':   'Screening',               '8':  'Dinner or Gala',
  '9':   'Class, Training, or Workshop', '10': 'Meeting or Networking Event',
  '11':  'Party or Social Gathering','12': 'Rally',
  '13':  'Tournament',              '14': 'Game or Competition',
  '15':  'Race or Endurance Event', '16': 'Tour',
  '17':  'Attraction',              '18': 'Camp, Trip, or Retreat',
  '19':  'Appearance or Signing',   '100': 'Other',
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

async function fetchEventbrite() {
  const source = 'eventbrite';
  const token = process.env.EVENTBRITE_PRIVATE_TOKEN;
  if (!token) return skipped(source, 'EVENTBRITE_PRIVATE_TOKEN not set');

  // Find the nearest store in dollartree.js and use its pre-curated venue IDs.
  // Eventbrite has no geo search API — venue IDs were discovered via web scrape + API resolution.
  const nearest = stores
    .map(s => ({ ...s, distMi: haversineMiles(LAT, LON, s.lat, s.lng) }))
    .sort((a, b) => a.distMi - b.distMi)[0];

  const venueIds = (nearest?.eventbriteVenueIds ?? []).map(v => v.id);
  if (!venueIds.length) return skipped(source, `No venue IDs found for nearest store (${nearest?.id ?? 'none'})`);

  console.error(`[past-7d] eventbrite: using ${venueIds.length} venues from store "${nearest.id}" (${nearest.distMi.toFixed(1)} mi away)`);

  const BASE    = 'https://www.eventbriteapi.com/v3';
  const headers = { Authorization: `Bearer ${token}` };

  try {
    // Fetch all venues in parallel — /venues/{id}/events/ accepts no query params
    const perVenue = await Promise.all(venueIds.map(async venueId => {
      const r = await timedFetch(`${BASE}/venues/${venueId}/events/`, { headers, timeoutMs: 30000 });
      if (!r.ok) return { venueId, error: `HTTP ${r.status}`, events: [] };
      return { venueId, events: r.body?.events ?? [] };
    }));

    // Flatten, filter to past 7-day window, dedupe by event ID
    const seen = new Set();
    const events = [];
    for (const { venueId, events: evs, error } of perVenue) {
      if (error) continue;
      for (const e of evs) {
        const date = (e.start?.utc ?? '').slice(0, 10);
        if (!inWindow(date)) continue;
        if (seen.has(e.id)) continue;
        seen.add(e.id);
        events.push({
          id:           e.id,
          name:         e.name?.text,
          date,
          start_local:  e.start?.local,
          start_utc:    e.start?.utc,
          end_local:    e.end?.local,
          status:       e.status,
          url:          e.url,
          venue_id:     venueId,
          is_free:      e.is_free,
          capacity:     e.capacity ?? null,
          category:     EB_CATEGORIES[e.category_id] ?? null,
          format:       EB_FORMATS[e.format_id] ?? null,
        });
      }
    }

    events.sort((a, b) => (a.start_utc ?? '').localeCompare(b.start_utc ?? ''));

    return wrap(source, {
      store_id:          nearest.id,
      store_name:        nearest.name,
      store_dist_mi:     parseFloat(nearest.distMi.toFixed(2)),
      venue_ids_queried: venueIds,
      note: 'Eventbrite has no geo search — venue IDs sourced from stores/dollartree.js. /venues/{id}/events/ returns all events; filtered client-side to the past 7-day window.',
      event_count: events.length,
      events,
    });
  } catch (e) {
    return errored(source, e);
  }
}

async function fetchMlb() {
  const source = 'mlb';
  try {
    const params = new URLSearchParams({
      sportId:   '1',
      season:    String(now.getFullYear()),
      gameType:  'R',
      startDate: MINUS7,
      endDate:   TODAY,
      fields:    'dates,date,games,gameDate,venue,name,teams,away,home,team,status,detailedState,officialDate',
    });
    const r = await timedFetch(
      `https://statsapi.mlb.com/api/v1/schedule?${params}`,
      { timeoutMs: 20000 }
    );
    if (!r.ok) return errored(source, `HTTP ${r.status}`);

    const games = [];
    for (const dateObj of (r.body?.dates ?? [])) {
      for (const g of (dateObj.games ?? [])) {
        games.push({
          date:              dateObj.date,
          game_datetime_utc: g.gameDate,
          away_team:         g.teams?.away?.team?.name,
          home_team:         g.teams?.home?.team?.name,
          venue_name:        g.venue?.name,
          status:            g.status?.detailedState,
        });
      }
    }

    return wrap(source, {
      season: now.getFullYear(),
      game_count: games.length,
      games,
    });
  } catch (e) {
    return errored(source, e);
  }
}

async function fetchNhl() {
  const source = 'nhl';
  try {
    // /v1/schedule/{date} returns a gameWeek covering ~7 days from that date
    const r = await timedFetch(`https://api-web.nhle.com/v1/schedule/${MINUS7}`);
    if (!r.ok) return errored(source, `HTTP ${r.status}`);

    const games = [];
    for (const week of (r.body?.gameWeek ?? [])) {
      const date = week.date;
      if (date < MINUS7 || date > TODAY) continue;
      for (const g of (week.games ?? [])) {
        games.push({
          date,
          start_time_utc:  g.startTimeUTC,
          game_type:       g.gameType === 2 ? 'regular' : g.gameType === 3 ? 'playoff' : String(g.gameType),
          away_team:       g.awayTeam?.abbrev,
          away_team_name:  g.awayTeam?.placeName?.default,
          home_team:       g.homeTeam?.abbrev,
          home_team_name:  g.homeTeam?.placeName?.default,
          venue_name:      g.venue?.default,
          game_state:      g.gameState,
          home_score:      g.homeTeam?.score ?? null,
          away_score:      g.awayTeam?.score ?? null,
        });
      }
    }

    return wrap(source, { game_count: games.length, games });
  } catch (e) {
    return errored(source, e);
  }
}

async function fetchNfl() {
  const source = 'nfl';
  const key = process.env.BALLDONTLIE_API_KEY;
  if (!key) return skipped(source, 'BALLDONTLIE_API_KEY not set');
  try {
    const season = now.getFullYear();
    const params = new URLSearchParams({
      'seasons[]': String(season),
      per_page:    '100',
    });
    const r = await timedFetch(
      `https://api.balldontlie.io/nfl/v1/games?${params}`,
      { headers: { Authorization: key }, timeoutMs: 30000 }
    );
    if (!r.ok) return errored(source, `HTTP ${r.status}`);
    // BallDontLie ignores date params — filter client-side
    const data = (r.body?.data ?? []).filter(g => inWindow((g.date ?? '').slice(0, 10)));

    return wrap(source, {
      game_count: data.length,
      games: data.map(g => ({
        date:             (g.date ?? '').slice(0, 10),
        week:             g.week,
        season:           g.season,
        away_team:        g.visitor_team?.full_name,
        away_team_abbrev: g.visitor_team?.abbreviation,
        home_team:        g.home_team?.full_name,
        home_team_abbrev: g.home_team?.abbreviation,
        venue:            g.venue,
        status:           g.status,
        home_score:       g.home_team_score ?? null,
        away_score:       g.visitor_team_score ?? null,
      })),
    });
  } catch (e) {
    return errored(source, e);
  }
}

async function fetchNba() {
  const source = 'nba';
  const key = process.env.BALLDONTLIE_API_KEY;
  if (!key) return skipped(source, 'BALLDONTLIE_API_KEY not set');
  try {
    const season = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
    const params = new URLSearchParams({
      'seasons[]': String(season),
      per_page:    '100',
    });
    const r = await timedFetch(
      `https://api.balldontlie.io/v1/games?${params}`,
      { headers: { Authorization: key }, timeoutMs: 30000 }
    );
    if (!r.ok) return errored(source, `HTTP ${r.status}`);
    // BallDontLie ignores date params — filter client-side
    const data = (r.body?.data ?? []).filter(g => inWindow((g.datetime ?? '').slice(0, 10)));

    return wrap(source, {
      game_count: data.length,
      note: 'No venue field available. Use home_team.city to match arena. For full venue name, cross-reference ESPN basketball/nba scoreboard.',
      games: data.map(g => ({
        datetime_utc:     g.datetime,
        date:             (g.datetime ?? '').slice(0, 10),
        away_team:        g.visitor_team?.full_name,
        away_team_abbrev: g.visitor_team?.abbreviation,
        home_team:        g.home_team?.full_name,
        home_team_abbrev: g.home_team?.abbreviation,
        home_city:        g.home_team?.city,
        status:           g.status,
        period:           g.period,
        home_score:       g.home_team_score ?? null,
        away_score:       g.visitor_team_score ?? null,
      })),
    });
  } catch (e) {
    return errored(source, e);
  }
}

async function fetchMls() {
  const source = 'mls';
  try {
    const r = await timedFetch(
      `https://site.api.espn.com/apis/site/v2/sports/soccer/usa.1/scoreboard?dates=${MINUS7_COMPACT}-${TODAY_COMPACT}&limit=100`,
      { timeoutMs: 20000 }
    );
    if (!r.ok) return errored(source, `HTTP ${r.status}`);
    const events = r.body?.events ?? [];

    return wrap(source, {
      game_count: events.length,
      games: events.map(e => {
        const comp  = e.competitions?.[0];
        const venue = comp?.venue;
        const competitors = comp?.competitors ?? [];
        const home = competitors.find(c => c.homeAway === 'home');
        const away = competitors.find(c => c.homeAway === 'away');
        return {
          date:             e.date?.slice(0, 10),
          datetime_utc:     e.date,
          name:             e.name,
          short_name:       e.shortName,
          away_team:        away?.team?.displayName,
          away_team_abbrev: away?.team?.abbreviation,
          home_team:        home?.team?.displayName,
          home_team_abbrev: home?.team?.abbreviation,
          venue_name:       venue?.fullName,
          venue_city:       venue?.address?.city,
          venue_state:      venue?.address?.state,
          status:           comp?.status?.type?.name,
          home_score:       home?.score ?? null,
          away_score:       away?.score ?? null,
        };
      }),
    });
  } catch (e) {
    return errored(source, e);
  }
}

async function fetchPredictHq() {
  const source = 'predicthq';
  const token = process.env.PREDICTHQ_TOKEN;
  if (!token) return skipped(source, 'PREDICTHQ_TOKEN not set');
  try {
    const LABELS = ['graduation', 'exam', 'academic-session'];
    const headers = { Authorization: `Bearer ${token}` };

    const results = {};
    for (const label of LABELS) {
      const params = new URLSearchParams({
        category:    'academic',
        country:     'US',
        'start.gte': MINUS7,
        'start.lte': TODAY,
        phq_label:   label,
        sort:        'start',
        limit:       '50',
      });
      const r = await timedFetch(
        `https://api.predicthq.com/v1/events/?${params}`,
        { headers, timeoutMs: 30000 }
      );
      if (!r.ok) return errored(source, `${label}: HTTP ${r.status}`);

      results[label] = {
        total:  r.body.count,
        events: (r.body.results ?? []).map(e => ({
          id:         e.id,
          title:      e.title,
          start_date: e.start_local?.slice(0, 10),
          end_date:   e.end_local?.slice(0, 10),
          attendance: e.phq_attendance,
          labels:     e.phq_labels?.map(l => l.label),
          city:       e.geo?.address?.locality,
          state:      e.geo?.address?.region,
          country:    e.geo?.address?.country_code,
          lat:        e.location?.[1],
          lon:        e.location?.[0],
        })),
      };
    }

    return wrap(source, results);
  } catch (e) {
    return errored(source, e);
  }
}

// ---------------------------------------------------------------------------
// Orchestrate — run all APIs in parallel
// ---------------------------------------------------------------------------
async function main() {
  console.error(`[past-7d] location=${LAT},${LON}  window=${MINUS7} → ${TODAY}`);

  const [
    // weather (observed)
    nwsObs, omHistorical, omAir, omFlood,
    // events (completed)
    eventbrite, mlb, nhl, nfl, nba, mls, predicthq,
  ] = await Promise.all([
    fetchNwsObservations(),
    fetchOpenMeteoHistorical(),
    fetchOpenMeteoAirQualityHistorical(),
    fetchOpenMeteoFloodHistorical(),
    fetchEventbrite(),
    fetchMlb(),
    fetchNhl(),
    fetchNfl(),
    fetchNba(),
    fetchMls(),
    fetchPredictHq(),
  ]);

  const output = {
    meta: {
      generated_at:   now.toISOString(),
      location:       { lat: LAT, lon: LON },
      lookback_window: { from: MINUS7, to: TODAY },
      env_keys_present: {
        EVENTBRITE_PRIVATE_TOKEN: !!process.env.EVENTBRITE_PRIVATE_TOKEN,
        BALLDONTLIE_API_KEY:      !!process.env.BALLDONTLIE_API_KEY,
        PREDICTHQ_TOKEN:          !!process.env.PREDICTHQ_TOKEN,
      },
    },

    weather: {
      // Actual observed conditions — what customers experienced
      nws_observations:        nwsObs,       // hourly station readings → daily aggregates
      open_meteo_historical:   omHistorical, // ERA5-blended daily + hourly actuals
      open_meteo_air_quality:  omAir,        // daily max AQI; high AQI correlates with mask/allergy-relief sales
      open_meteo_flood:        omFlood,      // historical river discharge; flood events → mops, tarps
    },

    events: {
      // Events that occurred — actual foot-traffic drivers
      eventbrite:   eventbrite,    // venue-based; requires EVENTBRITE_VENUE_IDS
      mlb:          mlb,
      nhl:          nhl,
      nfl:          nfl,
      nba:          nba,
      mls:          mls,
      predicthq:    predicthq,     // graduation weekends → balloon/banner/cup sales
    },

    mobility: {
      note: 'WZDx state feeds are live-only and do not provide historical work-zone data. Omitted from past-7d output.',
    },
  };

  // ---------------------------------------------------------------------------
  // Persist logs
  // ---------------------------------------------------------------------------
  const { mkdirSync, writeFileSync } = await import('fs');
  const { default: path } = await import('path');

  mkdirSync('logs', { recursive: true });

  const city = nwsObs.data?.location?.city?.toLowerCase().replace(/\s+/g, '-') ?? `${LAT}_${LON}`;
  const slug = `${city}-past7-ending-${TODAY}`;

  const rawPath = path.join('logs', `${slug}-raw.json`);
  writeFileSync(rawPath, JSON.stringify(output, null, 2));
  console.error(`[past-7d] raw  → ${rawPath}`);

  // Clean log — strip bulk arrays down to summaries, same philosophy as forecast-7d:
  //   1. Remove open_meteo_historical.hourly
  //   2. Remove hourly nested inside each air_quality daily entry
  //   3. Drop flood data if no abnormality (max discharge < 2× overall mean)
  //   4. Sports: replace games[] with date → game_count map (include final scores summary)
  //   5. PredictHQ: replace event arrays with label → total_count
  //   6. Ticketmaster: deduplicate by name, summarize by segment → genre → count
  //   7. NWS observations: keep daily aggregates only (drop raw observation_count detail)
  function clean(raw) {
    const c = JSON.parse(JSON.stringify(raw));

    // 1. Strip hourly from Open-Meteo historical
    if (c.weather.open_meteo_historical?.data) {
      delete c.weather.open_meteo_historical.data.hourly;
    }

    // 2. Strip hourly from each air quality daily entry
    if (c.weather.open_meteo_air_quality?.data?.daily) {
      for (const day of c.weather.open_meteo_air_quality.data.daily) {
        delete day.hourly;
      }
    }

    // 3. Summarise flood into per-day status + top-level worst-case status
    const floodDays = c.weather.open_meteo_flood?.data?.daily ?? [];
    if (floodDays.length > 0) {
      const days = floodDays.map(d => {
        const cur  = d.river_discharge_m3s;
        const mean = d.river_discharge_mean_m3s;
        const max  = d.river_discharge_max_m3s;
        if (cur == null || mean == null) return { date: d.date, status: 'no_data' };
        if (cur > mean * 2)   return { date: d.date, status: 'flooding',    reason: `current discharge ${(cur / mean).toFixed(1)}x above mean` };
        if (max > mean * 2)   return { date: d.date, status: 'flood_risk',  reason: `max ensemble ${(max / mean).toFixed(1)}x above mean` };
        return { date: d.date, status: 'normal' };
      });
      const priority = { flooding: 2, flood_risk: 1, normal: 0, no_data: -1 };
      const worstStatus = days.reduce((best, d) => (priority[d.status] ?? 0) > (priority[best] ?? 0) ? d.status : best, 'normal');
      c.weather.open_meteo_flood = {
        source: 'open-meteo-flood', ok: true,
        data: { status: worstStatus, days },
      };
    }

    // 4. Collapse each sport's games[] → date_game_count + scores summary
    const sports = ['mlb', 'nhl', 'nfl', 'nba', 'mls'];
    for (const sport of sports) {
      const s = c.events[sport];
      if (!s?.data?.games) continue;
      const map = {};
      for (const g of s.data.games) {
        const d = (g.date ?? g.datetime_utc ?? '').slice(0, 10);
        if (d) map[d] = (map[d] ?? 0) + 1;
      }
      s.data = { game_count: s.data.game_count, date_game_count: map };
    }

    // 5. PredictHQ: keep only label totals
    if (c.events.predicthq?.data) {
      const phq = c.events.predicthq.data;
      c.events.predicthq.data = Object.fromEntries(
        Object.entries(phq).map(([label, v]) => [label, v?.total ?? v])
      );
    }

    // 6. Eventbrite: replace events[] with date → count summary
    if (c.events.eventbrite?.data?.events) {
      const events = c.events.eventbrite.data.events;
      const byDate = {}, byType = {};
      for (const e of events) {
        if (e.date) byDate[e.date] = (byDate[e.date] ?? 0) + 1;
        const type = `${e.category ?? 'Unknown'} (${e.format ?? 'Unknown'})`;
        byType[type] = (byType[type] ?? 0) + 1;
      }
      c.events.eventbrite.data = {
        event_count: c.events.eventbrite.data.event_count,
        by_date:     byDate,
        by_type:     byType,
      };
    }

    return c;
  }

  const cleaned = clean(output);
  const cleanPath = path.join('logs', `${slug}-clean.json`);
  writeFileSync(cleanPath, JSON.stringify(cleaned, null, 2));
  console.error(`[past-7d] clean → ${cleanPath}`);

  console.log(JSON.stringify(cleaned, null, 2));
}

main().catch(err => { console.error(err); process.exit(1); });
