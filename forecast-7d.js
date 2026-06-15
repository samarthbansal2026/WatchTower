/**
 * forecast-7d.js — 7-day forward-looking data aggregator for dollar-store demand planning.
 *
 * Calls every API in categories.json that has forward-looking data and returns a single
 * structured object organized by category → source. Missing API keys produce a { skipped }
 * entry rather than crashing the whole run.
 *
 * Usage:
 *   node --env-file=.env forecast-7d.js [lat] [lon]
 *   node --env-file=.env forecast-7d.js 40.7128 -74.0060   # New York City
 *
 * Location defaults to Chicago, IL (a central US metro near many Dollar Tree stores).
 * All sports schedules are league-wide (not geo-filtered) — filter downstream by venue proximity.
 */

import { timedFetch } from './lib/test-runner.js';
import stores from './stores/dollartree.js';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const LAT = parseFloat(process.argv[2] ?? process.env.LAT ?? '41.8781');
const LON = parseFloat(process.argv[3] ?? process.env.LON ?? '-87.6298');

const now  = new Date();
const plus7 = new Date(now);
plus7.setDate(plus7.getDate() + 7);

const TODAY       = now.toISOString().slice(0, 10);           // YYYY-MM-DD
const PLUS7       = plus7.toISOString().slice(0, 10);
const TODAY_TM    = now.toISOString().split('.')[0] + 'Z';    // Ticketmaster ISO
const PLUS7_TM    = plus7.toISOString().split('.')[0] + 'Z';
const TODAY_COMPACT  = TODAY.replace(/-/g, '');               // YYYYMMDD (ESPN/NHL)
const PLUS7_COMPACT  = PLUS7.replace(/-/g, '');

const UA = 'watchtower-forecast-7d';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function inWindow(dateStr) {
  if (!dateStr) return false;
  const d = dateStr.slice(0, 10);
  return d >= TODAY && d <= PLUS7;
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
// WEATHER
// ---------------------------------------------------------------------------

async function fetchNwsForecast() {
  const source = 'noaa-nws-forecast';
  try {
    const r1 = await timedFetch(`https://api.weather.gov/points/${LAT},${LON}`, {
      headers: { 'User-Agent': UA, Accept: 'application/geo+json' },
    });
    if (!r1.ok) return errored(source, `points HTTP ${r1.status}`);
    const forecastUrl = r1.body?.properties?.forecast;
    const hourlyUrl   = r1.body?.properties?.forecastHourly;
    if (!forecastUrl) return errored(source, 'no properties.forecast in points response');

    const r2 = await timedFetch(forecastUrl, {
      headers: { 'User-Agent': UA, Accept: 'application/geo+json' },
    });
    if (!r2.ok) return errored(source, `forecast HTTP ${r2.status}`);
    const periods = r2.body?.properties?.periods ?? [];

    // 7-day window = 14 twice-daily periods
    const relevant = periods.filter(p => {
      const d = (p.startTime ?? '').slice(0, 10);
      return d >= TODAY && d <= PLUS7;
    });

    return wrap(source, {
      location: {
        city: r1.body.properties.relativeLocation?.properties?.city,
        state: r1.body.properties.relativeLocation?.properties?.state,
        lat: LAT, lon: LON,
      },
      office: r1.body.properties.cwa,
      periods: relevant.map(p => ({
        name:              p.name,             // "Tonight", "Monday", "Monday Night", …
        startTime:         p.startTime,
        endTime:           p.endTime,
        isDaytime:         p.isDaytime,
        temperature:       p.temperature,
        temperatureUnit:   p.temperatureUnit,
        windSpeed:         p.windSpeed,
        windDirection:     p.windDirection,
        shortForecast:     p.shortForecast,
        detailedForecast:  p.detailedForecast,
        probabilityOfPrecipitation: p.probabilityOfPrecipitation?.value,
        relativeHumidity:  p.relativeHumidity?.value,
      })),
    });
  } catch (e) {
    return errored(source, e);
  }
}

async function fetchNwsAlerts() {
  const source = 'noaa-nws-alerts';
  try {
    const r = await timedFetch(
      `https://api.weather.gov/alerts/active?point=${LAT},${LON}`,
      { headers: { 'User-Agent': UA, Accept: 'application/geo+json' } }
    );
    if (!r.ok) return errored(source, `HTTP ${r.status}`);
    const features = r.body?.features ?? [];
    return wrap(source, {
      count: features.length,
      alerts: features.map(f => ({
        event:       f.properties?.event,
        severity:    f.properties?.severity,
        urgency:     f.properties?.urgency,
        certainty:   f.properties?.certainty,
        headline:    f.properties?.headline,
        description: f.properties?.description,
        instruction: f.properties?.instruction,
        onset:       f.properties?.onset,
        expires:     f.properties?.expires,
        areaDesc:    f.properties?.areaDesc,
        senderName:  f.properties?.senderName,
      })),
    });
  } catch (e) {
    return errored(source, e);
  }
}

async function fetchOpenMeteoForecast() {
  const source = 'open-meteo-forecast';
  try {
    const url = `https://api.open-meteo.com/v1/forecast`
      + `?latitude=${LAT}&longitude=${LON}`
      + `&hourly=temperature_2m,precipitation,weather_code,relative_humidity_2m,apparent_temperature,wind_speed_10m`
      + `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,weather_code,wind_speed_10m_max,sunrise,sunset`
      + `&temperature_unit=fahrenheit&wind_speed_unit=mph`
      + `&timezone=auto&forecast_days=7`;
    const r = await timedFetch(url);
    if (!r.ok) return errored(source, `HTTP ${r.status}`);

    const d = r.body.daily;
    const h = r.body.hourly;

    // Build a clean daily summary (7 days)
    const daily = (d.time ?? []).map((date, i) => ({
      date,
      temp_high_f:              d.temperature_2m_max?.[i],
      temp_low_f:               d.temperature_2m_min?.[i],
      precipitation_mm:         d.precipitation_sum?.[i],
      precipitation_prob_pct:   d.precipitation_probability_max?.[i],
      weather_code:             d.weather_code?.[i],
      wind_speed_max_mph:       d.wind_speed_10m_max?.[i],
      sunrise:                  d.sunrise?.[i],
      sunset:                   d.sunset?.[i],
    }));

    // Hourly summary (168 hours = 7 days)
    const hourly = (h.time ?? []).slice(0, 168).map((time, i) => ({
      time,
      temp_f:               h.temperature_2m?.[i],
      feels_like_f:         h.apparent_temperature?.[i],
      precipitation_mm:     h.precipitation?.[i],
      weather_code:         h.weather_code?.[i],
      humidity_pct:         h.relative_humidity_2m?.[i],
      wind_speed_mph:       h.wind_speed_10m?.[i],
    }));

    return wrap(source, { timezone: r.body.timezone, daily, hourly });
  } catch (e) {
    return errored(source, e);
  }
}

async function fetchOpenMeteoEnsemble() {
  const source = 'open-meteo-ensemble';
  try {
    // ICON seamless: 40 members, ~7.5-day horizon
    const url = `https://ensemble-api.open-meteo.com/v1/ensemble`
      + `?latitude=${LAT}&longitude=${LON}`
      + `&hourly=temperature_2m,precipitation`
      + `&models=icon_seamless&timezone=auto&forecast_days=7`;
    const r = await timedFetch(url, { timeoutMs: 30000 });
    if (!r.ok) return errored(source, `HTTP ${r.status}`);

    const h = r.body.hourly;
    const times = h.time ?? [];

    // Collect all member keys for each variable
    const tempKeys  = Object.keys(h).filter(k => k.startsWith('temperature_2m'));
    const precipKeys = Object.keys(h).filter(k => k.startsWith('precipitation'));

    // Per time-step: compute p10 / p50 / p90 across members
    function percentiles(keys, idx) {
      const vals = keys.map(k => h[k]?.[idx]).filter(v => v != null).sort((a, b) => a - b);
      if (!vals.length) return { p10: null, p50: null, p90: null };
      return {
        p10: vals[Math.floor(vals.length * 0.10)],
        p50: vals[Math.floor(vals.length * 0.50)],
        p90: vals[Math.floor(vals.length * 0.90)],
      };
    }

    // Return daily-aggregated probabilistic summary (group by date)
    const byDate = {};
    times.slice(0, 180).forEach((t, i) => {
      const date = t.slice(0, 10);
      if (!byDate[date]) byDate[date] = { temp_samples: [], precip_samples: [] };
      tempKeys.forEach(k  => { const v = h[k]?.[i]; if (v != null) byDate[date].temp_samples.push(v); });
      precipKeys.forEach(k => { const v = h[k]?.[i]; if (v != null) byDate[date].precip_samples.push(v); });
    });

    function pct(arr, p) {
      if (!arr.length) return null;
      const s = [...arr].sort((a, b) => a - b);
      return s[Math.floor(s.length * p)];
    }

    const daily = Object.entries(byDate).slice(0, 7).map(([date, { temp_samples, precip_samples }]) => ({
      date,
      temp_f: {
        p10: pct(temp_samples, 0.10),
        p50: pct(temp_samples, 0.50),
        p90: pct(temp_samples, 0.90),
      },
      precip_mm: {
        p10: pct(precip_samples, 0.10),
        p50: pct(precip_samples, 0.50),
        p90: pct(precip_samples, 0.90),
      },
    }));

    return wrap(source, {
      model: 'icon_seamless',
      member_count: tempKeys.length,
      // "High confidence rain" = >75% of members show precip > 0 on a day
      daily_probabilistic: daily,
    });
  } catch (e) {
    return errored(source, e);
  }
}

async function fetchOpenMeteoAirQuality() {
  const source = 'open-meteo-air-quality';
  try {
    const url = `https://air-quality-api.open-meteo.com/v1/air-quality`
      + `?latitude=${LAT}&longitude=${LON}`
      + `&hourly=pm2_5,pm10,ozone,nitrogen_dioxide,carbon_monoxide,us_aqi`
      + `&timezone=auto&forecast_days=7`;
    const r = await timedFetch(url, { timeoutMs: 60000 });
    if (!r.ok) return errored(source, `HTTP ${r.status}`);

    const h = r.body.hourly;
    // Group hourly into daily max AQI for easy alerting
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
        pm2_5: pm,
        pm10: h.pm10?.[i],
        ozone: h.ozone?.[i],
        no2: h.nitrogen_dioxide?.[i],
        co: h.carbon_monoxide?.[i],
      });
    });

    const daily = Object.entries(byDate).slice(0, 7).map(([date, v]) => ({
      date,
      max_us_aqi:  v.max_aqi,
      max_pm2_5:   v.max_pm2_5,
      // AQI category: >150 = Unhealthy, >100 = Sensitive groups
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

async function fetchOpenMeteoFlood() {
  const source = 'open-meteo-flood';
  try {
    const url = `https://flood-api.open-meteo.com/v1/flood`
      + `?latitude=${LAT}&longitude=${LON}`
      + `&daily=river_discharge,river_discharge_mean,river_discharge_max,river_discharge_min`
      + `&forecast_days=7&timezone=auto`;
    let r;
    try {
      r = await timedFetch(url, { timeoutMs: 60000 });
    } catch {
      // Open-Meteo flood API rejects connections for locations without GloFAS river coverage
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
// EVENTS
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
  '1':   'Conference',               '2':  'Seminar or Talk',
  '3':   'Tradeshow or Expo',        '4':  'Convention',
  '5':   'Festival or Fair',         '6':  'Concert or Performance',
  '7':   'Screening',                '8':  'Dinner or Gala',
  '9':   'Class, Training, or Workshop', '10': 'Meeting or Networking Event',
  '11':  'Party or Social Gathering', '12': 'Rally',
  '13':  'Tournament',               '14': 'Game or Competition',
  '15':  'Race or Endurance Event',  '16': 'Tour',
  '17':  'Attraction',               '18': 'Camp, Trip, or Retreat',
  '19':  'Appearance or Signing',    '100': 'Other',
};

function haversineMilesEB(lat1, lon1, lat2, lon2) {
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

  const nearest = stores
    .map(s => ({ ...s, distMi: haversineMilesEB(LAT, LON, s.lat, s.lng) }))
    .sort((a, b) => a.distMi - b.distMi)[0];

  const venueIds = (nearest?.eventbriteVenueIds ?? []).map(v => v.id);
  if (!venueIds.length) return skipped(source, `No venue IDs found for nearest store (${nearest?.id ?? 'none'})`);

  console.error(`[forecast-7d] eventbrite: using ${venueIds.length} venues from store "${nearest.id}" (${nearest.distMi.toFixed(1)} mi away)`);

  const BASE    = 'https://www.eventbriteapi.com/v3';
  const headers = { Authorization: `Bearer ${token}` };

  try {
    const perVenue = await Promise.all(venueIds.map(async venueId => {
      const r = await timedFetch(`${BASE}/venues/${venueId}/events/`, { headers, timeoutMs: 30000 });
      if (!r.ok) return { venueId, error: `HTTP ${r.status}`, events: [] };
      return { venueId, events: r.body?.events ?? [] };
    }));

    const seen = new Set();
    const events = [];
    for (const { venueId, events: evs, error } of perVenue) {
      if (error) continue;
      for (const e of evs) {
        const date = (e.start?.utc ?? '').slice(0, 10);
        if (date < TODAY || date > PLUS7) continue;
        if (seen.has(e.id)) continue;
        seen.add(e.id);
        events.push({
          id:          e.id,
          name:        e.name?.text,
          date,
          start_local: e.start?.local,
          start_utc:   e.start?.utc,
          end_local:   e.end?.local,
          status:      e.status,
          url:         e.url,
          venue_id:    venueId,
          is_free:     e.is_free,
          capacity:    e.capacity ?? null,
          category:    EB_CATEGORIES[e.category_id] ?? null,
          format:      EB_FORMATS[e.format_id] ?? null,
        });
      }
    }

    events.sort((a, b) => (a.start_utc ?? '').localeCompare(b.start_utc ?? ''));

    return wrap(source, {
      store_id:          nearest.id,
      store_name:        nearest.name,
      store_dist_mi:     parseFloat(nearest.distMi.toFixed(2)),
      venue_ids_queried: venueIds,
      note: 'Eventbrite has no geo search — venue IDs sourced from stores/dollartree.js. /venues/{id}/events/ returns all events; filtered client-side to the 7-day forecast window.',
      event_count: events.length,
      events,
    });
  } catch (e) {
    return errored(source, e);
  }
}

async function fetchTicketmaster() {
  const source = 'ticketmaster';
  const key = process.env.TICKETMASTER_CONSUMER_KEY;
  if (!key) return skipped(source, 'TICKETMASTER_CONSUMER_KEY not set');

  // One call per day so each day gets its own 100-event budget.
  // A single 7-day call sorted by date gets exhausted by today's dense schedule in busy metros.
  function dayBounds(offsetDays) {
    const d = new Date(now);
    d.setDate(d.getDate() + offsetDays);
    const base = d.toISOString().slice(0, 10);
    return { start: base + 'T00:00:00Z', end: base + 'T23:59:59Z', date: base };
  }

  function mapEvent(e) {
    const venue = e._embedded?.venues?.[0];
    const cls   = e.classifications?.[0];
    return {
      id:             e.id,
      name:           e.name,
      date:           e.dates?.start?.localDate,
      time:           e.dates?.start?.localTime,
      datetime_utc:   e.dates?.start?.dateTime,
      status:         e.dates?.status?.code,
      venue_name:     venue?.name,
      venue_address:  venue?.address?.line1,
      venue_city:     venue?.city?.name,
      venue_state:    venue?.state?.stateCode,
      venue_lat:      venue?.location?.latitude,
      venue_lon:      venue?.location?.longitude,
      segment:        cls?.segment?.name,
      genre:          cls?.genre?.name,
      sub_genre:      cls?.subGenre?.name,
      expected_attendance: e.pleaseNote ?? null,
      url:            e.url,
      price_range:    e.priceRanges?.[0]
        ? { min: e.priceRanges[0].min, max: e.priceRanges[0].max, currency: e.priceRanges[0].currency }
        : null,
    };
  }

  try {
    const days = Array.from({ length: 7 }, (_, i) => dayBounds(i));

    // Fetch all 7 days in parallel
    const results = await Promise.all(days.map(async ({ start, end, date }) => {
      const params = new URLSearchParams({
        countryCode:   'US',
        latlong:       `${LAT},${LON}`,
        radius:        '25',
        unit:          'miles',
        startDateTime: start,
        endDateTime:   end,
        size:          '100',
        sort:          'date,asc',
        apikey:        key,
      });
      const r = await timedFetch(
        `https://app.ticketmaster.com/discovery/v2/events.json?${params}`,
        { timeoutMs: 45000 }
      );
      if (!r.ok) return { date, total: 0, events: [], error: `HTTP ${r.status}` };
      return {
        date,
        total:  r.body?.page?.totalElements ?? 0,
        events: (r.body?._embedded?.events ?? []).map(mapEvent),
      };
    }));

    const allEvents = results.flatMap(d => d.events);
    const totalAvailable = results.reduce((sum, d) => sum + d.total, 0);

    return wrap(source, {
      total_available: totalAvailable,
      radius_miles: 25,
      events: allEvents,
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
      startDate: TODAY,
      endDate:   PLUS7,
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
          date:        dateObj.date,
          game_datetime_utc: g.gameDate,
          away_team:   g.teams?.away?.team?.name,
          home_team:   g.teams?.home?.team?.name,
          venue_name:  g.venue?.name,
          status:      g.status?.detailedState,
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
    // /v1/schedule/{date} returns a gameWeek array covering ~7 days from that date
    const r = await timedFetch(`https://api-web.nhle.com/v1/schedule/${TODAY}`);
    if (!r.ok) return errored(source, `HTTP ${r.status}`);

    const games = [];
    for (const week of (r.body?.gameWeek ?? [])) {
      const date = week.date;
      if (date < TODAY || date > PLUS7) continue;
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
          game_state:      g.gameState,   // 'FUT' = not started
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
    // BallDontLie ignores start_date/end_date params — filter client-side
    const data = (r.body?.data ?? []).filter(g => inWindow((g.date ?? '').slice(0, 10)));

    return wrap(source, {
      game_count: data.length,
      games: data.map(g => ({
        date:         (g.date ?? '').slice(0, 10),
        week:         g.week,
        season:       g.season,
        away_team:    g.visitor_team?.full_name,
        away_team_abbrev: g.visitor_team?.abbreviation,
        home_team:    g.home_team?.full_name,
        home_team_abbrev: g.home_team?.abbreviation,
        venue:        g.venue,
        status:       g.status,
        home_score:   g.home_team_score ?? null,
        away_score:   g.visitor_team_score ?? null,
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
    // BallDontLie ignores start_date/end_date params — filter client-side
    const data = (r.body?.data ?? []).filter(g => inWindow((g.datetime ?? '').slice(0, 10)));

    return wrap(source, {
      game_count: data.length,
      // BallDontLie NBA has no venue field — home_team.city is the implicit arena city
      note: 'No venue field available. Use home_team.city to match arena. For full venue name, cross-reference ESPN basketball/nba scoreboard.',
      games: data.map(g => ({
        datetime_utc: g.datetime,
        date:         (g.datetime ?? '').slice(0, 10),
        away_team:    g.visitor_team?.full_name,
        away_team_abbrev: g.visitor_team?.abbreviation,
        home_team:    g.home_team?.full_name,
        home_team_abbrev: g.home_team?.abbreviation,
        home_city:    g.home_team?.city,      // use for arena geo-matching
        status:       g.status,
        period:       g.period,
        home_score:   g.home_team_score ?? null,
        away_score:   g.visitor_team_score ?? null,
      })),
    });
  } catch (e) {
    return errored(source, e);
  }
}

async function fetchMls() {
  const source = 'mls';
  try {
    // ESPN unofficial — no auth, full venue field
    const r = await timedFetch(
      `https://site.api.espn.com/apis/site/v2/sports/soccer/usa.1/scoreboard?dates=${TODAY_COMPACT}-${PLUS7_COMPACT}&limit=100`,
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
          date:           e.date?.slice(0, 10),
          datetime_utc:   e.date,
          name:           e.name,
          short_name:     e.shortName,
          away_team:      away?.team?.displayName,
          away_team_abbrev: away?.team?.abbreviation,
          home_team:      home?.team?.displayName,
          home_team_abbrev: home?.team?.abbreviation,
          venue_name:     venue?.fullName,
          venue_city:     venue?.address?.city,
          venue_state:    venue?.address?.state,
          status:         comp?.status?.type?.name,
          home_score:     home?.score ?? null,
          away_score:     away?.score ?? null,
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
        'start.gte': TODAY,
        'start.lte': PLUS7,
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
          id:            e.id,
          title:         e.title,
          start_date:    e.start_local?.slice(0, 10),
          end_date:      e.end_local?.slice(0, 10),
          attendance:    e.phq_attendance,
          labels:        e.phq_labels?.map(l => l.label),
          city:          e.geo?.address?.locality,
          state:         e.geo?.address?.region,
          country:       e.geo?.address?.country_code,
          lat:           e.location?.[1],
          lon:           e.location?.[0],
        })),
      };
    }

    return wrap(source, results);
  } catch (e) {
    return errored(source, e);
  }
}

// ---------------------------------------------------------------------------
// MOBILITY
// ---------------------------------------------------------------------------

// Haversine distance between two lat/lon points — returns miles.
function haversineMiles(lat1, lon1, lat2, lon2) {
  const R = 3958.8;
  const toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

// Rough bounding-box state detection for the states we have WZDx feeds for.
// Returns the 2-letter code or null if the store is in an uncovered state.
function detectState(lat, lon) {
  if (lat >= 40.5  && lat <= 45.1 && lon >= -79.8  && lon <= -71.8) return 'NY';
  if (lat >= 37.9  && lat <= 39.7 && lon >= -79.5  && lon <= -75.0) return 'MD';
  if (lat >= 45.5  && lat <= 49.1 && lon >= -124.8 && lon <= -116.9) return 'WA';
  if (lat >= 38.4  && lat <= 39.9 && lon >= -75.8  && lon <= -74.9) return 'DE';
  if (lat >= 28.9  && lat <= 33.1 && lon >= -94.1  && lon <= -88.8) return 'LA';
  if (lat >= 41.9  && lat <= 49.1 && lon >= -117.3 && lon <= -111.0) return 'ID';
  return null;
}

const WZDX_FEEDS = {
  NY: 'https://511ny.org/api/wzdx',
  MD: 'https://filter.ritis.org/wzdx_v4.1/mdot.geojson',
  WA: 'https://wzdx.wsdot.wa.gov/api/v4/WorkZoneFeed',
  DE: 'https://wzdx.e-dot.com/del_dot_feed_wzdx_v4.1.geojson',
  LA: 'https://wzdx.e-dot.com/la_dot_d_feed_wzdx_v4.1.geojson',
  ID: 'https://511.idaho.gov/api/wzdx',
};

const WZDX_RADIUS_MILES = 5;

async function fetchWzdxStates() {
  const source = 'wzdx-state-feeds';

  const state = detectState(LAT, LON);
  if (!state) {
    return wrap(source, {
      note: `No WZDx feed available for the state containing (${LAT}, ${LON}). Covered states: ${Object.keys(WZDX_FEEDS).join(', ')}`,
      work_zones: [],
    });
  }

  const feedUrl = WZDX_FEEDS[state];
  try {
    const r = await timedFetch(feedUrl, {
      timeoutMs: 20000,
      headers: { 'User-Agent': 'watchtower-wzdx/1.0 (work.samarthbansal@gmail.com)' },
    });
    if (!r.ok) return errored(source, `${state} feed HTTP ${r.status}`);

    let body = r.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { /* */ } }
    if (body?.type !== 'FeatureCollection' || !Array.isArray(body.features)) {
      return errored(source, `${state} feed: not a FeatureCollection`);
    }

    // Step 1: filter to 7-day window
    const inWindow = body.features.filter(f => {
      const props = f.properties;
      const start = props?.start_date ?? props?.core_details?.start_date;
      const end   = props?.end_date   ?? props?.core_details?.end_date;
      if (!end) return true;
      if (end < TODAY) return false;
      if (start && start > PLUS7) return false;
      return true;
    });

    // Step 2: filter to within WZDX_RADIUS_MILES of the store using Haversine.
    // GeoJSON coordinates are [lon, lat]. We check geometry_start and geometry_end;
    // if either endpoint is within range the work zone is considered nearby.
    function coordPairs(feature) {
      const coords = feature.geometry?.coordinates;
      if (!coords || !coords.length) return [];
      const type = feature.geometry?.type;
      if (type === 'LineString') return [coords[0], coords[coords.length - 1]];
      if (type === 'MultiPoint') return coords;          // [[lon,lat], [lon,lat], …]
      if (type === 'Point') return [coords];             // [lon, lat]
      return Array.isArray(coords[0]) ? [coords[0], coords[coords.length - 1]] : [coords];
    }

    function isNearby(feature) {
      for (const [fLon, fLat] of coordPairs(feature)) {
        if (typeof fLat !== 'number' || typeof fLon !== 'number') continue;
        if (haversineMiles(LAT, LON, fLat, fLon) <= WZDX_RADIUS_MILES) return true;
      }
      return false;
    }

    const nearby = inWindow.filter(isNearby);

    return wrap(source, {
      state,
      feed_url:     feedUrl,
      feed_version: body.feed_info?.version ?? body.road_event_feed_info?.version,
      publisher:    body.feed_info?.publisher ?? body.road_event_feed_info?.publisher,
      radius_miles: WZDX_RADIUS_MILES,
      total_in_state_window: inWindow.length,
      total_near_store:      nearby.length,
      work_zones: nearby.map(f => {
        const p  = f.properties;
        const cd = p?.core_details ?? p;
        const pairs = coordPairs(f);
        return {
          road_name:         cd.road_names?.[0] ?? p.road_name,
          direction:         cd.direction,
          start_date:        cd.start_date ?? p.start_date,
          end_date:          cd.end_date   ?? p.end_date,
          description:       cd.description ?? p.short_description,
          types_of_work:     p.types_of_work?.map(t => t.type_name) ?? [],
          lane_restrictions: p.restrictions?.map(r => r.restriction_type) ?? [],
          geometry_type:     f.geometry?.type,
          geometry_start:    pairs[0] ?? null,
          geometry_end:      pairs[pairs.length - 1] ?? null,
          distance_miles:    (() => {
            let min = Infinity;
            for (const [fLon, fLat] of pairs) {
              if (typeof fLat !== 'number') continue;
              const d = haversineMiles(LAT, LON, fLat, fLon);
              if (d < min) min = d;
            }
            return min === Infinity ? null : parseFloat(min.toFixed(2));
          })(),
        };
      }).sort((a, b) => (a.distance_miles ?? 99) - (b.distance_miles ?? 99)),
    });
  } catch (e) {
    return errored(source, e);
  }
}

// WSDOT commented out — WA-state only, not relevant for most store locations.
// Uncomment fetchWsdot() and restore it to Promise.all + output.mobility when needed.
/*
async function fetchWsdot() { ... }
*/

// ---------------------------------------------------------------------------
// Orchestrate — run all APIs in parallel per category
// ---------------------------------------------------------------------------
async function main() {
  console.error(`[forecast-7d] location=${LAT},${LON}  window=${TODAY} → ${PLUS7}`);

  const [
    // weather
    nwsForecast, nwsAlerts, omForecast, omEnsemble, omAir, omFlood,
    // events
    ticketmaster, eventbrite, mlb, nhl, nfl, nba, mls, predicthq,
    // mobility
    wzdxStates,
  ] = await Promise.all([
    fetchNwsForecast(),
    fetchNwsAlerts(),
    fetchOpenMeteoForecast(),
    fetchOpenMeteoEnsemble(),
    fetchOpenMeteoAirQuality(),
    fetchOpenMeteoFlood(),
    fetchTicketmaster(),
    fetchEventbrite(),
    fetchMlb(),
    fetchNhl(),
    fetchNfl(),
    fetchNba(),
    fetchMls(),
    fetchPredictHq(),
    fetchWzdxStates(),
  ]);

  const output = {
    meta: {
      generated_at:    now.toISOString(),
      location:        { lat: LAT, lon: LON },
      forecast_window: { from: TODAY, to: PLUS7 },
      env_keys_present: {
        TICKETMASTER_CONSUMER_KEY: !!process.env.TICKETMASTER_CONSUMER_KEY,
        EVENTBRITE_PRIVATE_TOKEN:  !!process.env.EVENTBRITE_PRIVATE_TOKEN,
        BALLDONTLIE_API_KEY:       !!process.env.BALLDONTLIE_API_KEY,
        PREDICTHQ_TOKEN:           !!process.env.PREDICTHQ_TOKEN,
      },
    },

    weather: {
      // Drives impulse purchases (umbrellas, fans, hand-warmers) and foot traffic volume
      nws_forecast:   nwsForecast,
      nws_alerts:     nwsAlerts,
      open_meteo_forecast:  omForecast,
      open_meteo_ensemble:  omEnsemble,   // probabilistic — use for stocking confidence
      open_meteo_air_quality: omAir,      // high AQI → masks, allergy-relief spike
      open_meteo_flood:     omFlood,      // stores near rivers — mops, tarps, water
    },

    events: {
      // Predictable foot-traffic surges near venues → party supplies, snacks, drinks
      ticketmaster:  ticketmaster,   // concerts, festivals, comedy — 25-mile radius
      eventbrite:    eventbrite,     // venue-based; category + format resolved
      mlb:           mlb,            // ~10 games/day league-wide during season
      nhl:           nhl,            // Oct–Jun; full venue field
      nfl:           nfl,            // Sundays; largest single-day spikes
      nba:           nba,            // Oct–Jun; use home_city for arena matching
      mls:           mls,            // Feb–Nov; full venue field via ESPN
      predicthq:     predicthq,      // graduation weekends → balloons, banners, cups
    },

    mobility: {
      // Road closures within 5 miles of the store — affects access and delivery routing
      wzdx_state_feeds: wzdxStates,
    },
  };

  // ---------------------------------------------------------------------------
  // Persist logs
  // ---------------------------------------------------------------------------
  const { mkdirSync, writeFileSync } = await import('fs');
  const { default: path } = await import('path');

  mkdirSync('logs', { recursive: true });

  // Derive a short location slug from NWS city name or lat/lon fallback
  const city = nwsForecast.data?.location?.city?.toLowerCase().replace(/\s+/g, '-') ?? `${LAT}_${LON}`;
  const slug = `${city}-${TODAY}`;

  // Raw log — everything as fetched
  const rawPath = path.join('logs', `${slug}-raw.json`);
  writeFileSync(rawPath, JSON.stringify(output, null, 2));
  console.error(`[forecast-7d] raw  → ${rawPath}`);

  // Clean log — trimmed per user spec:
  //   1. Remove open_meteo_forecast.hourly
  //   2. Remove open_meteo_ensemble.daily_probabilistic
  //   3. Remove hourly nested inside each air_quality daily entry
  //   4. Drop open_meteo_flood if no abnormality (max discharge < 2× mean across all days)
  //   5. Sports: replace games[] with date → game_count map
  //   6. PredictHQ: replace event arrays with label → total_count
  //   7. Ticketmaster: deduplicate by event name, then summarize by segment → genre → count
  function clean(raw) {
    const c = JSON.parse(JSON.stringify(raw)); // deep clone

    // 1. Strip hourly from Open-Meteo forecast
    if (c.weather.open_meteo_forecast?.data) {
      delete c.weather.open_meteo_forecast.data.hourly;
    }

    // 2. Strip daily_probabilistic from ensemble
    if (c.weather.open_meteo_ensemble?.data) {
      delete c.weather.open_meteo_ensemble.data.daily_probabilistic;
    }

    // 3. Strip hourly from each air quality daily entry
    if (c.weather.open_meteo_air_quality?.data?.daily) {
      for (const day of c.weather.open_meteo_air_quality.data.daily) {
        delete day.hourly;
      }
    }

    // 4. Summarise flood into per-day status + top-level worst-case status
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

    // 5. Collapse each sport's games[] → { date_game_count: { "YYYY-MM-DD": N } }
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

    // 6. PredictHQ: keep only label totals
    if (c.events.predicthq?.data) {
      const phq = c.events.predicthq.data;
      c.events.predicthq.data = Object.fromEntries(
        Object.entries(phq).map(([label, v]) => [label, v?.total ?? v])
      );
    }

    // 7. Ticketmaster: dedupe by name, then summarize by segment → genre → sub_genre → count
    if (c.events.ticketmaster?.data?.events) {
      const events = c.events.ticketmaster.data.events;

      // Filter to events actually occurring within the 7-day window (API returns flex/season
      // tickets still on sale whose event date may be in the past)
      const inRange = events.filter(e => e.date >= TODAY && e.date <= PLUS7);

      // Deduplicate: keep first occurrence of each unique event name
      const seen = new Set();
      const deduped = inRange.filter(e => {
        if (seen.has(e.name)) return false;
        seen.add(e.name);
        return true;
      });

      // Build segment → genre → sub_genre → count hierarchy
      // Drop any level that is null, 'Unknown', 'Undefined', or 'Miscellaneous'
      const JUNK = new Set(['Unknown', 'Undefined', 'Miscellaneous']);
      const bySegment = {};
      for (const e of deduped) {
        const seg = e.segment;
        const gen = e.genre;
        const sub = e.sub_genre;
        if (!seg || !gen || !sub) continue;
        if (JUNK.has(seg) || JUNK.has(gen) || JUNK.has(sub)) continue;
        if (!bySegment[seg]) bySegment[seg] = {};
        if (!bySegment[seg][gen]) bySegment[seg][gen] = {};
        bySegment[seg][gen][sub] = (bySegment[seg][gen][sub] ?? 0) + 1;
      }

      // Date → count of unique events
      const byDate = {};
      for (const e of deduped) {
        if (e.date) byDate[e.date] = (byDate[e.date] ?? 0) + 1;
      }

      c.events.ticketmaster.data = {
        total_available:  c.events.ticketmaster.data.total_available,
        unique_events:    deduped.length,
        radius_miles:     c.events.ticketmaster.data.radius_miles,
        by_date:          byDate,
        by_segment:       bySegment,
      };
    }

    // 8. Eventbrite: replace events[] with by_date + by_type (category | format combined)
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

    // 10. Hide mobility — full work zone list stays in raw log only
    delete c.mobility;

    return c;
  }

  const cleaned = clean(output);
  const cleanPath = path.join('logs', `${slug}-clean.json`);
  writeFileSync(cleanPath, JSON.stringify(cleaned, null, 2));
  console.error(`[forecast-7d] clean → ${cleanPath}`);

  // Print the clean version to stdout
  console.log(JSON.stringify(cleaned, null, 2));
}

main().catch(err => { console.error(err); process.exit(1); });
