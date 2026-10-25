import BloodBank from '../models/BloodBank.js';

export const createBloodBank = async (req, res) => {
  try {
    const bloodBank = await BloodBank.create({
      ...req.body,
      createdBy: req.user._id,
      status: 'pending',
      isVerified: false
    });
    res.status(201).json(bloodBank);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getBloodBanks = async (req, res) => {
  try {
    const { latitude, longitude, radius, status } = req.query;

    if (status && status !== 'approved') {
      return res.status(403).json({ message: 'Only approved blood banks are publicly listed' });
    }

    const query = { status: 'approved' };

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

    const bloodBanks = await BloodBank.find(query);

    res.json(bloodBanks);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getManagedBloodBanks = async (req, res) => {
  try {
    const query = req.user.role === 'admin' ? {} : { createdBy: req.user._id };
    const bloodBanks = await BloodBank.find(query).sort({ updatedAt: -1 });
    res.json(bloodBanks);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getBloodBankById = async (req, res) => {
  try {
    const bloodBank = await BloodBank.findById(req.params.id);

    if (!bloodBank) {
      return res.status(404).json({ message: 'Blood bank not found' });
    }

    if (bloodBank.status !== 'approved' && req.user.role !== 'admin' && bloodBank.createdBy?.toString() !== req.user._id.toString()) {
      return res.status(404).json({ message: 'Blood bank not found' });
    }

    res.json(bloodBank);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const updateBloodBank = async (req, res) => {
  try {
    const bloodBank = await BloodBank.findById(req.params.id);

    if (!bloodBank) {
      return res.status(404).json({ message: 'Blood bank not found' });
    }

    if (req.user.role !== 'admin' && bloodBank.createdBy?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only manage blood banks you created' });
    }

    for (const field of ['name', 'location', 'contact', 'hours', 'inventory']) {
      if (req.body[field] !== undefined) bloodBank[field] = req.body[field];
    }
    await bloodBank.save();

    res.json(bloodBank);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const moderateBloodBank = async (req, res) => {
  try {
    const { status } = req.body;
    const bloodBank = await BloodBank.findById(req.params.id);

    if (!bloodBank) {
      return res.status(404).json({ message: 'Blood bank not found' });
    }

    if (req.user.role !== 'admin' && bloodBank.createdBy?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only manage blood banks you created' });
    }

    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid blood bank status' });
    }

    bloodBank.status = status;
    bloodBank.isVerified = status === 'approved';

    await bloodBank.save();
    res.json(bloodBank);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteBloodBank = async (req, res) => {
  try {
    const bloodBank = await BloodBank.findById(req.params.id);

    if (!bloodBank) {
      return res.status(404).json({ message: 'Blood bank not found' });
    }

    if (req.user.role !== 'admin' && bloodBank.createdBy?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only manage blood banks you created' });
    }

    await bloodBank.deleteOne();
    res.json({ message: 'Blood bank deleted' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
