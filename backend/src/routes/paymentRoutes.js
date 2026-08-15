import { Router } from 'express';
import {
  initiate,
  listMyPayments,
  getPayment,
  mpesaCallback,
  simulateConfirm,
} from '../controllers/paymentController.js';
import { protect } from '../middleware/auth.js';
import { requireFields } from '../middleware/validation.js';

const router = Router();

// Public webhook — Safaricom calls this (must NOT require auth).
router.post('/mpesa/callback', mpesaCallback);

router.use(protect);

router.post('/', requireFields('rideId', 'phone'), initiate);
router.get('/', listMyPayments);
router.post('/:id/simulate-confirm', simulateConfirm); // must precede /:id
router.get('/:id', getPayment);

export default router;
