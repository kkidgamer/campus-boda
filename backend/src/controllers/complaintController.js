import mongoose from 'mongoose';
import Complaint from '../models/Complaint.js';
import Ride from '../models/Ride.js';
import asyncHandler from '../utils/asyncHandler.js';

function serializeComplaint(complaint) {
  const c = complaint.toJSON();
  return {
    ...c,
    id: c._id,
    rideLabel: complaint.rideId
      ? `${complaint.rideId.pickup?.label || '?'} → ${complaint.rideId.destination?.label || '?'}`
      : null,
    riderName: complaint.riderId?.name || null,
  };
}

/**
 * File a complaint.
 * Body: { rideId?, category?, description, evidence? }
 * rideId is optional — complaints can be general (not tied to a ride).
 */
export const createComplaint = asyncHandler(async (req, res) => {
  const { rideId, category, description, evidence } = req.body;

  if (!description || !description.trim()) {
    return res.status(400).json({ error: { message: 'Complaint description is required' } });
  }

  let riderId = null;
  if (rideId) {
    if (!mongoose.isValidObjectId(rideId)) {
      return res.status(400).json({ error: { message: 'Invalid rideId' } });
    }
    const ride = await Ride.findById(rideId);
    if (!ride) {
      return res.status(404).json({ error: { message: 'Ride not found' } });
    }
    if (ride.passengerId.toString() !== req.user.id && req.user.systemRole !== 'admin') {
      return res.status(403).json({ error: { message: 'You can only file complaints about your own rides' } });
    }
    riderId = ride.riderId || null;
  }

  const complaint = await Complaint.create({
    rideId: rideId || null,
    passengerId: req.user.id,
    riderId,
    category: (category || 'other').trim(),
    description: description.trim(),
    evidence: evidence || null,
    status: 'open',
  });

  return res.status(201).json({ message: 'Complaint filed', complaint: serializeComplaint(complaint) });
});

/** The authenticated passenger's complaints, ?status= filter. */
export const listMyComplaints = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const filter = { passengerId: req.user.id };
  if (status) filter.status = status;

  const complaints = await Complaint.find(filter)
    .sort({ createdAt: -1 })
    .populate('rideId', 'pickup destination status')
    .populate('riderId', 'name');
  return res.json({ results: complaints.map(serializeComplaint), count: complaints.length });
});

/** Complaint detail — owner or admin. */
export const getComplaint = asyncHandler(async (req, res) => {
  const complaint = await Complaint.findById(req.params.id)
    .populate('rideId', 'pickup destination status')
    .populate('riderId', 'name');
  if (!complaint) {
    return res.status(404).json({ error: { message: 'Complaint not found' } });
  }
  if (complaint.passengerId.toString() !== req.user.id && req.user.systemRole !== 'admin') {
    return res.status(403).json({ error: { message: 'You cannot view this complaint' } });
  }
  return res.json({ complaint: serializeComplaint(complaint) });
});
