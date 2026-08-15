import { Router } from 'express';
import healthRoutes from './healthRoutes.js';
import campusRoutes from './campusRoutes.js';
import authRoutes from './authRoutes.js';
import riderRoutes from './riderRoutes.js';
import motorcycleRoutes from './motorcycleRoutes.js';
import rideRoutes from './rideRoutes.js';
import fareRoutes from './fareRoutes.js';
import paymentRoutes from './paymentRoutes.js';
import complaintRoutes from './complaintRoutes.js';
import reviewRoutes from './reviewRoutes.js';
import adminRoutes from './adminRoutes.js';

/**
 * API versioning — everything lives under /api/v1.
 *
 * Future resource routers (Phase 4+):
 *   /users, /passengers, /notifications
 */
const router = Router();

router.use('/health', healthRoutes);
router.use('/campuses', campusRoutes);
router.use('/auth', authRoutes);
router.use('/riders', riderRoutes);
router.use('/motorcycles', motorcycleRoutes);
router.use('/rides', rideRoutes);
router.use('/fares', fareRoutes);
router.use('/payments', paymentRoutes);
router.use('/complaints', complaintRoutes);
router.use('/reviews', reviewRoutes);
router.use('/admin', adminRoutes);

export default router;
