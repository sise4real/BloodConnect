import express from 'express';
import {
  createCamp,
  getCamps,
  getManagedCamps,
  getCampById,
  registerForCamp,
  moderateCamp,
  updateCamp,
  deleteCamp
} from '../controllers/campController.js';
import { protect, adminOnly, hospitalOrAdmin } from '../middleware/auth.js';

const router = express.Router();

router.route('/')
  .get(protect, getCamps)
  .post(protect, hospitalOrAdmin, createCamp);

router.get('/manage', protect, hospitalOrAdmin, getManagedCamps);

router.route('/:id')
  .get(protect, getCampById)
  .put(protect, hospitalOrAdmin, updateCamp)
  .delete(protect, hospitalOrAdmin, deleteCamp);

router.post('/:id/register', protect, registerForCamp);
router.put('/:id/moderate', protect, adminOnly, moderateCamp);

export default router;
