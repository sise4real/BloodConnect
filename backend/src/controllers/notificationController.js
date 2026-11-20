import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { getDonorEligibility } from '../utils/donorEligibility.js';

export const createNotification = async (userId, type, title, message, data = {}) => {
  try {
    const notification = await Notification.create({
      user: userId,
      type,
      title,
      message,
      data
    });
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
  }
};

export const notifyNearbyDonors = async (bloodRequest, { renewed = false } = {}) => {
  try {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const donors = await User.find({
      role: 'donor',
      bloodType: bloodRequest.bloodType,
      isActive: true,
      availability: true,
      $and: [
        { $or: [{ lastDonation: null }, { lastDonation: { $lte: threeMonthsAgo } }] },
        { 'medicalInfo.age': { $gte: 18, $lte: 65 } },
        { 'medicalInfo.weight': { $gte: 50 } }
      ],
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: bloodRequest.location.coordinates
          },
          $maxDistance: 50000
        }
      }
    });

    const notifications = donors.map(donor => ({
      user: donor._id,
      type: 'blood_request',
      title: renewed
        ? bloodRequest.status === 'approved' ? 'Blood request renewed nearby' : 'Blood request renewal awaiting approval'
        : bloodRequest.status === 'approved' ? 'Blood request nearby' : 'Blood request awaiting approval',
      message: renewed && bloodRequest.status !== 'approved'
        ? `A nearby request for ${bloodRequest.bloodType} blood was renewed and is awaiting admin approval. You can respond after approval.`
        : `${bloodRequest.patientName} needs ${bloodRequest.bloodType} blood at ${bloodRequest.hospital?.name || 'a nearby hospital'}.${bloodRequest.status === 'approved' ? '' : ' The request is awaiting admin approval.'}`,
      data: { bloodRequestId: bloodRequest._id }
    }));

    await Notification.insertMany(notifications);
  } catch (error) {
    console.error('Error notifying donors:', error);
  }
};

export const notifyNearbyDonorsOfCamp = async (camp) => {
  try {
    const donors = await User.find({
      role: 'donor',
      isActive: true,
      availability: true,
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: camp.location.coordinates
          },
          $maxDistance: 50000
        }
      }
    });

    const notifications = donors
      .filter(donor => getDonorEligibility(donor).passesPreliminaryChecks)
      .map(donor => ({
        user: donor._id,
        type: 'donation_camp',
        title: 'Donation camp near you',
        message: `${camp.name} is scheduled for ${new Date(camp.date).toLocaleDateString()}${camp.location.venue ? ` at ${camp.location.venue}` : ''}.`,
        data: { campId: camp._id }
      }));

    if (notifications.length > 0) await Notification.insertMany(notifications);
  } catch (error) {
    console.error('Error notifying donors about camp:', error);
  }
};

export const getUserNotifications = async (req, res) => {
  try {
    const { unreadOnly } = req.query;

    let query = { user: req.user._id };
    if (unreadOnly === 'true') {
      query.isRead = false;
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(notifications);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    notification.isRead = true;
    notification.readAt = Date.now();
    await notification.save();

    res.json(notification);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.user._id, isRead: false },
      { isRead: true, readAt: Date.now() }
    );

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({ message: 'Notification deleted' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      user: req.user._id,
      isRead: false
    });

    res.json({ count });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
