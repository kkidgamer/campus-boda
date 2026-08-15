import { getIO } from './index.js';

function emitToUser(userId, event, payload) {
  const io = getIO();
  if (!io || !userId) return;
  io.to(`user:${userId.toString()}`).emit(event, payload);
}

function emitToRiders(event, payload) {
  const io = getIO();
  if (!io) return;
  io.to('riders').emit(event, payload);
}

/** Normalize a possibly-populated ref to a plain id string (or null). */
function idOf(ref) {
  if (!ref) return null;
  return (ref._id ?? ref).toString();
}

/**
 * A new ride was requested — ping every candidate (verified + online) rider's
 * socket so their dashboard updates instantly.
 */
export function emitRideNew(ridePayload, candidates, extra = {}) {
  for (const rider of candidates) {
    const riderUserId = idOf(rider.userId);
    if (riderUserId) {
      emitToUser(riderUserId, 'ride:new', { ride: ridePayload, ...extra });
    }
  }
}

/** A ride's status changed — notify the passenger and/or assigned rider. */
export function emitRideUpdate(ridePayload, { passengerId, riderId } = {}) {
  const passenger = idOf(passengerId);
  const rider = idOf(riderId);
  if (passenger) emitToUser(passenger, 'ride:update', { ride: ridePayload });
  if (rider) emitToUser(rider, 'ride:update', { ride: ridePayload });
}

/** A ride was taken — other riders should drop it from their available list. */
export function emitRideTaken(rideId) {
  emitToRiders('ride:taken', { rideId: rideId.toString() });
}

/** A ride was cancelled — notify both parties. */
export function emitRideCancelled(ridePayload, { passengerId, riderId } = {}) {
  const passenger = idOf(passengerId);
  const rider = idOf(riderId);
  if (passenger) emitToUser(passenger, 'ride:cancelled', { ride: ridePayload });
  if (rider) emitToUser(rider, 'ride:cancelled', { ride: ridePayload });
}
