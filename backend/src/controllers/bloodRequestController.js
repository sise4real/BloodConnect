import BloodRequest from '../models/BloodRequest.js';
import User from '../models/User.js';
import { notifyNearbyDonors } from './notificationController.js';

export const createBloodRequest = async (req, res) => {
  try {
    const bloodRequest = await BloodRequest.create({
      ...req.body,
      requester: req.user._id
    });

    await bloodRequest.populate('requester', 'fullName email phone');

    if (bloodRequest.status === 'approved') {
      await notifyNearbyDonors(bloodRequest);
    }

    res.status(201).json(bloodRequest);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getBloodRequests = async (req, res) => {
  try {
    const { status, bloodType, urgency, latitude, longitude, radius } = req.query;

    let query = {};

    if (status) query.status = status;
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
    const bloodRequest = await BloodRequest.findById(req.params.id);

    if (!bloodRequest) {
      return res.status(404).json({ message: 'Blood request not found' });
    }

    if (bloodRequest.status !== 'approved') {
      return res.status(400).json({ message: 'Can only respond to approved requests' });
    }

    const existingResponse = bloodRequest.responses.find(
      r => r.donor.toString() === req.user._id.toString()
    );

    if (existingResponse) {
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
    const bloodRequest = await BloodRequest.findById(req.params.id);

    if (!bloodRequest) {
      return res.status(404).json({ message: 'Blood request not found' });
    }

    const previousStatus = bloodRequest.status;
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

    response.status = status;

    if (status === 'completed') {
      const donor = await User.findById(response.donor);
      if (donor) {
        donor.donationsCount += 1;
        donor.lastDonation = Date.now();
        await donor.save();
      }
    }

    await bloodRequest.save();
    res.json(bloodRequest);
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
