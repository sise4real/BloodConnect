import express from 'express';
import {
  createBloodBank,
  getBloodBanks,
  getManagedBloodBanks,
  getBloodBankById,
  updateBloodBank,
  moderateBloodBank,
  deleteBloodBank
} from '../controllers/bloodBankController.js';
import { protect, adminOnly, verifiedInstitutionOrAdmin } from '../middleware/auth.js';

const router = express.Router();

router.route('/')
  .get(protect, getBloodBanks)
  .post(protect, verifiedInstitutionOrAdmin, createBloodBank);

router.get('/manage', protect, verifiedInstitutionOrAdmin, getManagedBloodBanks);

router.route('/:id')
  .get(protect, getBloodBankById)
  .put(protect, verifiedInstitutionOrAdmin, updateBloodBank)
  .delete(protect, verifiedInstitutionOrAdmin, deleteBloodBank);

router.put('/:id/moderate', protect, adminOnly, moderateBloodBank);

export default router;
