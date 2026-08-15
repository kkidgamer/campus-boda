import FareConfiguration from '../models/FareConfiguration.js';

/** Simple peak-hour heuristic: 07:00–09:00 and 16:00–18:00 local time. */
function isPeakHour(date = new Date()) {
  const h = date.getHours();
  return (h >= 7 && h <= 9) || (h >= 16 && h <= 18);
}

/** The active fare configuration for a campus, or null. */
export async function getFareConfiguration(campusId) {
  return FareConfiguration.findOne({ campusId, active: true });
}

/**
 * Calculate a fare from a FareConfiguration and distance in km.
 *   fare = max(baseFare + pricePerKm * distance, minimumFare) * peakMultiplier
 * Returns the rounded fare plus a transparent breakdown.
 */
export function calculateFare(config, distanceKm) {
  const distance = Math.max(Number(distanceKm) || 0, 0);
  const peakApplied = isPeakHour();

  let fare = config.baseFare + config.pricePerKm * distance;
  if (fare < config.minimumFare) fare = config.minimumFare;
  if (peakApplied) fare *= config.peakMultiplier;

  return {
    estimatedFare: Math.round(fare),
    baseFare: config.baseFare,
    pricePerKm: config.pricePerKm,
    distanceKm: distance,
    minimumFare: config.minimumFare,
    peakMultiplier: config.peakMultiplier,
    peakApplied,
  };
}

/**
 * Estimate a ride fare for a campus. Returns null if the campus has no
 * active fare configuration.
 */
export async function computeEstimatedFare({ campusId, distanceKm }) {
  const config = await getFareConfiguration(campusId);
  if (!config) return null;
  return calculateFare(config, distanceKm);
}
