import mongoose from 'mongoose';

const complaintSchema = new mongoose.Schema(
  {
    rideId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ride', default: null },
    passengerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    riderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    category: { type: String, trim: true, default: '' },
    description: { type: String, required: [true, 'Complaint description is required'], trim: true },
    evidence: { type: mongoose.Schema.Types.Mixed, default: null },
    status: { type: String, enum: ['open', 'in_progress', 'resolved', 'dismissed'], default: 'open' },
    resolution: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

export default mongoose.model('Complaint', complaintSchema);
