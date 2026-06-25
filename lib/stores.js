/**
 * Aggregated store registry for forecast, past-7d, and intel scripts.
 */
import dollartree from '../stores/dollartree.js';
import cavenders from '../stores/cavenders.js';

export default [...dollartree, ...cavenders];
