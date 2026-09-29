import mongoose from 'mongoose';

const bloodRequestSchema = new mongoose.Schema({
  requester: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  patientName: {
    type: String,
    required: true
  },
  bloodType: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    required: true
  },
  unitsNeeded: {
    type: Number,
    required: true,
    min: 1
  },
  urgency: {
    type: String,
    enum: ['critical', 'urgent', 'normal'],
    default: 'normal'
  },
  hospital: {
    name: String,
    address: String,
    phone: String
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
    }
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'fulfilled', 'expired'],
    default: 'pending'
  },
  reason: {
    type: String,
    required: true
  },
  requiredBy: {
    type: Date,
    required: true
  },
  responses: [{
    donor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'completed'],
      default: 'pending'
    },
    respondedAt: {
      type: Date,
      default: Date.now
    },
    notes: String
  }],
  moderationNotes: String,
  moderatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  moderatedAt: Date
}, {
  timestamps: true
});

bloodRequestSchema.index({ location: '2dsphere' });
bloodRequestSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model('BloodRequest', bloodRequestSchema);
