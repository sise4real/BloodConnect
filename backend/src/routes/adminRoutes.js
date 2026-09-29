import express from 'express';
import {
  getDashboardStats,
  getAllUsers,
  updateUserStatus,
  deleteUser,
  getPendingItems
} from '../controllers/adminController.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);
router.use(adminOnly);

router.get('/dashboard', getDashboardStats);
router.get('/pending', getPendingItems);
router.get('/users', getAllUsers);
router.put('/users/:id', updateUserStatus);
router.delete('/users/:id', deleteUser);

export default router;
