import mongoose from 'mongoose';

const campusSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Campus name is required'], trim: true },
    institution: { type: String, trim: true, default: '' },
    address: { type: String, trim: true, default: '' },
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
    boundaries: { type: mongoose.Schema.Types.Mixed, default: null },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  },
  { timestamps: true }
);

campusSchema.index({ name: 1, institution: 1 }, { unique: true });

export default mongoose.model('Campus', campusSchema);
