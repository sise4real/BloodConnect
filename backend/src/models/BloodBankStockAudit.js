import mongoose from 'mongoose';

const bloodBankStockAuditSchema = new mongoose.Schema({
  bloodBank: { type: mongoose.Schema.Types.ObjectId, ref: 'BloodBank', required: true, index: true },
  changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  bloodType: { type: String, enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], required: true },
  previousUnits: { type: Number, min: 0, default: null },
  newUnits: { type: Number, min: 0 },
  changedAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['pending', 'applied', 'failed'], default: 'applied', index: true },
  note: { type: String, trim: true }
}, { timestamps: false });

bloodBankStockAuditSchema.index({ bloodBank: 1, changedAt: -1 });

export default mongoose.model('BloodBankStockAudit', bloodBankStockAuditSchema);
