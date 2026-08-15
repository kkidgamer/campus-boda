import Motorcycle from '../models/Motorcycle.js';
import RiderProfile from '../models/RiderProfile.js';
import asyncHandler from '../utils/asyncHandler.js';

function serializeMotorcycle(mc) {
  return {
    id: mc._id,
    riderId: mc.riderId,
    registrationNumber: mc.registrationNumber,
    make: mc.make,
    model: mc.model,
    color: mc.color,
    year: mc.year,
    documents: mc.documents,
    verificationStatus: mc.verificationStatus,
    createdAt: mc.createdAt,
  };
}

/** Add a motorcycle to the authenticated user's rider application. */
export const addMotorcycle = asyncHandler(async (req, res) => {
  const profile = await RiderProfile.findOne({ userId: req.user.id });
  if (!profile) {
    return res.status(400).json({ error: { message: 'Create a rider profile first' } });
  }

  const { registrationNumber, make, model, color, year, documents } = req.body;
  const mc = await Motorcycle.create({
    riderId: req.user.id,
    registrationNumber,
    make: make || '',
    model: model || '',
    color: color || '',
    year: year || null,
    documents: documents || {},
  });

  return res.status(201).json({ motorcycle: serializeMotorcycle(mc) });
});

/** The authenticated user's motorcycles. */
export const getMyMotorcycles = asyncHandler(async (req, res) => {
  const motorcycles = await Motorcycle.find({ riderId: req.user.id }).sort({ createdAt: -1 });
  return res.json({ results: motorcycles, count: motorcycles.length });
});

/** Update a motorcycle (owner only). Vehicle changes trigger re-verification. */
export const updateMotorcycle = asyncHandler(async (req, res) => {
  const mc = await Motorcycle.findById(req.params.id);
  if (!mc) {
    return res.status(404).json({ error: { message: 'Motorcycle not found' } });
  }
  if (mc.riderId.toString() !== req.user.id) {
    return res.status(403).json({ error: { message: 'You do not own this motorcycle' } });
  }

  const fields = ['registrationNumber', 'make', 'model', 'color', 'year', 'documents'];
  let changed = false;
  for (const field of fields) {
    if (req.body[field] !== undefined) {
      mc[field] = req.body[field];
      changed = true;
    }
  }
  if (changed && mc.verificationStatus !== 'pending') {
    mc.verificationStatus = 'pending';
  }
  await mc.save();

  return res.json({ motorcycle: serializeMotorcycle(mc) });
});

/** Delete a motorcycle (owner only). */
export const deleteMotorcycle = asyncHandler(async (req, res) => {
  const mc = await Motorcycle.findById(req.params.id);
  if (!mc) {
    return res.status(404).json({ error: { message: 'Motorcycle not found' } });
  }
  if (mc.riderId.toString() !== req.user.id) {
    return res.status(403).json({ error: { message: 'You do not own this motorcycle' } });
  }
  await mc.deleteOne();
  return res.status(204).end();
});
