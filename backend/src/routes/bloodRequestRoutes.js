import express from 'express';
import {
  createBloodRequest,
  getBloodRequests,
  getBloodRequestById,
  respondToRequest,
  moderateBloodRequest,
  updateResponseStatus,
  deleteBloodRequest
} from '../controllers/bloodRequestController.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

router.route('/')
  .get(protect, getBloodRequests)
  .post(protect, createBloodRequest);

router.route('/:id')
  .get(protect, getBloodRequestById)
  .delete(protect, deleteBloodRequest);

router.post('/:id/respond', protect, respondToRequest);
router.put('/:id/moderate', protect, adminOnly, moderateBloodRequest);
router.put('/:id/response-status', protect, updateResponseStatus);

export default router;
