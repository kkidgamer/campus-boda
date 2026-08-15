import mongoose from 'mongoose';
import User from '../models/User.js';
import Campus from '../models/Campus.js';
import asyncHandler from '../utils/asyncHandler.js';
import { signAccessToken, signRefreshToken, verifyToken } from '../utils/jwt.js';

/** Shape a User document for API responses (never includes the password). */
function serializeUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    accountType: user.accountType,
    systemRole: user.systemRole,
    campusId: user.campusId,
    profilePhoto: user.profilePhoto,
    status: user.status,
    verified: user.verified,
    createdAt: user.createdAt,
  };
}

/**
 * Register a new campus user.
 * Body: { name, email, phone, password, accountType?, campusId? }
 */
export const register = asyncHandler(async (req, res) => {
  const { name, email, phone, password, accountType, campusId } = req.body;

  const existing = await User.findOne({ email: String(email).toLowerCase() });
  if (existing) {
    return res.status(409).json({ error: { message: 'An account with this email already exists' } });
  }

  if (campusId) {
    if (!mongoose.isValidObjectId(campusId)) {
      return res.status(400).json({ error: { message: 'Invalid campusId' } });
    }
    const campus = await Campus.findById(campusId);
    if (!campus) {
      return res.status(400).json({ error: { message: 'Campus not found' } });
    }
  }

  const user = await User.create({
    name,
    email,
    phone,
    password,
    accountType: accountType || 'other',
    campusId: campusId || null,
  });

  return res.status(201).json({
    message: 'Account created successfully',
    user: serializeUser(user),
  });
});

/**
 * Login with email + password.
 * Body: { email, password }
 */
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email: String(email).toLowerCase() }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ error: { message: 'Invalid email or password' } });
  }

  if (user.status !== 'active') {
    return res.status(403).json({ error: { message: 'This account is not active' } });
  }

  return res.json({
    access: signAccessToken(user),
    refresh: signRefreshToken(user),
    user: serializeUser(user),
  });
});

/**
 * Exchange a valid refresh token for a fresh token pair.
 * Body: { refresh }
 */
export const refresh = asyncHandler(async (req, res) => {
  const { refresh: refreshToken } = req.body;

  let payload;
  try {
    payload = verifyToken(refreshToken);
  } catch {
    return res.status(401).json({ error: { message: 'Invalid or expired refresh token' } });
  }

  if (payload.type !== 'refresh') {
    return res.status(401).json({ error: { message: 'Not a refresh token' } });
  }

  const user = await User.findById(payload.sub);
  if (!user || user.status !== 'active') {
    return res.status(401).json({ error: { message: 'Account not found or inactive' } });
  }

  return res.json({
    access: signAccessToken(user),
    refresh: signRefreshToken(user),
    user: serializeUser(user),
  });
});

/** Return the currently authenticated user. Requires a valid access token. */
export const profile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) {
    return res.status(404).json({ error: { message: 'User not found' } });
  }
  return res.json(serializeUser(user));
});

/**
 * Stateless logout — the client discards its tokens.
 * Accepted for API completeness; there is no server-side token store yet.
 */
export const logout = asyncHandler(async (req, res) => {
  return res.status(204).end();
});
