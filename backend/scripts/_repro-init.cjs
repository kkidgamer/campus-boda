require('./src/config/environment.js');
const mongoose = require('mongoose');

async function main() {
  // Import all models the same way app.js does
  require('./src/models/User.js');
  require('./src/models/Campus.js');
  require('./src/models/RiderProfile.js');
  require('./src/models/Motorcycle.js');
  require('./src/models/PickupPoint.js');
  require('./src/models/Ride.js');
  require('./src/models/Payment.js');
  require('./src/models/Review.js');
  require('./src/models/Complaint.js');
  require('./src/models/Emergency.js');
  require('./src/models/Notification.js');
  require('./src/models/FareConfiguration.js');

  console.log('models:', Object.keys(mongoose.models));
  await mongoose.connect('mongodb://127.0.0.1:27017/campus_boda', { serverSelectionTimeoutMS: 5000 });
  console.log('connected');
  for (const [name, model] of Object.entries(mongoose.models)) {
    try {
      await model.init();
      console.log(`init OK: ${name}`);
    } catch (err) {
      console.log(`init FAILED: ${name} -> ${err.message}`);
    }
  }
  await mongoose.disconnect();
}
main().catch((e) => { console.error('FATAL', e); process.exit(1); });
