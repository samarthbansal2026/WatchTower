# FRED for Retail — How Macro Signals Drive Store Decisions

A store makes four recurring decisions: **what to stock**, **how to price it**, **when to hire/expand**, and **how to finance it**. Every FRED series maps to one of those.

---

## 1. Will customers actually spend? → Consumer Sentiment + Unemployment

**Request:**
```js
GET /fred/series/observations?series_id=UMCSENT&sort_order=desc&limit=12&api_key=KEY&file_type=json
GET /fred/series/observations?series_id=UNRATE&sort_order=desc&limit=1&api_key=KEY&file_type=json
```

**Response (2026-04/05):**
```json
{ "UMCSENT": { "date": "2026-04-01", "value": "49.8" } }
{ "UNRATE":  { "date": "2026-05-01", "value": "4.3" } }
```

**What this means:**
The Consumer Sentiment index baseline is 100 (1966=100). Below 70 is pessimistic; **49.8 is near-recession territory** — consumers are scared. Unemployment at 4.3% is low, meaning people *have* jobs and money, but *don't want to spend it*. That's a specific signal:

- Don't over-order luxury or discretionary inventory
- Value items, essentials, and private-label do well in this environment
- Promotions and discount messaging outperform "premium" positioning

---

## 2. Are my costs about to rise? → CPI + PCE + WTI Oil

**Request:**
```js
// Pull 13 months to compute year-over-year inflation rate
GET /fred/series/observations?series_id=CPIAUCSL&sort_order=desc&limit=13&api_key=KEY&file_type=json
GET /fred/series/observations?series_id=PCEPI&sort_order=desc&limit=13&api_key=KEY&file_type=json
GET /fred/series/observations?series_id=DCOILWTICO&sort_order=desc&limit=1&api_key=KEY&file_type=json
```

**Response:**
```json
{ "CPIAUCSL":    { "date": "2026-04-01", "value": "332.407" } }
{ "PCEPI":       { "date": "2026-04-01", "value": "130.902" } }
{ "DCOILWTICO":  { "date": "2026-06-01", "value": "95.96" } }
```

**What this means:**
- Compute YoY on CPI/PCE to see how fast prices are rising. Supplier invoices will follow — build that margin into your next purchase orders.
- WTI at **$95.96** is elevated (normal range ~$60–$80). Freight/shipping costs are directly tied to oil. Every inbound order from a distant supplier is landing at a higher cost per unit.

**Action:** Lock in supplier contracts before they pass fuel surcharges to you. Consider closer/domestic suppliers for high-velocity SKUs.

---

## 3. Is now a good time to borrow (expand / renovate)? → DGS10 + EFFR + Yield Curve

**NY Fed request (no auth):**
```js
GET https://markets.newyorkfed.org/api/rates/all/latest.json
```

**FRED request:**
```js
GET /fred/series/observations?series_id=DGS10&sort_order=desc&limit=1&api_key=KEY&file_type=json
GET /fred/series/observations?series_id=T10Y2Y&sort_order=desc&limit=1&api_key=KEY&file_type=json
```

**Response:**
```json
{ "EFFR": { "percentRate": 3.62, "targetRateFrom": 3.50, "targetRateTo": 3.75 } }
{ "DGS10":  { "date": "2026-06-03", "value": "4.49" } }
{ "T10Y2Y": { "date": "2026-06-04", "value": "0.42" } }
```

**What this means:**
- The FOMC target is **3.50–3.75%**. Commercial loans price off this — expect 7–9%+ for a business loan right now. **That's expensive money.**
- An expansion that pencils at 4% rates may not make sense at 9%.
- The **10Y-2Y yield spread at +0.42%** is barely positive. When it was deeply negative (inverted) it preceded recessions. 0.42 = cautious "probably OK, but watch it."

**Action:** If expansion ROI doesn't clear the higher hurdle rate, defer. If you must borrow, prefer short-term lines of credit over long-term fixed loans while waiting for rates to fall.

---

## 4. Should I open a second location / expand home goods? → Housing Starts + GDP

**Request:**
```js
GET /fred/series/observations?series_id=HOUST&sort_order=desc&limit=12&api_key=KEY&file_type=json
GET /fred/series/observations?series_id=GDPC1&sort_order=desc&limit=5&api_key=KEY&file_type=json
```

**Response:**
```json
{ "HOUST": { "date": "2026-04-01", "value": "1465.0" } }  // thousands of units
{ "GDPC1": { "date": "2026-01-01", "value": "24152.656" } } // billions, chained 2017$
```

**What this means:**
1,465,000 new housing starts/month means roughly **1.5 million households** will need to furnish and equip a new home over the next 6–18 months. For stores selling furniture, appliances, kitchen goods, tools, or bedding, this is a **leading demand signal** you can act on before customers walk in.

GDP growth (compare Q1 2026 to Q1 2025 for YoY rate) confirms the macro backdrop. Positive growth = expansion is sensible. Negative or flat = wait.

---

## 5. How much money is floating around? → M2 Money Supply

**Request:**
```js
GET /fred/series/observations?series_id=M2SL&sort_order=desc&limit=13&api_key=KEY&file_type=json
```

**Response:**
```json
{ "M2SL": { "date": "2026-04-01", "value": "22804.5" } }  // billions
```

**What this means:**
M2 is a 6–12 month **leading indicator** — it moves before you feel it at the register.
- M2 growing fast → more money chasing the same goods → inflation is coming → raise prices gradually and stock up now before COGS increase.
- M2 contracting → credit tightening → consumer purchases slow → be conservative on inventory orders.

---

## The Decision Dashboard — All Signals Together

Run `tests/fred/observations.js` once (~5.5 seconds) to pull all 12 series in a single batch. Map to actions:

| Series | Value (2026-05/06) | Store Signal |
|---|---|---|
| UMCSENT — Consumer Sentiment | 49.8 | Pessimistic. Value messaging, lean on essentials |
| UNRATE — Unemployment | 4.3% | Jobs exist, but spending held back by sentiment |
| CPIAUCSL — CPI Inflation | 332.4 | Prices rising. Build margin into supplier negotiations |
| DCOILWTICO — WTI Crude | $95.96 | Freight costs elevated. Prefer nearby suppliers |
| FEDFUNDS — Fed Funds Rate | 3.63% | Expensive credit environment |
| DGS10 — 10-Year Treasury | 4.49% | Business loans ~7–9%. High bar for expansion |
| T10Y2Y — Yield Curve Spread | +0.42% | No recession imminent, but growth is slow |
| HOUST — Housing Starts | 1,465K | Strong. Home goods demand coming in 6–18 months |
| GDPC1 — Real GDP | $24.15T | Compute YoY for growth/contraction signal |
| CIVPART — Labor Participation | 61.8% | Pool for hiring is available but not large |
| M2SL — M2 Money Supply | $22,804B | Compare MoM/YoY for inflation pressure lead |
| PCEPI — PCE Price Index | 130.9 | Fed's preferred inflation gauge. Matches CPI story |

**NY Fed rates (no auth, ~420ms):**

| Rate | Value (2026-06-04) | Store Signal |
|---|---|---|
| EFFR | 3.62% | Cost of overnight money. Floor for all lending |
| SOFR | 3.62% | Benchmark for variable-rate loans/leases |
| FOMC Target | 3.50–3.75% | Policy direction signal — watch for cuts |

---

## How to use this programmatically

```js
import { timedFetch } from '../../lib/test-runner.js';

const KEY = process.env.FRED_API_KEY;
const BASE = 'https://api.stlouisfed.org/fred';

async function getMacroSnapshot() {
  const SERIES = ['UNRATE','CPIAUCSL','UMCSENT','HOUST','DGS10','T10Y2Y','M2SL'];
  const snapshot = {};
  for (const id of SERIES) {
    const r = await timedFetch(
      `${BASE}/series/observations?series_id=${id}&api_key=${KEY}&file_type=json&sort_order=desc&limit=13`
    );
    const obs = r.body.observations.filter(o => o.value !== '.');
    snapshot[id] = {
      latest: { date: obs[0].date, value: parseFloat(obs[0].value) },
      yoy: obs.length >= 13
        ? ((parseFloat(obs[0].value) - parseFloat(obs[12].value)) / parseFloat(obs[12].value) * 100).toFixed(2) + '%'
        : null,
    };
  }
  return snapshot;
}
```

YoY is the most useful derived metric — raw index values are meaningless without context, but the rate of change tells you direction and speed.

---

## Related test files
- `tests/fred/observations.js` — pulls all 12 series in one pass
- `tests/fred/series.js` — series metadata (frequency, units, last updated)
- `tests/fred/nyfed-rates.js` — SOFR/EFFR/OBFR reference rates (no auth)
