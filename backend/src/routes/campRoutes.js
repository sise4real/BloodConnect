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
import { protect, adminOnly, verifiedInstitutionOrAdmin } from '../middleware/auth.js';

const router = express.Router();

router.route('/')
  .get(protect, getCamps)
  .post(protect, verifiedInstitutionOrAdmin, createCamp);

router.get('/manage', protect, verifiedInstitutionOrAdmin, getManagedCamps);

router.route('/:id')
  .get(protect, getCampById)
  .put(protect, verifiedInstitutionOrAdmin, updateCamp)
  .delete(protect, verifiedInstitutionOrAdmin, deleteCamp);

router.post('/:id/register', protect, registerForCamp);
router.put('/:id/moderate', protect, adminOnly, moderateCamp);

export default router;
