// Orchestrator: recursively imports every test file under tests/ (except self)
// and runs them sequentially.
//
// Usage:
//   node --env-file=.env tests/run-all.js            # run everything
//   node --env-file=.env tests/run-all.js noaa       # only tests/noaa/**
//   node --env-file=.env tests/run-all.js tier1      # filter by mod.tier
import { readdirSync, statSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, relative } from 'node:path';
import { printResultLine, printSummary, clearCalls, getCalls, C } from '../lib/test-runner.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SELF = 'run-all.js';
const ROOT = dirname(__dirname);
const LOGS_DIR = join(ROOT, 'logs');

function writeLog(rel, result) {
  const parts = rel.split('/');
  const service = parts[0];
  const api = parts[parts.length - 1].replace('.js', '');
  const dir = join(LOGS_DIR, service);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, `${api}.json`),
    JSON.stringify({ result, calls: getCalls() }, null, 2),
  );
}
const filterArg = process.argv[2]; // either a folder name (e.g. "noaa") or a tier id

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...walk(full));
    else if (st.isFile() && entry.endsWith('.js') && entry !== SELF) out.push(full);
  }
  return out;
}

const files = walk(__dirname).sort();
console.log(`${C.bold}${C.cyan}Watchtower API harness${C.reset} — discovered ${files.length} test(s)${filterArg ? ` (filter: ${filterArg})` : ''}\n`);

const results = [];
for (const f of files) {
  const rel = relative(__dirname, f);
  if (filterArg && !rel.includes(filterArg)) {
    // Try tier filter too (loaded module .tier check below).
  }
  const mod = await import(pathToFileURL(f).href);
  if (typeof mod.run !== 'function') continue;
  if (filterArg && !rel.includes(filterArg) && mod.tier !== filterArg) continue;
  clearCalls();
  try {
    const r = await mod.run();
    results.push(r);
    printResultLine(r);
    writeLog(rel, r);
  } catch (e) {
    const r = { name: mod.name || rel, ok: false, ms: 0, error: e.message || String(e) };
    results.push(r);
    printResultLine(r);
    writeLog(rel, r);
  }
}

printSummary(results);
process.exit(results.every(r => r.ok) ? 0 : 1);
