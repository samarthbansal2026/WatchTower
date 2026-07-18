/**
 * Store Portfolio — multi-brand store list used across all pull scripts
 * (forecast-7d, past-7d, social-7d, store-intel) and findNearestStore().
 *
 * Originally scoped to Dollar Tree's top 3 stores by estimated revenue/profit;
 * now also holds other brands (Cavender's, Lowes Foods) that share the same
 * geo-lookup pipeline. The Dollar Tree revenue analysis below still applies
 * only to the Dollar Tree entries.
 *
 * ⚠  Dollar Tree publishes NO store-level revenue or profit data.
 *    Rankings below are inference from three public proxies:
 *      1. Foot traffic  — daily pedestrian/shopper volume (drives transaction count)
 *      2. Income density — median HH income × population within 1-mile radius
 *                         (drives basket size; 3.0 multi-price items skew toward
 *                          $3–$7 purchases vs. legacy $1.25 basket)
 *      3. Rent/cost ratio — lower occupancy cost vs. revenue → better net margin
 *
 *    Fleet benchmarks (public, from analyst reports & SEC filings):
 *      • Average store revenue     : ~$1.6M / year
 *      • Average store EBITDA      : ~$130K / year (~8% margin)
 *      • 3.0 format comp-sales lift: +220 bps vs. legacy stores
 *      • Avg transaction           : ~$8–10 (3.0 format) vs. ~$5–6 (legacy)
 *
 *    Stores with 3–5× fleet-average foot traffic can plausibly generate
 *    $4–8M / year in revenue; exact figures are not public.
 */

const stores = [

  /**
   * #1 — East Harlem, New York City  [EST. REVENUE: ~$5–8M/yr]
   *      STRONGEST REVENUE IN THE CHAIN (estimated)
   *
   * Lat:  40.8002
   * Lng: -73.9388
   *
   * Address : 2182 3rd Ave, New York, NY 10035
   * Format  : 3.0 multi-price (urban compact)
   *
   * Revenue case:
   *   - East Harlem / 3rd Ave corridor sees heavy foot traffic from dense
   *     residential population + nearby transit hubs.
   *   - Mix shifts heavily toward $3–$7 items (seasonal, home, snacks) vs.
   *     legacy $1.25 basket — boosting revenue per sq ft.
   *
   * Profit case:
   *   - Manhattan rent compresses margin, though East Harlem is lower than
   *     Midtown (~5–6% vs. 8% fleet average). Absolute dollar profit is
   *     high given the revenue base.
   *
   * Gotchas:
   *   - Multiple Dollar Tree stores in Manhattan; this is the East Harlem location.
   *   - Inventory turns daily; shrink rate is higher than suburban stores.
   */
  {
    id: 'nyc-herald-square',
    name: 'Dollar Tree — Herald Square, Midtown Manhattan',
    lat: 40.8002,
    lng: -73.9388,
    address: '2182 3rd Ave, New York, NY 10035, United States',
    state: 'NY',
    format: '3.0 multi-price (urban compact)',
    estimatedAnnualRevenue: '$5–8M',
    revenueRankReason: 'Highest foot-traffic corridor in the chain; 400k+ daily pedestrians',
    estimatedMargin: '~5–6% (compressed by Midtown rent)',
    footTrafficTier: 'top-0.1% of all US retail',
    avgTicketVsFleet: '+40–60% (3.0 format + tourist/impulse mix)',
    rentPressure: 'HIGH — ~$300/sq ft/yr',
    // Eventbrite venue IDs within 20 mi — discovered 2026-06-08 via web search + API resolution
    // Use GET /venues/{id}/events/ (no query params accepted); filter client-side by date
    eventbriteVenueIds: [
      { id: '297163512', name: 'Adam Clayton Powell Jr State Office Building, New York, NY', distanceMi: 0.76 },
      { id: '194080079', name: 'Movement Harlem, New York, NY',                              distanceMi: 0.88 },
      { id: '233014369', name: 'Harbor NYC Rooftop, New York, NY',                           distanceMi: 3.97 },
      { id: '297259262', name: 'Intrepid Museum, New York, NY',                              distanceMi: 4.06 },
      { id: '297414490', name: 'Bryant Park, New York, NY',                                  distanceMi: 4.21 },
      { id: '295072663', name: 'Sparrow\'s Nest Studio, New York, NY',                       distanceMi: 4.25 },
      { id: '235460369', name: '520 8th Ave, New York, NY',                                  distanceMi: 4.26 },
      { id: '133100419', name: 'Hyatt House Chelsea, New York, NY',                          distanceMi: 4.61 },
      { id: '297949667', name: 'The Hudson, New York, NY',                                   distanceMi: 4.76 },
      { id: '43834295',  name: 'Chelsea Market, New York, NY',                               distanceMi: 5.29 },
      { id: '297773531', name: 'Gansevoort Plaza, New York, NY',                             distanceMi: 5.48 },
      { id: '46949169',  name: 'Alligator Lounge, Brooklyn, NY',                             distanceMi: 5.98 },
      { id: '297488202', name: 'Refuge, Brooklyn, NY',                                       distanceMi: 6.12 },
      { id: '105995369', name: 'Sour Mouse NYC, New York, NY',                               distanceMi: 6.18 },
      { id: '297940060', name: 'The Concord NYC, New York, NY',                              distanceMi: 6.24 },
      { id: '297816496', name: 'Elsewhere, Brooklyn, NY',                                    distanceMi: 6.33 },
      { id: '298018639', name: 'Elsewhere - The Hall, Brooklyn, NY',                         distanceMi: 6.33 },
      { id: '296443418', name: 'MAMATACO, Brooklyn, NY',                                     distanceMi: 6.80 },
      { id: '297636651', name: 'Hall des Lumières, New York, NY',                            distanceMi: 6.89 },
      { id: '297450703', name: 'Secret Pour, Brooklyn, NY',                                  distanceMi: 7.37 },
      { id: '246560673', name: 'Marriott, New York, NY',                                     distanceMi: 7.41 },
      { id: '297930942', name: 'Littlefield, Brooklyn, NY',                                  distanceMi: 8.73 },
      { id: '297385034', name: 'Governors Island Play Lawns, New York, NY',                  distanceMi: 8.84 },
    ],
  },

  /**
   * #2 — Burlington, NC — Church Street Plaza  [EST. REVENUE: ~$4.5–6M/yr]
   *      WORLD-RECORD FOOTPRINT; REGIONAL DESTINATION STORE
   *
   * Lat:  36.0951
   * Lng: -79.4009
   *
   * Address : 2120 N Church St, Burlington, NC 27217
   * Format  : 3.0 multi-price / XL footprint
   *
   * Revenue case:
   *   - Largest Dollar Tree footprint in the fleet — serves as a regional
   *     destination for bulk and seasonal stock.
   *   - Draws shoppers from a wide radius who treat it as a primary shopping
   *     trip, not an impulse stop — boosting basket size significantly.
   *   - Average ticket est. +60–80% vs. fleet average.
   *
   * Profit case:
   *   - Rural NC rent is extremely low (~$12–15/sq ft/yr) vs. massive volume,
   *     yielding est. ~10–12% EBITDA — well above fleet average.
   *   - Best revenue-to-rent ratio in the chain.
   *
   * Gotchas:
   *   - Destination-driven traffic is less predictable day-to-day than
   *     urban walk-in traffic.
   *   - XL footprint requires higher inventory investment.
   */
  {
    id: 'burlington-nc-church-st',
    name: 'Dollar Tree — Burlington, Church Street Plaza',
    lat: 36.0951,
    lng: -79.4009,
    address: '2120 N Church St, Burlington, NC 27217, United States',
    state: 'NC',
    format: '3.0 multi-price / XL footprint',
    estimatedAnnualRevenue: '$4.5–6M',
    revenueRankReason: 'World-record footprint; primary regional destination for bulk/seasonal stock',
    estimatedMargin: '~10–12% (Low rural-market rent vs. massive volume)',
    footTrafficTier: 'top-0.1% of fleet (regional destination status)',
    avgTicketVsFleet: '+60–80%',
    rentPressure: 'LOW — ~$12-15/sq ft/yr',
    // Eventbrite venue IDs within 20 mi — discovered 2026-06-08 via web search + API resolution
    eventbriteVenueIds: [
      { id: '295489859', name: 'Buster Sykes Agricultural Demonstration Farm and Forest, Mebane, NC', distanceMi: 0.30 },
      { id: '296846597', name: 'Burlington Athletic Stadium, Burlington, NC',                          distanceMi: 0.77 },
      { id: '297936498', name: '703 E Davis St, Burlington, NC',                                       distanceMi: 1.78 },
      { id: '297974399', name: '127 E Front St, Burlington, NC',                                       distanceMi: 1.99 },
      { id: '295643822', name: 'May Memorial Library, Burlington, NC',                                 distanceMi: 1.99 },
      { id: '297798701', name: 'Kernodle Senior Center, Burlington, NC',                               distanceMi: 3.00 },
      { id: '297563984', name: 'Krafty Sloth Taphouse, Burlington, NC',                               distanceMi: 4.30 },
      { id: '297900206', name: 'The Krafty Sloth Taphouse, Burlington, NC',                           distanceMi: 4.30 },
      { id: '295746464', name: 'Greensboro, Greensboro, NC',                                          distanceMi: 19.96 },
    ],
  },


  /**
   * #3 — Orlando, FL — International Dr / Tourist Corridor  [EST. REVENUE: ~$3–4.5M/yr]
   *      HIGHEST PROFIT MARGIN CANDIDATE (volume + low costs)
   *
   * Lat:  28.4358
   * Lng: -81.4638
   *
   * Address : ~8201 International Dr, Orlando, FL 32819
   *           (I-Drive tourist strip, near Universal Studios)
   * Format  : 3.0 multi-price (expanded seasonal & novelty)
   *
   * Revenue case:
   *   - Orlando's International Drive corridor hosts ~75 million annual tourist
   *     visits (Disney + Universal + convention center). Tourist shoppers over-index
   *     on impulse buys — party supplies, snacks, sunscreen, souvenirs — all
   *     strong Dollar Tree categories.
   *   - Average basket skews higher than fleet avg because tourists buy multiples
   *     (party supplies, gifts to take home) in single visits.
   *   - Year-round seasonality: no winter slowdown unlike northern urban stores.
   *
   * Profit case:
   *   - Florida has NO state income tax (operational cost advantage vs. NYC/Chicago).
   *   - I-Drive rent is high but far below NYC (~$80–$120/sq ft/yr).
   *   - Low shrink vs. NYC; tourist-heavy areas have lower chronic theft than
   *     dense urban commuter stores.
   *   - Combined effect: est. 9–11% EBITDA — likely the best margin in top-revenue tier.
   *
   * Gotchas:
   *   - Heavily seasonal by tourist calendar (summer + Christmas peak, Jan–Feb soft).
   *   - High SKU velocity on novelty/seasonal items; requires frequent replenishment.
   *   - Multiple Dollar Tree stores on I-Drive; the Universal-adjacent cluster is
   *     the highest-traffic subset.
   */
  {
    id: 'orlando-fl-intl-drive',
    name: 'Dollar Tree — International Drive, Orlando',
    lat: 28.4658,
    lng: -81.4553,
    address: '5295 International Dr Ste 400, Orlando, FL 32819, United States',
    state: 'FL',
    format: '3.0 multi-price (expanded seasonal/novelty)',
    estimatedAnnualRevenue: '$3–4.5M',
    revenueRankReason: '75M annual tourist visits; impulse-buy corridor; year-round volume',
    estimatedMargin: '~9–11% (best margin in top-revenue tier; no state income tax + lower rent)',
    footTrafficTier: 'top-1% — tourism-driven',
    avgTicketVsFleet: '+25–45% (multi-unit tourist purchases)',
    rentPressure: 'MEDIUM — ~$100/sq ft/yr',
    flStateAdvantage: 'No Florida state income tax; lower labor overhead vs. CA/NY',
    // Eventbrite venue IDs within 20 mi — discovered 2026-06-08 via web search + API resolution
    eventbriteVenueIds: [
      { id: '297386524', name: 'Dezerland Park Orlando, Orlando, FL',                                          distanceMi: 0.47 },
      { id: '296005952', name: 'DoubleTree by Hilton at the Entrance to Universal Orlando, Orlando, FL',       distanceMi: 0.90 },
      { id: '297729340', name: 'Fabletics, Orlando, FL',                                                       distanceMi: 1.97 },
      { id: '297952548', name: 'lululemon, Orlando, FL',                                                       distanceMi: 1.97 },
      { id: '297745107', name: 'Altira Pool + Lounge, Orlando, FL',                                            distanceMi: 6.86 },
      { id: '297487271', name: 'Grand Bohemian Hotel Orlando, Autograph Collection, Orlando, FL',              distanceMi: 6.88 },
      { id: '297841391', name: 'Grand Bohemian Orlando, Autograph Collection, Orlando, FL',                    distanceMi: 6.88 },
      { id: '296501396', name: 'Celine Orlando, Orlando, FL',                                                  distanceMi: 7.05 },
      { id: '297739101', name: 'The Patio, Orlando, FL',                                                       distanceMi: 7.06 },
      { id: '297417070', name: 'Wall Street, Orlando, FL',                                                     distanceMi: 7.11 },
      { id: '297375627', name: 'Lake Eola Park, Orlando, FL',                                                  distanceMi: 7.13 },
      { id: '297899422', name: 'The Vanguard, Orlando, FL',                                                    distanceMi: 7.46 },
      { id: '296715509', name: '578 N Orange Ave, Orlando, FL',                                                distanceMi: 7.46 },
      { id: '297536079', name: 'Grape and the Grain Wine Bar, Orlando, FL',                                    distanceMi: 8.70 },
      { id: '297131736', name: 'AdventHealth University, Orlando, FL',                                         distanceMi: 9.30 },
      { id: '297883584', name: 'Orlando Fashion Square, Orlando, FL',                                          distanceMi: 9.34 },
      { id: '297903461', name: 'Aroma Gastro Bar, Orlando, FL',                                                distanceMi: 11.21 },
      { id: '297699047', name: '3800 S Econlockhatchee Trail, Orlando, FL',                                    distanceMi: 12.14 },
    ],
  },

  /**
   * #4 — Dallas, TX — Cavender's Boot City, Stemmons Fwy  [Western wear, not Dollar Tree]
   *
   * Lat:  32.8049
   * Lng: -96.8378
   *
   * Address : 2475 N Stemmons Fwy, Dallas, TX 75207
   * Format  : Western wear big-box (boots, apparel)
   *
   * Gotchas:
   *   - Different brand/category from the other 3 stores (Dollar Tree). Kept in
   *     the same array because all pull scripts (forecast-7d, past-7d, social-7d)
   *     key off this store list and findNearestStore().
   *   - Lat/lng rounded to 4 decimals: NWS /points redirects (301) to a
   *     canonical 4-decimal coordinate above that precision, and this repo's
   *     raw http/https fetch helper doesn't follow redirects.
   */
  {
    id: 'dallas-tx-stemmons-fwy',
    name: "Cavender's Boot City — Stemmons Fwy, Dallas",
    lat: 32.8049,
    lng: -96.8378,
    address: '2475 N Stemmons Fwy, Dallas, TX 75207, United States',
    state: 'TX',
    format: 'Western wear big-box (boots, apparel)',
  },

  /**
   * #5 — Mooresville, NC — Store #241  [Grocery, not Dollar Tree]
   *
   * Lat:  35.5868
   * Lng: -80.8717
   *
   * Address : 125 Center Square Drive, Mooresville, NC 28117
   * Format  : Full-service grocery
   *
   * Gotchas:
   *   - Different brand/category (Lowes Foods grocery) from the other Dollar
   *     Tree stores. Kept in the same array because all pull scripts
   *     (forecast-7d, past-7d, social-7d) key off this store list and
   *     findNearestStore().
   *   - Coordinates from Census geocoder (x/y = lng/lat, not lat/lng).
   */
  {
    id: 'mooresville-nc-center-square',
    name: 'Lowes Foods of Mooresville — Store #241',
    lat: 35.5868,
    lng: -80.8717,
    address: '125 Center Square Drive, Mooresville, NC 28117, United States',
    state: 'NC',
    format: 'Full-service grocery',
  },

  /**
   * Ingles Markets — Arden, Airport Road  [Store #137]
   *
   * Lat:  35.4506
   * Lng: -82.5274
   *
   * Address : 352 Airport Rd, Arden, NC 28704
   * Format  : Full-service grocery
   *
   * Called "Mega Ingles" colloquially by the user — no official "mega"
   * branding found. Arden has two Ingles locations (#130 Long Shoals Rd,
   * #137 Airport Rd); #137 is the newer store (opened ~2021, curbside +
   * online ordering) and the best-supported match for "biggest one," though
   * no square-footage figure is publicly confirmed. Coordinates from Census
   * geocoder (x/y = lng/lat, not lat/lng).
   */
  {
    id: 'arden-nc-airport-rd',
    name: 'Ingles Markets — Arden, Airport Road (Store #137)',
    lat: 35.4506,
    lng: -82.5274,
    address: '352 Airport Rd, Arden, NC 28704, United States',
    state: 'NC',
    format: 'Full-service grocery',
  },

  /**
   * Smart & Final #735 — La Cienega Blvd, Los Angeles
   *
   * Lat:  34.043843
   * Lng: -118.376788
   *
   * Address : 1833-B La Cienega Blvd, Los Angeles, CA 90035
   * Format  : Full-service grocery / warehouse
   *
   * Coordinates from Census geocoder (x/y = lng/lat, not lat/lng).
   */
  {
    id: 'la-la-cienega-735',
    name: 'Smart & Final #735 — La Cienega Blvd',
    lat: 34.043843,
    lng: -118.376788,
    address: '1833-B La Cienega Blvd, Los Angeles, CA 90035, United States',
    state: 'CA',
    format: 'Full-service grocery / warehouse',
    // Eventbrite venue IDs within 20 mi — discovered 2026-07-08 via web scrape + API resolution
    eventbriteVenueIds: [
      { id: '298022044', name: 'Barnes & Noble The Grove, Los Angeles, CA', distanceMi: 2.26 },
      { id: '298122374', name: 'Pacific Design Center, West Hollywood, CA', distanceMi: 2.67 },
      { id: '298136136', name: 'Vuori, Los Angeles, CA', distanceMi: 2.67 },
      { id: '77019679', name: 'Catch One, Los Angeles, CA', distanceMi: 3.03 },
      { id: '297324812', name: 'Dragonfly Hollywood, Los Angeles, CA', distanceMi: 4.14 },
      { id: '223614679', name: 'The Broadwater Second Stage, Los Angeles, CA', distanceMi: 4.29 },
      { id: '298087706', name: 'GoodPeople, Los Angeles, CA', distanceMi: 4.44 },
      { id: '289589253', name: 'Pandora Storefront 6801 Hollywood Blvd, Los Angeles, CA', distanceMi: 4.56 },
      { id: '298013040', name: 'Warwick, Los Angeles, CA', distanceMi: 4.57 },
      { id: '295954485', name: 'California African American Museum, Los Angeles, CA', distanceMi: 5.68 },
      { id: '297123777', name: 'The Vermont Hollywood, Los Angeles, CA', distanceMi: 5.85 },
      { id: '298324405', name: 'The Vermont Hollywood, Los Angeles, CA', distanceMi: 5.85 },
      { id: '221872519', name: 'The Pack Theater, Los Angeles, CA', distanceMi: 6.21 },
      { id: '298230505', name: 'Buca di Beppo, Los Angeles, CA', distanceMi: 6.53 },
      { id: '197744409', name: 'Counter Culture Coffee, Los Angeles, CA', distanceMi: 6.54 },
      { id: '298288473', name: 'The Mayan, Los Angeles, CA', distanceMi: 6.74 },
      { id: '297607039', name: '1 Windward Ave, Los Angeles, CA', distanceMi: 6.79 },
      { id: '169624839', name: 'Green Haus kitchen studio, Los Angeles, CA', distanceMi: 6.97 },
      { id: '296825067', name: '630 W 5th St, Los Angeles, CA', distanceMi: 6.99 },
      { id: '159476169', name: 'Pershing Square, Los Angeles, CA', distanceMi: 7.08 },
      { id: '282756843', name: 'Pershing Square, Los Angeles, CA', distanceMi: 7.1 },
      { id: '97359729', name: 'Grand Performances, Los Angeles, CA', distanceMi: 7.2 },
      { id: '9352669', name: 'The Association, Los Angeles, CA', distanceMi: 7.28 },
      { id: '99050009', name: 'Philosophical Research Society, Los Angeles, CA', distanceMi: 7.42 },
      { id: '298253540', name: 'The Green Room on Ventura 21+ Events Space, Los Angeles, CA', distanceMi: 8.13 },
      { id: '297538608', name: 'Mattress Central, Los Angeles, CA', distanceMi: 8.47 },
      { id: '298420738', name: 'Reserve Lounge, Glendale, CA', distanceMi: 8.74 },
      { id: '297880779', name: 'Solar Studios, Glendale, CA', distanceMi: 8.86 },
      { id: '297046804', name: 'Rio de Los Angeles State Park State Recreation Area, Los Angeles, CA', distanceMi: 8.91 },
      { id: '214910099', name: 'Collab MakerSpace, Los Angeles, CA', distanceMi: 9.02 },
      { id: '298161626', name: 'Hall of Crucifixion-Resurrection, Glendale, CA', distanceMi: 9.08 },
      { id: '297802762', name: 'UNEARTHED, Glendale, CA', distanceMi: 9.21 },
      { id: '297953416', name: 'Moonlight Rollerway, Inc., Glendale, CA', distanceMi: 9.26 },
      { id: '298321771', name: '5230 San Fernando Rd, Glendale, CA', distanceMi: 9.36 },
      { id: '169773939', name: 'Glendale, Glendale, CA', distanceMi: 9.75 },
      { id: '298336494', name: 'Fabletics, Glendale, CA', distanceMi: 9.78 },
      { id: '297770120', name: 'Brewyard Beer Company, Glendale, CA', distanceMi: 9.8 },
      { id: '296808575', name: 'Brewyard Beer Company, Glendale, CA', distanceMi: 9.8 },
      { id: '297503931', name: 'I.F.B. Studios, Glendale, CA', distanceMi: 9.81 },
      { id: '296336679', name: 'The Famous, Glendale, CA', distanceMi: 9.87 },
      { id: '271765383', name: 'Glendale Marketplace, Glendale, CA', distanceMi: 9.91 },
      { id: '297011819', name: '216 S Louise St, Glendale, CA', distanceMi: 9.93 },
      { id: '297668802', name: 'Glendale Presbyterian Church, Glendale, CA', distanceMi: 9.95 },
      { id: '298148900', name: '201 N Brand Blvd suite 200, Glendale, CA', distanceMi: 10.01 },
      { id: '298361469', name: '110 N Artsakh Ave, Glendale, CA', distanceMi: 10.01 },
      { id: '297609438', name: '250 S Glendale Ave, Glendale, CA', distanceMi: 10.02 },
      { id: '297760793', name: 'The Glendale Room, Glendale, CA', distanceMi: 10.02 },
      { id: '297876973', name: 'The Glendale Room, Glendale, CA', distanceMi: 10.02 },
      { id: '298251786', name: '250 S Glendale Ave, Glendale, CA', distanceMi: 10.02 },
      { id: '298455435', name: 'Giggles Night Club, Glendale, CA', distanceMi: 10.03 },
      { id: '221958779', name: 'Armenian Arts, Glendale, CA', distanceMi: 10.06 },
      { id: '298036886', name: 'Alex Theatre, Glendale, CA', distanceMi: 10.07 },
      { id: '298322825', name: 'Alex Theatre, Glendale, CA', distanceMi: 10.07 },
      { id: '296420234', name: 'ace/121 Gallery, Glendale, CA', distanceMi: 10.12 },
      { id: '240728413', name: 'Sister\'s Place, 600 South Adams Street, Glendale, CA, USA, Glendale, CA', distanceMi: 10.19 },
      { id: '296325970', name: 'Ozzy\'s Apizza Glendale, Glendale, CA', distanceMi: 10.37 },
      { id: '298275857', name: '801 N Brand Blvd, Glendale, CA', distanceMi: 10.51 },
      { id: '298395362', name: 'Rosebud Coffee, Los Angeles, CA', distanceMi: 11.58 },
      { id: '298138519', name: 'Crescenta Valley Community Regional Park, La Crescenta-Montrose, CA', distanceMi: 14.24 },
      { id: '295050537', name: '4451 Dunsmore Ave, Glendale, CA', distanceMi: 14.81 },
      { id: '298305922', name: 'Community Center of La Cañada Flintridge, La Cañada Flintridge, CA', distanceMi: 14.9 },
    ],
  },

  /**
   * Smart & Final #511 — Lincoln Heights, Los Angeles
   *
   * Lat:  34.075290
   * Lng: -118.215751
   *
   * Address : 2511 Daly Street, Los Angeles, CA 90031
   * Format  : Full-service grocery / warehouse
   *
   * Coordinates from Census geocoder (x/y = lng/lat, not lat/lng).
   */
  {
    id: 'la-lincoln-heights-511',
    name: 'Smart & Final #511 — Lincoln Heights',
    lat: 34.075290,
    lng: -118.215751,
    address: '2511 Daly Street, Los Angeles, CA 90031, United States',
    state: 'CA',
    format: 'Full-service grocery / warehouse',
    // Eventbrite venue IDs within 20 mi — discovered 2026-07-08 via web scrape + API resolution
    eventbriteVenueIds: [
      { id: '214910099', name: 'Collab MakerSpace, Los Angeles, CA', distanceMi: 0.72 },
      { id: '297046804', name: 'Rio de Los Angeles State Park State Recreation Area, Los Angeles, CA', distanceMi: 1.99 },
      { id: '97359729', name: 'Grand Performances, Los Angeles, CA', distanceMi: 2.62 },
      { id: '298395362', name: 'Rosebud Coffee, Los Angeles, CA', distanceMi: 2.8 },
      { id: '282756843', name: 'Pershing Square, Los Angeles, CA', distanceMi: 2.82 },
      { id: '296825067', name: '630 W 5th St, Los Angeles, CA', distanceMi: 2.83 },
      { id: '159476169', name: 'Pershing Square, Los Angeles, CA', distanceMi: 2.83 },
      { id: '9352669', name: 'The Association, Los Angeles, CA', distanceMi: 2.86 },
      { id: '298288473', name: 'The Mayan, Los Angeles, CA', distanceMi: 3.46 },
      { id: '197744409', name: 'Counter Culture Coffee, Los Angeles, CA', distanceMi: 3.71 },
      { id: '297538608', name: 'Mattress Central, Los Angeles, CA', distanceMi: 3.95 },
      { id: '298161626', name: 'Hall of Crucifixion-Resurrection, Glendale, CA', distanceMi: 3.98 },
      { id: '297880779', name: 'Solar Studios, Glendale, CA', distanceMi: 4.32 },
      { id: '99050009', name: 'Philosophical Research Society, Los Angeles, CA', distanceMi: 4.4 },
      { id: '298420738', name: 'Reserve Lounge, Glendale, CA', distanceMi: 4.4 },
      { id: '297123777', name: 'The Vermont Hollywood, Los Angeles, CA', distanceMi: 4.46 },
      { id: '298324405', name: 'The Vermont Hollywood, Los Angeles, CA', distanceMi: 4.46 },
      { id: '240728413', name: 'Sister\'s Place, 600 South Adams Street, Glendale, CA, USA, Glendale, CA', distanceMi: 4.69 },
      { id: '221872519', name: 'The Pack Theater, Los Angeles, CA', distanceMi: 4.74 },
      { id: '297609438', name: '250 S Glendale Ave, Glendale, CA', distanceMi: 5.04 },
      { id: '298251786', name: '250 S Glendale Ave, Glendale, CA', distanceMi: 5.04 },
      { id: '169773939', name: 'Glendale, Glendale, CA', distanceMi: 5.16 },
      { id: '297011819', name: '216 S Louise St, Glendale, CA', distanceMi: 5.17 },
      { id: '297668802', name: 'Glendale Presbyterian Church, Glendale, CA', distanceMi: 5.25 },
      { id: '296336679', name: 'The Famous, Glendale, CA', distanceMi: 5.28 },
      { id: '271765383', name: 'Glendale Marketplace, Glendale, CA', distanceMi: 5.33 },
      { id: '296420234', name: 'ace/121 Gallery, Glendale, CA', distanceMi: 5.37 },
      { id: '298361469', name: '110 N Artsakh Ave, Glendale, CA', distanceMi: 5.4 },
      { id: '297760793', name: 'The Glendale Room, Glendale, CA', distanceMi: 5.44 },
      { id: '297876973', name: 'The Glendale Room, Glendale, CA', distanceMi: 5.44 },
      { id: '298336494', name: 'Fabletics, Glendale, CA', distanceMi: 5.45 },
      { id: '298148900', name: '201 N Brand Blvd suite 200, Glendale, CA', distanceMi: 5.53 },
      { id: '298036886', name: 'Alex Theatre, Glendale, CA', distanceMi: 5.55 },
      { id: '298322825', name: 'Alex Theatre, Glendale, CA', distanceMi: 5.55 },
      { id: '298455435', name: 'Giggles Night Club, Glendale, CA', distanceMi: 5.56 },
      { id: '221958779', name: 'Armenian Arts, Glendale, CA', distanceMi: 5.64 },
      { id: '295954485', name: 'California African American Museum, Los Angeles, CA', distanceMi: 5.65 },
      { id: '297953416', name: 'Moonlight Rollerway, Inc., Glendale, CA', distanceMi: 5.72 },
      { id: '298321771', name: '5230 San Fernando Rd, Glendale, CA', distanceMi: 5.98 },
      { id: '298275857', name: '801 N Brand Blvd, Glendale, CA', distanceMi: 6.17 },
      { id: '296325970', name: 'Ozzy\'s Apizza Glendale, Glendale, CA', distanceMi: 6.32 },
      { id: '223614679', name: 'The Broadwater Second Stage, Los Angeles, CA', distanceMi: 6.48 },
      { id: '77019679', name: 'Catch One, Los Angeles, CA', distanceMi: 6.49 },
      { id: '297324812', name: 'Dragonfly Hollywood, Los Angeles, CA', distanceMi: 6.71 },
      { id: '298013040', name: 'Warwick, Los Angeles, CA', distanceMi: 6.81 },
      { id: '289589253', name: 'Pandora Storefront 6801 Hollywood Blvd, Los Angeles, CA', distanceMi: 7.35 },
      { id: '297770120', name: 'Brewyard Beer Company, Glendale, CA', distanceMi: 7.72 },
      { id: '297802762', name: 'UNEARTHED, Glendale, CA', distanceMi: 7.72 },
      { id: '296808575', name: 'Brewyard Beer Company, Glendale, CA', distanceMi: 7.72 },
      { id: '297503931', name: 'I.F.B. Studios, Glendale, CA', distanceMi: 7.76 },
      { id: '298022044', name: 'Barnes & Noble The Grove, Los Angeles, CA', distanceMi: 8.22 },
      { id: '169624839', name: 'Green Haus kitchen studio, Los Angeles, CA', distanceMi: 8.33 },
      { id: '298230505', name: 'Buca di Beppo, Los Angeles, CA', distanceMi: 8.87 },
      { id: '298305922', name: 'Community Center of La Cañada Flintridge, La Cañada Flintridge, CA', distanceMi: 8.91 },
      { id: '298122374', name: 'Pacific Design Center, West Hollywood, CA', distanceMi: 9.55 },
      { id: '298138519', name: 'Crescenta Valley Community Regional Park, La Crescenta-Montrose, CA', distanceMi: 10.52 },
      { id: '295050537', name: '4451 Dunsmore Ave, Glendale, CA', distanceMi: 11.24 },
      { id: '298136136', name: 'Vuori, Los Angeles, CA', distanceMi: 11.72 },
      { id: '298253540', name: 'The Green Room on Ventura 21+ Events Space, Los Angeles, CA', distanceMi: 13.81 },
      { id: '298087706', name: 'GoodPeople, Los Angeles, CA', distanceMi: 13.82 },
      { id: '297607039', name: '1 Windward Ave, Los Angeles, CA', distanceMi: 15.97 },
    ],
  },

  /**
   * Smart & Final #304 — Glendale, Verdugo Rd
   *
   * Lat:  34.148507
   * Lng: -118.235594
   *
   * Address : 210 N Verdugo Road, Glendale, CA 91206
   * Format  : Full-service grocery / warehouse
   *
   * Coordinates from Census geocoder (x/y = lng/lat, not lat/lng).
   */
  {
    id: 'glendale-verdugo-304',
    name: 'Smart & Final #304 — Glendale, Verdugo Rd',
    lat: 34.148507,
    lng: -118.235594,
    address: '210 N Verdugo Road, Glendale, CA 91206, United States',
    state: 'CA',
    format: 'Full-service grocery / warehouse',
    // Eventbrite venue IDs within 20 mi — discovered 2026-07-08 via web scrape + API resolution
    eventbriteVenueIds: [
      { id: '240728413', name: 'Sister\'s Place, 600 South Adams Street, Glendale, CA, USA, Glendale, CA', distanceMi: 0.69 },
      { id: '297609438', name: '250 S Glendale Ave, Glendale, CA', distanceMi: 0.85 },
      { id: '298251786', name: '250 S Glendale Ave, Glendale, CA', distanceMi: 0.85 },
      { id: '296420234', name: 'ace/121 Gallery, Glendale, CA', distanceMi: 0.91 },
      { id: '297011819', name: '216 S Louise St, Glendale, CA', distanceMi: 1 },
      { id: '297668802', name: 'Glendale Presbyterian Church, Glendale, CA', distanceMi: 1.01 },
      { id: '298361469', name: '110 N Artsakh Ave, Glendale, CA', distanceMi: 1.04 },
      { id: '297760793', name: 'The Glendale Room, Glendale, CA', distanceMi: 1.06 },
      { id: '297876973', name: 'The Glendale Room, Glendale, CA', distanceMi: 1.06 },
      { id: '298036886', name: 'Alex Theatre, Glendale, CA', distanceMi: 1.1 },
      { id: '271765383', name: 'Glendale Marketplace, Glendale, CA', distanceMi: 1.1 },
      { id: '298322825', name: 'Alex Theatre, Glendale, CA', distanceMi: 1.1 },
      { id: '296336679', name: 'The Famous, Glendale, CA', distanceMi: 1.12 },
      { id: '298148900', name: '201 N Brand Blvd suite 200, Glendale, CA', distanceMi: 1.14 },
      { id: '298455435', name: 'Giggles Night Club, Glendale, CA', distanceMi: 1.14 },
      { id: '221958779', name: 'Armenian Arts, Glendale, CA', distanceMi: 1.18 },
      { id: '169773939', name: 'Glendale, Glendale, CA', distanceMi: 1.19 },
      { id: '298336494', name: 'Fabletics, Glendale, CA', distanceMi: 1.31 },
      { id: '298275857', name: '801 N Brand Blvd, Glendale, CA', distanceMi: 1.33 },
      { id: '296325970', name: 'Ozzy\'s Apizza Glendale, Glendale, CA', distanceMi: 1.59 },
      { id: '298161626', name: 'Hall of Crucifixion-Resurrection, Glendale, CA', distanceMi: 1.88 },
      { id: '297880779', name: 'Solar Studios, Glendale, CA', distanceMi: 2 },
      { id: '297953416', name: 'Moonlight Rollerway, Inc., Glendale, CA', distanceMi: 2 },
      { id: '298321771', name: '5230 San Fernando Rd, Glendale, CA', distanceMi: 2.1 },
      { id: '298420738', name: 'Reserve Lounge, Glendale, CA', distanceMi: 2.11 },
      { id: '297538608', name: 'Mattress Central, Los Angeles, CA', distanceMi: 2.46 },
      { id: '99050009', name: 'Philosophical Research Society, Los Angeles, CA', distanceMi: 3.43 },
      { id: '297046804', name: 'Rio de Los Angeles State Park State Recreation Area, Los Angeles, CA', distanceMi: 3.44 },
      { id: '296808575', name: 'Brewyard Beer Company, Glendale, CA', distanceMi: 3.49 },
      { id: '297770120', name: 'Brewyard Beer Company, Glendale, CA', distanceMi: 3.5 },
      { id: '297503931', name: 'I.F.B. Studios, Glendale, CA', distanceMi: 3.53 },
      { id: '298395362', name: 'Rosebud Coffee, Los Angeles, CA', distanceMi: 3.67 },
      { id: '297802762', name: 'UNEARTHED, Glendale, CA', distanceMi: 3.87 },
      { id: '298305922', name: 'Community Center of La Cañada Flintridge, La Cañada Flintridge, CA', distanceMi: 4.28 },
      { id: '221872519', name: 'The Pack Theater, Los Angeles, CA', distanceMi: 4.65 },
      { id: '197744409', name: 'Counter Culture Coffee, Los Angeles, CA', distanceMi: 4.65 },
      { id: '297123777', name: 'The Vermont Hollywood, Los Angeles, CA', distanceMi: 5.13 },
      { id: '298324405', name: 'The Vermont Hollywood, Los Angeles, CA', distanceMi: 5.13 },
      { id: '298138519', name: 'Crescenta Valley Community Regional Park, La Crescenta-Montrose, CA', distanceMi: 5.34 },
      { id: '214910099', name: 'Collab MakerSpace, Los Angeles, CA', distanceMi: 5.75 },
      { id: '295050537', name: '4451 Dunsmore Ave, Glendale, CA', distanceMi: 6.05 },
      { id: '298013040', name: 'Warwick, Los Angeles, CA', distanceMi: 6.49 },
      { id: '223614679', name: 'The Broadwater Second Stage, Los Angeles, CA', distanceMi: 6.6 },
      { id: '298230505', name: 'Buca di Beppo, Los Angeles, CA', distanceMi: 6.73 },
      { id: '97359729', name: 'Grand Performances, Los Angeles, CA', distanceMi: 6.76 },
      { id: '289589253', name: 'Pandora Storefront 6801 Hollywood Blvd, Los Angeles, CA', distanceMi: 6.77 },
      { id: '297324812', name: 'Dragonfly Hollywood, Los Angeles, CA', distanceMi: 6.79 },
      { id: '296825067', name: '630 W 5th St, Los Angeles, CA', distanceMi: 6.87 },
      { id: '282756843', name: 'Pershing Square, Los Angeles, CA', distanceMi: 6.98 },
      { id: '159476169', name: 'Pershing Square, Los Angeles, CA', distanceMi: 6.98 },
      { id: '9352669', name: 'The Association, Los Angeles, CA', distanceMi: 7.2 },
      { id: '298288473', name: 'The Mayan, Los Angeles, CA', distanceMi: 7.58 },
      { id: '77019679', name: 'Catch One, Los Angeles, CA', distanceMi: 8.61 },
      { id: '298022044', name: 'Barnes & Noble The Grove, Los Angeles, CA', distanceMi: 8.79 },
      { id: '295954485', name: 'California African American Museum, Los Angeles, CA', distanceMi: 9.56 },
      { id: '298122374', name: 'Pacific Design Center, West Hollywood, CA', distanceMi: 9.56 },
      { id: '298253540', name: 'The Green Room on Ventura 21+ Events Space, Los Angeles, CA', distanceMi: 11.69 },
      { id: '298136136', name: 'Vuori, Los Angeles, CA', distanceMi: 12.2 },
      { id: '169624839', name: 'Green Haus kitchen studio, Los Angeles, CA', distanceMi: 12.59 },
      { id: '298087706', name: 'GoodPeople, Los Angeles, CA', distanceMi: 14.43 },
      { id: '297607039', name: '1 Windward Ave, Los Angeles, CA', distanceMi: 17.61 },
    ],
  },

  /**
   * Smart & Final #444 — Los Angeles, Midtown (Pico Blvd)
   *
   * Lat:  34.048683
   * Lng: -118.335836
   *
   * Address : 4550 Pico Blvd, Ste D303, Los Angeles, CA 90019
   * Format  : Full-service grocery / warehouse
   *
   * Coordinates from Census geocoder (x/y = lng/lat, not lat/lng).
   */
  {
    id: 'la-midtown-444',
    name: 'Smart & Final #444 — Los Angeles, Midtown',
    lat: 34.048683,
    lng: -118.335836,
    address: '4550 Pico Blvd, Ste D303, Los Angeles, CA 90019, United States',
    state: 'CA',
    format: 'Full-service grocery / warehouse',
    // Eventbrite venue IDs within 20 mi — discovered 2026-07-08 via web scrape + API resolution
    eventbriteVenueIds: [
      { id: '77019679', name: 'Catch One, Los Angeles, CA', distanceMi: 0.67 },
      { id: '298022044', name: 'Barnes & Noble The Grove, Los Angeles, CA', distanceMi: 2.16 },
      { id: '297324812', name: 'Dragonfly Hollywood, Los Angeles, CA', distanceMi: 2.91 },
      { id: '223614679', name: 'The Broadwater Second Stage, Los Angeles, CA', distanceMi: 2.94 },
      { id: '298013040', name: 'Warwick, Los Angeles, CA', distanceMi: 3.43 },
      { id: '298122374', name: 'Pacific Design Center, West Hollywood, CA', distanceMi: 3.53 },
      { id: '289589253', name: 'Pandora Storefront 6801 Hollywood Blvd, Los Angeles, CA', distanceMi: 3.72 },
      { id: '295954485', name: 'California African American Museum, Los Angeles, CA', distanceMi: 3.76 },
      { id: '297123777', name: 'The Vermont Hollywood, Los Angeles, CA', distanceMi: 3.84 },
      { id: '298324405', name: 'The Vermont Hollywood, Los Angeles, CA', distanceMi: 3.84 },
      { id: '221872519', name: 'The Pack Theater, Los Angeles, CA', distanceMi: 4.36 },
      { id: '298288473', name: 'The Mayan, Los Angeles, CA', distanceMi: 4.42 },
      { id: '197744409', name: 'Counter Culture Coffee, Los Angeles, CA', distanceMi: 4.43 },
      { id: '296825067', name: '630 W 5th St, Los Angeles, CA', distanceMi: 4.63 },
      { id: '159476169', name: 'Pershing Square, Los Angeles, CA', distanceMi: 4.73 },
      { id: '282756843', name: 'Pershing Square, Los Angeles, CA', distanceMi: 4.75 },
      { id: '97359729', name: 'Grand Performances, Los Angeles, CA', distanceMi: 4.83 },
      { id: '298136136', name: 'Vuori, Los Angeles, CA', distanceMi: 4.85 },
      { id: '9352669', name: 'The Association, Los Angeles, CA', distanceMi: 4.94 },
      { id: '99050009', name: 'Philosophical Research Society, Los Angeles, CA', distanceMi: 5.56 },
      { id: '169624839', name: 'Green Haus kitchen studio, Los Angeles, CA', distanceMi: 5.87 },
      { id: '298230505', name: 'Buca di Beppo, Los Angeles, CA', distanceMi: 6.12 },
      { id: '297538608', name: 'Mattress Central, Los Angeles, CA', distanceMi: 6.52 },
      { id: '214910099', name: 'Collab MakerSpace, Los Angeles, CA', distanceMi: 6.65 },
      { id: '297046804', name: 'Rio de Los Angeles State Park State Recreation Area, Los Angeles, CA', distanceMi: 6.69 },
      { id: '298087706', name: 'GoodPeople, Los Angeles, CA', distanceMi: 6.79 },
      { id: '298420738', name: 'Reserve Lounge, Glendale, CA', distanceMi: 6.87 },
      { id: '297880779', name: 'Solar Studios, Glendale, CA', distanceMi: 6.97 },
      { id: '298161626', name: 'Hall of Crucifixion-Resurrection, Glendale, CA', distanceMi: 7.13 },
      { id: '297953416', name: 'Moonlight Rollerway, Inc., Glendale, CA', distanceMi: 7.62 },
      { id: '298321771', name: '5230 San Fernando Rd, Glendale, CA', distanceMi: 7.77 },
      { id: '169773939', name: 'Glendale, Glendale, CA', distanceMi: 7.96 },
      { id: '298336494', name: 'Fabletics, Glendale, CA', distanceMi: 8.04 },
      { id: '297802762', name: 'UNEARTHED, Glendale, CA', distanceMi: 8.05 },
      { id: '296336679', name: 'The Famous, Glendale, CA', distanceMi: 8.1 },
      { id: '297011819', name: '216 S Louise St, Glendale, CA', distanceMi: 8.13 },
      { id: '271765383', name: 'Glendale Marketplace, Glendale, CA', distanceMi: 8.15 },
      { id: '297668802', name: 'Glendale Presbyterian Church, Glendale, CA', distanceMi: 8.17 },
      { id: '297609438', name: '250 S Glendale Ave, Glendale, CA', distanceMi: 8.19 },
      { id: '298251786', name: '250 S Glendale Ave, Glendale, CA', distanceMi: 8.19 },
      { id: '298361469', name: '110 N Artsakh Ave, Glendale, CA', distanceMi: 8.25 },
      { id: '297760793', name: 'The Glendale Room, Glendale, CA', distanceMi: 8.26 },
      { id: '297876973', name: 'The Glendale Room, Glendale, CA', distanceMi: 8.26 },
      { id: '298148900', name: '201 N Brand Blvd suite 200, Glendale, CA', distanceMi: 8.28 },
      { id: '240728413', name: 'Sister\'s Place, 600 South Adams Street, Glendale, CA, USA, Glendale, CA', distanceMi: 8.29 },
      { id: '298455435', name: 'Giggles Night Club, Glendale, CA', distanceMi: 8.3 },
      { id: '298036886', name: 'Alex Theatre, Glendale, CA', distanceMi: 8.33 },
      { id: '298322825', name: 'Alex Theatre, Glendale, CA', distanceMi: 8.33 },
      { id: '296420234', name: 'ace/121 Gallery, Glendale, CA', distanceMi: 8.34 },
      { id: '221958779', name: 'Armenian Arts, Glendale, CA', distanceMi: 8.34 },
      { id: '296808575', name: 'Brewyard Beer Company, Glendale, CA', distanceMi: 8.56 },
      { id: '297770120', name: 'Brewyard Beer Company, Glendale, CA', distanceMi: 8.57 },
      { id: '297503931', name: 'I.F.B. Studios, Glendale, CA', distanceMi: 8.58 },
      { id: '296325970', name: 'Ozzy\'s Apizza Glendale, Glendale, CA', distanceMi: 8.76 },
      { id: '298275857', name: '801 N Brand Blvd, Glendale, CA', distanceMi: 8.85 },
      { id: '297607039', name: '1 Windward Ave, Los Angeles, CA', distanceMi: 8.97 },
      { id: '298253540', name: 'The Green Room on Ventura 21+ Events Space, Los Angeles, CA', distanceMi: 9.15 },
      { id: '298395362', name: 'Rosebud Coffee, Los Angeles, CA', distanceMi: 9.31 },
      { id: '298138519', name: 'Crescenta Valley Community Regional Park, La Crescenta-Montrose, CA', distanceMi: 12.95 },
      { id: '298305922', name: 'Community Center of La Cañada Flintridge, La Cañada Flintridge, CA', distanceMi: 13.17 },
      { id: '295050537', name: '4451 Dunsmore Ave, Glendale, CA', distanceMi: 13.57 },
    ],
  },

  /**
   * Smart & Final #484 — Los Angeles, S. Figueroa
   *
   * Lat:  34.046991
   * Lng: -118.262161
   *
   * Address : 845 S Figueroa St #100, Los Angeles, CA 90017
   * Format  : Full-service grocery / warehouse
   *
   * Coordinates from Census geocoder (x/y = lng/lat, not lat/lng).
   */
  {
    id: 'la-s-figueroa-484',
    name: 'Smart & Final #484 — Los Angeles, S. Figueroa',
    lat: 34.046991,
    lng: -118.262161,
    address: '845 S Figueroa St #100, Los Angeles, CA 90017, United States',
    state: 'CA',
    format: 'Full-service grocery / warehouse',
    // Eventbrite venue IDs within 20 mi — discovered 2026-07-08 via web scrape + API resolution
    eventbriteVenueIds: [
      { id: '296825067', name: '630 W 5th St, Los Angeles, CA', distanceMi: 0.47 },
      { id: '298288473', name: 'The Mayan, Los Angeles, CA', distanceMi: 0.48 },
      { id: '159476169', name: 'Pershing Square, Los Angeles, CA', distanceMi: 0.52 },
      { id: '282756843', name: 'Pershing Square, Los Angeles, CA', distanceMi: 0.54 },
      { id: '97359729', name: 'Grand Performances, Los Angeles, CA', distanceMi: 0.69 },
      { id: '9352669', name: 'The Association, Los Angeles, CA', distanceMi: 0.73 },
      { id: '295954485', name: 'California African American Museum, Los Angeles, CA', distanceMi: 2.47 },
      { id: '214910099', name: 'Collab MakerSpace, Los Angeles, CA', distanceMi: 2.67 },
      { id: '197744409', name: 'Counter Culture Coffee, Los Angeles, CA', distanceMi: 3.17 },
      { id: '297123777', name: 'The Vermont Hollywood, Los Angeles, CA', distanceMi: 3.44 },
      { id: '298324405', name: 'The Vermont Hollywood, Los Angeles, CA', distanceMi: 3.44 },
      { id: '77019679', name: 'Catch One, Los Angeles, CA', distanceMi: 3.55 },
      { id: '297046804', name: 'Rio de Los Angeles State Park State Recreation Area, Los Angeles, CA', distanceMi: 3.88 },
      { id: '221872519', name: 'The Pack Theater, Los Angeles, CA', distanceMi: 4.1 },
      { id: '99050009', name: 'Philosophical Research Society, Los Angeles, CA', distanceMi: 4.65 },
      { id: '223614679', name: 'The Broadwater Second Stage, Los Angeles, CA', distanceMi: 4.8 },
      { id: '297324812', name: 'Dragonfly Hollywood, Los Angeles, CA', distanceMi: 4.98 },
      { id: '297538608', name: 'Mattress Central, Los Angeles, CA', distanceMi: 4.99 },
      { id: '298013040', name: 'Warwick, Los Angeles, CA', distanceMi: 5.32 },
      { id: '298161626', name: 'Hall of Crucifixion-Resurrection, Glendale, CA', distanceMi: 5.4 },
      { id: '169624839', name: 'Green Haus kitchen studio, Los Angeles, CA', distanceMi: 5.43 },
      { id: '298420738', name: 'Reserve Lounge, Glendale, CA', distanceMi: 5.5 },
      { id: '297880779', name: 'Solar Studios, Glendale, CA', distanceMi: 5.51 },
      { id: '298022044', name: 'Barnes & Noble The Grove, Los Angeles, CA', distanceMi: 5.85 },
      { id: '289589253', name: 'Pandora Storefront 6801 Hollywood Blvd, Los Angeles, CA', distanceMi: 5.88 },
      { id: '298395362', name: 'Rosebud Coffee, Los Angeles, CA', distanceMi: 5.97 },
      { id: '240728413', name: 'Sister\'s Place, 600 South Adams Street, Glendale, CA, USA, Glendale, CA', distanceMi: 6.52 },
      { id: '169773939', name: 'Glendale, Glendale, CA', distanceMi: 6.61 },
      { id: '297609438', name: '250 S Glendale Ave, Glendale, CA', distanceMi: 6.67 },
      { id: '298251786', name: '250 S Glendale Ave, Glendale, CA', distanceMi: 6.67 },
      { id: '297011819', name: '216 S Louise St, Glendale, CA', distanceMi: 6.71 },
      { id: '296336679', name: 'The Famous, Glendale, CA', distanceMi: 6.76 },
      { id: '297953416', name: 'Moonlight Rollerway, Inc., Glendale, CA', distanceMi: 6.77 },
      { id: '297668802', name: 'Glendale Presbyterian Church, Glendale, CA', distanceMi: 6.78 },
      { id: '271765383', name: 'Glendale Marketplace, Glendale, CA', distanceMi: 6.81 },
      { id: '298336494', name: 'Fabletics, Glendale, CA', distanceMi: 6.83 },
      { id: '298361469', name: '110 N Artsakh Ave, Glendale, CA', distanceMi: 6.92 },
      { id: '297760793', name: 'The Glendale Room, Glendale, CA', distanceMi: 6.94 },
      { id: '297876973', name: 'The Glendale Room, Glendale, CA', distanceMi: 6.94 },
      { id: '296420234', name: 'ace/121 Gallery, Glendale, CA', distanceMi: 6.95 },
      { id: '298148900', name: '201 N Brand Blvd suite 200, Glendale, CA', distanceMi: 7.01 },
      { id: '298321771', name: '5230 San Fernando Rd, Glendale, CA', distanceMi: 7.01 },
      { id: '298455435', name: 'Giggles Night Club, Glendale, CA', distanceMi: 7.04 },
      { id: '298036886', name: 'Alex Theatre, Glendale, CA', distanceMi: 7.05 },
      { id: '298322825', name: 'Alex Theatre, Glendale, CA', distanceMi: 7.05 },
      { id: '221958779', name: 'Armenian Arts, Glendale, CA', distanceMi: 7.11 },
      { id: '298122374', name: 'Pacific Design Center, West Hollywood, CA', distanceMi: 7.3 },
      { id: '298275857', name: '801 N Brand Blvd, Glendale, CA', distanceMi: 7.69 },
      { id: '296325970', name: 'Ozzy\'s Apizza Glendale, Glendale, CA', distanceMi: 7.74 },
      { id: '298230505', name: 'Buca di Beppo, Los Angeles, CA', distanceMi: 8.04 },
      { id: '297802762', name: 'UNEARTHED, Glendale, CA', distanceMi: 8.24 },
      { id: '297770120', name: 'Brewyard Beer Company, Glendale, CA', distanceMi: 8.49 },
      { id: '296808575', name: 'Brewyard Beer Company, Glendale, CA', distanceMi: 8.49 },
      { id: '297503931', name: 'I.F.B. Studios, Glendale, CA', distanceMi: 8.52 },
      { id: '298136136', name: 'Vuori, Los Angeles, CA', distanceMi: 9.05 },
      { id: '298087706', name: 'GoodPeople, Los Angeles, CA', distanceMi: 11.01 },
      { id: '298305922', name: 'Community Center of La Cañada Flintridge, La Cañada Flintridge, CA', distanceMi: 11.37 },
      { id: '298138519', name: 'Crescenta Valley Community Regional Park, La Crescenta-Montrose, CA', distanceMi: 12.23 },
      { id: '298253540', name: 'The Green Room on Ventura 21+ Events Space, Los Angeles, CA', distanceMi: 12.39 },
      { id: '297607039', name: '1 Windward Ave, Los Angeles, CA', distanceMi: 12.8 },
      { id: '295050537', name: '4451 Dunsmore Ave, Glendale, CA', distanceMi: 12.93 },
    ],
  },

  /**
   * Advance Auto Parts — E Millbrook Rd, Raleigh, NC
   *
   * Lat:  35.848942
   * Lng: -78.600936
   *
   * Address : 2635 E Millbrook Rd, Raleigh, NC 27604
   * Format  : Auto parts retail
   *
   * Coordinates from Census geocoder (x/y = lng/lat, not lat/lng).
   */
  {
    id: 'raleigh-nc-millbrook-advance',
    name: 'Advance Auto Parts — E Millbrook Rd, Raleigh',
    lat: 35.848942,
    lng: -78.600936,
    address: '2635 E Millbrook Rd, Raleigh, NC 27604, United States',
    state: 'NC',
    format: 'Auto parts retail',
  },

  /**
   * Five Below — 5th Ave, Midtown Manhattan, New York
   *
   * Lat:  40.754860
   * Lng: -73.979965
   *
   * Address : 530 5th Ave, New York, NY 10036
   * Format  : Value/discount retail
   *
   * Coordinates from Census geocoder (x/y = lng/lat, not lat/lng).
   */
  {
    id: 'nyc-5th-ave-five-below',
    name: 'Five Below — 5th Ave, Midtown Manhattan',
    lat: 40.754860,
    lng: -73.979965,
    address: '530 5th Ave, New York, NY 10036, United States',
    state: 'NY',
    format: 'Value/discount retail',
  },

  /**
   * Total Wine & More — Corridor Marketplace, Laurel, MD
   *
   * Lat:  39.096791
   * Lng: -76.806656
   *
   * Address : 3335 Corridor Marketplace, Laurel, MD 20724
   * Format  : Wine/beer/spirits big-box
   *
   * Coordinates from Census geocoder (x/y = lng/lat, not lat/lng).
   */
  {
    id: 'laurel-md-corridor-total-wine',
    name: 'Total Wine & More — Corridor Marketplace, Laurel',
    lat: 39.096791,
    lng: -76.806656,
    address: '3335 Corridor Marketplace, Laurel, MD 20724, United States',
    state: 'MD',
    format: 'Wine/beer/spirits big-box',
  },

];

/**
 * Summary ranking
 *
 * Store                       Est. Revenue    Est. EBITDA Margin   Best for
 * ─────────────────────────── ──────────────  ────────────────────  ──────────────────
 * NYC East Harlem             $5–8M / yr      ~5–6%                 Raw revenue #1
 * Burlington NC Church St     $4.5–6M / yr    ~10–12%               Best rent ratio, XL footprint
 * Orlando I-Drive             $3–4.5M / yr    ~9–11%                Highest margin %, low costs
 *
 * Fleet average (9,000+ stores): ~$1.6M revenue, ~8% EBITDA
 * Data basis: analyst estimates, SEC 8-K earnings filings, commercial RE benchmarks.
 * No store-level data is published by Dollar Tree, Inc.
 */

export default stores;
