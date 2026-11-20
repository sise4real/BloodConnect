import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d'
  });
};

const validateMedicalInfo = medicalInfo => {
  if (!medicalInfo || typeof medicalInfo !== 'object') return null;
  if (medicalInfo.age !== undefined && (!Number.isInteger(Number(medicalInfo.age)) || Number(medicalInfo.age) < 1 || Number(medicalInfo.age) > 120)) {
    return 'Age must be a whole number between 1 and 120';
  }
  if (medicalInfo.weight !== undefined && (!Number.isFinite(Number(medicalInfo.weight)) || Number(medicalInfo.weight) <= 0 || Number(medicalInfo.weight) > 500)) {
    return 'Weight must be greater than 0 and no more than 500 kg';
  }
  return null;
};

export const register = async (req, res) => {
  try {
    const { email, password, fullName, role, bloodType, phone, location, medicalInfo, institutionName, institutionRegistrationNumber } = req.body;
    const medicalInfoError = validateMedicalInfo(medicalInfo);
    if (medicalInfoError) return res.status(400).json({ message: medicalInfoError });
    if (['hospital', 'blood_bank'].includes(role) && (!String(institutionName || '').trim() || !String(institutionRegistrationNumber || '').trim())) {
      return res.status(400).json({ message: 'Institution name and registration number are required' });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = await User.create({
      email,
      password,
      fullName,
      // Keep public roles available while preventing self assignment of admin.
      role: ['donor', 'recipient', 'hospital', 'blood_bank'].includes(role) ? role : 'donor',
      bloodType,
      phone,
      location,
      medicalInfo,
      institutionName: ['hospital', 'blood_bank'].includes(role) ? institutionName : undefined,
      institutionRegistrationNumber: ['hospital', 'blood_bank'].includes(role) ? institutionRegistrationNumber : undefined,
      isVerified: false,
      institutionVerificationStatus: ['hospital', 'blood_bank'].includes(role) ? 'pending' : 'approved'
    });

    const token = generateToken(user._id);

    res.status(201).json({
      _id: user._id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      bloodType: user.bloodType,
      location: user.location,
      isVerified: user.isVerified,
      institutionVerificationStatus: user.institutionVerificationStatus,
      institutionName: user.institutionName,
      institutionRegistrationNumber: user.institutionRegistrationNumber,
      medicalInfo: user.medicalInfo,
      token
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (user && (await user.comparePassword(password))) {
      if (!user.isActive) {
        return res.status(403).json({ message: 'Account is deactivated' });
      }

      const token = generateToken(user._id);

      res.json({
        _id: user._id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        bloodType: user.bloodType,
        location: user.location,
        isVerified: user.isVerified,
        institutionVerificationStatus: user.institutionVerificationStatus,
        institutionName: user.institutionName,
        institutionRegistrationNumber: user.institutionRegistrationNumber,
        medicalInfo: user.medicalInfo,
        token
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json(user);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      if (req.body.medicalInfo !== undefined) {
        const medicalInfoError = validateMedicalInfo(req.body.medicalInfo);
        if (medicalInfoError) return res.status(400).json({ message: medicalInfoError });
      }
      user.fullName = req.body.fullName || user.fullName;
      user.phone = req.body.phone || user.phone;
      user.bloodType = req.body.bloodType || user.bloodType;
      user.location = req.body.location || user.location;
      user.availability = req.body.availability !== undefined ? req.body.availability : user.availability;
      user.medicalInfo = req.body.medicalInfo || user.medicalInfo;

      if (req.body.password) {
        user.password = req.body.password;
      }

      const updatedUser = await user.save();

      res.json({
        _id: updatedUser._id,
        email: updatedUser.email,
        fullName: updatedUser.fullName,
        role: updatedUser.role,
        bloodType: updatedUser.bloodType,
        location: updatedUser.location,
        availability: updatedUser.availability,
        medicalInfo: updatedUser.medicalInfo,
        institutionVerificationStatus: updatedUser.institutionVerificationStatus,
        institutionName: updatedUser.institutionName,
        institutionRegistrationNumber: updatedUser.institutionRegistrationNumber
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
