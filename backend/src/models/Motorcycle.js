import mongoose from 'mongoose';

const motorcycleSchema = new mongoose.Schema(
  {
    riderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    registrationNumber: {
      type: String,
      required: [true, 'Registration number is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    make: { type: String, trim: true, default: '' },
    model: { type: String, trim: true, default: '' },
    color: { type: String, trim: true, default: '' },
    year: { type: Number, default: null },
    documents: { type: mongoose.Schema.Types.Mixed, default: {} },
    verificationStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'suspended'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

export default mongoose.model('Motorcycle', motorcycleSchema);
