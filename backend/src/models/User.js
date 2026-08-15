import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { ACCOUNT_TYPES, SYSTEM_ROLES } from '../utils/validators.js';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: { type: String, required: [true, 'Phone number is required'], trim: true },
    password: { type: String, required: [true, 'Password is required'], minlength: 8, select: false },
    accountType: { type: String, enum: ACCOUNT_TYPES, default: 'other' },
    systemRole: { type: String, enum: SYSTEM_ROLES, default: 'passenger' },
    campusId: { type: mongoose.Schema.Types.ObjectId, ref: 'Campus', default: null },
    profilePhoto: { type: String, default: '' },
    status: { type: String, enum: ['active', 'suspended', 'deactivated'], default: 'active' },
    verified: { type: Boolean, default: false },
    emergencyContacts: {
      type: [
        {
          name: { type: String, required: [true, 'Contact name is required'], trim: true },
          phone: { type: String, required: [true, 'Contact phone is required'], trim: true },
          relationship: { type: String, trim: true, default: '' },
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  return next();
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

// Do not leak the password hash in JSON responses.
userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.password;
    return ret;
  },
});

export default mongoose.model('User', userSchema);
