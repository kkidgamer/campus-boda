import mongoose from 'mongoose';
import env from '../src/config/environment.js';
import logger from '../src/utils/logger.js';
import Campus from '../src/models/Campus.js';
import PickupPoint from '../src/models/PickupPoint.js';
import User from '../src/models/User.js';
import FareConfiguration from '../src/models/FareConfiguration.js';

const PICKUP_POINTS = [
  'Main Gate',
  'Library',
  'Hostels',
  'Student Centre',
  'Administration',
  'Cafeteria',
  'Lecture Block',
  'Sports Complex',
];

async function seed() {
  await mongoose.connect(env.mongodbUri);
  logger.info('Connected, seeding...');

  // Default campus
  const campus = await Campus.findOneAndUpdate(
    { name: 'Main Campus' },
    {
      name: 'Main Campus',
      institution: 'Campus Boda University',
      address: 'Example Road, University Town',
      status: 'active',
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  logger.info(`Campus ready: ${campus.name} (${campus._id})`);

  // Pickup points
  for (const name of PICKUP_POINTS) {
    await PickupPoint.findOneAndUpdate(
      { campusId: campus._id, name },
      { campusId: campus._id, name, status: 'active' },
      { upsert: true, setDefaultsOnInsert: true }
    );
  }
  logger.info(`Pickup points ready (${PICKUP_POINTS.length})`);

  // Fare configuration for the default campus
  await FareConfiguration.findOneAndUpdate(
    { campusId: campus._id },
    {
      campusId: campus._id,
      baseFare: 100,
      pricePerKm: 50,
      minimumFare: 150,
      peakMultiplier: 1.2,
      active: true,
    },
    { upsert: true, setDefaultsOnInsert: true }
  );
  logger.info('Fare configuration ready (base 100, 50/km, min 150, peak x1.2)');

  // Default admin (password hashed by the User pre-save hook)
  const adminEmail = 'admin@campusboda.test';
  let admin = await User.findOne({ email: adminEmail });
  if (admin) {
    admin.name = 'System Admin';
    admin.phone = '+254700000000';
    admin.accountType = 'staff';
    admin.systemRole = 'admin';
    admin.campusId = campus._id;
    admin.verified = true;
    admin.status = 'active';
  } else {
    admin = new User({
      name: 'System Admin',
      email: adminEmail,
      phone: '+254700000000',
      password: 'Admin@123',
      accountType: 'staff',
      systemRole: 'admin',
      campusId: campus._id,
      verified: true,
      status: 'active',
    });
  }
  await admin.save();
  logger.info(`Admin ready: ${admin.email}`);

  await mongoose.disconnect();
  logger.info('Seed complete.');
}

seed().catch((err) => {
  logger.error(`Seed failed: ${err.message}`);
  process.exit(1);
});
