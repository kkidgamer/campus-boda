import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
  {
    rideId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ride', required: true, unique: true },
    passengerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    riderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    comment: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

export default mongoose.model('Review', reviewSchema);
