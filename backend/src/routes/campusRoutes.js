import { Router } from 'express';
import {
  listCampuses,
  listPickupPoints,
  requireDatabase,
} from '../controllers/campusController.js';

const router = Router();

router.get('/', requireDatabase, listCampuses);
router.get('/:campusId/pickup-points', requireDatabase, listPickupPoints);

export default router;
