import { Router } from 'express';
import {
  getMyProfile,
  updateMyProfile,
  changeMyPassword,
  listEmergencyContacts,
  addEmergencyContact,
  updateEmergencyContact,
  deleteEmergencyContact,
} from '../controllers/userController.js';
import { protect } from '../middleware/auth.js';
import { requireFields, validateEnum } from '../middleware/validation.js';
import { ACCOUNT_TYPES } from '../utils/validators.js';

const router = Router();

// All user endpoints require authentication.
router.use(protect);

// Own profile
router.get('/me', getMyProfile);
router.put('/me', validateEnum('accountType', ACCOUNT_TYPES), updateMyProfile);
router.patch('/me/password', requireFields('currentPassword', 'newPassword'), changeMyPassword);

// Emergency contacts
router.get('/me/emergency-contacts', listEmergencyContacts);
router.post(
  '/me/emergency-contacts',
  requireFields('name', 'phone'),
  addEmergencyContact
);
router.put('/me/emergency-contacts/:contactId', updateEmergencyContact);
router.delete('/me/emergency-contacts/:contactId', deleteEmergencyContact);

export default router;
