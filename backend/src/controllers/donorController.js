import User from '../models/User.js';
import { getDonorEligibility } from '../utils/donorEligibility.js';
import BloodRequest from '../models/BloodRequest.js';

export const searchDonors = async (req, res) => {
  try {
    const { bloodType, latitude, longitude, radius } = req.query;
    const city = typeof req.query.city === 'string' ? req.query.city.trim() : '';
    const postalCode = typeof req.query.postalCode === 'string' ? req.query.postalCode.trim() : '';
    const hasCoordinates = latitude !== undefined && longitude !== undefined;
    const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const validBloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
    if (bloodType && !validBloodTypes.includes(bloodType)) {
      return res.status(400).json({ message: 'Invalid blood type' });
    }
    if ((latitude === undefined) !== (longitude === undefined)) {
      return res.status(400).json({ message: 'Latitude and longitude must be provided together' });
    }
    if (latitude !== undefined || longitude !== undefined) {
      const lat = Number(latitude);
      const lon = Number(longitude);
      if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lon) || lon < -180 || lon > 180) {
        return res.status(400).json({ message: 'Invalid latitude or longitude' });
      }
    }
    if (!hasCoordinates && !city && !postalCode) {
      return res.status(400).json({ message: 'Search by city, postal code, or current GPS location' });
    }

    const query = { role: 'donor', isActive: true, availability: true };
    const locationConditions = [];

    if (bloodType) {
      query.bloodType = bloodType;
    }

    if (city) {
      locationConditions.push({ 'location.city': new RegExp(`^${escapeRegex(city)}$`, 'i') });
    }

    if (postalCode) {
      locationConditions.push({ 'location.postalCode': new RegExp(`^${escapeRegex(postalCode)}$`, 'i') });
    }

    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    locationConditions.push({
      $or: [{ lastDonation: null }, { lastDonation: { $lte: threeMonthsAgo } }]
    });
    locationConditions.push({ 'medicalInfo.age': { $gte: 18, $lte: 65 } });
    locationConditions.push({ 'medicalInfo.weight': { $gte: 50 } });

    if (hasCoordinates) {
      const searchRadius = radius === undefined ? 50 : Number(radius);
      if (!Number.isFinite(searchRadius) || searchRadius <= 0) {
        return res.status(400).json({ message: 'Radius must be a positive number of kilometres' });
      }
      locationConditions.push({
        location: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [Number(longitude), Number(latitude)]
            },
            $maxDistance: searchRadius * 1000
          }
        }
      });
    }

    if (locationConditions.length > 0) {
      query.$and = locationConditions;
    }

    const donors = await User.find(query)
      .select('-password')
      .limit(50);

    res.json(donors);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getDonorById = async (req, res) => {
  try {
    const donor = await User.findOne({
      _id: req.params.id,
      role: 'donor'
    }).select('-password');

    if (!donor) {
      return res.status(404).json({ message: 'Donor not found' });
    }

    res.json(donor);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getDonorStats = async (req, res) => {
  try {
    const totalDonors = await User.countDocuments({ role: 'donor', isActive: true });
    const availableDonors = await User.countDocuments({
      role: 'donor',
      isActive: true,
      availability: true
    });

    const bloodTypeStats = await User.aggregate([
      {
        $match: { role: 'donor', isActive: true }
      },
      {
        $group: {
          _id: '$bloodType',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      totalDonors,
      availableDonors,
      bloodTypeStats
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getDonationHistory = async (req, res) => {
  try {
    if (req.user.role !== 'donor') return res.status(403).json({ message: 'Donation history is available to donor accounts only' });
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
    const query = { responses: { $elemMatch: { donor: req.user._id, status: 'completed' } } };
    const [requests, total] = await Promise.all([
      BloodRequest.find(query).select('patientName bloodType hospital responses createdAt status')
        .populate('requester', 'fullName')
        .sort({ updatedAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      BloodRequest.countDocuments(query)
    ]);
    const donations = requests.flatMap(request => (request.responses || [])
      .filter(response => response.status === 'completed' && String(response.donor) === String(req.user._id))
      .map(response => ({
        requestId: request._id,
        patientName: request.patientName,
        bloodType: request.bloodType,
        hospital: request.hospital?.name,
        completedAt: response.verifiedAt,
        verifiedBy: response.verifiedBy,
        requestStatus: request.status
      })));
    res.json({ donations, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (error) { res.status(400).json({ message: error.message }); }
};

export const checkEligibility = async (req, res) => {
  try {
    const donor = await User.findById(req.user._id);

    if (donor.role !== 'donor') {
      return res.status(400).json({ message: 'Only donors can check eligibility' });
    }

    const eligibility = getDonorEligibility(donor);

    res.json({
      ...eligibility,
      message: eligibility.assessmentStatus === 'pending_assessment'
        ? 'Complete your age and weight information to continue the preliminary assessment.'
        : eligibility.passesPreliminaryChecks
          ? 'Preliminary checks passed. Complete medical screening with a qualified provider before donating.'
          : 'You do not currently meet the preliminary donation checks.',
      ...(eligibility.nextEligibleDate ? { nextEligibleDate: eligibility.nextEligibleDate } : {})
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

