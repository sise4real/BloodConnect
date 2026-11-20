import mongoose from 'mongoose';

const platformSettingsSchema = new mongoose.Schema({
  key: { type: String, default: 'global', unique: true },
  maxRequestRenewals: { type: Number, default: 3, min: 1, max: 10 },
  stockDashboardRefreshSeconds: { type: Number, default: 30, min: 10, max: 300 },
  stockFreshHours: { type: Number, default: 6, min: 1, max: 24 },
  stockAgingHours: { type: Number, default: 12, min: 2, max: 48 },
  stockUnverifiedHours: { type: Number, default: 24, min: 6, max: 168 }
}, { timestamps: true });

export default mongoose.model('PlatformSettings', platformSettingsSchema);
