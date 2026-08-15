import RiderProfile from '../models/RiderProfile.js';

/**
 * Candidate riders for a ride: verified + currently online.
 * When campusId is given, riders without a campus match any campus; riders
 * with a campus must match the ride's campus.
 *
 * Real-time matching (broadcasting new rides to online riders) lands with the
 * Socket.IO phase; for now this is used to report candidate availability.
 */
export async function findCandidateRiders({ campusId } = {}) {
  const profiles = await RiderProfile.find({
    verificationStatus: 'approved',
    isOnline: true,
  }).populate('userId', 'campusId name');

  if (!campusId) return profiles;

  const campus = campusId.toString();
  return profiles.filter(
    (p) => !p.userId?.campusId || p.userId.campusId.toString() === campus
  );
}
