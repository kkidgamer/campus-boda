import mongoose from 'mongoose';
import { RIDE_STATUSES } from '../utils/validators.js';

const locationSchema = new mongoose.Schema(
  {
    label: { type: String, trim: true, default: '' },
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
  },
  { _id: false }
);

const rideSchema = new mongoose.Schema(
  {
    passengerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    riderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    campusId: { type: mongoose.Schema.Types.ObjectId, ref: 'Campus', required: true, index: true },
    pickup: { type: locationSchema, default: () => ({}) },
    destination: { type: locationSchema, default: () => ({}) },
    estimatedFare: { type: Number, default: 0 },
    finalFare: { type: Number, default: 0 },
    status: { type: String, enum: RIDE_STATUSES, default: 'REQUESTED' },
    requestedAt: { type: Date, default: Date.now },
    acceptedAt: { type: Date, default: null },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.model('Ride', rideSchema);
