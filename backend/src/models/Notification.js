import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['blood_request', 'donation_camp', 'eligibility_reminder', 'response_update', 'stock_verification', 'system'],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  data: {
    bloodRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BloodRequest'
    },
    campId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DonationCamp'
    },
    bloodBankId: { type: mongoose.Schema.Types.ObjectId, ref: 'BloodBank' },
    bloodType: String
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: Date
}, {
  timestamps: true
});

notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });

export default mongoose.model('Notification', notificationSchema);
