import InstitutionDocument from '../models/InstitutionDocument.js';

const allowedTypes = new Set(['application/pdf', 'image/jpeg', 'image/png']);
const maxBytes = 5 * 1024 * 1024;

export const uploadInstitutionDocument = async (req, res) => {
  try {
    if (!['hospital', 'blood_bank'].includes(req.user.role)) return res.status(403).json({ message: 'Only hospital or blood bank accounts can submit verification documents' });
    if (!allowedTypes.has(req.headers['content-type'])) return res.status(415).json({ message: 'Upload a PDF, JPEG, or PNG document' });
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) return res.status(400).json({ message: 'Choose a document to upload' });
    if (req.body.length > maxBytes) return res.status(413).json({ message: 'Documents must be 5 MB or smaller' });
    const signatures = {
      'application/pdf': req.body.subarray(0, 4).toString() === '%PDF',
      'image/png': req.body.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
      'image/jpeg': req.body[0] === 0xff && req.body[1] === 0xd8 && req.body[2] === 0xff
    };
    if (!signatures[req.headers['content-type']]) return res.status(400).json({ message: 'The file content does not match its declared type' });

    let suppliedName = String(req.headers['x-file-name'] || 'verification-document');
    try { suppliedName = decodeURIComponent(suppliedName); } catch { /* Keep a safe literal filename if decoding fails. */ }
    const originalName = suppliedName.replace(/[\r\n"\\/]/g, '_').slice(0, 180);
    const document = await InstitutionDocument.create({
      institution: req.user._id,
      uploadedBy: req.user._id,
      originalName,
      contentType: req.headers['content-type'],
      size: req.body.length,
      data: req.body
    });
    res.status(201).json({ _id: document._id, originalName: document.originalName, uploadedAt: document.uploadedAt });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const listInstitutionDocuments = async (req, res) => {
  try {
    const documents = await InstitutionDocument.find()
      .select('institution originalName contentType size uploadedAt')
      .populate('institution', 'fullName institutionName institutionRegistrationNumber institutionVerificationStatus')
      .sort({ uploadedAt: -1 });
    res.json(documents);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const downloadInstitutionDocument = async (req, res) => {
  try {
    const document = await InstitutionDocument.findById(req.params.id).select('+data');
    if (!document) return res.status(404).json({ message: 'Document not found' });
    const safeName = document.originalName.replace(/[\r\n"\\/]/g, '_');
    res.set({
      'Content-Type': document.contentType,
      'Content-Length': document.size,
      'Content-Disposition': `attachment; filename="${safeName}"`,
      'X-Content-Type-Options': 'nosniff'
    });
    res.send(document.data);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
