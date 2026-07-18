/**
 * social-7d.js — 7-day look-back social chatter aggregator.
 *
 * Pulls recent social media posts mentioning Dollar Tree + store-local terms
 * from Reddit, Twitter/X, TikTok, and Instagram (YouTube disabled — low value,
 * see scratch/test-youtube-croma-v*.js) via SociaVault by default.
 *
 * reddit/twitter/tiktok can instead be sourced from RapidAPI (--source=rapidapi)
 * when SociaVault credits are exhausted — see fetchRedditRapid/fetchTwitterRapid/
 * fetchTikTokRapid. Instagram always uses SociaVault; no RapidAPI equivalent is wired in.
 *
 * Instagram runs account-level (not keyword search) and is currently only
 * configured for Croma — India has no TikTok, so its own posts/comments fill
 * that gap. See STORE_CONFIG.instagramHandle and fetchInstagram().
 *
 * Usage:
 *   node --env-file=.env social-7d.js                            # all stores, all platforms
 *   node --env-file=.env social-7d.js 40.8002 -73.9388            # single lat/lon
 *   node --env-file=.env social-7d.js --only=instagram            # all stores, one platform
 *   node --env-file=.env social-7d.js --store=delhi-croma-odeon-cp --only=instagram
 *   node --env-file=.env social-7d.js --source=rapidapi --only=reddit,twitter,tiktok
 *
 * Credentials required (in .env):
 *   SOCIAVAULT_API_KEY — https://sociavault.com (free tier: 50 credits)
 *   RAPIDAPI_KEY       — https://rapidapi.com (only needed for --source=rapidapi)
 *
 * Output:
 *   logs/<city>-social7-ending-<date>-raw.json   — full response data
 *   logs/<city>-social7-ending-<date>-clean.json — summaries only
 */

import { timedFetch } from './lib/test-runner.js';
import stores from './stores/portfolio.js';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
let LAT = parseFloat(process.argv[2] ?? process.env.LAT ?? '41.8781');
let LON = parseFloat(process.argv[3] ?? process.env.LON ?? '-87.6298');

// Source for reddit/twitter/tiktok: 'sociavault' (default) or 'rapidapi'.
// Selected via --source=rapidapi. Instagram always uses SociaVault (no RapidAPI equivalent wired in).
let SOURCE = 'sociavault';

const now = new Date();
const minus7 = new Date(now);
minus7.setDate(minus7.getDate() - 7);

const TODAY  = now.toISOString().slice(0, 10);
const MINUS7 = minus7.toISOString().slice(0, 10);

const SOCIAVAULT_BASE = 'https://api.sociavault.com/v1/scrape';

// ---------------------------------------------------------------------------
// Per-store search config — tuned from 25+ credits of live API testing.
//
// Key findings that shaped these queries:
//   Reddit:  broad topic queries beat geo-specific ones. "dollar store NYC complaint"
//            surfaced r/DollarTree, r/dollartreebeauty, r/AskNYC, r/povertyfinance.
//            Geo-specific ("Dollar Tree East Harlem") returned mostly noise.
//   Twitter: exact-phrase "Dollar Tree" + operator words returned 20 tweets each.
//            "Dollar Tree NYC" hit a tweet literally about East Harlem.
//   TikTok:  keyword search returns 30 videos/query. Geo+brand combos worked —
//            "Dollar Tree haul NYC" returned a video tagged #harlem #dollartreehaul.
//   YouTube: broad queries return 20 videos + 25 shorts. Haul/review content is rich.
//
// Budget: ~14 queries/store × 4 platforms = ~56 credits/store, ~168 for all 3.
// ---------------------------------------------------------------------------
const STORE_CONFIG = {
  'nyc-herald-square': {
    brand: 'Dollar Tree',
    generic: 'dollar store',
    geo: ['NYC', 'New York', 'East Harlem', 'Harlem'],
    city: 'NYC',
    competitors: ['Dollar General', 'Family Dollar'],
  },
  'burlington-nc-church-st': {
    brand: 'Dollar Tree',
    generic: 'dollar store',
    geo: ['Burlington NC', 'Burlington', 'Church Street'],
    city: 'Burlington NC',
    competitors: ['Dollar General', 'Family Dollar'],
  },
  'orlando-fl-intl-drive': {
    brand: 'Dollar Tree',
    generic: 'dollar store',
    geo: ['Orlando', 'International Drive', 'I-Drive'],
    city: 'Orlando',
    competitors: ['Dollar General', 'Family Dollar', 'Five Below'],
  },
  'dallas-tx-stemmons-fwy': {
    brand: 'Cavender\'s',
    generic: 'western wear',
    geo: ['Dallas', 'Stemmons Fwy', 'Market Center'],
    city: 'Dallas',
    competitors: ['Boot Barn', 'Sheplers'],
  },
  'stl-savealot-rock-road': {
    brand: 'Save A Lot',
    generic: 'grocery store',
    geo: ['St. Louis', 'St Charles Rock Rd', 'MO'],
    city: 'St. Louis',
    competitors: ['Aldi', 'Schnucks'],
  },
  'delhi-croma-odeon-cp': {
    brand: 'Croma',
    generic: 'electronics store',
    geo: ['New Delhi', 'Connaught Place', 'CP', 'Rajiv Chowk'],
    city: 'New Delhi',
    competitors: ['Vijay Sales', 'Reliance Digital'],
    // India has no TikTok — Instagram (posts + comments) is the substitute short-video signal.
    // See scratch/test-instagram-sociavault-v*.js for the endpoint testing that led here.
    instagramHandle: 'croma.retail',
    // Verified via instagram/profile (not guessed): reliancedigital/vijaysales are squatted by
    // unrelated small accounts. Real ones confirmed 2026-07-01 — reliance_digital (1.36M, verified),
    // vijaysalesofficial (151K, verified).
    instagramCompetitorHandles: ['reliance_digital', 'vijaysalesofficial'],
  },
  'mooresville-nc-center-square': {
    brand: 'Lowes Foods',
    generic: 'grocery store',
    geo: ['Mooresville', 'Mooresville NC', 'Center Square', 'Lake Norman'],
    city: 'Mooresville',
    competitors: ['Harris Teeter', 'Food Lion'],
  },
  'arden-nc-airport-rd': {
    brand: 'Ingles',
    generic: 'grocery store',
    geo: ['Arden NC', 'Arden', 'Airport Road', 'Asheville'],
    city: 'Arden NC',
    competitors: ['Publix', 'Harris Teeter'],
  },
  'la-la-cienega-735': {
    brand: 'Smart & Final',
    generic: 'warehouse grocery store',
    geo: ['La Cienega', 'Los Angeles', 'West Hollywood', 'Mid-City LA'],
    city: 'La Cienega, LA',
    competitors: ['Ralphs', 'Grocery Outlet'],
  },
  'la-lincoln-heights-511': {
    brand: 'Smart & Final',
    generic: 'warehouse grocery store',
    geo: ['Lincoln Heights', 'Los Angeles', 'Northeast LA'],
    city: 'Lincoln Heights, LA',
    competitors: ['Ralphs', 'Grocery Outlet'],
  },
  'glendale-verdugo-304': {
    brand: 'Smart & Final',
    generic: 'warehouse grocery store',
    geo: ['Glendale', 'Verdugo Rd', 'Los Angeles'],
    city: 'Glendale, CA',
    competitors: ['Ralphs', 'Grocery Outlet'],
  },
  'la-midtown-444': {
    brand: 'Smart & Final',
    generic: 'warehouse grocery store',
    geo: ['Midtown LA', 'Pico Blvd', 'Los Angeles', 'Miracle Mile'],
    city: 'Midtown LA',
    competitors: ['Ralphs', 'Grocery Outlet'],
  },
  'la-s-figueroa-484': {
    brand: 'Smart & Final',
    generic: 'warehouse grocery store',
    geo: ['South Figueroa', 'Downtown LA', 'DTLA', 'Los Angeles'],
    city: 'DTLA',
    competitors: ['Ralphs', 'Grocery Outlet'],
  },
  'raleigh-nc-millbrook-advance': {
    brand: 'Advance Auto Parts',
    generic: 'auto parts store',
    geo: ['Raleigh', 'Millbrook', 'Raleigh NC'],
    city: 'Raleigh NC',
    competitors: ['AutoZone', "O'Reilly Auto Parts"],
  },
  'nyc-5th-ave-five-below': {
    brand: 'Five Below',
    generic: 'value store',
    geo: ['NYC', 'New York', 'Midtown Manhattan', '5th Ave'],
    city: 'NYC',
    competitors: ['Dollar Tree', 'Target'],
  },
  'laurel-md-corridor-total-wine': {
    brand: 'Total Wine & More',
    generic: 'wine and liquor store',
    geo: ['Laurel MD', 'Laurel', 'Corridor Marketplace'],
    city: 'Laurel MD',
    competitors: ['BevMo', "ABC Fine Wine & Spirits"],
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function wrap(source, data) {
  return { source, ok: true, data };
}

function skipped(source, reason) {
  return { source, ok: true, skipped: true, reason, data: null };
}

function errored(source, error) {
  return { source, ok: false, error: String(error), data: null };
}

function findNearestStore(lat, lon) {
  const toRad = d => d * Math.PI / 180;
  function haversineMiles(lat1, lon1, lat2, lon2) {
    const R = 3958.8;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2
      + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.asin(Math.sqrt(a));
  }
  return stores
    .map(s => ({ ...s, distMi: haversineMiles(lat, lon, s.lat, s.lng) }))
    .sort((a, b) => a.distMi - b.distMi)[0];
}

// ---------------------------------------------------------------------------
// Platform-specific query builders.
// Each returns [{ label, query }] tuned to what actually worked in testing.
// ---------------------------------------------------------------------------

function redditQueries(storeId) {
  const cfg = STORE_CONFIG[storeId];
  if (!cfg) return [];
  const city = cfg.city;
  return [
    { label: 'brand+geo',         query: `${cfg.brand} ${city}` },
    { label: 'brand+geo',         query: `${cfg.generic} ${city}` },
    { label: 'brand+sentiment',   query: `${cfg.generic} ${city} complaint` },
    { label: 'brand+praise',      query: `${cfg.brand} ${city} praise love` },
    { label: 'brand+restock',     query: `${cfg.generic} complaint restock` },
    { label: 'brand+requests',    query: `${cfg.generic} request wish` },
    { label: 'brand+haul',        query: `${cfg.brand} haul finds` },
    // Competitor — tested: gives context on why shoppers choose DT vs others
    { label: 'competitor+geo',    query: `${cfg.competitors[0]} ${city}` },
    { label: 'competitor+geo',    query: `${cfg.competitors[1]} ${city}` },
  ];
}

function twitterQueries(storeId) {
  const cfg = STORE_CONFIG[storeId];
  if (!cfg) return [];
  const city = cfg.city;
  return [
    { label: 'brand+geo',         query: `"${cfg.brand}" ${city}` },
    { label: 'brand+complaint',   query: `"${cfg.brand}" complaint OR dirty OR worst OR closed` },
    { label: 'brand+praise',      query: `"${cfg.brand}" love OR great OR best OR amazing` },
    { label: 'brand+restock',     query: `"${cfg.brand}" restock OR "in stock" OR "new finds"` },
    { label: 'brand+requests',    query: `"${cfg.brand}" wish OR need OR request OR "should carry"` },
    // Competitor — how people compare them
    { label: 'competitor',        query: `"${cfg.competitors[0]}" OR "${cfg.competitors[1] ?? cfg.competitors[0]}" ${city}` },
  ];
}

// TikTok geo queries — unique per store (3 credits/store)
function tiktokQueries(storeId) {
  const cfg = STORE_CONFIG[storeId];
  if (!cfg) return [];
  const city = cfg.city;
  return [
    { label: 'brand+geo',         query: `${cfg.brand} haul ${city}` },
    { label: 'brand+geo',         query: `${cfg.brand} ${city}` },
    { label: 'competitor',        query: `${cfg.competitors[0]} ${city}` },
  ];
}

// TikTok global queries — same results regardless of store, run once (3 credits total)
function tiktokGlobalQueries(brand = 'Dollar Tree') {
  return [
    { label: 'brand+haul',        query: `${brand} haul finds` },
    { label: 'brand+restock',     query: `${brand} restock` },
    { label: 'brand+complaint',   query: `${brand} complaint` },
  ];
}

// Instagram — one query per store (returns the configured handle + competitor
// handles, if any). Not a keyword search: instagram/posts pulls each account's
// own grid (reels + photos + carousels already carry engagement stats), and
// instagram/comments pulls customer voice off Croma's top post. Competitors
// are fetched profile+posts only (no comments) — benchmarking cadence/reach,
// same intent as the "competitor" queries on Reddit/Twitter/TikTok.
// See fetchInstagram() below.
function instagramQueries(storeId) {
  const cfg = STORE_CONFIG[storeId];
  if (!cfg?.instagramHandle) return [];
  return [
    { label: 'handle', query: cfg.instagramHandle },
    ...(cfg.instagramCompetitorHandles ?? []).map(h => ({ label: 'competitor', query: h })),
  ];
}

function youtubeQueries(storeId) {
  const cfg = STORE_CONFIG[storeId];
  if (!cfg) return [];
  const city = cfg.city;
  return [
    { label: 'brand+geo',         query: `${cfg.brand} haul ${city}` },
    { label: 'brand+geo',         query: `${cfg.brand} ${city} 2026` },
    { label: 'brand+review',      query: `${cfg.brand} review complaint` },
    { label: 'brand+haul',        query: `${cfg.brand} restock new finds` },
  ];
}

// ---------------------------------------------------------------------------
// SociaVault fetch helper
// ---------------------------------------------------------------------------
let creditsExhausted = false;

async function sociaFetch(endpoint, params) {
  if (creditsExhausted) return { ok: false, status: 402, body: null, ms: 0 };
  const key = process.env.SOCIAVAULT_API_KEY;
  const qs = new URLSearchParams(params);
  const url = `${SOCIAVAULT_BASE}/${endpoint}?${qs}`;
  // Reddit is consistently slow (7-15s/query in testing); others are fast (<5s)
  const isReddit = endpoint.startsWith('reddit');
  const r = await timedFetch(url, {
    headers: { 'x-api-key': key },
    timeoutMs: isReddit ? 45000 : 30000,
  });
  if (r.status === 402) {
    creditsExhausted = true;
    console.error(`[social-7d] Credits exhausted — skipping remaining queries`);
  }
  return r;
}

// ---------------------------------------------------------------------------
// RapidAPI fetch helper — alternate source for reddit/twitter/tiktok, selected
// via --source=rapidapi (default remains SociaVault). One account key
// (X-RapidAPI-Key), a different host per subscribed API.
// ---------------------------------------------------------------------------
async function rapidFetch(host, path, params, timeoutMs = 30000) {
  const key = process.env.RAPIDAPI_KEY;
  const qs = new URLSearchParams(params);
  const url = `https://${host}/${path}?${qs}`;
  return timedFetch(url, {
    headers: { 'x-rapidapi-host': host, 'x-rapidapi-key': key },
    timeoutMs,
  });
}

// ---------------------------------------------------------------------------
// Reddit — /reddit/search
// Posts returned as object keyed by index, not array.
// ---------------------------------------------------------------------------
async function fetchReddit(queries) {
  const source = 'reddit';
  const key = process.env.SOCIAVAULT_API_KEY;
  if (!key) return skipped(source, 'SOCIAVAULT_API_KEY not set');

  try {
    const allPosts = [];
    const seen = new Set();
    let creditsUsed = 0;

    for (const { label, query } of queries) {
      // Geo queries: recent posts sorted by new. Sentiment/haul/competitor: relevance over a wider window.
      const isGeo = label === 'brand+geo';
      let r;
      try {
        r = await sociaFetch('reddit/search', {
          query,
          sort: isGeo ? 'new' : 'relevance',
          timeframe: isGeo ? 'week' : 'year',
        });
      } catch (e) {
        console.error(`[social-7d] reddit "${query}" → ${e.name ?? 'Error'}: ${e.message}`);
        continue;
      }
      creditsUsed += 1;

      if (!r.ok) {
        if (!creditsExhausted) console.error(`[social-7d] reddit "${query}" → HTTP ${r.status}`);
        continue;
      }

      const posts = Object.values(r.body?.data?.posts ?? {});
      for (const p of posts) {
        if (seen.has(p.id)) continue;
        seen.add(p.id);
        allPosts.push({
          id:        p.id,
          subreddit: p.subreddit,
          author:    p.author,
          title:     p.title,
          selftext:  (p.selftext ?? '').slice(0, 500),
          score:     p.score,
          num_comments: p.num_comments,
          created_utc:  p.created_utc,
          url:       p.url,
          query_label: label,
          query_used:  query,
        });
      }

      await new Promise(r => setTimeout(r, 300));
    }

    return wrap(source, {
      credits_used: creditsUsed,
      post_count: allPosts.length,
      posts: allPosts,
    });
  } catch (e) {
    return errored(source, e);
  }
}

// ---------------------------------------------------------------------------
// Reddit (RapidAPI alternate) — Reddit Search (vibe max): GET /posts/search
// Flat array response, unlike SociaVault's indexed-object shape.
// Gotcha: rapid consecutive calls can trip "Too many follow-up requests" —
// keep the 300ms pacing delay between queries.
// ---------------------------------------------------------------------------
async function fetchRedditRapid(queries) {
  const source = 'reddit';
  const key = process.env.RAPIDAPI_KEY;
  if (!key) return skipped(source, 'RAPIDAPI_KEY not set');

  const host = 'reddit-search2.p.rapidapi.com';
  try {
    const allPosts = [];
    const seen = new Set();
    let creditsUsed = 0;

    for (const { label, query } of queries) {
      const isGeo = label === 'brand+geo';
      let r;
      try {
        r = await rapidFetch(host, 'posts/search', {
          query,
          sort: isGeo ? 'new' : 'relevance',
          time: isGeo ? 'week' : 'year',
        });
      } catch (e) {
        console.error(`[social-7d] reddit "${query}" → ${e.name ?? 'Error'}: ${e.message}`);
        continue;
      }
      creditsUsed += 1;

      if (!r.ok || r.body?.status === false) {
        console.error(`[social-7d] reddit "${query}" → HTTP ${r.status} ${r.body?.message ?? ''}`);
        continue;
      }

      const posts = r.body?.data ?? [];
      for (const p of posts) {
        if (seen.has(p.id)) continue;
        seen.add(p.id);
        allPosts.push({
          id:        p.id,
          subreddit: p.subreddit?.name ?? null,
          author:    p.authorInfo?.name ?? null,
          title:     p.postTitle,
          selftext:  (typeof p.content === 'string' ? p.content : '').slice(0, 500),
          score:     p.score,
          num_comments: p.commentCount,
          created_utc:  p.createdAt,
          url:       p.permalink ? `https://www.reddit.com${p.permalink}` : p.url,
          query_label: label,
          query_used:  query,
        });
      }

      await new Promise(r => setTimeout(r, 300));
    }

    return wrap(source, {
      credits_used: creditsUsed,
      post_count: allPosts.length,
      posts: allPosts,
    });
  } catch (e) {
    return errored(source, e);
  }
}

// ---------------------------------------------------------------------------
// Twitter — /twitter/search
// Deeply nested timeline structure.
// ---------------------------------------------------------------------------
function extractTweets(body) {
  const tweets = [];
  try {
    const instructions = body.data?.result?.timeline?.instructions ?? [];
    for (const inst of instructions) {
      for (const entry of (inst.entries ?? [])) {
        const tweetResult = entry.content?.itemContent?.tweet_results?.result;
        if (!tweetResult) continue;
        const legacy = tweetResult.legacy;
        const core = tweetResult.core?.user_results?.result?.legacy;
        if (!legacy) continue;
        tweets.push({
          text:       legacy.full_text,
          user:       core?.screen_name ?? null,
          user_name:  core?.name ?? null,
          likes:      legacy.favorite_count,
          retweets:   legacy.retweet_count,
          replies:    legacy.reply_count,
          views:      tweetResult.views?.count ?? null,
          created_at: legacy.created_at,
        });
      }
    }
  } catch { /* malformed response — return what we have */ }
  return tweets;
}

async function fetchTwitter(queries) {
  const source = 'twitter';
  const key = process.env.SOCIAVAULT_API_KEY;
  if (!key) return skipped(source, 'SOCIAVAULT_API_KEY not set');

  try {
    const allTweets = [];
    const seen = new Set();
    let creditsUsed = 0;

    for (const { label, query } of queries) {
      let r;
      try {
        r = await sociaFetch('twitter/search', {
          query,
          type: 'Latest',
        });
      } catch (e) {
        console.error(`[social-7d] twitter "${query}" → ${e.name ?? 'Error'}: ${e.message}`);
        continue;
      }
      creditsUsed += 1;

      if (!r.ok) {
        if (!creditsExhausted) console.error(`[social-7d] twitter "${query}" → HTTP ${r.status}`);
        continue;
      }

      const tweets = extractTweets(r.body);
      for (const t of tweets) {
        const dedupeKey = `${t.user}:${t.text?.slice(0, 80)}`;
        if (seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);
        allTweets.push({
          ...t,
          query_label: label,
          query_used:  query,
        });
      }

      await new Promise(r => setTimeout(r, 300));
    }

    return wrap(source, {
      credits_used: creditsUsed,
      tweet_count: allTweets.length,
      tweets: allTweets,
    });
  } catch (e) {
    return errored(source, e);
  }
}

// ---------------------------------------------------------------------------
// Twitter (RapidAPI alternate) — XScraper: GET /search
// Flat array response (v1.1-shaped tweet objects), unlike SociaVault's
// deeply nested GraphQL timeline. Gotcha: type=Latest returns 0 results for
// low-volume brand queries — type=Top reliably returns results, at the cost
// of recency (results aren't guaranteed inside the 7-day window).
// ---------------------------------------------------------------------------
function extractTweetsRapid(body) {
  const tweets = [];
  for (const t of (body?.data ?? [])) {
    tweets.push({
      text:       t.full_text,
      user:       t.user?.core?.screen_name ?? null,
      user_name:  t.user?.core?.name ?? null,
      likes:      t.favorite_count,
      retweets:   t.retweet_count,
      replies:    t.reply_count,
      views:      t.views_count ?? null,
      created_at: t.created_at,
    });
  }
  return tweets;
}

async function fetchTwitterRapid(queries) {
  const source = 'twitter';
  const key = process.env.RAPIDAPI_KEY;
  if (!key) return skipped(source, 'RAPIDAPI_KEY not set');

  const host = 'xscraper.p.rapidapi.com';
  try {
    const allTweets = [];
    const seen = new Set();
    let creditsUsed = 0;

    for (const { label, query } of queries) {
      let r;
      try {
        r = await rapidFetch(host, 'search', {
          search_query: query,
          type: 'Top',
        });
      } catch (e) {
        console.error(`[social-7d] twitter "${query}" → ${e.name ?? 'Error'}: ${e.message}`);
        continue;
      }
      creditsUsed += 1;

      if (!r.ok) {
        console.error(`[social-7d] twitter "${query}" → HTTP ${r.status}`);
        continue;
      }

      const tweets = extractTweetsRapid(r.body);
      for (const t of tweets) {
        const dedupeKey = `${t.user}:${t.text?.slice(0, 80)}`;
        if (seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);
        allTweets.push({
          ...t,
          query_label: label,
          query_used:  query,
        });
      }

      await new Promise(r => setTimeout(r, 300));
    }

    return wrap(source, {
      credits_used: creditsUsed,
      tweet_count: allTweets.length,
      tweets: allTweets,
    });
  } catch (e) {
    return errored(source, e);
  }
}

// ---------------------------------------------------------------------------
// TikTok — /tiktok/search/keyword
// Returns search_item_list as object keyed by index; each value has aweme_info.
// ---------------------------------------------------------------------------
async function fetchTikTok(queries) {
  const source = 'tiktok';
  const key = process.env.SOCIAVAULT_API_KEY;
  if (!key) return skipped(source, 'SOCIAVAULT_API_KEY not set');

  try {
    const allVideos = [];
    const seen = new Set();
    let creditsUsed = 0;

    for (const { label, query } of queries) {
      let r;
      try {
        r = await sociaFetch('tiktok/search/keyword', {
          query,
          date_posted: 'this-week',
          sort_by: 'date-posted',
          region: 'US',
        });
      } catch (e) {
        console.error(`[social-7d] tiktok "${query}" → ${e.name ?? 'Error'}: ${e.message}`);
        continue;
      }
      creditsUsed += 1;

      if (!r.ok) {
        if (!creditsExhausted) console.error(`[social-7d] tiktok "${query}" → HTTP ${r.status}`);
        continue;
      }

      const items = Object.values(r.body?.data?.search_item_list ?? {});
      for (const item of items) {
        const a = item.aweme_info ?? item;
        if (seen.has(a.aweme_id)) continue;
        seen.add(a.aweme_id);
        const stats = a.statistics ?? {};
        allVideos.push({
          id:           a.aweme_id,
          desc:         (a.desc ?? '').slice(0, 500),
          author:       a.author?.nickname ?? a.author?.unique_id ?? null,
          author_uid:   a.author?.unique_id ?? null,
          play_count:   stats.play_count ?? null,
          like_count:   stats.digg_count ?? null,
          comment_count: stats.comment_count ?? null,
          share_count:  stats.share_count ?? null,
          collect_count: stats.collect_count ?? null,
          created_utc:  a.create_time ?? null,
          url:          a.share_url ?? a.url ?? null,
          query_label:  label,
          query_used:   query,
        });
      }

      await new Promise(r => setTimeout(r, 300));
    }

    return wrap(source, {
      credits_used: creditsUsed,
      video_count: allVideos.length,
      videos: allVideos,
    });
  } catch (e) {
    return errored(source, e);
  }
}

// ---------------------------------------------------------------------------
// TikTok (RapidAPI alternate) — TikTok API23: GET /api/search/general
// Flat item_list array, unlike SociaVault's indexed-object shape. Gotcha: no
// server-side date filter (SociaVault had date_posted=this-week) — filter
// client-side on createTime against the 7-day lookback window.
// ---------------------------------------------------------------------------
async function fetchTikTokRapid(queries) {
  const source = 'tiktok';
  const key = process.env.RAPIDAPI_KEY;
  if (!key) return skipped(source, 'RAPIDAPI_KEY not set');

  const host = 'tiktok-api23.p.rapidapi.com';
  const minus7Epoch = Math.floor(minus7.getTime() / 1000);

  try {
    const allVideos = [];
    const seen = new Set();
    let creditsUsed = 0;

    for (const { label, query } of queries) {
      let r;
      try {
        r = await rapidFetch(host, 'api/search/general', {
          keyword: query,
          cursor: 0,
          search_id: 0,
        });
      } catch (e) {
        console.error(`[social-7d] tiktok "${query}" → ${e.name ?? 'Error'}: ${e.message}`);
        continue;
      }
      creditsUsed += 1;

      if (!r.ok) {
        console.error(`[social-7d] tiktok "${query}" → HTTP ${r.status}`);
        continue;
      }

      const items = r.body?.item_list ?? [];
      for (const a of items) {
        if (a.createTime < minus7Epoch) continue;
        if (seen.has(a.id)) continue;
        seen.add(a.id);
        const stats = a.stats ?? {};
        allVideos.push({
          id:           a.id,
          desc:         (a.desc ?? '').slice(0, 500),
          author:       a.author?.nickname ?? a.author?.uniqueId ?? null,
          author_uid:   a.author?.uniqueId ?? null,
          play_count:   stats.playCount ?? null,
          like_count:   stats.diggCount ?? null,
          comment_count: stats.commentCount ?? null,
          share_count:  stats.shareCount ?? null,
          collect_count: stats.collectCount ?? null,
          created_utc:  a.createTime ?? null,
          url:          a.video?.playAddr ?? null,
          query_label:  label,
          query_used:   query,
        });
      }

      await new Promise(r => setTimeout(r, 300));
    }

    return wrap(source, {
      credits_used: creditsUsed,
      video_count: allVideos.length,
      videos: allVideos,
    });
  } catch (e) {
    return errored(source, e);
  }
}

// ---------------------------------------------------------------------------
// Instagram — /instagram/profile, /instagram/posts, /instagram/comments
//
// Tested against @croma.retail (scratch/test-instagram-sociavault-v*.js):
//   - instagram/posts (handle=) is the primary source. Its grid already mixes
//     reels/photos/carousels with like_count/comment_count/play_count inline —
//     no need to also call instagram/reels, it's a strict subset.
//   - instagram/comments needs url=https://www.instagram.com/p/<code>/, not
//     shortcode=. It's the one signal posts/reels can't give: real customer
//     text (demand questions, complaints).
//   - instagram/post-info and instagram/reels: redundant with posts, skipped.
//   - instagram/transcript: broken in practice (null/garbage on 3/3 real
//     reels), skipped.
//
// Competitors (instagramCompetitorHandles) get the exact same 3-call treatment
// as the primary handle — this is account-based, not keyword search, so the
// only way to benchmark cadence/reach/sentiment against Vijay Sales /
// Reliance Digital is to pull their own profile+posts+comments too. Handles
// were verified live via instagram/profile, not guessed — see STORE_CONFIG.
//
// 3 credits/account: profile (1) + posts (1) + comments on top post (1).
// Croma run total = 3 × (1 primary + N competitors) — 9 credits for 2 competitors.
// ---------------------------------------------------------------------------
async function fetchInstagramAccount(handle) {
  let creditsUsed = 0;

  // Profile — account metadata (followers, verified, bio).
  let profile = null;
  const profileR = await sociaFetch('instagram/profile', { handle });
  creditsUsed += 1;
  if (profileR.ok) {
    const u = profileR.body?.data?.data?.user ?? {};
    profile = {
      username:  u.username,
      full_name: u.full_name,
      followers: u.edge_followed_by?.count ?? null,
      verified:  u.is_verified ?? null,
      bio:       (u.biography ?? '').slice(0, 300),
    };
  } else if (!creditsExhausted) {
    console.error(`[social-7d] instagram profile "${handle}" → HTTP ${profileR.status}`);
  }
  await new Promise(r => setTimeout(r, 300));

  // Posts (grid) — reels + photos + carousels, engagement stats inline.
  const postsR = await sociaFetch('instagram/posts', { handle });
  creditsUsed += 1;

  if (!postsR.ok) {
    if (!creditsExhausted) console.error(`[social-7d] instagram posts "${handle}" → HTTP ${postsR.status}`);
    return { handle, credits_used: creditsUsed, profile, post_count: 0, posts: [], top_post_code: null, comment_count: 0, comments: [] };
  }

  const rawItems = postsR.body?.data?.items ?? {};
  const items = Array.isArray(rawItems) ? rawItems : Object.values(rawItems);
  const posts = items.map(m => ({
    code:          m.code,
    media_type:    m.media_type,   // 1=photo, 2=video/reel, 8=carousel
    product_type:  m.product_type, // 'feed' | 'clips' | 'carousel_container'
    like_count:    m.like_count ?? null,
    comment_count: m.comment_count ?? null,
    play_count:    m.play_count ?? null,
    caption:       (m.caption?.text ?? '').slice(0, 300),
    taken_at:      m.taken_at ?? null,
  }));

  // Comments — customer voice on whichever post has the most reach (plays if a
  // reel, else likes), the one signal that raw engagement counts can't give.
  let comments = [];
  const topPost = [...posts].sort(
    (a, b) => (b.play_count ?? b.like_count ?? 0) - (a.play_count ?? a.like_count ?? 0)
  )[0];

  if (topPost?.code) {
    await new Promise(r => setTimeout(r, 300));
    const commentsR = await sociaFetch('instagram/comments', {
      url: `https://www.instagram.com/p/${topPost.code}/`,
    });
    creditsUsed += 1;

    if (commentsR.ok) {
      const rawComments = commentsR.body?.data?.comments ?? {};
      const arr = Array.isArray(rawComments) ? rawComments : Object.values(rawComments);
      comments = arr.map(c => ({
        user:       c.user?.username ?? null,
        text:       (c.text ?? '').slice(0, 300),
        likes:      c.comment_like_count ?? null,
        created_at: c.created_at ?? null,
      }));
    } else if (!creditsExhausted) {
      console.error(`[social-7d] instagram comments "${handle}" → HTTP ${commentsR.status}`);
    }
  }

  return {
    handle,
    credits_used:  creditsUsed,
    profile,
    post_count:    posts.length,
    posts,
    top_post_code: topPost?.code ?? null,
    comment_count: comments.length,
    comments,
  };
}

async function fetchInstagram(handle, competitorHandles = []) {
  const source = 'instagram';
  const key = process.env.SOCIAVAULT_API_KEY;
  if (!key) return skipped(source, 'SOCIAVAULT_API_KEY not set');
  if (!handle) return skipped(source, 'no instagramHandle configured for this store');

  try {
    const own = await fetchInstagramAccount(handle);
    let creditsUsed = own.credits_used;

    const competitors = [];
    for (const competitorHandle of competitorHandles) {
      if (creditsExhausted) break;
      const acct = await fetchInstagramAccount(competitorHandle);
      creditsUsed += acct.credits_used;
      competitors.push(acct);
    }

    return wrap(source, {
      credits_used:  creditsUsed,
      handle:        own.handle,
      profile:       own.profile,
      post_count:    own.post_count,
      posts:         own.posts,
      top_post_code: own.top_post_code,
      comment_count: own.comment_count,
      comments:      own.comments,
      competitors,
    });
  } catch (e) {
    return errored(source, e);
  }
}

// ---------------------------------------------------------------------------
// YouTube — /youtube/search (secondary source, disabled to save credits)
// Returns { videos: [...], shorts: [...] }
// Uncomment fetchYouTube + ytQueries in runSocial() to re-enable (4 credits/store).
// ---------------------------------------------------------------------------
/*
async function fetchYouTube(queries) {
  const source = 'youtube';
  const key = process.env.SOCIAVAULT_API_KEY;
  if (!key) return skipped(source, 'SOCIAVAULT_API_KEY not set');

  try {
    const allVideos = [];
    const seen = new Set();
    let creditsUsed = 0;

    for (const { label, query } of queries) {
      const r = await sociaFetch('youtube/search', {
        query,
        uploadDate: 'this_week',
        region: 'US',
      });
      creditsUsed += 1;

      if (!r.ok) {
        if (!creditsExhausted) console.error(`[social-7d] youtube "${query}" → HTTP ${r.status}`);
        continue;
      }

      const videos = [
        ...(r.body?.data?.videos ?? []),
        ...(r.body?.data?.shorts ?? []),
      ];

      for (const v of videos) {
        if (seen.has(v.id)) continue;
        seen.add(v.id);
        allVideos.push({
          id:           v.id,
          type:         v.type ?? 'video',
          title:        v.title,
          url:          v.url,
          channel:      v.channel?.title ?? v.channelTitle ?? null,
          channel_id:   v.channel?.id ?? v.channelId ?? null,
          view_count:   v.viewCountInt ?? null,
          view_text:    v.viewCountText ?? null,
          published:    v.publishedTimeText ?? null,
          length_sec:   v.lengthSeconds ?? null,
          query_label:  label,
          query_used:   query,
        });
      }

      await new Promise(r => setTimeout(r, 300));
    }

    return wrap(source, {
      credits_used: creditsUsed,
      video_count: allVideos.length,
      videos: allVideos,
    });
  } catch (e) {
    return errored(source, e);
  }
}
*/

// ---------------------------------------------------------------------------
// Orchestrate — runs platforms sequentially so partial results survive credit exhaustion.
//
// Selective runs:
//   node --env-file=.env social-7d.js                                      # all stores, all platforms
//   node --env-file=.env social-7d.js --store=nyc-herald-square            # one store, all platforms
//   node --env-file=.env social-7d.js --store=nyc-herald-square --only=reddit  # one store, one platform
//   node --env-file=.env social-7d.js --only=reddit,twitter                # all stores, specific platforms
//
// --store=<id>          run only this store (use store id from stores/portfolio.js)
// --only=<plat,...>     run only these platforms (comma-separated: reddit,twitter,tiktok)
// ---------------------------------------------------------------------------

const PLATFORMS = [
  { name: 'reddit',    buildQueries: redditQueries,    fetch: qs => (SOURCE === 'rapidapi' ? fetchRedditRapid(qs)  : fetchReddit(qs))  },
  { name: 'twitter',   buildQueries: twitterQueries,   fetch: qs => (SOURCE === 'rapidapi' ? fetchTwitterRapid(qs) : fetchTwitter(qs)) },
  { name: 'tiktok',    buildQueries: tiktokQueries,    fetch: qs => (SOURCE === 'rapidapi' ? fetchTikTokRapid(qs)  : fetchTikTok(qs))  },
  // instagramQueries returns [{label:'handle',query:handle}, {label:'competitor',query:h}, ...]
  {
    name: 'instagram',
    buildQueries: instagramQueries,
    fetch: qs => fetchInstagram(
      qs.find(q => q.label === 'handle')?.query,
      qs.filter(q => q.label === 'competitor').map(q => q.query),
    ),
  },
  // { name: 'youtube', buildQueries: youtubeQueries, fetch: fetchYouTube },  // secondary source — low value, see scratch/test-youtube-croma-v*.js
];

function parseFlags() {
  const flags = { store: null, only: null, source: null };
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--store='))  flags.store  = arg.split('=')[1];
    if (arg.startsWith('--only='))   flags.only   = arg.split('=')[1].split(',');
    if (arg.startsWith('--source=')) flags.source = arg.split('=')[1];
  }
  return flags;
}

async function runSocial(onlyPlatforms = null, tiktokGlobalResult = null) {
  const store = findNearestStore(LAT, LON);
  const storeId = store?.id ?? 'unknown';

  const activePlatforms = onlyPlatforms
    ? PLATFORMS.filter(p => onlyPlatforms.includes(p.name))
    : PLATFORMS;

  const totalQueryCount = activePlatforms.reduce((n, p) => n + p.buildQueries(storeId).length, 0);
  console.error(`[social-7d] store=${store?.name}  window=${MINUS7} → ${TODAY}  queries=${totalQueryCount} (${activePlatforms.map(p => p.name).join(', ')})`);

  const results = {};

  for (const platform of PLATFORMS) {
    if (onlyPlatforms && !onlyPlatforms.includes(platform.name)) {
      results[platform.name] = skipped(platform.name, `not in --only=${onlyPlatforms.join(',')}`);
      continue;
    }

    const queries = platform.buildQueries(storeId);
    console.error(`[social-7d] ${platform.name}: ${queries.length} queries...`);
    results[platform.name] = await platform.fetch(queries);

    // Merge global TikTok results (haul finds, restock, complaint) into this store's TikTok data
    if (platform.name === 'tiktok' && tiktokGlobalResult?.data?.videos && results.tiktok?.data?.videos) {
      const seen = new Set(results.tiktok.data.videos.map(v => v.id));
      for (const v of tiktokGlobalResult.data.videos) {
        if (!seen.has(v.id)) {
          results.tiktok.data.videos.push(v);
          seen.add(v.id);
        }
      }
      results.tiktok.data.video_count = results.tiktok.data.videos.length;
      results.tiktok.data.credits_used += tiktokGlobalResult.data.credits_used ?? 0;
    }

    // creditsExhausted only ever gets set by sociaFetch, so this cascade only bites
    // whichever platforms are actually sourced from SociaVault (--source=sociavault,
    // the default, plus Instagram which always uses it). RapidAPI-sourced platforms
    // never touch sociaFetch, so this flag can't wrongly cascade onto them.
    if (creditsExhausted) {
      const remaining = activePlatforms.slice(activePlatforms.indexOf(platform) + 1);
      for (const rp of remaining) {
        // TikTok's global queries (haul/restock/complaint) run once up front in main(),
        // independent of the per-store loop — use that result instead of discarding it
        // if a credits exhaustion earlier in the loop skips TikTok's per-store turn.
        results[rp.name] = (rp.name === 'tiktok' && tiktokGlobalResult?.data?.videos)
          ? tiktokGlobalResult
          : skipped(rp.name, 'credits exhausted');
      }
      if (remaining.length) {
        console.error(`\n[social-7d] ⚠ Credits exhausted during ${platform.name}.`);
        console.error(`[social-7d] Resume command:`);
        console.error(`  node --env-file=.env social-7d.js --store=${storeId} --only=${remaining.map(p => p.name).join(',')}`);
      }
      break;
    }
  }

  const totalCredits = PLATFORMS.reduce((n, p) => n + (results[p.name]?.data?.credits_used ?? 0), 0);

  const output = {
    meta: {
      generated_at:    now.toISOString(),
      store:           { id: storeId, name: store?.name, lat: LAT, lon: LON },
      lookback_window: { from: MINUS7, to: TODAY },
      source:          SOURCE,
      total_credits_used: totalCredits,
      queries_per_platform: Object.fromEntries(
        PLATFORMS.map(p => [p.name, p.buildQueries(storeId).length])
      ),
      env_keys_present: {
        SOCIAVAULT_API_KEY: !!process.env.SOCIAVAULT_API_KEY,
        RAPIDAPI_KEY: !!process.env.RAPIDAPI_KEY,
      },
    },

    ...results,
  };

  // ---------------------------------------------------------------------------
  // Persist logs — merge with existing file when running with --only,
  // so re-running one platform doesn't wipe data from previous runs.
  // ---------------------------------------------------------------------------
  const { mkdirSync, writeFileSync, readFileSync, existsSync } = await import('fs');
  const { default: path } = await import('path');

  mkdirSync('logs', { recursive: true });

  const city = store?.address?.split(',')[0]?.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-') ?? `${LAT}_${LON}`;
  const slug = `${city}-social7-ending-${TODAY}`;
  const rawPath = path.join('logs', `${slug}-raw.json`);

  if (onlyPlatforms && existsSync(rawPath)) {
    try {
      const prev = JSON.parse(readFileSync(rawPath, 'utf8'));
      for (const p of PLATFORMS) {
        if (!onlyPlatforms.includes(p.name) && prev[p.name] && !prev[p.name].skipped) {
          output[p.name] = prev[p.name];
        }
      }
      output.meta.total_credits_used = PLATFORMS.reduce(
        (n, p) => n + (output[p.name]?.data?.credits_used ?? 0), 0
      );
      console.error(`[social-7d] merged with existing ${rawPath}`);
    } catch { /* no valid previous file — write fresh */ }
  }

  writeFileSync(rawPath, JSON.stringify(output, null, 2));
  console.error(`[social-7d] raw  → ${rawPath}`);

  // Clean log: collapse posts/tweets/videos into counts + top items by engagement
  function clean(raw) {
    const c = JSON.parse(JSON.stringify(raw));

    // Reddit: keep top 10 by score, summarize rest
    if (c.reddit?.data?.posts) {
      const posts = c.reddit.data.posts;
      const bySubreddit = {};
      const byLabel = {};
      for (const p of posts) {
        bySubreddit[p.subreddit] = (bySubreddit[p.subreddit] ?? 0) + 1;
        byLabel[p.query_label] = (byLabel[p.query_label] ?? 0) + 1;
      }
      const top = [...posts].sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).slice(0, 10);
      c.reddit.data = {
        credits_used: c.reddit.data.credits_used,
        post_count: posts.length,
        by_subreddit: bySubreddit,
        by_query_label: byLabel,
        top_by_score: top.map(p => ({
          subreddit: p.subreddit, title: p.title, score: p.score,
          num_comments: p.num_comments, query_label: p.query_label,
        })),
      };
    }

    // Twitter: keep top 10 by likes, summarize rest
    if (c.twitter?.data?.tweets) {
      const tweets = c.twitter.data.tweets;
      const byLabel = {};
      for (const t of tweets) {
        byLabel[t.query_label] = (byLabel[t.query_label] ?? 0) + 1;
      }
      const top = [...tweets].sort((a, b) => (b.likes ?? 0) - (a.likes ?? 0)).slice(0, 10);
      c.twitter.data = {
        credits_used: c.twitter.data.credits_used,
        tweet_count: tweets.length,
        by_query_label: byLabel,
        top_by_likes: top.map(t => ({
          user: t.user, text: t.text?.slice(0, 200), likes: t.likes,
          retweets: t.retweets, query_label: t.query_label,
        })),
      };
    }

    // TikTok: keep top 10 by play_count
    if (c.tiktok?.data?.videos) {
      const videos = c.tiktok.data.videos;
      const byLabel = {};
      for (const v of videos) {
        byLabel[v.query_label] = (byLabel[v.query_label] ?? 0) + 1;
      }
      const top = [...videos].sort((a, b) => (b.play_count ?? 0) - (a.play_count ?? 0)).slice(0, 10);
      c.tiktok.data = {
        credits_used: c.tiktok.data.credits_used,
        video_count: videos.length,
        by_query_label: byLabel,
        top_by_views: top.map(v => ({
          author: v.author, desc: v.desc?.slice(0, 150),
          play_count: v.play_count, like_count: v.like_count,
          comment_count: v.comment_count, query_label: v.query_label,
        })),
      };
    }

    // Instagram: keep top 10 posts by reach (plays if reel, else likes) + all comments on the
    // top post, for the primary handle and for each competitor identically.
    if (c.instagram?.data?.posts) {
      const summarizeAccount = (acct) => {
        const posts = acct.posts ?? [];
        const top = [...posts]
          .sort((a, b) => (b.play_count ?? b.like_count ?? 0) - (a.play_count ?? a.like_count ?? 0))
          .slice(0, 10);
        return {
          handle:        acct.handle,
          profile:       acct.profile,
          post_count:    posts.length,
          top_by_reach:  top.map(p => ({
            code: p.code, product_type: p.product_type,
            like_count: p.like_count, comment_count: p.comment_count, play_count: p.play_count,
            caption: p.caption?.slice(0, 150),
          })),
          top_post_code: acct.top_post_code,
          comment_count: acct.comment_count,
          comments:      acct.comments,
        };
      };

      const primary = summarizeAccount(c.instagram.data);
      c.instagram.data = {
        credits_used: c.instagram.data.credits_used,
        ...primary,
        competitors: (c.instagram.data.competitors ?? []).map(summarizeAccount),
      };
    }

    // YouTube: secondary source — uncomment in runSocial() to re-enable
    // if (c.youtube?.data?.videos) { ... }

    return c;
  }

  const cleaned = clean(output);
  const cleanPath = path.join('logs', `${slug}-clean.json`);
  writeFileSync(cleanPath, JSON.stringify(cleaned, null, 2));
  console.error(`[social-7d] clean → ${cleanPath}`);

  console.log(JSON.stringify(cleaned, null, 2));
}

async function main() {
  const flags = parseFlags();
  if (flags.source) SOURCE = flags.source;
  console.error(`[social-7d] source=${SOURCE} (reddit/twitter/tiktok — instagram always uses sociavault)`);
  const hasLatLon = process.argv[2] && !process.argv[2].startsWith('--');

  // Run TikTok global queries once (not per-store) — saves a query per extra store
  const runTiktok = !flags.only || flags.only.includes('tiktok');
  let tiktokGlobalResult = null;
  if (runTiktok && !creditsExhausted) {
    const globalQueries = tiktokGlobalQueries(STORE_CONFIG[flags.store || stores[0].id]?.brand || 'Dollar Tree');
    console.error(`[social-7d] tiktok global: ${globalQueries.length} queries (shared across all stores)...`);
    tiktokGlobalResult = SOURCE === 'rapidapi' ? await fetchTikTokRapid(globalQueries) : await fetchTikTok(globalQueries);
  }

  if (hasLatLon) {
    LAT = parseFloat(process.argv[2]);
    LON = parseFloat(process.argv[3]);
    await runSocial(flags.only, tiktokGlobalResult);
  } else {
    const targetStores = flags.store
      ? stores.filter(s => s.id === flags.store)
      : stores;

    if (flags.store && !targetStores.length) {
      console.error(`[social-7d] Unknown store: ${flags.store}`);
      console.error(`[social-7d] Available: ${stores.map(s => s.id).join(', ')}`);
      process.exit(1);
    }

    console.error(`[social-7d] Running for ${targetStores.length} store(s)...`);

    for (const store of targetStores) {
      LAT = store.lat;
      LON = store.lng;
      creditsExhausted = false;
      console.error(`\n[social-7d] Running for ${store.name} (${LAT}, ${LON})`);

      await runSocial(flags.only, tiktokGlobalResult);

      if (creditsExhausted) {
        const idx = targetStores.indexOf(store);
        const remaining = targetStores.slice(idx + 1);
        if (remaining.length) {
          console.error(`\n[social-7d] ⚠ Remaining stores not started: ${remaining.map(s => s.id).join(', ')}`);
          console.error(`[social-7d] Resume command:`);
          console.error(`  node --env-file=.env social-7d.js --store=${remaining[0].id}${flags.only ? ' --only=' + flags.only.join(',') : ''}`);
        }
        break;
      }
    }
  }
}

main().catch(err => { console.error(err); process.exit(1); });
