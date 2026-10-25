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
import { protect, adminOnly, hospitalOrAdmin } from '../middleware/auth.js';

const router = express.Router();

router.route('/')
  .get(protect, getBloodBanks)
  .post(protect, hospitalOrAdmin, createBloodBank);

router.get('/manage', protect, hospitalOrAdmin, getManagedBloodBanks);

router.route('/:id')
  .get(protect, getBloodBankById)
  .put(protect, hospitalOrAdmin, updateBloodBank)
  .delete(protect, hospitalOrAdmin, deleteBloodBank);

router.put('/:id/moderate', protect, adminOnly, moderateBloodBank);

export default router;
