import mongoose from 'mongoose';

const emergencySchema = new mongoose.Schema(
  {
    rideId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ride', default: null },
    passengerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    riderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    location: {
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
      label: { type: String, trim: true, default: '' },
    },
    type: { type: String, enum: ['sos', 'accident', 'harassment', 'mechanical', 'other'], default: 'sos' },
    status: { type: String, enum: ['open', 'acknowledged', 'resolved'], default: 'open' },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

export default mongoose.model('Emergency', emergencySchema);
