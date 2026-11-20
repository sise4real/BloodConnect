import express from 'express';
import {
  uploadInstitutionDocument,
  listInstitutionDocuments,
  downloadInstitutionDocument
} from '../controllers/institutionDocumentController.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();
const parseDocument = express.raw({
  type: ['application/pdf', 'image/jpeg', 'image/png'],
  limit: '5mb'
});

router.post('/', protect, parseDocument, uploadInstitutionDocument);
router.get('/', protect, adminOnly, listInstitutionDocuments);
router.get('/:id/download', protect, adminOnly, downloadInstitutionDocument);

export default router;
