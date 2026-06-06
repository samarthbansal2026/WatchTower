import { timedFetch, pass, fail } from '../../lib/test-runner.js';

export const name = 'Open-Meteo Weather Forecast';
export const tier = 'tier1';

export async function run() {
  const t0 = Date.now();
  try {
    const lat = 37.7749, lon = -122.4194; // San Francisco
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,precipitation,weather_code&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&temperature_unit=fahrenheit&timezone=America/Los_Angeles`;
    const r = await timedFetch(url);
    if (!r.ok) return fail(name, r.ms, `HTTP ${r.status}`, r.status);
    if (!r.body?.hourly?.temperature_2m) return fail(name, r.ms, 'missing hourly temperature data');
    if (!r.body?.daily?.temperature_2m_max) return fail(name, r.ms, 'missing daily temperature data');

    const hourly = r.body.hourly;
    const daily = r.body.daily;
    return pass(name, Date.now() - t0, {
      location: { latitude: lat, longitude: lon },
      timezone: r.body.timezone,
      hourlyPoints: hourly.temperature_2m.length,
      firstHourlyTemp: `${hourly.temperature_2m[0]}°F`,
      dailyPoints: daily.temperature_2m_max.length,
      firstDayHighLow: `${daily.temperature_2m_max[0]}°F / ${daily.temperature_2m_min[0]}°F`,
    });
  } catch (e) {
    return fail(name, Date.now() - t0, e);
  }
}
