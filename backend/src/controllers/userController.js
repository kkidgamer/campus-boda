import mongoose from 'mongoose';
import User from '../models/User.js';
import Campus from '../models/Campus.js';
import asyncHandler from '../utils/asyncHandler.js';

/** Shape a User document for API responses (never includes the password). */
async function serializeUser(user) {
  let campusName = null;
  if (user.campusId) {
    const campus = await Campus.findById(user.campusId).select('name');
    campusName = campus?.name || null;
  }
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    accountType: user.accountType,
    systemRole: user.systemRole,
    campusId: user.campusId,
    campusName,
    profilePhoto: user.profilePhoto,
    status: user.status,
    verified: user.verified,
    emergencyContacts: user.emergencyContacts || [],
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

/** Verify a campusId exists (when provided). */
async function validateCampus(campusId) {
  if (!mongoose.isValidObjectId(campusId)) {
    return { error: 'Invalid campusId' };
  }
  const campus = await Campus.findById(campusId);
  if (!campus) return { error: 'Campus not found' };
  return { campus };
}

/** The authenticated user's own profile (includes emergency contacts). */
export const getMyProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) {
    return res.status(404).json({ error: { message: 'User not found' } });
  }
  return res.json({ user: await serializeUser(user) });
});

/**
 * Update the authenticated user's profile.
 * Body: { name?, phone?, accountType?, campusId?, profilePhoto? }
 * Email and systemRole are not editable here.
 */
export const updateMyProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) {
    return res.status(404).json({ error: { message: 'User not found' } });
  }

  if (req.body.campusId !== undefined) {
    if (req.body.campusId === null || req.body.campusId === '') {
      user.campusId = null;
    } else {
      const { error } = await validateCampus(req.body.campusId);
      if (error) {
        return res.status(400).json({ error: { message: error } });
      }
      user.campusId = req.body.campusId;
    }
  }
  if (req.body.name !== undefined) user.name = req.body.name;
  if (req.body.phone !== undefined) user.phone = req.body.phone;
  if (req.body.accountType !== undefined) user.accountType = req.body.accountType;
  if (req.body.profilePhoto !== undefined) user.profilePhoto = req.body.profilePhoto;

  await user.save();
  return res.json({ message: 'Profile updated', user: await serializeUser(user) });
});

/**
 * Change the authenticated user's password.
 * Body: { currentPassword, newPassword }
 */
export const changeMyPassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({
      error: { message: 'New password must be at least 8 characters' },
    });
  }

  const user = await User.findById(req.user.id).select('+password');
  if (!user) {
    return res.status(404).json({ error: { message: 'User not found' } });
  }
  if (!(await user.comparePassword(currentPassword))) {
    return res.status(401).json({ error: { message: 'Current password is incorrect' } });
  }

  user.password = newPassword;
  await user.save();
  return res.json({ message: 'Password updated successfully' });
});

/* ------------------------------------------------------------------ */
/* Emergency contacts                                                  */
/* ------------------------------------------------------------------ */

/** The authenticated user's emergency contacts. */
export const listEmergencyContacts = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) {
    return res.status(404).json({ error: { message: 'User not found' } });
  }
  return res.json({ results: user.emergencyContacts || [], count: user.emergencyContacts?.length || 0 });
});

/** Add an emergency contact. Body: { name, phone, relationship? } */
export const addEmergencyContact = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) {
    return res.status(404).json({ error: { message: 'User not found' } });
  }
  user.emergencyContacts.push({
    name: req.body.name,
    phone: req.body.phone,
    relationship: req.body.relationship || '',
  });
  await user.save();
  const contact = user.emergencyContacts[user.emergencyContacts.length - 1];
  return res.status(201).json({ message: 'Emergency contact added', contact });
});

/** Update an emergency contact. Body: { name?, phone?, relationship? } */
export const updateEmergencyContact = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) {
    return res.status(404).json({ error: { message: 'User not found' } });
  }
  const contact = user.emergencyContacts.id(req.params.contactId);
  if (!contact) {
    return res.status(404).json({ error: { message: 'Emergency contact not found' } });
  }
  if (req.body.name !== undefined) contact.name = req.body.name;
  if (req.body.phone !== undefined) contact.phone = req.body.phone;
  if (req.body.relationship !== undefined) contact.relationship = req.body.relationship;
  await user.save();
  return res.json({ message: 'Emergency contact updated', contact });
});

/** Delete an emergency contact. */
export const deleteEmergencyContact = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) {
    return res.status(404).json({ error: { message: 'User not found' } });
  }
  const contact = user.emergencyContacts.id(req.params.contactId);
  if (!contact) {
    return res.status(404).json({ error: { message: 'Emergency contact not found' } });
  }
  contact.deleteOne();
  await user.save();
  return res.json({ message: 'Emergency contact deleted' });
});
