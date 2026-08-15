import mongoose from 'mongoose';
import Review from '../models/Review.js';
import Ride from '../models/Ride.js';
import RiderProfile from '../models/RiderProfile.js';
import asyncHandler from '../utils/asyncHandler.js';

function serializeReview(review) {
  const r = review.toJSON();
  return {
    ...r,
    id: r._id,
    rideLabel: review.rideId
      ? `${review.rideId.pickup?.label || '?'} → ${review.rideId.destination?.label || '?'}`
      : null,
    riderName: review.riderId?.name || null,
  };
}

/**
 * Rate a completed ride.
 * Body: { rideId, rating, comment? }
 * One review per ride; creating one also refreshes the rider's average rating.
 */
export const createReview = asyncHandler(async (req, res) => {
  const { rideId, rating, comment } = req.body;

  const stars = Number(rating);
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
    return res.status(400).json({ error: { message: 'rating must be a whole number between 1 and 5' } });
  }
  if (!mongoose.isValidObjectId(rideId)) {
    return res.status(400).json({ error: { message: 'Invalid rideId' } });
  }

  const ride = await Ride.findById(rideId);
  if (!ride) {
    return res.status(404).json({ error: { message: 'Ride not found' } });
  }
  if (ride.passengerId.toString() !== req.user.id && req.user.systemRole !== 'admin') {
    return res.status(403).json({ error: { message: 'You can only review your own rides' } });
  }
  if (ride.status !== 'COMPLETED') {
    return res.status(400).json({ error: { message: `Ride is ${ride.status} — only completed rides can be reviewed` } });
  }
  if (!ride.riderId) {
    return res.status(400).json({ error: { message: 'This ride has no rider to review' } });
  }

  const existing = await Review.findOne({ rideId });
  if (existing) {
    return res.status(409).json({ error: { message: 'This ride has already been reviewed' } });
  }

  const review = await Review.create({
    rideId,
    passengerId: req.user.id,
    riderId: ride.riderId,
    rating: stars,
    comment: (comment || '').trim(),
  });

  // Recompute the rider's average rating (rounded to 1 decimal).
  const [agg] = await Review.aggregate([
    { $match: { riderId: ride.riderId } },
    { $group: { _id: null, avg: { $avg: '$rating' } } },
  ]);
  await RiderProfile.findOneAndUpdate(
    { userId: ride.riderId },
    { rating: agg ? Math.round(agg.avg * 10) / 10 : 0 }
  );

  return res.status(201).json({ message: 'Review submitted', review: serializeReview(review) });
});

/**
 * Reviews the user is involved in:
 *   GET /reviews        -> reviews the user wrote (as passenger)
 *   GET /reviews?about=me -> reviews about the user (as rider)
 */
export const listReviews = asyncHandler(async (req, res) => {
  const { about } = req.query;
  const filter = about === 'me' ? { riderId: req.user.id } : { passengerId: req.user.id };

  const reviews = await Review.find(filter)
    .sort({ createdAt: -1 })
    .populate('rideId', 'pickup destination status')
    .populate('riderId', 'name');
  return res.json({ results: reviews.map(serializeReview), count: reviews.length });
});

/** Review detail — reviewer, rated rider, or admin. */
export const getReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id)
    .populate('rideId', 'pickup destination status')
    .populate('riderId', 'name');
  if (!review) {
    return res.status(404).json({ error: { message: 'Review not found' } });
  }
  const isActor =
    review.passengerId?.toString() === req.user.id || review.riderId?._id?.toString() === req.user.id;
  if (!isActor && req.user.systemRole !== 'admin') {
    return res.status(403).json({ error: { message: 'You cannot view this review' } });
  }
  return res.json({ review: serializeReview(review) });
});
