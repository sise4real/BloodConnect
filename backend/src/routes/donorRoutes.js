import express from 'express';
import {
  searchDonors,
  getDonorById,
  getDonorStats,
  checkEligibility,
  getDonationHistory
} from '../controllers/donorController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/search', protect, searchDonors);
router.get('/stats', protect, getDonorStats);
router.get('/eligibility', protect, checkEligibility);
router.get('/history', protect, getDonationHistory);
router.get('/:id', protect, getDonorById);

export default router;
