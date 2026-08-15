import { Router } from 'express';
import {
  createComplaint,
  listMyComplaints,
  getComplaint,
} from '../controllers/complaintController.js';
import { protect } from '../middleware/auth.js';
import { requireFields } from '../middleware/validation.js';

const router = Router();

router.use(protect);

router.post('/', requireFields('description'), createComplaint);
router.get('/', listMyComplaints);
router.get('/:id', getComplaint);

export default router;
