import { Router } from 'express';
import {
  listRiders,
  verifyRider,
  createRider,
  addRiderMotorcycle,
  deleteRiderMotorcycle,
  listRides,
  listPayments,
  listFares,
  createFare,
  updateFare,
  listCampuses,
  getCampus,
  createCampus,
  updateCampus,
  deleteCampus,
  listPickupPoints,
  getPickupPoint,
  createPickupPoint,
  updatePickupPoint,
  deletePickupPoint,
  listUsers,
  updateUserStatus,
  listComplaints,
  updateComplaint,
  getStats,
} from '../controllers/adminController.js';
import { protect } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { requireFields, validateEnum } from '../middleware/validation.js';

const router = Router();

// All admin routes require the admin system role
router.use(protect, requireRole('admin'));

// Dashboard stats
router.get('/stats', getStats);

// Riders
router.get('/riders', listRiders);
router.post(
  '/riders',
  requireFields('name', 'email', 'phone', 'password'),
  validateEnum('accountType', ['student', 'staff', 'lecturer', 'visitor', 'contractor', 'other']),
  createRider
);
router.post('/riders/:userId/motorcycles', requireFields('registrationNumber'), addRiderMotorcycle);
router.delete('/riders/:userId/motorcycles/:motorcycleId', deleteRiderMotorcycle);
router.patch(
  '/riders/:userId/verify',
  requireFields('status'),
  validateEnum('status', ['approved', 'rejected', 'suspended']),
  verifyRider
);

// Rides
router.get('/rides', listRides);

// Payments
router.get('/payments', listPayments);

// Fares
router.get('/fares', listFares);
router.post('/fares', requireFields('campusId'), createFare);
router.put('/fares/:campusId', updateFare);

// Campuses
router.get('/campuses', listCampuses);
router.get('/campuses/:id', getCampus);
router.post('/campuses', requireFields('name'), validateEnum('status', ['active', 'inactive']), createCampus);
router.put('/campuses/:id', validateEnum('status', ['active', 'inactive']), updateCampus);
router.delete('/campuses/:id', deleteCampus);

// Pickup points
router.get('/pickup-points', listPickupPoints);
router.get('/pickup-points/:id', getPickupPoint);
router.post(
  '/pickup-points',
  requireFields('campusId', 'name'),
  validateEnum('status', ['active', 'inactive']),
  createPickupPoint
);
router.put('/pickup-points/:id', validateEnum('status', ['active', 'inactive']), updatePickupPoint);
router.delete('/pickup-points/:id', deletePickupPoint);

// Users
router.get('/users', listUsers);
router.patch(
  '/users/:id/status',
  requireFields('status'),
  validateEnum('status', ['active', 'suspended', 'deactivated']),
  updateUserStatus
);

// Complaints
router.get('/complaints', listComplaints);
router.patch(
  '/complaints/:id',
  validateEnum('status', ['open', 'in_progress', 'resolved', 'dismissed']),
  updateComplaint
);

export default router;
