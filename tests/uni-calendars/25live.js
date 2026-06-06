import { timedFetch, pass, fail } from '../../lib/test-runner.js';

export const name = '25Live Academic Calendars';
export const tier = 'tier1';

const BASE   = 'https://25livepub.collegenet.com/calendars';
// Cover current AY (2025-26) + next full AY (2026-27)
const START  = '20250801';
const END    = '20270801';

const FEEDS = [
  { webname: 'fhsu-academic-calendar',   label: 'Fort Hays State U (KS)'      },
  { webname: 'uaf-academic-calendar',    label: 'U of Alaska Fairbanks (AK)'  },
  { webname: 'clc-academic-calendar',    label: 'College of Lake County (IL)' },
  { webname: 'taylor-academic-calendar', label: 'Taylor University (IN)'      },
];

// Patterns for the demand-signal event types we care about
const SIGNALS = {
  'move-in':    /residence hall|move[- ]in|check[- ]in|housing open/i,
  graduation:   /commencement|graduation|hooding/i,
  finals:       /final exam|finals week|final examination/i,
  break:        /spring break|winter break|thanksgiving|holiday break/i,
  'classes-start': /first day|classes begin|instruction begin|first day of class/i,
};

function categorize(events) {
  const found = {};
  for (const [key, re] of Object.entries(SIGNALS)) {
    const match = events.find(e => re.test(e.title || ''));
    if (match) found[key] = { title: match.title, date: match.startDateTime?.slice(0, 10) };
  }
  return found;
}

export async function run() {
  const t0 = Date.now();

  const fetches = await Promise.all(
    FEEDS.map(async feed => {
      const url = `${BASE}/${feed.webname}.json?startdate=${START}&enddate=${END}`;
      try {
        const r = await timedFetch(url, { timeoutMs: 15000 });
        return { feed, r, err: null };
      } catch (e) {
        return { feed, r: null, err: e };
      }
    })
  );

  const results = {};
  for (const { feed, r, err } of fetches) {
    if (err) return fail(name, Date.now() - t0, `${feed.label}: network error — ${err}`);
    if (!r.ok) return fail(name, Date.now() - t0, `${feed.label}: HTTP ${r.status}`, r.status);
    if (!Array.isArray(r.body)) {
      return fail(name, Date.now() - t0, `${feed.label}: expected array, got ${typeof r.body}`);
    }
    const active = r.body.filter(e => !e.canceled);
    if (active.length === 0) {
      return fail(name, Date.now() - t0, `${feed.label}: 0 active events in range`);
    }
    results[feed.label] = { total: active.length, signals: categorize(active) };
  }

  return pass(name, Date.now() - t0, results);
}
