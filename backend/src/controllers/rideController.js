import mongoose from 'mongoose';
import Ride from '../models/Ride.js';
import Campus from '../models/Campus.js';
import RiderProfile from '../models/RiderProfile.js';
import asyncHandler from '../utils/asyncHandler.js';
import { haversineKm } from '../utils/geo.js';
import { computeEstimatedFare } from '../services/fareService.js';
import { findCandidateRiders } from '../services/matchingService.js';
import {
  emitRideNew,
  emitRideUpdate,
  emitRideTaken,
  emitRideCancelled,
} from '../sockets/rideSocket.js';

/** Allowed status transitions: target -> set of allowed current statuses. */
const TRANSITIONS = {
  ACCEPTED: ['REQUESTED', 'SEARCHING'],
  ARRIVING: ['ACCEPTED'],
  STARTED: ['ACCEPTED', 'ARRIVING'],
  COMPLETED: ['STARTED'],
  CANCELLED: ['REQUESTED', 'SEARCHING', 'ACCEPTED'],
};

function serializeRide(ride) {
  const r = ride.toJSON();
  return {
    ...r,
    id: r._id,
    passengerName: ride.passengerId?.name,
    riderName: ride.riderId?.name,
  };
}

/** Load a ride and ensure the requester is the passenger, assigned rider, or admin. */
async function loadRideForActor(rideId, userId) {
  const ride = await Ride.findById(rideId)
    .populate('passengerId', 'name')
    .populate('riderId', 'name');
  if (!ride) return null;
  const isActor =
    ride.passengerId?._id?.toString() === userId ||
    (ride.riderId && ride.riderId._id.toString() === userId);
  return { ride, isActor };
}

/**
 * Request a ride.
 * Body: { campusId, pickup: {label, latitude?, longitude?},
 *         destination: {label, latitude?, longitude?}, distanceKm? }
 */
export const requestRide = asyncHandler(async (req, res) => {
  const { campusId, pickup, destination, distanceKm } = req.body;

  if (!mongoose.isValidObjectId(campusId)) {
    return res.status(400).json({ error: { message: 'Invalid campusId' } });
  }
  const campus = await Campus.findById(campusId);
  if (!campus) {
    return res.status(400).json({ error: { message: 'Campus not found' } });
  }
  if (!pickup?.label || !destination?.label) {
    return res.status(400).json({ error: { message: 'pickup and destination must include a label' } });
  }

  // Distance: haversine from coordinates when available, else provided km, else default 2.
  const geoDistance = haversineKm(pickup, destination);
  const distance = geoDistance ?? Number(distanceKm) ?? 2;

  const fare = (await computeEstimatedFare({ campusId, distanceKm: distance })) ?? {
    estimatedFare: 0,
  };
  const candidateRiders = await findCandidateRiders({ campusId });

  const ride = await Ride.create({
    passengerId: req.user.id,
    campusId,
    pickup,
    destination,
    estimatedFare: fare.estimatedFare,
    status: 'REQUESTED',
    requestedAt: new Date(),
  });

  // Real-time matching: ping every candidate rider's socket instantly.
  emitRideNew(serializeRide(ride), candidateRiders, { fareDetails: fare });

  return res.status(201).json({
    message: 'Ride requested',
    ride: serializeRide(ride),
    fareDetails: fare,
    riderCount: candidateRiders.length,
  });
});

/** The authenticated user's rides (as passenger or assigned rider). */
export const listMyRides = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const filter = {
    $or: [{ passengerId: req.user.id }, { riderId: req.user.id }],
  };
  if (status) filter.status = status;

  const rides = await Ride.find(filter)
    .sort({ createdAt: -1 })
    .populate('passengerId', 'name')
    .populate('riderId', 'name');
  return res.json({ results: rides.map(serializeRide), count: rides.length });
});

/** Rides awaiting a rider — visible to verified, online riders only. */
export const availableRides = asyncHandler(async (req, res) => {
  const profile = await RiderProfile.findOne({ userId: req.user.id });
  if (!profile || profile.verificationStatus !== 'approved') {
    return res.status(403).json({ error: { message: 'Only verified riders can view ride requests' } });
  }
  if (!profile.isOnline) {
    return res.json({ results: [], count: 0, online: false });
  }

  const filter = { status: { $in: ['REQUESTED', 'SEARCHING'] } };
  if (req.user.campusId) filter.campusId = req.user.campusId;

  const rides = await Ride.find(filter)
    .sort({ createdAt: 1 })
    .populate('passengerId', 'name');
  return res.json({ results: rides.map(serializeRide), count: rides.length, online: true });
});

/** The authenticated rider's current active ride (ACCEPTED/ARRIVING/STARTED). */
export const getActiveRide = asyncHandler(async (req, res) => {
  const ride = await Ride.findOne({
    riderId: req.user.id,
    status: { $in: ['ACCEPTED', 'ARRIVING', 'STARTED'] },
  })
    .sort({ createdAt: -1 })
    .populate('passengerId', 'name phone')
    .populate('riderId', 'name');
  if (!ride) {
    return res.status(404).json({ error: { message: 'No active ride' } });
  }
  return res.json({ ride: serializeRide(ride) });
});

/** Ride detail — passenger, assigned rider, or admin. */
export const getRide = asyncHandler(async (req, res) => {
  const { ride, isActor } = await loadRideForActor(req.params.id, req.user.id);
  if (!ride) {
    return res.status(404).json({ error: { message: 'Ride not found' } });
  }
  if (!isActor && req.user.systemRole !== 'admin') {
    return res.status(403).json({ error: { message: 'You cannot view this ride' } });
  }
  return res.json(serializeRide(ride));
});

/** Rider accepts a ride: REQUESTED/SEARCHING -> ACCEPTED. */
export const acceptRide = asyncHandler(async (req, res) => {
  if (req.user.systemRole !== 'rider') {
    return res.status(403).json({ error: { message: 'Only riders can accept rides' } });
  }
  const profile = await RiderProfile.findOne({ userId: req.user.id });
  if (!profile || profile.verificationStatus !== 'approved') {
    return res.status(403).json({ error: { message: 'Rider is not verified' } });
  }
  if (!profile.isOnline) {
    return res.status(400).json({ error: { message: 'Go online to accept ride requests' } });
  }

  const ride = await Ride.findById(req.params.id);
  if (!ride) {
    return res.status(404).json({ error: { message: 'Ride not found' } });
  }
  if (ride.passengerId.toString() === req.user.id) {
    return res.status(400).json({ error: { message: 'You cannot accept your own ride request' } });
  }
  if (!TRANSITIONS.ACCEPTED.includes(ride.status)) {
    return res.status(409).json({ error: { message: `Ride cannot be accepted from status ${ride.status}` } });
  }

  ride.riderId = req.user.id;
  ride.status = 'ACCEPTED';
  ride.acceptedAt = new Date();
  await ride.save();

  await ride.populate([
    { path: 'passengerId', select: 'name' },
    { path: 'riderId', select: 'name' },
  ]);

  // Notify the passenger their ride was picked up, and other riders to drop it.
  const serialized = serializeRide(ride);
  emitRideUpdate(serialized, { passengerId: ride.passengerId });
  emitRideTaken(ride._id);

  return res.json({ message: 'Ride accepted', ride: serialized });
});

/** Rider signals arrival: ACCEPTED -> ARRIVING. */
export const arriveRide = asyncHandler(async (req, res) => {
  const ride = await Ride.findById(req.params.id);
  if (!ride) return res.status(404).json({ error: { message: 'Ride not found' } });
  if (ride.riderId?.toString() !== req.user.id) {
    return res.status(403).json({ error: { message: 'You are not the assigned rider' } });
  }
  if (!TRANSITIONS.ARRIVING.includes(ride.status)) {
    return res.status(409).json({ error: { message: `Ride cannot be marked arriving from status ${ride.status}` } });
  }
  ride.status = 'ARRIVING';
  await ride.save();
  const serialized = serializeRide(ride);
  emitRideUpdate(serialized, { passengerId: ride.passengerId });
  return res.json({ ride: serialized });
});

/** Rider starts the trip: ACCEPTED/ARRIVING -> STARTED. */
export const startRide = asyncHandler(async (req, res) => {
  const ride = await Ride.findById(req.params.id);
  if (!ride) return res.status(404).json({ error: { message: 'Ride not found' } });
  if (ride.riderId?.toString() !== req.user.id) {
    return res.status(403).json({ error: { message: 'You are not the assigned rider' } });
  }
  if (!TRANSITIONS.STARTED.includes(ride.status)) {
    return res.status(409).json({ error: { message: `Ride cannot be started from status ${ride.status}` } });
  }
  ride.status = 'STARTED';
  ride.startedAt = new Date();
  await ride.save();
  const serialized = serializeRide(ride);
  emitRideUpdate(serialized, { passengerId: ride.passengerId });
  return res.json({ ride: serialized });
});

/** Rider completes the trip: STARTED -> COMPLETED. Body: { finalFare? } */
export const completeRide = asyncHandler(async (req, res) => {
  const ride = await Ride.findById(req.params.id);
  if (!ride) return res.status(404).json({ error: { message: 'Ride not found' } });
  if (ride.riderId?.toString() !== req.user.id) {
    return res.status(403).json({ error: { message: 'You are not the assigned rider' } });
  }
  if (!TRANSITIONS.COMPLETED.includes(ride.status)) {
    return res.status(409).json({ error: { message: `Ride cannot be completed from status ${ride.status}` } });
  }

  ride.finalFare = req.body.finalFare ?? ride.estimatedFare;
  ride.status = 'COMPLETED';
  ride.completedAt = new Date();
  await ride.save();

  // Rider stats
  await RiderProfile.findOneAndUpdate(
    { userId: req.user.id },
    { $inc: { totalTrips: 1 } }
  );

  const serialized = serializeRide(ride);
  emitRideUpdate(serialized, { passengerId: ride.passengerId });

  return res.json({ message: 'Ride completed', ride: serialized });
});

/** Passenger cancels: REQUESTED/SEARCHING/ACCEPTED -> CANCELLED. */
export const cancelRide = asyncHandler(async (req, res) => {
  const { ride, isActor } = await loadRideForActor(req.params.id, req.user.id);
  if (!ride) return res.status(404).json({ error: { message: 'Ride not found' } });
  if (!isActor) {
    return res.status(403).json({ error: { message: 'Only the passenger can cancel this ride' } });
  }
  if (!TRANSITIONS.CANCELLED.includes(ride.status)) {
    return res.status(409).json({ error: { message: `Ride cannot be cancelled from status ${ride.status}` } });
  }
  ride.status = 'CANCELLED';
  ride.cancelledAt = new Date();
  await ride.save();
  const serialized = serializeRide(ride);
  emitRideCancelled(serialized, {
    passengerId: ride.passengerId,
    riderId: ride.riderId,
  });
  // Broadcast to all riders: the pending ride is no longer available.
  emitRideTaken(ride._id);
  return res.json({ message: 'Ride cancelled', ride: serialized });
});
