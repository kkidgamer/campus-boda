import { Router } from 'express';
import { quoteFare, getCampusFare } from '../controllers/fareController.js';

const router = Router();

router.get('/quote', quoteFare);
router.get('/campus/:campusId', getCampusFare);

export default router;
