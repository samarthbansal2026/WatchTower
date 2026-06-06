// WSDOT (Washington State DOT) Traveler Information API
// https://wsdot.wa.gov/traffic/api/  — free access code; AccessCode query param.
// Tests 4 representative endpoints out of ~11 available.
import { timedFetch, pass, fail } from '../../lib/test-runner.js';

export const name = 'WSDOT';
export const tier = 'tier2';

const BASE = 'https://wsdot.com/Traffic/api'; // canonical REST host
const ENDPOINTS = {
  alerts:   '/HighwayAlerts/HighwayAlertsREST.svc/GetAlertsAsJson',
  cameras:  '/HighwayCameras/HighwayCamerasREST.svc/GetCamerasAsJson',
  flow:     '/TrafficFlow/TrafficFlowREST.svc/GetTrafficFlowsAsJson',
  passes:   '/MountainPassConditions/MountainPassConditionsREST.svc/GetMountainPassConditionsAsJson',
};

export async function run() {
  const t0 = Date.now();
  const key = process.env.WSDOT_ACCESS_CODE;
  if (!key) return fail(name, 0, 'WSDOT_ACCESS_CODE not set');

  try {
    const results = {};
    for (const [label, path] of Object.entries(ENDPOINTS)) {
      const r = await timedFetch(`${BASE}${path}?AccessCode=${key}`, { timeoutMs: 20000 });
      if (!r.ok) return fail(name, r.ms, `${label} HTTP ${r.status}`, r.status);
      // WSDOT returns either a string body (octet/text) or a JSON array.
      let body = r.body;
      if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch { /* */ }
      }
      if (!Array.isArray(body)) {
        return fail(name, r.ms, `${label} response not an array`);
      }
      results[label] = { ms: r.ms, count: body.length, sampleKeys: Object.keys(body[0] || {}).slice(0, 6) };
    }
    return pass(name, Date.now() - t0, results);
  } catch (e) {
    return fail(name, Date.now() - t0, e);
  }
}
