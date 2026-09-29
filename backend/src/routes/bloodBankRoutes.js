import express from 'express';
import {
  createBloodBank,
  getBloodBanks,
  getBloodBankById,
  updateBloodBank,
  moderateBloodBank,
  deleteBloodBank
} from '../controllers/bloodBankController.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

router.route('/')
  .get(protect, getBloodBanks)
  .post(protect, adminOnly, createBloodBank);

router.route('/:id')
  .get(protect, getBloodBankById)
  .put(protect, adminOnly, updateBloodBank)
  .delete(protect, adminOnly, deleteBloodBank);

router.put('/:id/moderate', protect, adminOnly, moderateBloodBank);

export default router;
