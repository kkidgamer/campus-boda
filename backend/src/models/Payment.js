import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    rideId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ride', required: true, unique: true },
    passengerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    riderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    amount: { type: Number, required: true },
    method: { type: String, enum: ['mpesa', 'cash', 'card'], default: 'mpesa' },
    status: { type: String, enum: ['pending', 'paid', 'failed', 'refunded'], default: 'pending' },
    transactionId: { type: String, trim: true, default: '' },
    mpesaReceipt: { type: String, trim: true, default: '' },
    paidAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.model('Payment', paymentSchema);
