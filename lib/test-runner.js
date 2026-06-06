// Shared helpers for API tests.

let _calls = [];
export function clearCalls() { _calls = []; }
export function getCalls() { return _calls; }

const C = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
  cyan: '\x1b[36m',
};

export async function timedFetch(url, opts = {}) {
  const start = Date.now();
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 15000);
  const { timeoutMs: _t, ...fetchOpts } = opts;
  try {
    const res = await fetch(url, { ...fetchOpts, signal: ctrl.signal });
    const ms = Date.now() - start;
    const ct = res.headers.get('content-type') || '';
    // Match application/json, application/geo+json, application/ld+json, etc.
    const isJson = /\bjson\b/.test(ct);
    let body;
    if (isJson) {
      body = await res.json();
    } else {
      body = await res.text();
    }
    _calls.push({
      request: {
        url,
        method: (fetchOpts.method || 'GET').toUpperCase(),
        headers: fetchOpts.headers ?? {},
      },
      response: {
        status: res.status,
        ms,
        headers: Object.fromEntries(res.headers.entries()),
        body,
      },
    });
    return { status: res.status, ok: res.ok, ms, body, headers: res.headers };
  } finally {
    clearTimeout(timeout);
  }
}

export function pass(name, ms, sample, notes = '') {
  return { name, ok: true, ms, sample, notes };
}

export function fail(name, ms, error, status = null) {
  return { name, ok: false, ms, error: String(error), status };
}

// Use when a test is scaffolded but blocked on a missing credential — does not
// count as PASS or FAIL in the suite summary.
export function skip(name, reason) {
  return { name, ok: true, skipped: true, ms: 0, reason };
}

export function truncate(obj, max = 400) {
  const s = typeof obj === 'string' ? obj : JSON.stringify(obj);
  if (s.length <= max) return s;
  return s.slice(0, max) + '… [truncated]';
}

export function printResultLine(r) {
  let tag;
  if (r.skipped) tag = `${C.yellow}SKIP${C.reset}`;
  else if (r.ok) tag = `${C.green}PASS${C.reset}`;
  else            tag = `${C.red}FAIL${C.reset}`;
  const ms = `${C.dim}${String(r.ms ?? '-').padStart(5)}ms${C.reset}`;
  const name = r.name.padEnd(22);
  if (r.skipped) {
    console.log(`  ${tag}  ${ms}  ${C.bold}${name}${C.reset} ${C.dim}${r.reason || ''}${C.reset}`);
  } else if (r.ok) {
    console.log(`  ${tag}  ${ms}  ${C.bold}${name}${C.reset} ${C.dim}${truncate(r.sample, 80)}${C.reset}`);
  } else {
    const st = r.status ? `[${r.status}] ` : '';
    console.log(`  ${tag}  ${ms}  ${C.bold}${name}${C.reset} ${C.yellow}${st}${r.error}${C.reset}`);
  }
}

export function printSummary(results) {
  const skipped = results.filter(r => r.skipped).length;
  const passes = results.filter(r => r.ok && !r.skipped).length;
  const fails = results.filter(r => !r.ok).length;
  const skipPart = skipped > 0 ? `, ${C.yellow}${skipped} skip${C.reset}` : '';
  console.log(`\n${C.bold}Summary:${C.reset} ${C.green}${passes} pass${C.reset}, ${C.red}${fails} fail${C.reset}${skipPart}, total ${results.length}`);
  if (fails > 0) {
    console.log(`${C.yellow}Failed:${C.reset} ${results.filter(r => !r.ok).map(r => r.name).join(', ')}`);
  }
  if (skipped > 0) {
    console.log(`${C.dim}Skipped:${C.reset} ${results.filter(r => r.skipped).map(r => r.name).join(', ')}`);
  }
}

export { C };
