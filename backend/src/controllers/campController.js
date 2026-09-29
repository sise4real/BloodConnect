import DonationCamp from '../models/DonationCamp.js';

export const createCamp = async (req, res) => {
  try {
    const camp = await DonationCamp.create({
      ...req.body,
      organizer: req.user._id
    });

    await camp.populate('organizer', 'fullName email phone');

    res.status(201).json(camp);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getCamps = async (req, res) => {
  try {
    const { status, latitude, longitude, radius } = req.query;

    let query = {};

    if (status) {
      query.status = status;
    } else {
      query.status = { $in: ['approved', 'active'] };
    }

    if (latitude && longitude) {
      query.location = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)]
          },
          $maxDistance: radius ? parseInt(radius) * 1000 : 100000
        }
      };
    }

    const camps = await DonationCamp.find(query)
      .populate('organizer', 'fullName email phone')
      .populate('registeredDonors', 'fullName bloodType')
      .populate('moderatedBy', 'fullName')
      .sort({ date: 1 });

    res.json(camps);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getCampById = async (req, res) => {
  try {
    const camp = await DonationCamp.findById(req.params.id)
      .populate('organizer', 'fullName email phone')
      .populate('registeredDonors', 'fullName bloodType email phone')
      .populate('moderatedBy', 'fullName');

    if (!camp) {
      return res.status(404).json({ message: 'Camp not found' });
    }

    res.json(camp);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const registerForCamp = async (req, res) => {
  try {
    const camp = await DonationCamp.findById(req.params.id);

    if (!camp) {
      return res.status(404).json({ message: 'Camp not found' });
    }

    if (camp.status !== 'approved' && camp.status !== 'active') {
      return res.status(400).json({ message: 'Camp is not available for registration' });
    }

    if (camp.registeredDonors.includes(req.user._id)) {
      return res.status(400).json({ message: 'Already registered' });
    }

    if (camp.capacity && camp.registeredDonors.length >= camp.capacity) {
      return res.status(400).json({ message: 'Camp is full' });
    }

    camp.registeredDonors.push(req.user._id);
    await camp.save();
    await camp.populate('registeredDonors', 'fullName bloodType');

    res.json(camp);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const moderateCamp = async (req, res) => {
  try {
    const { status, moderationNotes } = req.body;
    const camp = await DonationCamp.findById(req.params.id);

    if (!camp) {
      return res.status(404).json({ message: 'Camp not found' });
    }

    camp.status = status;
    camp.moderationNotes = moderationNotes;
    camp.moderatedBy = req.user._id;
    camp.moderatedAt = Date.now();

    await camp.save();
    await camp.populate('moderatedBy', 'fullName');

    res.json(camp);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteCamp = async (req, res) => {
  try {
    const camp = await DonationCamp.findById(req.params.id);

    if (!camp) {
      return res.status(404).json({ message: 'Camp not found' });
    }

    if (camp.organizer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await camp.deleteOne();
    res.json({ message: 'Camp deleted' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
