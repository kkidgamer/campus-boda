import mongoose from 'mongoose';
import RiderProfile from '../models/RiderProfile.js';
import Motorcycle from '../models/Motorcycle.js';
import User from '../models/User.js';
import Ride from '../models/Ride.js';
import Payment from '../models/Payment.js';
import FareConfiguration from '../models/FareConfiguration.js';
import Campus from '../models/Campus.js';
import PickupPoint from '../models/PickupPoint.js';
import Complaint from '../models/Complaint.js';
import asyncHandler from '../utils/asyncHandler.js';

/** Fields an admin may set on a campus / pickup point. */
const CAMPUS_FIELDS = ['name', 'institution', 'address', 'latitude', 'longitude', 'boundaries', 'status'];
const PICKUP_POINT_FIELDS = ['campusId', 'name', 'description', 'latitude', 'longitude', 'status'];

/** Copy only whitelisted, present fields from the request body. */
function pickFields(body, fields) {
  const picked = {};
  for (const field of fields) {
    if (body[field] !== undefined) picked[field] = body[field];
  }
  return picked;
}

/** Validate lat/lng values (when provided) and coerce them to numbers. */
function validateCoordinates(fields) {
  const errors = [];
  const ranges = [
    ['latitude', -90, 90],
    ['longitude', -180, 180],
  ];
  for (const [name, min, max] of ranges) {
    const value = fields[name];
    if (value === undefined || value === null || value === '') continue;
    const num = Number(value);
    if (Number.isNaN(num) || num < min || num > max) {
      errors.push(`${name} must be a number between ${min} and ${max}`);
    } else {
      fields[name] = num;
    }
  }
  return errors;
}

/** Verify a campusId exists (when provided), for pickup point writes. */
async function resolveCampusId(campusId) {
  if (!mongoose.isValidObjectId(campusId)) {
    return { error: 'Invalid campusId' };
  }
  const campus = await Campus.findById(campusId);
  if (!campus) return { error: 'Campus not found' };
  return { campus };
}

/**
 * List rider applications, optionally filtered by verification status.
 * Query: ?status=pending|approved|rejected|suspended
 */
export const listRiders = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const filter = status ? { verificationStatus: status } : {};
  const profiles = await RiderProfile.find(filter)
    .populate('userId', 'name email phone accountType status verified')
    .sort({ createdAt: -1 });

  // Attach each rider's motorcycles so admins can review them in one place.
  const riderIds = profiles.map((p) => p.userId?._id).filter(Boolean);
  const motorcycles = await Motorcycle.find({ riderId: { $in: riderIds } });
  const byRider = motorcycles.reduce((acc, m) => {
    const key = m.riderId.toString();
    (acc[key] ||= []).push(m);
    return acc;
  }, {});

  const results = profiles.map((p) => ({
    ...p.toJSON(),
    motorcycles: byRider[p.userId?._id?.toString()] || [],
  }));
  return res.json({ results, count: results.length });
});

/**
 * Approve, reject or suspend a rider application.
 * Body: { status: 'approved' | 'rejected' | 'suspended' }
 *
 * Approval promotes the user's systemRole to 'rider' and verifies them
 * (and their motorcycles). Rejection reverts them to 'passenger'.
 */
export const verifyRider = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const { userId } = req.params;

  const profile = await RiderProfile.findOne({ userId });
  if (!profile) {
    return res.status(404).json({ error: { message: 'Rider application not found' } });
  }
  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({ error: { message: 'User not found' } });
  }

  profile.verificationStatus = status;

  if (status === 'approved') {
    user.systemRole = 'rider';
    user.verified = true;
    await Motorcycle.updateMany({ riderId: user._id }, { verificationStatus: 'approved' });
  } else if (status === 'rejected') {
    if (user.systemRole === 'rider') user.systemRole = 'passenger';
    user.verified = false;
    await Motorcycle.updateMany({ riderId: user._id }, { verificationStatus: 'rejected' });
  } else if (status === 'suspended') {
    user.verified = false;
    await Motorcycle.updateMany({ riderId: user._id }, { verificationStatus: 'suspended' });
  }

  await profile.save();
  await user.save();

  return res.json({
    message: `Rider application ${status}`,
    rider: {
      id: profile._id,
      userId: profile.userId,
      verificationStatus: profile.verificationStatus,
    },
    user: {
      id: user._id,
      name: user.name,
      systemRole: user.systemRole,
      verified: user.verified,
    },
  });
});

/* ------------------------------------------------------------------ */
/* Rider registration (admin registers riders — they do not self-apply) */
/* ------------------------------------------------------------------ */

/**
 * Register a rider directly (admin-driven — riders do not self-apply).
 * Body: {
 *   name, email, phone, password,
 *   accountType?, campusId?,
 *   nationalId?, licenseNumber?, licenseDocument?, profilePhoto?,
 *   motorcycle?: { registrationNumber, make?, model?, color?, year? }
 * }
 * Creates the user account (systemRole: rider, verified) plus the rider
 * profile and an optional motorcycle. Since the admin vets the documents
 * at registration, the profile is created as approved.
 */
export const createRider = asyncHandler(async (req, res) => {
  const { name, email, phone, password, accountType, campusId } = req.body;
  const { nationalId, licenseNumber, licenseDocument, profilePhoto, motorcycle } = req.body;

  const existing = await User.findOne({ email: String(email).toLowerCase() });
  if (existing) {
    return res.status(409).json({ error: { message: 'An account with this email already exists' } });
  }

  if (campusId) {
    const { error } = await resolveCampusId(campusId);
    if (error) {
      return res.status(400).json({ error: { message: error } });
    }
  }

  const user = await User.create({
    name,
    email,
    phone,
    password,
    accountType: accountType || 'other',
    campusId: campusId || null,
    systemRole: 'rider',
    verified: true,
  });

  const profile = await RiderProfile.create({
    userId: user._id,
    nationalId: nationalId || '',
    licenseNumber: licenseNumber || '',
    licenseDocument: licenseDocument || '',
    profilePhoto: profilePhoto || '',
    verificationStatus: 'approved',
  });

  let createdMotorcycle = null;
  if (motorcycle && motorcycle.registrationNumber) {
    try {
      createdMotorcycle = await Motorcycle.create({
        riderId: user._id,
        registrationNumber: motorcycle.registrationNumber,
        make: motorcycle.make || '',
        model: motorcycle.model || '',
        color: motorcycle.color || '',
        year: motorcycle.year || null,
        verificationStatus: 'approved',
      });
    } catch (err) {
      // Duplicate registration number — roll back the rider account.
      await Promise.all([User.findByIdAndDelete(user._id), RiderProfile.deleteOne({ userId: user._id })]);
      if (err.code === 11000) {
        return res.status(409).json({
          error: { message: `A motorcycle with registration ${motorcycle.registrationNumber} already exists` },
        });
      }
      throw err;
    }
  }

  return res.status(201).json({
    message: 'Rider registered successfully',
    user: { id: user._id, name: user.name, email: user.email, phone: user.phone },
    rider: { id: profile._id, verificationStatus: profile.verificationStatus },
    motorcycle: createdMotorcycle,
  });
});

/**
 * Add a motorcycle to an existing rider.
 * Body: { registrationNumber, make?, model?, color?, year? }
 * New motorcycles are approved immediately (admin vetted the rider).
 */
export const addRiderMotorcycle = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const profile = await RiderProfile.findOne({ userId });
  if (!profile) {
    return res.status(404).json({ error: { message: 'Rider not found' } });
  }
  const { registrationNumber } = req.body;
  if (!registrationNumber) {
    return res.status(400).json({ error: { message: 'registrationNumber is required' } });
  }
  try {
    const motorcycle = await Motorcycle.create({
      riderId: userId,
      registrationNumber,
      make: req.body.make || '',
      model: req.body.model || '',
      color: req.body.color || '',
      year: req.body.year || null,
      verificationStatus: 'approved',
    });
    return res.status(201).json({ message: 'Motorcycle added', motorcycle });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        error: { message: `A motorcycle with registration ${registrationNumber} already exists` },
      });
    }
    throw err;
  }
});

/** Remove a motorcycle from a rider. */
export const deleteRiderMotorcycle = asyncHandler(async (req, res) => {
  const { userId, motorcycleId } = req.params;
  const motorcycle = await Motorcycle.findOneAndDelete({ _id: motorcycleId, riderId: userId });
  if (!motorcycle) {
    return res.status(404).json({ error: { message: 'Motorcycle not found' } });
  }
  return res.json({ message: 'Motorcycle removed' });
});

/** List all rides, optionally filtered by status (admin). */
export const listRides = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const filter = status ? { status } : {};
  const rides = await Ride.find(filter)
    .sort({ createdAt: -1 })
    .populate('passengerId', 'name email phone')
    .populate('riderId', 'name');
  return res.json({ results: rides, count: rides.length });
});

/** All payments (admin). */
export const listPayments = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const filter = status ? { status } : {};
  const payments = await Payment.find(filter)
    .sort({ createdAt: -1 })
    .populate('rideId', 'pickup destination finalFare status')
    .populate('passengerId', 'name email')
    .populate('riderId', 'name');
  return res.json({ results: payments, count: payments.length });
});

/** All fare configurations (admin). */
export const listFares = asyncHandler(async (req, res) => {
  const fares = await FareConfiguration.find().populate('campusId', 'name').sort({ createdAt: -1 });
  return res.json({ results: fares, count: fares.length });
});

/** Validate and coerce fare fields from a request body. */
function parseFareFields(body) {
  const values = {};
  const errors = [];
  for (const field of ['baseFare', 'pricePerKm', 'minimumFare']) {
    if (body[field] !== undefined) {
      const value = Number(body[field]);
      if (Number.isNaN(value) || value < 0) {
        errors.push(`${field} must be a non-negative number`);
      } else {
        values[field] = value;
      }
    }
  }
  if (body.peakMultiplier !== undefined) {
    const value = Number(body.peakMultiplier);
    if (Number.isNaN(value) || value < 1) {
      errors.push('peakMultiplier must be at least 1');
    } else {
      values.peakMultiplier = value;
    }
  }
  if (body.active !== undefined) values.active = Boolean(body.active);
  return { values, errors };
}

/** Create a campus fare configuration (admin). Body: { campusId, baseFare?, ... } */
export const createFare = asyncHandler(async (req, res) => {
  const { campusId } = req.body;
  if (!mongoose.isValidObjectId(campusId)) {
    return res.status(400).json({ error: { message: 'Invalid campusId' } });
  }
  const campus = await Campus.findById(campusId);
  if (!campus) {
    return res.status(404).json({ error: { message: 'Campus not found' } });
  }
  const existing = await FareConfiguration.findOne({ campusId });
  if (existing) {
    return res.status(409).json({ error: { message: 'A fare configuration already exists for this campus' } });
  }

  const { values, errors } = parseFareFields(req.body);
  if (errors.length > 0) {
    return res.status(400).json({ error: { message: errors.join('; ') } });
  }
  const config = await FareConfiguration.create({
    campusId,
    baseFare: 0,
    pricePerKm: 0,
    minimumFare: 0,
    peakMultiplier: 1,
    ...values,
  });
  return res.status(201).json({ message: 'Fare configuration created', fare: config });
});

/** Update a campus fare configuration (admin). */
export const updateFare = asyncHandler(async (req, res) => {
  const config = await FareConfiguration.findOne({ campusId: req.params.campusId });
  if (!config) {
    return res.status(404).json({ error: { message: 'No fare configuration for this campus' } });
  }
  const { values, errors } = parseFareFields(req.body);
  if (errors.length > 0) {
    return res.status(400).json({ error: { message: errors.join('; ') } });
  }
  Object.assign(config, values);
  await config.save();
  return res.json({ message: 'Fare configuration updated', fare: config });
});

/* ------------------------------------------------------------------ */
/* Campus CRUD                                                         */
/* ------------------------------------------------------------------ */

/** All campuses (any status), optionally filtered by ?status=. */
export const listCampuses = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const filter = status ? { status } : {};
  const campuses = await Campus.find(filter).sort({ name: 1 });
  return res.json({ results: campuses, count: campuses.length });
});

/** Single campus (admin). */
export const getCampus = asyncHandler(async (req, res) => {
  const campus = await Campus.findById(req.params.id);
  if (!campus) {
    return res.status(404).json({ error: { message: 'Campus not found' } });
  }
  return res.json(campus);
});

/** Create a campus. Body: { name, institution?, address?, latitude?, longitude?, status? } */
export const createCampus = asyncHandler(async (req, res) => {
  const fields = pickFields(req.body, CAMPUS_FIELDS);
  const coordErrors = validateCoordinates(fields);
  if (coordErrors.length > 0) {
    return res.status(400).json({ error: { message: coordErrors.join('; ') } });
  }
  const campus = await Campus.create(fields);
  return res.status(201).json({ message: 'Campus created', campus });
});

/** Update a campus (partial). */
export const updateCampus = asyncHandler(async (req, res) => {
  const campus = await Campus.findById(req.params.id);
  if (!campus) {
    return res.status(404).json({ error: { message: 'Campus not found' } });
  }
  const fields = pickFields(req.body, CAMPUS_FIELDS);
  const coordErrors = validateCoordinates(fields);
  if (coordErrors.length > 0) {
    return res.status(400).json({ error: { message: coordErrors.join('; ') } });
  }
  Object.assign(campus, fields);
  await campus.save();
  return res.json({ message: 'Campus updated', campus });
});

/**
 * Delete a campus. Rides, users and fare configurations reference the
 * campusId, so this is a soft delete — the campus is marked inactive
 * instead of being removed (which would orphan those records).
 */
export const deleteCampus = asyncHandler(async (req, res) => {
  const campus = await Campus.findById(req.params.id);
  if (!campus) {
    return res.status(404).json({ error: { message: 'Campus not found' } });
  }
  campus.status = 'inactive';
  await campus.save();
  return res.json({ message: 'Campus deactivated', campus });
});

/* ------------------------------------------------------------------ */
/* Pickup point CRUD                                                   */
/* ------------------------------------------------------------------ */

/** All pickup points (admin), optionally filtered by ?campusId= and ?status=. */
export const listPickupPoints = asyncHandler(async (req, res) => {
  const { campusId, status } = req.query;
  const filter = {};
  if (campusId) filter.campusId = campusId;
  if (status) filter.status = status;
  const points = await PickupPoint.find(filter)
    .populate('campusId', 'name')
    .sort({ campusId: 1, name: 1 });
  return res.json({ results: points, count: points.length });
});

/** Single pickup point (admin). */
export const getPickupPoint = asyncHandler(async (req, res) => {
  const point = await PickupPoint.findById(req.params.id).populate('campusId', 'name');
  if (!point) {
    return res.status(404).json({ error: { message: 'Pickup point not found' } });
  }
  return res.json(point);
});

/**
 * Create a pickup point.
 * Body: { campusId, name, description?, latitude?, longitude?, status? }
 */
export const createPickupPoint = asyncHandler(async (req, res) => {
  const fields = pickFields(req.body, PICKUP_POINT_FIELDS);
  const { error, campus } = await resolveCampusId(fields.campusId);
  if (error) {
    return res.status(400).json({ error: { message: error } });
  }
  const coordErrors = validateCoordinates(fields);
  if (coordErrors.length > 0) {
    return res.status(400).json({ error: { message: coordErrors.join('; ') } });
  }
  const point = await PickupPoint.create({ campusId: campus._id, ...fields });
  return res.status(201).json({ message: 'Pickup point created', pickupPoint: point });
});

/** Update a pickup point (partial). */
export const updatePickupPoint = asyncHandler(async (req, res) => {
  const point = await PickupPoint.findById(req.params.id);
  if (!point) {
    return res.status(404).json({ error: { message: 'Pickup point not found' } });
  }
  const fields = pickFields(req.body, PICKUP_POINT_FIELDS);
  if (fields.campusId !== undefined) {
    const { error } = await resolveCampusId(fields.campusId);
    if (error) {
      return res.status(400).json({ error: { message: error } });
    }
  }
  const coordErrors = validateCoordinates(fields);
  if (coordErrors.length > 0) {
    return res.status(400).json({ error: { message: coordErrors.join('; ') } });
  }
  Object.assign(point, fields);
  await point.save();
  return res.json({ message: 'Pickup point updated', pickupPoint: point });
});

/** Delete a pickup point (hard delete — it is not referenced by other models). */
export const deletePickupPoint = asyncHandler(async (req, res) => {
  const point = await PickupPoint.findByIdAndDelete(req.params.id);
  if (!point) {
    return res.status(404).json({ error: { message: 'Pickup point not found' } });
  }
  return res.json({ message: 'Pickup point deleted' });
});

/* ------------------------------------------------------------------ */
/* Users                                                               */
/* ------------------------------------------------------------------ */

/**
 * All users (admin), optionally filtered by ?status=, ?systemRole=,
 * ?accountType= and free-text ?q= (name/email/phone).
 */
export const listUsers = asyncHandler(async (req, res) => {
  const { status, systemRole, accountType, q } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (systemRole) filter.systemRole = systemRole;
  if (accountType) filter.accountType = accountType;
  if (q) {
    const regex = new RegExp(q, 'i');
    filter.$or = [{ name: regex }, { email: regex }, { phone: regex }];
  }
  const users = await User.find(filter)
    .populate('campusId', 'name')
    .sort({ createdAt: -1 });
  return res.json({ results: users, count: users.length });
});

/** Suspend / activate / deactivate a user. Body: { status } */
export const updateUserStatus = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(404).json({ error: { message: 'User not found' } });
  }
  if (user.systemRole === 'admin' && req.body.status !== 'active') {
    return res.status(400).json({ error: { message: 'Admin accounts cannot be suspended or deactivated' } });
  }
  user.status = req.body.status;
  await user.save();
  return res.json({ message: `User ${req.body.status}`, user });
});

/* ------------------------------------------------------------------ */
/* Complaints                                                          */
/* ------------------------------------------------------------------ */

/** All complaints (admin), optionally filtered by ?status= and ?category=. */
export const listComplaints = asyncHandler(async (req, res) => {
  const { status, category } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (category) filter.category = category;
  const complaints = await Complaint.find(filter)
    .sort({ createdAt: -1 })
    .populate('passengerId', 'name email phone')
    .populate('riderId', 'name phone')
    .populate('rideId', 'pickup destination status');
  return res.json({ results: complaints, count: complaints.length });
});

/** Update a complaint: ?status= (open|in_progress|resolved|dismissed) and/or resolution text. */
export const updateComplaint = asyncHandler(async (req, res) => {
  const complaint = await Complaint.findById(req.params.id);
  if (!complaint) {
    return res.status(404).json({ error: { message: 'Complaint not found' } });
  }
  if (req.body.status !== undefined) complaint.status = req.body.status;
  if (req.body.resolution !== undefined) complaint.resolution = req.body.resolution;
  await complaint.save();
  return res.json({ message: 'Complaint updated', complaint });
});

/* ------------------------------------------------------------------ */
/* Dashboard stats                                                     */
/* ------------------------------------------------------------------ */

/** Summary counts for the admin dashboard. */
export const getStats = asyncHandler(async (req, res) => {
  const [
    totalUsers,
    totalRiders,
    totalRides,
    activeRides,
    totalPayments,
    revenueAgg,
    openComplaints,
    activeCampuses,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ systemRole: 'rider' }),
    Ride.countDocuments(),
    Ride.countDocuments({ status: { $in: ['ACCEPTED', 'ARRIVING', 'STARTED'] } }),
    Payment.countDocuments(),
    Payment.aggregate([
      { $match: { status: 'paid' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Complaint.countDocuments({ status: { $in: ['open', 'in_progress'] } }),
    Campus.countDocuments({ status: 'active' }),
  ]);
  return res.json({
    totalUsers,
    totalRiders,
    totalRides,
    activeRides,
    totalPayments,
    revenue: revenueAgg[0]?.total || 0,
    openComplaints,
    activeCampuses,
  });
});
