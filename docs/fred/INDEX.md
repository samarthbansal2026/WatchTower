# FRED / Federal Reserve Economic Data — Index

Gold standard for macro economic data. 800K+ time series from 120 sources, plus NY Fed reference rates.

## Sub-APIs

| Name | Auth | Latency | Test File | Docs | Status |
|---|---|---|---|---|---|
| FRED Series Metadata | API key | ~5s (10 series) | `tests/fred/series.js` | [FRED-Series.md](FRED-Series.md) | ✓ PASS |
| FRED Observations | API key | ~5.5s (12 series) | `tests/fred/observations.js` | [FRED-Series.md](FRED-Series.md) | ✓ PASS |
| FRED Categories | API key | ~1.5s | `tests/fred/categories.js` | [FRED-Categories.md](FRED-Categories.md) | ✓ PASS |
| FRED Releases | API key | ~2.4s | `tests/fred/releases.js` | [FRED-Releases.md](FRED-Releases.md) | ✓ PASS |
| FRED Search | API key | ~2.8s | `tests/fred/search.js` | [FRED-Search.md](FRED-Search.md) | ✓ PASS |
| FRED Sources | API key | ~3.7s | `tests/fred/sources.js` | [FRED-Sources.md](FRED-Sources.md) | ✓ PASS |
| NY Fed Reference Rates | None | ~420ms | `tests/fred/nyfed-rates.js` | [NYFed-Rates.md](NYFed-Rates.md) | ✓ PASS |

## Key data coverage

**Macro indicators (via FRED observations):**
- Unemployment Rate (UNRATE) — 4.3% as of 2026-05
- CPI All Urban (CPIAUCSL) — 332.4 (1982-84=100) as of 2026-04
- Effective Fed Funds Rate (FEDFUNDS) — 3.63% as of 2026-05
- 10-Year Treasury (DGS10) — 4.49% as of 2026-06-03
- Real GDP (GDPC1) — $24.15T as of 2026-Q1
- Housing Starts (HOUST) — 1,465K as of 2026-04
- Consumer Sentiment (UMCSENT) — 49.8 as of 2026-04
- PCE Price Index (PCEPI) — 130.9 as of 2026-04
- Labor Force Participation (CIVPART) — 61.8% as of 2026-05
- M2 Money Supply (M2SL) — $22,804B as of 2026-04
- 10Y-2Y Yield Spread (T10Y2Y) — 0.42% as of 2026-06-04
- WTI Crude Oil (DCOILWTICO) — $95.96 as of 2026-06-01

**NY Fed Reference Rates (as of 2026-06-04):**
- SOFR: 3.62% | EFFR: 3.62% | OBFR: 3.62% | TGCR: 3.59% | BGCR: 3.59%
- FOMC target range: 3.50%–3.75%

## Auth setup
```bash
# .env
FRED_API_KEY=your_key_here
# Register at: https://fredaccount.stlouisfed.org/login/secure/ → My Account → API Keys
```

## Running
```bash
node --env-file=.env tests/run-all.js fred
# 7 pass, 0 fail
```
