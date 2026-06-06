import { timedFetch, pass, fail, skip } from '../../lib/test-runner.js';

export const name = 'PredictHQ Academic Events';
export const tier = 'tier2';

const BASE = 'https://api.predicthq.com/v1/events/';

// Cover current AY (2025-26) and next full AY (2026-27)
const DATE_FROM = '2025-08-01';
const DATE_TO   = '2027-08-01';

// Labels that map to demand-signal event types
const QUERIES = [
  { label: 'graduation',        phq_label: 'graduation'        },
  { label: 'exam',              phq_label: 'exam'              },
  { label: 'academic-session',  phq_label: 'academic-session'  },
];

function headers(token) {
  return { Authorization: `Bearer ${token}` };
}

function saneEvent(e) {
  return e && typeof e.id === 'string' &&
         typeof e.title === 'string' &&
         typeof e.start_local === 'string' &&
         Array.isArray(e.phq_labels);
}

function summarize(e) {
  return {
    title:       e.title,
    date:        e.start_local?.slice(0, 10),
    attendance:  e.phq_attendance,
    labels:      e.phq_labels?.map(l => l.label),
    city:        e.geo?.address?.locality,
    region:      e.geo?.address?.region,
  };
}

export async function run() {
  const token = process.env.PREDICTHQ_TOKEN;
  if (!token) return skip(name, 'PREDICTHQ_TOKEN not set');

  const t0 = Date.now();
  const fetches = await Promise.all(
    QUERIES.map(async q => {
      const params = new URLSearchParams({
        category:    'academic',
        country:     'US',
        'start.gte': DATE_FROM,
        'start.lte': DATE_TO,
        phq_label:   q.phq_label,
        sort:        'start',
        limit:       '3',
      });
      const url = BASE + '?' + params.toString();
      try {
        const r = await timedFetch(url, { headers: headers(token), timeoutMs: 30000 });
        return { q, r, err: null };
      } catch (e) {
        return { q, r: null, err: e };
      }
    })
  );

  const results = {};
  for (const { q, r, err } of fetches) {
    if (err) return fail(name, Date.now() - t0, `${q.label}: network error — ${err}`);
    if (!r.ok) return fail(name, Date.now() - t0, `${q.label}: HTTP ${r.status}`, r.status);

    const body = r.body;
    if (typeof body.count !== 'number') {
      return fail(name, Date.now() - t0, `${q.label}: missing count field`);
    }
    if (!Array.isArray(body.results) || body.results.length === 0) {
      return fail(name, Date.now() - t0, `${q.label}: no results`);
    }
    if (!saneEvent(body.results[0])) {
      return fail(name, Date.now() - t0, `${q.label}: unexpected event shape`);
    }

    results[q.label] = {
      total:    body.count,
      overflow: body.overflow,
      sample:   body.results.slice(0, 2).map(summarize),
    };
  }

  return pass(name, Date.now() - t0, results);
}
