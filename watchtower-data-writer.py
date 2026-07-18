#!/usr/bin/env python3
"""
watchtower-data-writer.py

Reads raw WatchTower signal JSON files and writes directly-derivable data
into the ERP TypeScript data files. Sections requiring insight, forecasting,
or narrative generation are skipped and left for human/LLM review.

Usage:
    python3 watchtower-data-writer.py

Input files (auto-selected as most-recent match in WatchTower/logs/):
    edgewater-*-clean.json     → nyc-herald-square
    haw-river-*-clean.json     → burlington-nc-church-st
    tangelo-park-*-clean.json  → orlando-fl-intl-drive
    competitor-traffic-*.json  → all stores

Writes:
    outsideInData.ts  → weatherForecast, localEvents
    mockData.ts       → candidateStores (tag field), teaserPins
    operationsData.ts → competitorPromos

Does NOT write (requires derived analysis / narrative):
    dailyBriefData.ts
    dailyOperatingData.ts
    appMockData.ts
    forecastPlanData.ts
"""

import json
import re
import sys
from pathlib import Path
from datetime import datetime

# ── Paths ──────────────────────────────────────────────────────────────────────

SCRIPT_DIR   = Path(__file__).parent
LOGS_DIR     = SCRIPT_DIR / 'logs'
ERP_DATA_DIR = (SCRIPT_DIR.parent / 'retailabs-erp' / 'src' / 'pages' / 'watchtower' / 'data').resolve()

# ── Store mapping ──────────────────────────────────────────────────────────────

STORE_FILE_PREFIXES = {
    'nyc-herald-square':       'edgewater',
    'burlington-nc-church-st': 'haw-river',
    'orlando-fl-intl-drive':   'tangelo-park',
}

STORE_ORDER = ['nyc-herald-square', 'burlington-nc-church-st', 'orlando-fl-intl-drive']

# ── Utilities ──────────────────────────────────────────────────────────────────

def load_latest(pattern: str) -> dict:
    files = sorted(LOGS_DIR.glob(pattern))
    if not files:
        raise FileNotFoundError(f'No files matching {LOGS_DIR / pattern}')
    path = files[-1]
    print(f'  Loading {path.name}')
    with open(path) as f:
        return json.load(f)

def fmt_date(iso: str) -> str:
    """'2026-06-13' → 'Jun 13'"""
    d = datetime.strptime(iso[:10], '%Y-%m-%d')
    return d.strftime('%b %-d')

def day_abbr(name: str) -> str:
    """'Thursday' → 'Thu'"""
    return name[:3]

def icon_for(precip: int) -> str:
    """Return lucide-react icon name based on precipitation probability."""
    if precip >= 50:
        return 'CloudRain'
    if precip >= 20:
        return 'Cloud'
    return 'Sun'

def color_for(precip: int) -> str:
    if precip >= 50:
        return 'blue'
    if precip >= 20:
        return 'slate'
    return 'amber'

def conf_for(day_index: int) -> str:
    return 'High' if day_index < 3 else 'Medium'

def ts_str(s: str) -> str:
    """Escape a string for use in a TypeScript single-quoted string literal."""
    return s.replace('\\', '\\\\').replace("'", "\\'")

# ── TypeScript array replacement ───────────────────────────────────────────────

def replace_export_const(content: str, var_name: str, new_body: str) -> str:
    """
    Finds `export const VAR_NAME[: TYPE][ = ][ [ ... ]]` in content and
    replaces the array body.  Handles nested brackets, template literals,
    and single/double-quoted strings so it never mis-counts brackets inside
    string values.
    """
    start_re = re.compile(
        rf'^(export const {re.escape(var_name)}\b[^\n]*=\s*)',
        re.MULTILINE,
    )
    m = start_re.search(content)
    if not m:
        print(f'  WARNING: "export const {var_name}" not found — skipping')
        return content

    decl_start   = m.start()
    bracket_start = content.find('[', m.end())
    if bracket_start == -1:
        print(f'  WARNING: No "[" found after "export const {var_name}" — skipping')
        return content

    # Walk forward counting bracket depth, respecting strings
    depth       = 1
    i           = bracket_start + 1
    in_str      = False
    str_char    = None
    in_template = False
    tmpl_depth  = 0

    while i < len(content) and depth > 0:
        c = content[i]
        if in_template:
            if c == '\\':
                i += 2
                continue
            if c == '`':
                in_template = False
            elif c == '$' and content[i + 1:i + 2] == '{':
                tmpl_depth += 1
                i += 2
                continue
            elif c == '}' and tmpl_depth > 0:
                tmpl_depth -= 1
        elif in_str:
            if c == '\\':
                i += 2
                continue
            if c == str_char:
                in_str = False
        else:
            if c == '`':
                in_template = True
            elif c in ('"', "'"):
                in_str   = True
                str_char = c
            elif c == '[':
                depth += 1
            elif c == ']':
                depth -= 1
        i += 1

    end = i
    if end < len(content) and content[end] == ';':
        end += 1

    header      = content[decl_start:bracket_start]   # "export const FOO: Bar[] = "
    replacement = f'{header}[\n{new_body}\n];'
    return content[:decl_start] + replacement + content[end:]

# ── Data accessors ─────────────────────────────────────────────────────────────

def daytime_periods(store_data: dict) -> list:
    return [p for p in store_data['weather']['nws_forecast']['data']['periods']
            if p['isDaytime']]

def active_alert_events(store_data: dict) -> set:
    return {a['event'] for a in store_data['weather']['nws_alerts']['data'].get('alerts', [])}

def active_alerts(store_data: dict) -> list:
    return store_data['weather']['nws_alerts']['data'].get('alerts', [])

def tm_data(store_data: dict) -> dict:
    return store_data['events']['ticketmaster']['data']

def nhl_data(store_data: dict) -> dict:
    return store_data['events']['nhl']['data']

def phq_data(store_data: dict) -> dict:
    return store_data['events']['predicthq']['data']

# ── Generator: weatherForecast ─────────────────────────────────────────────────

def gen_weather_forecast(stores_data: dict) -> str:
    lines = []
    for store_id in STORE_ORDER:
        data = stores_data.get(store_id)
        if not data:
            continue
        periods = daytime_periods(data)
        alerts  = active_alert_events(data)
        # Heat Advisory covers today + tomorrow (day 0 and 1)
        for i, p in enumerate(periods):
            temp   = p['temperature']
            short  = p['shortForecast']
            precip = p['probabilityOfPrecipitation']

            condition = f'{short} ({precip}%)'
            if i < 2 and 'Heat Advisory' in alerts:
                condition += ' — Heat Advisory active'

            icon  = icon_for(precip)
            color = color_for(precip)
            conf  = conf_for(i)
            day   = day_abbr(p['name'])

            lines.append(
                f"  {{ day: '{day}', temp: '{temp}°', "
                f"condition: '{ts_str(condition)}', "
                f"impact: '—', conf: '{conf}', "
                f"icon: {icon}, color: '{color}', "
                f"store: '{store_id}' }},"
            )
        lines.append('')  # blank separator between stores

    return '\n'.join(lines).rstrip()

# ── Generator: localEvents ─────────────────────────────────────────────────────

def gen_local_events(stores_data: dict) -> str:
    lines = []
    event_id = 1

    # Collect stores with PHQ graduation data (same count for all, so deduplicate)
    phq_stores    = []
    phq_counts    = None
    forecast_meta = None
    for store_id in STORE_ORDER:
        data = stores_data.get(store_id)
        if not data:
            continue
        phq = phq_data(data)
        if phq.get('graduation', 0) > 0:
            phq_stores.append(store_id)
            phq_counts    = phq
            forecast_meta = data['meta']

    for store_id in STORE_ORDER:
        data = stores_data.get(store_id)
        if not data:
            continue
        nhl = nhl_data(data)
        tm  = tm_data(data)

        # ── NHL games (same national schedule for all stores; attribute to all) ──
        if nhl['game_count'] > 0:
            dates       = sorted(nhl['date_game_count'].keys())
            date_labels = [fmt_date(d) for d in dates]
            nhl_name    = 'NHL Playoff Games — ' + ' / '.join(date_labels)
            nhl_date    = date_labels[0] + (' + ' + ' + '.join(date_labels[1:]) if len(date_labels) > 1 else '')
            nhl_src     = f"NHL official schedule API ({nhl['game_count']} games this window)"
            lines.append(f'  {{')
            lines.append(f'    id: {event_id},')
            lines.append(f"    name: '{ts_str(nhl_name)}',")
            lines.append(f"    date: '{ts_str(nhl_date)}',")
            lines.append(f"    attendance: '18,000–20,000',")
            lines.append(f"    type: 'Sports',")
            lines.append(f"    impact: '—',")
            lines.append(f"    conf: 'Medium',")
            lines.append(f"    distance: 'Metro area',")
            lines.append(f"    source: '{ts_str(nhl_src)}',")
            lines.append(f"    stores: ['{store_id}'],")
            lines.append(f'  }},')
            event_id += 1

        # ── Ticketmaster event summary ──────────────────────────────────────────
        by_date = tm.get('by_date', {})
        if by_date:
            dates_sorted = sorted(by_date.keys())
            max_date     = max(by_date, key=lambda d: by_date[d])
            max_count    = by_date[max_date]
            total        = tm.get('total_available', '?')
            unique       = tm.get('unique_events', '?')
            radius       = tm.get('radius_miles', 25)
            window_from  = fmt_date(dates_sorted[0])
            window_to    = fmt_date(dates_sorted[-1])
            window_str   = f'{window_from}–{window_to}'

            # Build by-date annotation
            by_date_note = ', '.join(
                f'{fmt_date(d)} ({by_date[d]})'
                for d in dates_sorted
            )

            lines.append(f'  {{')
            lines.append(f'    id: {event_id},')
            lines.append(f"    name: 'Live Events — {window_str} — peaks {fmt_date(max_date)} ({max_count} events)',")
            lines.append(f"    date: '{window_str} — peaks {fmt_date(max_date)} ({max_count} unique events)',")
            lines.append(f"    attendance: 'Varies — up to 20,000/event',")
            lines.append(f"    type: 'Music / Sports / Arts',")
            lines.append(f"    impact: '—',")
            lines.append(f"    conf: 'Medium',")
            lines.append(f"    distance: '{radius}-mi radius',")
            lines.append(f"    source: 'Ticketmaster Discovery v2 ({total} total, {unique} unique, {window_str}; by day: {by_date_note})',")
            lines.append(f"    stores: ['{store_id}'],")
            lines.append(f'  }},')
            event_id += 1

        lines.append('')

    # ── PredictHQ graduation (one entry, all stores) ────────────────────────────
    if phq_counts and forecast_meta:
        g  = phq_counts.get('graduation', 0)
        e  = phq_counts.get('exam', 0)
        s  = phq_counts.get('academic-session', 0)
        fw = forecast_meta['forecast_window']
        w_from = fmt_date(fw['from'])
        w_to   = fmt_date(fw['to'])
        stores_arr = ', '.join(f"'{sid}'" for sid in phq_stores)

        lines.append(f'  {{')
        lines.append(f'    id: {event_id},')
        lines.append(f"    name: 'Graduation Ceremonies ({g} events)',")
        lines.append(f"    date: '{w_from}–{w_to}',")
        lines.append(f"    attendance: '{g} ceremonies across metro',")
        lines.append(f"    type: 'Academic',")
        lines.append(f"    impact: '—',")
        lines.append(f"    conf: 'High',")
        lines.append(f"    distance: 'Metro area',")
        lines.append(f"    source: 'PredictHQ academic events API (graduation={g}, exam={e}, session={s})',")
        lines.append(f"    stores: [{stores_arr}],")
        lines.append(f'  }},')

    return '\n'.join(lines).rstrip()

# ── Generator: candidateStores ─────────────────────────────────────────────────

_STORE_STATIC = {
    'nyc-herald-square': {
        'name':     'Dollar Tree',
        'address':  '2182 3rd Ave, New York, NY 10035',
        'dist':     '0.0 mi',
        'primary':  True,
        'nickname': 'E. Harlem',
    },
    'burlington-nc-church-st': {
        'name':     'Dollar Tree',
        'address':  '2120 N Church St, Burlington, NC 27217',
        'dist':     '—',
        'nickname': 'Burlington NC',
    },
    'orlando-fl-intl-drive': {
        'name':     'Dollar Tree',
        'address':  '5295 International Dr Ste 400, Orlando, FL 32819',
        'dist':     '—',
        'nickname': 'Orlando I-Drive',
    },
}

def _build_tag(store_id: str, data: dict) -> str:
    periods = daytime_periods(data)
    alerts  = active_alert_events(data)
    tm      = tm_data(data)

    if store_id == 'nyc-herald-square':
        total_events = sum(tm.get('by_date', {}).values())
        high_temp    = max(p['temperature'] for p in periods)
        alert_note   = ' · Heat Advisory active' if 'Heat Advisory' in alerts else ''
        return f'East Harlem · 3.0 format · {total_events} events in 25-mi radius this week{alert_note}'

    if store_id == 'burlington-nc-church-st':
        max_temp     = max(p['temperature'] for p in periods)
        return f'Burlington · XL / regional destination · extreme heat ({max_temp}°F peak this week)'

    if store_id == 'orlando-fl-intl-drive':
        precips = [p['probabilityOfPrecipitation'] for p in periods]
        min_p   = min(precips)
        max_p   = max(precips)
        return f'I-Drive · tourist corridor · rainy season active ({min_p}–{max_p}% afternoon storms daily)'

    return store_id

def gen_candidate_stores(stores_data: dict) -> str:
    lines = []
    for store_id in STORE_ORDER:
        cfg  = _STORE_STATIC[store_id]
        data = stores_data.get(store_id)
        tag  = _build_tag(store_id, data) if data else store_id

        lines.append('  {')
        lines.append(f"    id: '{store_id}',")
        lines.append(f"    name: '{cfg['name']}',")
        lines.append(f"    address: '{cfg['address']}',")
        lines.append(f"    tag: '{ts_str(tag)}',")
        lines.append(f"    dist: '{cfg['dist']}',")
        if cfg.get('primary'):
            lines.append(f"    primary: true,")
        if cfg.get('nickname'):
            lines.append(f"    nickname: '{cfg['nickname']}',")
        lines.append('  },')

    return '\n'.join(lines)

# ── Generator: teaserPins ──────────────────────────────────────────────────────

def gen_teaser_pins(stores_data: dict) -> str:
    """Pins reflect live signals for the primary store (nyc-herald-square)."""
    data = stores_data.get('nyc-herald-square')
    if not data:
        return "  { id: 'p1', x: 73, y: 28, color: '#D97706', layer: 'weather',  label: 'Weather' },"

    periods    = daytime_periods(data)
    alert_evts = active_alert_events(data)
    nhl        = nhl_data(data)
    tm         = tm_data(data)
    phq        = phq_data(data)

    today_temp = periods[0]['temperature'] if periods else '?'

    lines = []

    # Pin 1 — weather (always)
    if 'Heat Advisory' in alert_evts:
        weather_label = f'Heat Advisory {today_temp}°F'
    else:
        weather_label = f'Heat {today_temp}°F'
    lines.append(f"  {{ id: 'p1', x: 73, y: 28, color: '#D97706', layer: 'weather',   label: '{weather_label}' }},")

    # Pin 2 — events (always)
    if nhl['game_count'] > 0:
        events_label = 'NHL Playoffs'
    else:
        by_date   = tm.get('by_date', {})
        max_count = max(by_date.values()) if by_date else 0
        events_label = f'{max_count} Events' if max_count else 'Local Events'
    lines.append(f"  {{ id: 'p2', x: 24, y: 22, color: '#7C3AED', layer: 'events',    label: '{events_label}' }},")

    # Pin 3 — AQI (only if alert active)
    if 'Air Quality Alert' in alert_evts:
        lines.append(f"  {{ id: 'p3', x: 52, y: 82, color: '#DC2626', layer: 'aqi',       label: 'AQI Alert' }},")

    # Pin 4 — academic (only if graduation events active)
    grad_count = phq.get('graduation', 0)
    if grad_count > 0:
        lines.append(f"  {{ id: 'p4', x: 70, y: 56, color: '#2563EB', layer: 'academic',  label: 'Graduation' }},")

    return '\n'.join(lines)

# ── Generator: competitorPromos ────────────────────────────────────────────────

# Threat-level modifier per store and competitor
_THREAT = {
    'nyc-herald-square': {
        'Dollar General':  {'bev': 'High',   'care': 'High',   'seas': 'Medium'},
        'Family Dollar':   {'bev': 'High',   'care': 'High',   'seas': 'Medium'},
        'Walmart':         {'bev': 'Medium', 'care': 'Medium', 'seas': 'Medium'},
        'Target':          {'bev': 'Low',    'care': 'Low',    'seas': 'Medium'},
    },
    'burlington-nc-church-st': {
        'Dollar General':  {'bev': 'High',   'care': 'High',   'seas': 'Medium'},
        'Family Dollar':   {'bev': 'High',   'care': 'High',   'seas': 'Medium'},
        'Walmart':         {'bev': 'Medium', 'care': 'Medium', 'seas': 'Medium'},
        'Target':          {'bev': 'Low',    'care': 'Low',    'seas': 'Medium'},
    },
    'orlando-fl-intl-drive': {
        'Dollar General':  {'bev': 'Medium', 'care': 'Medium', 'seas': 'Low'},
        'Family Dollar':   {'bev': 'Medium', 'care': 'Medium', 'seas': 'Low'},
        'Walmart':         {'bev': 'Low',    'care': 'Low',    'seas': 'Low'},
        'Target':          {'bev': 'Low',    'care': 'Low',    'seas': 'Low'},
    },
}

# Generic response templates keyed by (competitor, category_type)
_RESPONSE = {
    ('Dollar General', 'bev'):    "DG wins on soda volume packs. Push Dollar Tree single-serve & RTD — no 3-unit minimum required.",
    ('Dollar General', 'care'):   "DG undercuts Dollar Tree on unit price this week. Keep personal care endcap fully faced — convenience is the counter.",
    ('Family Dollar', 'bev'):     "FD wins on unit price ($1.00/unit vs DT $1.25). Counter with SKU breadth and one-stop value.",
    ('Family Dollar', 'care'):    "FD undercuts on unit price. Ensure personal care shelves are fully stocked and visible.",
    ('Walmart', 'bev'):           "App-savvy shoppers may divert for app-rebate deals. Counter with grab-and-go single-serve near entrance — no app, no trip.",
    ('Walmart', 'care'):          "Walmart premium rebates target planned shoppers. DT wins on convenience for unplanned purchases.",
    ('Target', 'seas'):           "Sell through Dollar Tree summer seasonal before the Target event date — front endcap now.",
    ('Target', 'bev'):            "Target not price-competitive on beverages vs Dollar Tree this week.",
    ('Target', 'care'):           "Target premium personal care does not overlap significantly with Dollar Tree $1.25 SKUs.",
}

def gen_competitor_promos(competitor_data: dict) -> str:
    promos_json = competitor_data.get('competitor_promos', {})
    lines = []
    pid   = 1

    for store_id in STORE_ORDER:
        threat_map = _THREAT.get(store_id, {})

        # ── Dollar General ──────────────────────────────────────────────────────
        dg       = promos_json.get('dollar_general', {})
        dg_src   = dg.get('source', 'DG Weekly Ad')
        dg_deals = dg.get('deals', [])
        dg_per   = dg.get('ad_period', '').split('|')[0].strip()

        coke_deal    = next((d for d in dg_deals if 'Coca-Cola' in d.get('product', '')), None)
        colgate_deal = next((d for d in dg_deals if 'Colgate'   in d.get('product', '')), None)

        def emit(competitor, category, promo_text, threat_key, cat_key, source_str, resp_key, urgency):
            """Append one CompetitorPromo entry to lines."""
            nonlocal pid
            threat   = threat_map.get(competitor, {}).get(threat_key, 'Medium')
            response = _RESPONSE.get((competitor, resp_key), '—')
            lines.append(
                f"  {{ id: 'p{pid}', competitor: '{ts_str(competitor)}',"
                f" category: '{ts_str(category)}',"
                f" promo: '{ts_str(promo_text)}',"
                f" threatLevel: '{threat}',"
                f" source: '{ts_str(source_str)}',"
                f" response: '{ts_str(response)}',"
                f" urgency: '{urgency}', store: '{store_id}' }},"
            )
            pid += 1

        # Coke/beverage deal only for NYC (most event-dense / heat-exposed)
        if coke_deal and store_id == 'nyc-herald-square':
            unit_str = coke_deal.get('unit_price', '')
            reg_str  = coke_deal.get('regular', '')
            promo    = coke_deal['product'] + ' — ' + coke_deal['deal']
            if unit_str:
                promo += ' (' + unit_str + (', was ' + reg_str if reg_str else '') + ')'
            emit('Dollar General', 'Beverages', promo, 'bev', 'bev',
                 'DG Weekly Ad ' + dg_per + ' (' + dg_src + ')', 'bev', 'This week')

        # Colgate personal care deal (all stores)
        if colgate_deal:
            unit  = colgate_deal.get('unit_price', '')
            promo = colgate_deal['product'] + ' — ' + colgate_deal['deal']
            if unit:
                promo += ' (' + unit + ' vs Dollar Tree $1.25)'
            emit('Dollar General', 'Health & Beauty', promo, 'care', 'care',
                 'DG Weekly Ad ' + dg_per + ' (' + dg_src + ')', 'care', 'This week')

        # ── Walmart ─────────────────────────────────────────────────────────────
        wm       = promos_json.get('walmart', {})
        wm_src   = wm.get('source', 'Walmart Weekly Ad')
        wm_deals = wm.get('deals', [])
        wm_per   = wm.get('ad_period', '').split('|')[0].strip()

        pepsi_deal = next((d for d in wm_deals if 'Pepsi Prebiotic' in d.get('product', '')), None)

        # Pepsi rebate deal only for NYC (highest app-savvy shopper overlap)
        if pepsi_deal and store_id == 'nyc-herald-square':
            rebate = pepsi_deal.get('rebate', '')
            promo  = pepsi_deal['product'] + ' — ' + pepsi_deal['deal']
            if rebate:
                promo += ', ' + rebate
            emit('Walmart', 'Beverages', promo, 'bev', 'bev',
                 'Walmart Weekly Ad ' + wm_per + ' (' + wm_src + ')', 'bev', 'This week')

        # ── Family Dollar ────────────────────────────────────────────────────────
        fd       = promos_json.get('family_dollar', {})
        fd_src   = fd.get('source', 'Family Dollar Weekly Ad')
        fd_deals = fd.get('deals', [])
        fd_per   = fd.get('ad_period', '')

        bev_deal = next((d for d in fd_deals if '3 for $3' in d.get('deal', '')), None)
        if not bev_deal and fd_deals:
            bev_deal = fd_deals[0]

        if bev_deal:
            note  = bev_deal.get('note', '')
            promo = bev_deal.get('product', 'Snacks & beverages') + ' — ' + bev_deal['deal']
            if note:
                promo += ' (' + note + ')'
            emit('Family Dollar', 'Beverages', promo, 'bev', 'bev',
                 'Family Dollar Weekly Ad ' + fd_per + ' (' + fd_src + ')', 'bev', 'This week')

        # ── Target ───────────────────────────────────────────────────────────────
        tgt     = promos_json.get('target', {})
        tgt_src = tgt.get('source', 'Target Circle Deal Days')
        tgt_evt = tgt.get('major_event', '')

        if tgt_evt:
            promo = tgt_evt if len(tgt_evt) <= 120 else tgt_evt[:117] + '…'
            emit('Target', 'Seasonal', promo, 'seas', 'seas',
                 'Target Circle Deal Days (' + tgt_src + ')', 'seas', 'By Jun 22')

        lines.append('')  # blank separator between stores

    return '\n'.join(lines).rstrip()

# ── File updaters ──────────────────────────────────────────────────────────────

def update_outside_in_data(stores_data: dict):
    path = ERP_DATA_DIR / 'outsideInData.ts'
    print(f'\nUpdating {path.name}...')
    content = path.read_text().replace('\r\n', '\n')

    content = replace_export_const(content, 'weatherForecast', gen_weather_forecast(stores_data))
    print('  ✓ weatherForecast')

    content = replace_export_const(content, 'localEvents', gen_local_events(stores_data))
    print('  ✓ localEvents')

    path.write_text(content)
    print(f'  Saved.')

def update_mock_data(stores_data: dict):
    path = ERP_DATA_DIR / 'mockData.ts'
    print(f'\nUpdating {path.name}...')
    content = path.read_text().replace('\r\n', '\n')

    content = replace_export_const(content, 'candidateStores', gen_candidate_stores(stores_data))
    print('  ✓ candidateStores')

    content = replace_export_const(content, 'teaserPins', gen_teaser_pins(stores_data))
    print('  ✓ teaserPins')

    path.write_text(content)
    print(f'  Saved.')

def update_operations_data(competitor_data: dict):
    path = ERP_DATA_DIR / 'operationsData.ts'
    print(f'\nUpdating {path.name}...')
    content = path.read_text().replace('\r\n', '\n')

    content = replace_export_const(content, 'competitorPromos', gen_competitor_promos(competitor_data))
    print('  ✓ competitorPromos')

    path.write_text(content)
    print(f'  Saved.')

# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    print('WatchTower Data Writer')
    print('=' * 54)
    print(f'Logs dir : {LOGS_DIR}')
    print(f'ERP data : {ERP_DATA_DIR}')
    print()

    print('Loading signal files...')
    stores_data = {}
    for store_id, prefix in STORE_FILE_PREFIXES.items():
        try:
            stores_data[store_id] = load_latest(f'{prefix}-*-clean.json')
        except FileNotFoundError as e:
            print(f'  WARNING: {e}')

    competitor_data = {}
    try:
        competitor_data = load_latest('competitor-traffic-*.json')
    except FileNotFoundError as e:
        print(f'  WARNING: {e}')

    if not stores_data:
        print('ERROR: No store signal files loaded. Aborting.')
        sys.exit(1)

    print(f'\nLoaded {len(stores_data)} store(s): {", ".join(stores_data)}')

    update_outside_in_data(stores_data)
    update_mock_data(stores_data)
    if competitor_data:
        update_operations_data(competitor_data)
    else:
        print('\nSkipping operationsData.ts (no competitor-traffic file found)')

    print('\n' + '=' * 54)
    print('Done.')
    print()
    print('Fields written as — (require human/LLM review):')
    print('  weatherForecast.impact')
    print('  localEvents.impact')
    print()
    print('Files NOT updated (narrative / derived content):')
    print('  dailyBriefData.ts     — store narrative briefs')
    print('  dailyOperatingData.ts — action recommendations')
    print('  appMockData.ts        — insight card analysis')
    print('  forecastPlanData.ts   — demand anomaly analysis')
    print()
    print('Competitor promo response fields are template-generated.')
    print('Review operationsData.ts for store-specific nuance.')


if __name__ == '__main__':
    main()
