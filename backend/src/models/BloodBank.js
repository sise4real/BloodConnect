import mongoose from 'mongoose';

const bloodBankSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
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
    city: String
  },
  contact: {
    phone: String,
    email: String,
    website: String
  },
  hours: {
    type: String,
    default: '24/7'
  },
  inventory: [{
    bloodType: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
    },
    units: Number,
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  }],
  isVerified: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  }
}, {
  timestamps: true
});

bloodBankSchema.index({ location: '2dsphere' });

export default mongoose.model('BloodBank', bloodBankSchema);
