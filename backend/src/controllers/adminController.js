import User from '../models/User.js';
import BloodRequest from '../models/BloodRequest.js';
import DonationCamp from '../models/DonationCamp.js';
import BloodBank from '../models/BloodBank.js';

export const getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalDonors = await User.countDocuments({ role: 'donor' });
    const activeDonors = await User.countDocuments({
      role: 'donor',
      availability: true,
      isActive: true
    });

    const pendingRequests = await BloodRequest.countDocuments({ status: 'pending' });
    const approvedRequests = await BloodRequest.countDocuments({ status: 'approved' });
    const totalRequests = await BloodRequest.countDocuments();

    const pendingCamps = await DonationCamp.countDocuments({ status: 'pending' });
    const activeCamps = await DonationCamp.countDocuments({
      status: { $in: ['approved', 'active'] }
    });

    const pendingBloodBanks = await BloodBank.countDocuments({ status: 'pending' });
    const approvedBloodBanks = await BloodBank.countDocuments({ status: 'approved' });

    const recentRequests = await BloodRequest.find()
      .populate('requester', 'fullName email')
      .sort({ createdAt: -1 })
      .limit(10);

    const recentUsers = await User.find()
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      users: {
        total: totalUsers,
        donors: totalDonors,
        activeDonors
      },
      requests: {
        total: totalRequests,
        pending: pendingRequests,
        approved: approvedRequests
      },
      camps: {
        pending: pendingCamps,
        active: activeCamps
      },
      bloodBanks: {
        pending: pendingBloodBanks,
        approved: approvedBloodBanks
      },
      recent: {
        requests: recentRequests,
        users: recentUsers
      }
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const { role, isActive, page = 1, limit = 20 } = req.query;

    let query = {};
    if (role) query.role = role;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await User.countDocuments(query);

    res.json({
      users,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      total: count
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const updateUserStatus = async (req, res) => {
  try {
    const { isActive, isVerified, role } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (isActive !== undefined) user.isActive = isActive;
    if (isVerified !== undefined) user.isVerified = isVerified;
    if (role) user.role = role;

    await user.save();

    res.json({
      _id: user._id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      isActive: user.isActive,
      isVerified: user.isVerified
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.role === 'admin') {
      return res.status(403).json({ message: 'Cannot delete admin users' });
    }

    await user.deleteOne();
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getPendingItems = async (req, res) => {
  try {
    const pendingRequests = await BloodRequest.find({ status: 'pending' })
      .populate('requester', 'fullName email phone')
      .sort({ createdAt: -1 });

    const pendingCamps = await DonationCamp.find({ status: 'pending' })
      .populate('organizer', 'fullName email phone')
      .sort({ createdAt: -1 });

    const pendingBloodBanks = await BloodBank.find({ status: 'pending' })
      .sort({ createdAt: -1 });

    res.json({
      requests: pendingRequests,
      camps: pendingCamps,
      bloodBanks: pendingBloodBanks
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
