function toRad(deg) {
  return (deg * Math.PI) / 180;
}

/**
 * Great-circle distance in kilometres between two { latitude, longitude }
 * points. Returns null if either point lacks coordinates.
 */
export function haversineKm(a, b) {
  if (!a?.latitude || !a?.longitude || !b?.latitude || !b?.longitude) return null;
  const R = 6371;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
