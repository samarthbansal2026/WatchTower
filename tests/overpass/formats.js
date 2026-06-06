// Validates that Overpass returns valid JSON, XML, and CSV output formats
// for the same simple query (cafes in a small Chicago bbox).
import { timedFetch, pass, fail } from '../../lib/test-runner.js';

export const name = 'Overpass Output Formats';
export const tier = 'tier1';

const INTERPRETER = 'https://overpass-api.de/api/interpreter';
const UA = 'watchtower/1.0 (work.samarthbansal@gmail.com)';

async function fetchWithRetry(opts, retries = 3, delayMs = 5000) {
  for (let i = 0; i < retries; i++) {
    const r = await timedFetch(INTERPRETER, opts);
    if (r.status !== 429) return r;
    if (i < retries - 1) await new Promise(res => setTimeout(res, delayMs));
  }
  return timedFetch(INTERPRETER, opts);
}

// Small bbox: ~500m around Chicago downtown to guarantee a few results
const BBOX = '41.878,−87.635,41.882,−87.630'.replace('−', '-');
const BBOX_CLEAN = '41.878,-87.635,41.882,-87.630';

function query(outFormat) {
  return `[out:${outFormat}][timeout:20];node["amenity"="cafe"](${BBOX_CLEAN});out body 5;`;
}

function csvQuery() {
  return `[out:csv(name,amenity,::lat,::lon;true;",")][timeout:20];node["amenity"="cafe"](${BBOX_CLEAN});out 5;`;
}

export async function run() {
  const results = [];

  // JSON
  {
    const t0 = Date.now();
    try {
      const r = await fetchWithRetry({
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': UA },
        body: `data=${encodeURIComponent(query('json'))}`,
        timeoutMs: 25000,
      });
      if (!r.ok) { results.push(fail('format:json', r.ms, `HTTP ${r.status}`, r.status)); }
      else if (!r.body?.elements) { results.push(fail('format:json', r.ms, 'no elements key')); }
      else results.push(pass('format:json', r.ms, { count: r.body.elements.length }));
    } catch (e) { results.push(fail('format:json', Date.now() - t0, e)); }
  }

  // Overpass rate-limits at 2 concurrent slots; space requests to avoid 429
  await new Promise(r => setTimeout(r, 2000));

  // XML (response is text, check for OSM root tag)
  {
    const t0 = Date.now();
    try {
      const r = await fetchWithRetry({
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': UA },
        body: `data=${encodeURIComponent(query('xml'))}`,
        timeoutMs: 25000,
      });
      if (!r.ok) { results.push(fail('format:xml', r.ms, `HTTP ${r.status}`, r.status)); }
      else {
        const body = typeof r.body === 'string' ? r.body : JSON.stringify(r.body);
        if (!body.includes('<osm') && !body.includes('<?xml')) {
          results.push(fail('format:xml', r.ms, `unexpected body: ${body.slice(0, 60)}`));
        } else {
          results.push(pass('format:xml', r.ms, { preview: body.slice(0, 80).replace(/\n/g, ' ') }));
        }
      }
    } catch (e) { results.push(fail('format:xml', Date.now() - t0, e)); }
  }

  await new Promise(r => setTimeout(r, 2000));

  // CSV
  {
    const t0 = Date.now();
    try {
      const r = await fetchWithRetry({
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': UA },
        body: `data=${encodeURIComponent(csvQuery())}`,
        timeoutMs: 25000,
      });
      if (!r.ok) { results.push(fail('format:csv', r.ms, `HTTP ${r.status}`, r.status)); }
      else {
        const body = typeof r.body === 'string' ? r.body : String(r.body);
        const lines = body.trim().split('\n');
        if (lines.length < 2) {
          results.push(fail('format:csv', r.ms, `too few lines: ${body.slice(0, 80)}`));
        } else {
          results.push(pass('format:csv', r.ms, { header: lines[0], rows: lines.length - 1 }));
        }
      }
    } catch (e) { results.push(fail('format:csv', Date.now() - t0, e)); }
  }

  const failed = results.find(r => !r.ok);
  if (failed) return failed;
  return pass(name, results.reduce((s, r) => s + r.ms, 0), {
    json: results[0].sample,
    xml: results[1].sample,
    csv: results[2].sample,
  });
}
