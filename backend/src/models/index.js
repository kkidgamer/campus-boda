/**
 * Model registry — importing this module registers every model with Mongoose
 * before the database connection opens, so startup can build all schema
 * indexes (unique indexes included) for every model.
 */
import User from './User.js';
import Campus from './Campus.js';
import RiderProfile from './RiderProfile.js';
import Motorcycle from './Motorcycle.js';
import PickupPoint from './PickupPoint.js';
import Ride from './Ride.js';
import Payment from './Payment.js';
import Review from './Review.js';
import Complaint from './Complaint.js';
import Emergency from './Emergency.js';
import Notification from './Notification.js';
import FareConfiguration from './FareConfiguration.js';

export {
  User,
  Campus,
  RiderProfile,
  Motorcycle,
  PickupPoint,
  Ride,
  Payment,
  Review,
  Complaint,
  Emergency,
  Notification,
  FareConfiguration,
};
