import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, trim: true, default: 'general' },
    title: { type: String, trim: true, default: '' },
    message: { type: String, trim: true, default: '' },
    read: { type: Boolean, default: false },
    data: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

export default mongoose.model('Notification', notificationSchema);
