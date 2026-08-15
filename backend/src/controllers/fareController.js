import mongoose from 'mongoose';
import Campus from '../models/Campus.js';
import asyncHandler from '../utils/asyncHandler.js';
import { calculateFare, getFareConfiguration } from '../services/fareService.js';

/**
 * Fare quote for a ride.
 * Query: ?campusId=<id>&distanceKm=<km>
 * Returns the estimated fare plus a transparent breakdown.
 */
export const quoteFare = asyncHandler(async (req, res) => {
  const { campusId, distanceKm } = req.query;

  if (!campusId || !mongoose.isValidObjectId(campusId)) {
    return res.status(400).json({ error: { message: 'A valid campusId is required' } });
  }
  const distance = Number(distanceKm);
  if (!distanceKm || Number.isNaN(distance) || distance < 0) {
    return res.status(400).json({ error: { message: 'A valid distanceKm is required' } });
  }
  const campus = await Campus.findById(campusId);
  if (!campus) {
    return res.status(404).json({ error: { message: 'Campus not found' } });
  }

  const config = await getFareConfiguration(campusId);
  if (!config) {
    return res.status(404).json({ error: { message: 'No active fare configuration for this campus' } });
  }

  return res.json({ quote: calculateFare(config, distance) });
});

/** Active fare configuration for a campus (public — transparent pricing). */
export const getCampusFare = asyncHandler(async (req, res) => {
  const { campusId } = req.params;
  const config = await getFareConfiguration(campusId);
  if (!config) {
    return res.status(404).json({ error: { message: 'No active fare configuration for this campus' } });
  }
  return res.json({
    fare: {
      id: config._id,
      campusId: config.campusId,
      baseFare: config.baseFare,
      pricePerKm: config.pricePerKm,
      minimumFare: config.minimumFare,
      peakMultiplier: config.peakMultiplier,
      active: config.active,
    },
  });
});
