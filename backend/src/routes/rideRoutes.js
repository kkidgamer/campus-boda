import { Router } from 'express';
import {
  requestRide,
  listMyRides,
  availableRides,
  getActiveRide,
  getRide,
  acceptRide,
  arriveRide,
  startRide,
  completeRide,
  cancelRide,
} from '../controllers/rideController.js';
import { protect } from '../middleware/auth.js';
import { requireFields } from '../middleware/validation.js';

const router = Router();

router.use(protect);

router.post('/', requireFields('pickup', 'destination', 'campusId'), requestRide);
router.get('/available', availableRides); // must precede /:id
router.get('/active', getActiveRide); // must precede /:id
router.get('/', listMyRides);
router.get('/:id', getRide);
router.post('/:id/accept', acceptRide);
router.post('/:id/arrive', arriveRide);
router.post('/:id/start', startRide);
router.post('/:id/complete', completeRide);
router.post('/:id/cancel', cancelRide);

export default router;
