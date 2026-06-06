import { timedFetch, pass, fail, skip } from '../../lib/test-runner.js';

export const name = 'Eventbrite User & Organizations';
export const tier = 'tier2';

const TOKEN = process.env.EVENTBRITE_PRIVATE_TOKEN;
const BASE  = 'https://www.eventbriteapi.com/v3';

function headers() {
  return { Authorization: `Bearer ${TOKEN}` };
}

export async function run() {
  if (!TOKEN) return skip(name, 'EVENTBRITE_PRIVATE_TOKEN not set');

  const t0 = Date.now();
  try {
    // 1. User profile
    const me = await timedFetch(`${BASE}/users/me/`, { headers: headers(), timeoutMs: 30000 });
    if (!me.ok) return fail(name, me.ms, `users/me HTTP ${me.status}`, me.status);
    const u = me.body;
    if (!u.id || !u.emails) return fail(name, me.ms, 'unexpected users/me shape');

    // 2. Organizations owned by this user
    const orgs = await timedFetch(`${BASE}/users/me/organizations/`, { headers: headers(), timeoutMs: 30000 });
    if (!orgs.ok) return fail(name, orgs.ms, `organizations HTTP ${orgs.status}`, orgs.status);
    const orgList = orgs.body?.organizations ?? [];

    return pass(name, Date.now() - t0, {
      userId: u.id,
      name: `${u.first_name} ${u.last_name}`,
      email: u.emails?.[0]?.email,
      organizationCount: orgList.length,
      organizations: orgList.slice(0, 3).map(o => ({ id: o.id, name: o.name })),
    });
  } catch (e) {
    return fail(name, Date.now() - t0, e);
  }
}
