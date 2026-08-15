import RiderProfile from '../models/RiderProfile.js';
import Motorcycle from '../models/Motorcycle.js';
import asyncHandler from '../utils/asyncHandler.js';

/** Shape a RiderProfile for API responses. */
function serializeRiderProfile(profile, extra = {}) {
  return {
    id: profile._id,
    userId: profile.userId,
    nationalId: profile.nationalId,
    licenseNumber: profile.licenseNumber,
    licenseDocument: profile.licenseDocument,
    profilePhoto: profile.profilePhoto,
    verificationStatus: profile.verificationStatus,
    rating: profile.rating,
    totalTrips: profile.totalTrips,
    isOnline: profile.isOnline,
    currentLocation: profile.currentLocation,
    createdAt: profile.createdAt,
    ...extra,
  };
}

/** Apply profile updates; any change after verification triggers a re-review. */
function applyProfileUpdates(profile, body) {
  const fields = ['nationalId', 'licenseNumber', 'licenseDocument', 'profilePhoto'];
  let changed = false;
  for (const field of fields) {
    if (body[field] !== undefined) {
      profile[field] = body[field];
      changed = true;
    }
  }
  if (changed && profile.verificationStatus !== 'pending') {
    profile.verificationStatus = 'pending';
  }
  return changed;
}

/**
 * Submit (or update) the rider application for the authenticated user.
 * Body: { nationalId, licenseNumber, licenseDocument?, profilePhoto? }
 */
export const upsertRiderProfile = asyncHandler(async (req, res) => {
  let profile = await RiderProfile.findOne({ userId: req.user.id });

  if (profile) {
    applyProfileUpdates(profile, req.body);
    await profile.save();
    return res.json({ message: 'Rider profile updated', rider: serializeRiderProfile(profile) });
  }

  profile = await RiderProfile.create({
    userId: req.user.id,
    nationalId: req.body.nationalId,
    licenseNumber: req.body.licenseNumber,
    licenseDocument: req.body.licenseDocument || '',
    profilePhoto: req.body.profilePhoto || '',
  });

  return res.status(201).json({
    message: 'Rider application submitted — pending admin verification',
    rider: serializeRiderProfile(profile),
  });
});

/** The authenticated user's own rider profile + motorcycles. */
export const getMyRiderProfile = asyncHandler(async (req, res) => {
  const profile = await RiderProfile.findOne({ userId: req.user.id });
  if (!profile) {
    return res.status(404).json({ error: { message: 'No rider profile yet' } });
  }
  const motorcycles = await Motorcycle.find({ riderId: req.user.id });
  return res.json(serializeRiderProfile(profile, { motorcycles }));
});

/** Update the authenticated user's rider profile. */
export const updateRiderProfile = asyncHandler(async (req, res) => {
  const profile = await RiderProfile.findOne({ userId: req.user.id });
  if (!profile) {
    return res.status(404).json({ error: { message: 'No rider profile yet' } });
  }
  applyProfileUpdates(profile, req.body);
  await profile.save();
  return res.json({ message: 'Rider profile updated', rider: serializeRiderProfile(profile) });
});

/** Toggle the rider's online/offline status. Body: { isOnline: boolean } */
export const setOnlineStatus = asyncHandler(async (req, res) => {
  const profile = await RiderProfile.findOne({ userId: req.user.id });
  if (!profile) {
    return res.status(404).json({ error: { message: 'No rider profile yet' } });
  }
  profile.isOnline = Boolean(req.body.isOnline);
  await profile.save();
  return res.json({ rider: serializeRiderProfile(profile) });
});

/** Public view of a rider (used by passengers during matching). */
export const getPublicRiderProfile = asyncHandler(async (req, res) => {
  const profile = await RiderProfile.findOne({ userId: req.params.id }).populate(
    'userId',
    'name profilePhoto'
  );
  if (!profile) {
    return res.status(404).json({ error: { message: 'Rider not found' } });
  }
  const motorcycles = await Motorcycle.find({
    riderId: req.params.id,
    verificationStatus: 'approved',
  });
  return res.json({
    id: profile._id,
    userId: profile.userId?._id,
    name: profile.userId?.name,
    profilePhoto: profile.profilePhoto,
    verificationStatus: profile.verificationStatus,
    rating: profile.rating,
    totalTrips: profile.totalTrips,
    isOnline: profile.isOnline,
    motorcycles: motorcycles.map((m) => ({
      id: m._id,
      registrationNumber: m.registrationNumber,
      make: m.make,
      model: m.model,
      color: m.color,
      year: m.year,
    })),
  });
});
