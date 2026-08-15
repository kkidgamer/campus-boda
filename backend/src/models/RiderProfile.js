import mongoose from 'mongoose';

const riderProfileSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    nationalId: { type: String, trim: true, default: '' },
    licenseNumber: { type: String, trim: true, default: '' },
    licenseDocument: { type: String, default: '' },
    profilePhoto: { type: String, default: '' },
    verificationStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'suspended'],
      default: 'pending',
    },
    rating: { type: Number, min: 0, max: 5, default: 0 },
    totalTrips: { type: Number, default: 0 },
    isOnline: { type: Boolean, default: false },
    currentLocation: {
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
    },
  },
  { timestamps: true }
);

export default mongoose.model('RiderProfile', riderProfileSchema);
