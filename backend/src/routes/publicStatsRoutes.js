import express from 'express';
import { getPublicStats } from '../controllers/publicStatsController.js';

const router = express.Router();

router.get('/', getPublicStats);

export default router;
