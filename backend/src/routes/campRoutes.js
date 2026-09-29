import express from 'express';
import {
  createCamp,
  getCamps,
  getCampById,
  registerForCamp,
  moderateCamp,
  deleteCamp
} from '../controllers/campController.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

router.route('/')
  .get(protect, getCamps)
  .post(protect, createCamp);

router.route('/:id')
  .get(protect, getCampById)
  .delete(protect, deleteCamp);

router.post('/:id/register', protect, registerForCamp);
router.put('/:id/moderate', protect, adminOnly, moderateCamp);

export default router;
