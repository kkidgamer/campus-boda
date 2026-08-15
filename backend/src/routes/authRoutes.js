import { Router } from 'express';
import { register, login, refresh, profile, logout } from '../controllers/authController.js';
import { requireFields, validateEmail, validateEnum } from '../middleware/validation.js';
import { protect } from '../middleware/auth.js';
import { ACCOUNT_TYPES } from '../utils/validators.js';

const router = Router();

router.post(
  '/register',
  requireFields('name', 'email', 'phone', 'password'),
  validateEmail,
  validateEnum('accountType', ACCOUNT_TYPES),
  register
);

router.post('/login', requireFields('email', 'password'), validateEmail, login);

router.post('/refresh', requireFields('refresh'), refresh);

router.get('/profile', protect, profile);

router.post('/logout', logout);

export default router;
