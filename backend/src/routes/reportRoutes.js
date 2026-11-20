import express from 'express';
import { protect } from '../middleware/auth.js';
import { downloadReport } from '../controllers/reportController.js';

const router = express.Router();
router.get('/:report', protect, downloadReport);
export default router;
