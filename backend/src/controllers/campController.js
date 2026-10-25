import DonationCamp from '../models/DonationCamp.js';

export const createCamp = async (req, res) => {
  try {
    const camp = await DonationCamp.create({
      ...req.body,
      organizer: req.user._id,
      status: 'pending'
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
    const publicStatuses = ['approved', 'active'];
    if (status && !publicStatuses.includes(status)) {
      return res.status(403).json({ message: 'Only approved and active camps are publicly listed' });
    }
    const query = {
      status: status ? status : { $in: publicStatuses },
      date: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
    };

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

export const getManagedCamps = async (req, res) => {
  try {
    const query = req.user.role === 'admin' ? {} : { organizer: req.user._id };
    const camps = await DonationCamp.find(query)
      .populate('organizer', 'fullName')
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

    if (!['approved', 'active'].includes(camp.status) && req.user.role !== 'admin' && camp.organizer.toString() !== req.user._id.toString()) {
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

    if (!['pending', 'approved', 'rejected', 'active', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ message: 'Invalid camp status' });
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

export const updateCamp = async (req, res) => {
  try {
    const camp = await DonationCamp.findById(req.params.id);
    if (!camp) return res.status(404).json({ message: 'Camp not found' });
    if (req.user.role !== 'admin' && camp.organizer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only manage camps you created' });
    }

    for (const field of ['name', 'description', 'location', 'date', 'startTime', 'endTime', 'contactInfo', 'capacity']) {
      if (req.body[field] !== undefined) camp[field] = req.body[field];
    }
    await camp.save();
    await camp.populate('organizer', 'fullName email phone');
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
