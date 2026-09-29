import Notification from '../models/Notification.js';
import User from '../models/User.js';

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

export const notifyNearbyDonors = async (bloodRequest) => {
  try {
    const donors = await User.find({
      role: 'donor',
      bloodType: bloodRequest.bloodType,
      isActive: true,
      availability: true,
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
      title: 'Urgent Blood Request Nearby',
      message: `${bloodRequest.patientName} needs ${bloodRequest.bloodType} blood urgently at ${bloodRequest.hospital.name}`,
      data: { bloodRequestId: bloodRequest._id }
    }));

    await Notification.insertMany(notifications);
  } catch (error) {
    console.error('Error notifying donors:', error);
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
