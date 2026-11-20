import mongoose from 'mongoose';

const institutionDocumentSchema = new mongoose.Schema({
  institution: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  originalName: { type: String, required: true },
  contentType: { type: String, enum: ['application/pdf', 'image/jpeg', 'image/png'], required: true },
  size: { type: Number, required: true, max: 5 * 1024 * 1024 },
  data: { type: Buffer, required: true, select: false },
  uploadedAt: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.model('InstitutionDocument', institutionDocumentSchema);
