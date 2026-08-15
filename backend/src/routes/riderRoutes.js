import { Router } from 'express';
import {
  upsertRiderProfile,
  getMyRiderProfile,
  updateRiderProfile,
  setOnlineStatus,
  getPublicRiderProfile,
} from '../controllers/riderController.js';
import { protect } from '../middleware/auth.js';
import { requireFields } from '../middleware/validation.js';

const router = Router();

// Authenticated rider endpoints (order matters: /me before /:id)
router.post('/', protect, requireFields('nationalId', 'licenseNumber'), upsertRiderProfile);
router.get('/me', protect, getMyRiderProfile);
router.put('/me', protect, updateRiderProfile);
router.patch('/me/status', protect, setOnlineStatus);

// Public rider profile (used by passengers during matching)
router.get('/:id', getPublicRiderProfile);

export default router;
