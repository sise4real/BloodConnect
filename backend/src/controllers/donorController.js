import User from '../models/User.js';

export const searchDonors = async (req, res) => {
  try {
    const { bloodType, latitude, longitude, radius, availability } = req.query;

    let query = { role: 'donor', isActive: true };

    if (bloodType) {
      query.bloodType = bloodType;
    }

    if (availability !== undefined) {
      query.availability = availability === 'true';
    }

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

export const checkEligibility = async (req, res) => {
  try {
    const donor = await User.findById(req.user._id);

    if (donor.role !== 'donor') {
      return res.status(400).json({ message: 'Only donors can check eligibility' });
    }

    const eligibility = {
      isEligible: true,
      reasons: []
    };

    if (!donor.lastDonation) {
      return res.json({ ...eligibility, message: 'You are eligible to donate!' });
    }

    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    if (donor.lastDonation > threeMonthsAgo) {
      eligibility.isEligible = false;
      const nextEligibleDate = new Date(donor.lastDonation);
      nextEligibleDate.setMonth(nextEligibleDate.getMonth() + 3);
      eligibility.reasons.push(`You must wait 3 months after your last donation. You'll be eligible again on ${nextEligibleDate.toLocaleDateString()}`);
      eligibility.nextEligibleDate = nextEligibleDate;
    }

    if (donor.medicalInfo?.age && donor.medicalInfo.age < 18) {
      eligibility.isEligible = false;
      eligibility.reasons.push('You must be at least 18 years old to donate');
    }

    if (donor.medicalInfo?.age && donor.medicalInfo.age > 65) {
      eligibility.isEligible = false;
      eligibility.reasons.push('Donors must be under 65 years old');
    }

    if (donor.medicalInfo?.weight && donor.medicalInfo.weight < 50) {
      eligibility.isEligible = false;
      eligibility.reasons.push('You must weigh at least 50kg to donate');
    }

    res.json({
      ...eligibility,
      message: eligibility.isEligible ? 'You are eligible to donate!' : 'You are currently not eligible to donate'
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const updateDonationHistory = async (req, res) => {
  try {
    const donor = await User.findById(req.user._id);

    if (donor.role !== 'donor') {
      return res.status(400).json({ message: 'Only donors can update donation history' });
    }

    donor.lastDonation = req.body.donationDate || Date.now();
    donor.donationsCount += 1;
    await donor.save();

    res.json({
      message: 'Donation history updated',
      lastDonation: donor.lastDonation,
      donationsCount: donor.donationsCount
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
