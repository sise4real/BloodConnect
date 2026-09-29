import express from 'express';
import {
  searchDonors,
  getDonorById,
  getDonorStats,
  checkEligibility,
  updateDonationHistory
} from '../controllers/donorController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/search', protect, searchDonors);
router.get('/stats', protect, getDonorStats);
router.get('/eligibility', protect, checkEligibility);
router.post('/donation-history', protect, updateDonationHistory);
router.get('/:id', protect, getDonorById);

export default router;
