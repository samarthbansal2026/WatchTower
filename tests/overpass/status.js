import { timedFetch, pass, fail } from '../../lib/test-runner.js';

export const name = 'Overpass Status & Timestamp';
export const tier = 'tier1';

const BASE = 'https://overpass-api.de/api';
const HEADERS = { Accept: '*/*', 'User-Agent': 'watchtower/1.0 (work.samarthbansal@gmail.com)' };

export async function run() {
  const results = [];

  // /api/timestamp — latest DB update
  {
    const t0 = Date.now();
    try {
      const r = await timedFetch(`${BASE}/timestamp`, { headers: HEADERS });
      if (!r.ok) { results.push(fail('timestamp', r.ms, `HTTP ${r.status}`, r.status)); }
      else {
        const ts = typeof r.body === 'string' ? r.body.trim() : String(r.body);
        if (!/^\d{4}-\d{2}-\d{2}/.test(ts)) {
          results.push(fail('timestamp', r.ms, `unexpected format: ${ts.slice(0, 40)}`));
        } else {
          results.push(pass('timestamp', r.ms, { timestamp: ts }));
        }
      }
    } catch (e) {
      results.push(fail('timestamp', Date.now() - t0, e));
    }
  }

  // /api/status — server quota + slot info
  {
    const t0 = Date.now();
    try {
      const r = await timedFetch(`${BASE}/status`, { headers: HEADERS });
      if (!r.ok) { results.push(fail('status', r.ms, `HTTP ${r.status}`, r.status)); }
      else {
        const body = typeof r.body === 'string' ? r.body : String(r.body);
        // Response is plain text with lines like "Connected as: ..." "Rate limit: ..."
        if (!body.includes('Rate limit') && !body.includes('Connected')) {
          results.push(fail('status', r.ms, `unexpected body: ${body.slice(0, 80)}`));
        } else {
          const rateLine = body.split('\n').find(l => l.startsWith('Rate limit'));
          results.push(pass('status', r.ms, { preview: body.split('\n').slice(0, 4).join(' | ') }));
        }
      }
    } catch (e) {
      results.push(fail('status', Date.now() - t0, e));
    }
  }

  const failed = results.find(r => !r.ok);
  if (failed) return failed;
  return pass(name, results.reduce((s, r) => s + r.ms, 0), {
    timestamp: results[0].sample.timestamp,
    status: results[1].sample.preview,
  });
}
