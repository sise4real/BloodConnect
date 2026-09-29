import BloodBank from '../models/BloodBank.js';

export const createBloodBank = async (req, res) => {
  try {
    const bloodBank = await BloodBank.create(req.body);
    res.status(201).json(bloodBank);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getBloodBanks = async (req, res) => {
  try {
    const { latitude, longitude, radius, status } = req.query;

    let query = {};

    if (status) {
      query.status = status;
    } else {
      query.status = 'approved';
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

    const bloodBanks = await BloodBank.find(query);

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

    res.json(bloodBank);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const updateBloodBank = async (req, res) => {
  try {
    const bloodBank = await BloodBank.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!bloodBank) {
      return res.status(404).json({ message: 'Blood bank not found' });
    }

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

    bloodBank.status = status;
    if (status === 'approved') {
      bloodBank.isVerified = true;
    }

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

    await bloodBank.deleteOne();
    res.json({ message: 'Blood bank deleted' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
