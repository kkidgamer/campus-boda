import Campus from '../models/Campus.js';
import PickupPoint from '../models/PickupPoint.js';
import asyncHandler from '../utils/asyncHandler.js';
import { isDatabaseConnected } from '../config/database.js';

function requireDatabase(req, res, next) {
  if (!isDatabaseConnected()) {
    return res.status(503).json({
      error: { message: 'Database unavailable — start MongoDB or check MONGODB_URI' },
    });
  }
  return next();
}

/** List active campuses (public). */
export const listCampuses = asyncHandler(async (req, res) => {
  const campuses = await Campus.find({ status: 'active' }).sort({ name: 1 });
  res.status(200).json({ results: campuses, count: campuses.length });
});

/** List pickup points for a campus (public). */
export const listPickupPoints = asyncHandler(async (req, res) => {
  const points = await PickupPoint.find({
    campusId: req.params.campusId,
    status: 'active',
  }).sort({ name: 1 });
  res.status(200).json({ results: points, count: points.length });
});

export { requireDatabase };
