import mongoose from 'mongoose';

const fareConfigurationSchema = new mongoose.Schema(
  {
    campusId: { type: mongoose.Schema.Types.ObjectId, ref: 'Campus', required: true, unique: true },
    baseFare: { type: Number, required: true, default: 0 },
    pricePerKm: { type: Number, required: true, default: 0 },
    minimumFare: { type: Number, required: true, default: 0 },
    peakMultiplier: { type: Number, required: true, default: 1 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model('FareConfiguration', fareConfigurationSchema);
