import BloodRequest from '../models/BloodRequest.js';
import User from '../models/User.js';

export const getPublicStats = async (req, res) => {
  try {
    const [registeredUsers, activeDonors, completedDonations, verifiedLivesSaved] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'donor', isActive: true, availability: true }),
      BloodRequest.aggregate([
        { $unwind: '$responses' },
        {
          $match: {
            'responses.status': 'completed',
            'responses.verifiedAt': { $type: 'date' },
            'responses.verifiedBy': { $type: 'objectId' }
          }
        },
        { $count: 'count' }
      ]),
      BloodRequest.aggregate([
        {
          $match: {
            status: 'fulfilled',
            livesSavedVerifiedAt: { $type: 'date' },
            livesSavedVerifiedBy: { $type: 'objectId' },
            livesSavedEvidence: { $type: 'string', $ne: '' },
            livesSavedCount: { $gt: 0 }
          }
        },
        { $group: { _id: null, count: { $sum: '$livesSavedCount' } } }
      ])
    ]);

    res.json({
      registeredUsers,
      activeDonors,
      successfulDonations: completedDonations[0]?.count ?? 0,
      livesSaved: verifiedLivesSaved[0]?.count ?? 0
    });
  } catch (error) {
    res.status(500).json({ message: 'Unable to load application statistics' });
  }
};
