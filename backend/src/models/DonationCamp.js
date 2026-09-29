import mongoose from 'mongoose';

const donationCampSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  organizer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  description: String,
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      required: true
    },
    address: String,
    venue: String
  },
  date: {
    type: Date,
    required: true
  },
  startTime: String,
  endTime: String,
  contactInfo: {
    phone: String,
    email: String
  },
  capacity: Number,
  registeredDonors: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'active', 'completed', 'cancelled'],
    default: 'pending'
  },
  moderationNotes: String,
  moderatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  moderatedAt: Date
}, {
  timestamps: true
});

donationCampSchema.index({ location: '2dsphere' });

export default mongoose.model('DonationCamp', donationCampSchema);
