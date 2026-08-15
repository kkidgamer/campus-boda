import { Router } from 'express';
import {
  createReview,
  listReviews,
  getReview,
} from '../controllers/reviewController.js';
import { protect } from '../middleware/auth.js';
import { requireFields } from '../middleware/validation.js';

const router = Router();

router.use(protect);

router.post('/', requireFields('rideId', 'rating'), createReview);
router.get('/', listReviews);
router.get('/:id', getReview);

export default router;
