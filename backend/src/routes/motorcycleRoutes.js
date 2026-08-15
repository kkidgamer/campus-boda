import { Router } from 'express';
import {
  addMotorcycle,
  getMyMotorcycles,
  updateMotorcycle,
  deleteMotorcycle,
} from '../controllers/motorcycleController.js';
import { protect } from '../middleware/auth.js';
import { requireFields } from '../middleware/validation.js';

const router = Router();

router.post('/', protect, requireFields('registrationNumber'), addMotorcycle);
router.get('/me', protect, getMyMotorcycles);
router.put('/:id', protect, updateMotorcycle);
router.delete('/:id', protect, deleteMotorcycle);

export default router;
