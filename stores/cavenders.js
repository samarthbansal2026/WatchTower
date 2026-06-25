/**
 * Cavender's Boot City — retail store locations for WatchTower intel.
 *
 * Cavender's is a western-wear chain (boots, hats, apparel). Unlike Dollar Tree
 * stores in dollartree.js, these are included for trade-area demand signals:
 * weather, local events, demographics, competitor promos.
 */

const stores = [
  {
    id: 'dallas-cavenders-stemmons',
    name: "Cavender's Boot City — N Stemmons, Dallas",
    lat: 32.8043,
    lng: -96.8378,
    address: '2475 N Stemmons Fwy, Dallas, TX 75207, United States',
    state: 'TX',
    eventbriteCitySlug: 'tx--dallas',
    // Google Places — cached place_id from Text Search (2026-06-24 PASS)
    googlePlaceId: 'ChIJKXS7pladToYRKHaSWQOms-w',
    googlePlacesQuery: "Cavender's Boot City 2475 N Stemmons Freeway Dallas TX",
    // Discovered 2026-06-24 via scripts/discover-eventbrite-venues.js
    // (Dallas /all-events/ scrape + API venue resolution, deduped by name, ≤8 mi)
    eventbriteVenueIds: [
      { id: '297704380', name: 'Dallas Market Hall, Dallas, TX', distanceMi: 0.5 },
      { id: '297500476', name: 'Stomping Ground Comedy Theater & Training Center, Dallas, TX', distanceMi: 0.69 },
      { id: '297839017', name: "Sue Ellen's, Dallas, TX", distanceMi: 1.59 },
      { id: '297707247', name: 'Rose Room, Dallas, TX', distanceMi: 1.61 },
      { id: '297965515', name: 'Station 4, Dallas, TX', distanceMi: 1.61 },
      { id: '298211601', name: '6400 Maple Ave, Dallas, TX', distanceMi: 1.62 },
      { id: '298221092', name: '3011 Gulden Ln, Dallas, TX', distanceMi: 1.79 },
      { id: '297220157', name: 'Central Commons, Dallas, TX', distanceMi: 2.04 },
      { id: '297784532', name: 'Mila, Dallas, TX', distanceMi: 2.15 },
      { id: '298243463', name: 'Rebel & Rose Neighborhood Bar, Dallas, TX', distanceMi: 2.18 },
      { id: '298138995', name: 'Cactus Social, Dallas, TX', distanceMi: 2.25 },
      { id: '297562646', name: 'Omni Dallas Hotel, Dallas, TX', distanceMi: 2.8 },
      { id: '297564836', name: 'The Shop Club, Dallas, TX', distanceMi: 3.05 },
      { id: '283083803', name: 'Harwood Tavern, Dallas, TX', distanceMi: 3.07 },
      { id: '298105044', name: 'Backyard - Dallas, Dallas, TX', distanceMi: 3.1 },
      { id: '297520461', name: 'Vice Park, Dallas, TX', distanceMi: 3.18 },
      { id: '297851853', name: "Gilley's Dallas, Dallas, TX", distanceMi: 3.39 },
      { id: '297444466', name: 'South Side Music Hall, Dallas, TX', distanceMi: 3.4 },
      { id: '297741565', name: '1515 S Harwood St, Dallas, TX', distanceMi: 3.55 },
      { id: '297553014', name: 'Lofty Spaces, Dallas, TX', distanceMi: 3.99 },
      { id: '271088603', name: "It'll Do Club, Dallas, TX", distanceMi: 4.1 },
      { id: '298155899', name: 'Texas Theatre, Dallas, TX', distanceMi: 4.27 },
      { id: '297611864', name: 'Granada Theater, Dallas, TX', distanceMi: 4.35 },
      { id: '297727432', name: 'Fair Park Coliseum, Dallas, TX', distanceMi: 4.99 },
      { id: '298100029', name: 'Stone Water Restaurant & Entertainment, Dallas, TX', distanceMi: 5.17 },
    ],
  },
];

export default stores;
