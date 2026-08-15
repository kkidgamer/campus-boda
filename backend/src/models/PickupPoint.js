import mongoose from 'mongoose';

const pickupPointSchema = new mongoose.Schema(
  {
    campusId: { type: mongoose.Schema.Types.ObjectId, ref: 'Campus', required: true, index: true },
    name: { type: String, required: [true, 'Pickup point name is required'], trim: true },
    description: { type: String, trim: true, default: '' },
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  },
  { timestamps: true }
);

export default mongoose.model('PickupPoint', pickupPointSchema);
