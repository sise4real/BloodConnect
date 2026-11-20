import BloodRequest from '../models/BloodRequest.js';
import User from '../models/User.js';
import { notifyNearbyDonors } from './notificationController.js';
import { getDonorEligibility } from '../utils/donorEligibility.js';
import { readSettings } from './settingsController.js';

export const createBloodRequest = async (req, res) => {
  try {
    const { patientName, bloodType, unitsNeeded, urgency, hospital, location, reason, requiredBy } = req.body;
    const bloodRequest = await BloodRequest.create({
      patientName,
      bloodType,
      unitsNeeded,
      urgency,
      hospital,
      location,
      reason,
      requiredBy,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      requester: req.user._id,
      status: 'pending'
    });

    await bloodRequest.populate('requester', 'fullName email phone');

    res.status(201).json(bloodRequest);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const renewBloodRequest = async (req, res) => {
  try {
    const bloodRequest = await BloodRequest.findById(req.params.id);
    if (!bloodRequest) return res.status(404).json({ message: 'Blood request not found' });

    const isAdmin = req.user.role === 'admin';
    const isOwner = bloodRequest.requester.toString() === req.user._id.toString() && ['recipient', 'hospital'].includes(req.user.role);
    if (!isAdmin && !isOwner) return res.status(403).json({ message: 'Only the request owner or an administrator can renew this request' });
    if (['fulfilled', 'cancelled'].includes(bloodRequest.status)) return res.status(400).json({ message: 'Fulfilled or cancelled requests cannot be renewed' });
    if (bloodRequest.status === 'rejected') return res.status(400).json({ message: 'Rejected requests cannot be renewed' });
    if (!['pending', 'approved', 'expired'].includes(bloodRequest.status)) return res.status(400).json({ message: 'Only active or expired requests can be renewed' });
    if (isAdmin && (typeof req.body.reason !== 'string' || !req.body.reason.trim())) {
      return res.status(400).json({ message: 'Administrators must provide a renewal reason' });
    }

    const settings = await readSettings();
    if (bloodRequest.renewalCount >= settings.maxRequestRenewals) {
      return res.status(409).json({ message: `This request has reached the renewal limit of ${settings.maxRequestRenewals}` });
    }
    const previousExpiresAt = bloodRequest.expiresAt || new Date(bloodRequest.createdAt.getTime() + 24 * 60 * 60 * 1000);
    const now = new Date();
    const nextExpiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const priorState = bloodRequest.status === 'expired' ? (bloodRequest.expiredFromStatus || 'pending') : bloodRequest.status;
    const renewalRecord = {
      renewedBy: req.user._id,
      renewedAt: now,
      reason: isAdmin ? req.body.reason.trim() : String(req.body.reason || '').trim(),
      previousExpiresAt,
      newExpiresAt: nextExpiresAt
    };
    const renewed = await BloodRequest.findOneAndUpdate(
      {
        _id: bloodRequest._id,
        status: bloodRequest.status,
        $or: [{ renewalCount: { $lt: settings.maxRequestRenewals } }, { renewalCount: { $exists: false } }]
      },
      {
        $set: { status: priorState, expiredFromStatus: null, expiresAt: nextExpiresAt },
        $inc: { renewalCount: 1 },
        $push: { renewalHistory: renewalRecord }
      },
      { new: true, runValidators: true }
    );
    if (!renewed) return res.status(409).json({ message: 'The request changed or reached its renewal limit. Refresh and try again.' });
    await notifyNearbyDonors(renewed, { renewed: true });
    await renewed.populate('requester', 'fullName email phone');
    res.json(renewed);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getBloodRequests = async (req, res) => {
  try {
    const { status, bloodType, urgency, latitude, longitude, radius } = req.query;

    let query = {};

    if (req.query.mine === 'true') query.requester = req.user._id;

    if (status) query.status = status;
    if (status === 'approved') {
      const now = new Date();
      query.$or = [
        { expiresAt: { $gt: now } },
        { expiresAt: { $exists: false }, createdAt: { $gt: new Date(now.getTime() - 24 * 60 * 60 * 1000) } }
      ];
    }
    if (bloodType) query.bloodType = bloodType;
    if (urgency) query.urgency = urgency;

    if (latitude && longitude) {
      query.location = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)]
          },
          $maxDistance: radius ? parseInt(radius) * 1000 : 50000
        }
      };
    }

    const bloodRequests = await BloodRequest.find(query)
      .populate('requester', 'fullName email phone')
      .populate('responses.donor', 'fullName bloodType phone email')
      .populate('moderatedBy', 'fullName')
      .sort({ urgency: -1, createdAt: -1 });

    res.json(bloodRequests);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getBloodRequestById = async (req, res) => {
  try {
    const bloodRequest = await BloodRequest.findById(req.params.id)
      .populate('requester', 'fullName email phone location')
      .populate('responses.donor', 'fullName bloodType phone email location')
      .populate('moderatedBy', 'fullName');

    if (!bloodRequest) {
      return res.status(404).json({ message: 'Blood request not found' });
    }

    res.json(bloodRequest);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const respondToRequest = async (req, res) => {
  try {
    const { status, notes } = req.body;
    if (req.user.role !== 'donor') {
      return res.status(403).json({ message: 'Only donors can respond to blood requests' });
    }
    if (!['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Response status must be accepted or rejected' });
    }
    if (status === 'accepted') {
      const donor = await User.findById(req.user._id);
      const eligibility = getDonorEligibility(donor);
      if (!eligibility.passesPreliminaryChecks) {
        return res.status(400).json({ message: 'You are not currently eligible to accept a donation request', reasons: eligibility.reasons });
      }
    }
    const bloodRequest = await BloodRequest.findById(req.params.id);

    if (!bloodRequest) {
      return res.status(404).json({ message: 'Blood request not found' });
    }

    if (bloodRequest.status !== 'approved') {
      return res.status(400).json({ message: 'Can only respond to approved requests' });
    }
    const effectiveExpiry = bloodRequest.expiresAt || new Date(bloodRequest.createdAt.getTime() + 24 * 60 * 60 * 1000);
    if (effectiveExpiry <= new Date()) {
      bloodRequest.expiredFromStatus = 'approved';
      bloodRequest.status = 'expired';
      bloodRequest.expiresAt = effectiveExpiry;
      await bloodRequest.save();
      return res.status(400).json({ message: 'This request has expired and must be renewed before you can respond' });
    }

    const existingResponse = bloodRequest.responses.find(
      r => r.donor.toString() === req.user._id.toString()
    );

    if (existingResponse) {
      if (existingResponse.verifiedAt || existingResponse.status === 'completed') {
        return res.status(400).json({ message: 'A completed donation response cannot be changed' });
      }
      existingResponse.status = status;
      existingResponse.notes = notes;
      existingResponse.respondedAt = Date.now();
    } else {
      bloodRequest.responses.push({
        donor: req.user._id,
        status,
        notes
      });
    }

    await bloodRequest.save();
    await bloodRequest.populate('responses.donor', 'fullName bloodType phone email');

    res.json(bloodRequest);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const moderateBloodRequest = async (req, res) => {
  try {
    const { status, moderationNotes } = req.body;
    if (!['approved', 'rejected', 'fulfilled', 'expired', 'cancelled'].includes(status)) {
      return res.status(400).json({ message: 'Invalid request status' });
    }
    const bloodRequest = await BloodRequest.findById(req.params.id);

    if (!bloodRequest) {
      return res.status(404).json({ message: 'Blood request not found' });
    }

    const previousStatus = bloodRequest.status;
    const effectiveExpiry = bloodRequest.expiresAt || new Date(bloodRequest.createdAt.getTime() + 24 * 60 * 60 * 1000);
    if (status === 'approved' && effectiveExpiry <= new Date()) {
      bloodRequest.status = 'expired';
      bloodRequest.expiredFromStatus = previousStatus === 'approved' ? 'approved' : 'pending';
      bloodRequest.expiresAt = effectiveExpiry;
      await bloodRequest.save();
      return res.status(400).json({ message: 'This request has expired and must be renewed before approval' });
    }
    if (status === 'fulfilled') {
      if (previousStatus !== 'approved') {
        return res.status(400).json({ message: 'Only approved requests can be marked fulfilled' });
      }
      const hasVerifiedDonation = bloodRequest.responses.some(response =>
        response.status === 'completed' && response.verifiedAt && response.verifiedBy
      );
      if (!hasVerifiedDonation) {
        return res.status(400).json({ message: 'A completed donation must be verified before fulfilling this request' });
      }
    }
    bloodRequest.status = status;
    bloodRequest.moderationNotes = moderationNotes;
    bloodRequest.moderatedBy = req.user._id;
    bloodRequest.moderatedAt = Date.now();

    await bloodRequest.save();
    await bloodRequest.populate('moderatedBy', 'fullName');

    if (status === 'approved' && previousStatus !== 'approved') {
      await notifyNearbyDonors(bloodRequest);
    }

    res.json(bloodRequest);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const updateResponseStatus = async (req, res) => {
  try {
    const { responseId, status } = req.body;
    const bloodRequest = await BloodRequest.findById(req.params.id);

    if (!bloodRequest) {
      return res.status(404).json({ message: 'Blood request not found' });
    }

    const response = bloodRequest.responses.id(responseId);
    if (!response) {
      return res.status(404).json({ message: 'Response not found' });
    }

    if (bloodRequest.requester.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only requester can update response status' });
    }

    if (!['accepted', 'rejected', 'completed'].includes(status)) {
      return res.status(400).json({ message: 'Invalid response status' });
    }

    if (response.verifiedAt && status !== 'completed') {
      return res.status(400).json({ message: 'A verified completed donation cannot be changed' });
    }

    response.status = status;

    if (status === 'completed' && !response.verifiedAt) {
      response.verifiedAt = new Date();
      response.verifiedBy = req.user._id;
      const donor = await User.findById(response.donor);
      if (donor) {
        donor.donationsCount += 1;
        donor.lastDonation = Date.now();
        donor.eligibilityReminderSentAt = null;
        await donor.save();
      }
    }

    await bloodRequest.save();
    res.json(bloodRequest);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const verifyLivesSaved = async (req, res) => {
  try {
    const { livesSavedCount, evidence } = req.body;
    const count = Number(livesSavedCount);
    if (!Number.isInteger(count) || count < 1 || typeof evidence !== 'string' || !evidence.trim()) {
      return res.status(400).json({ message: 'Enter a positive whole number and supporting evidence' });
    }

    const bloodRequest = await BloodRequest.findById(req.params.id);
    if (!bloodRequest) return res.status(404).json({ message: 'Blood request not found' });
    if (bloodRequest.status !== 'fulfilled') {
      return res.status(400).json({ message: 'Only fulfilled requests can document lives saved' });
    }
    if (bloodRequest.livesSavedVerifiedAt) {
      return res.status(409).json({ message: 'Lives saved has already been verified for this request' });
    }
    if (!bloodRequest.responses.some(response => response.status === 'completed' && response.verifiedAt && response.verifiedBy)) {
      return res.status(400).json({ message: 'A completed donation must be verified before recording lives saved' });
    }

    bloodRequest.livesSavedCount = count;
    bloodRequest.livesSavedEvidence = evidence.trim();
    bloodRequest.livesSavedVerifiedAt = new Date();
    bloodRequest.livesSavedVerifiedBy = req.user._id;
    await bloodRequest.save();
    res.json({ message: 'Lives saved milestone recorded', bloodRequest });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteBloodRequest = async (req, res) => {
  try {
    const bloodRequest = await BloodRequest.findById(req.params.id);

    if (!bloodRequest) {
      return res.status(404).json({ message: 'Blood request not found' });
    }

    if (bloodRequest.requester.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await bloodRequest.deleteOne();
    res.json({ message: 'Blood request deleted' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
