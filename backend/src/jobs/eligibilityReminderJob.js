import Notification from '../models/Notification.js';
import User from '../models/User.js';
import BloodRequest from '../models/BloodRequest.js';
import BloodBank from '../models/BloodBank.js';
import { readSettings } from '../controllers/settingsController.js';
import { getDonorEligibility } from '../utils/donorEligibility.js';

const runEligibilityReminderCheck = async () => {
  const donors = await User.find({
    role: 'donor',
    isActive: true,
    lastDonation: { $ne: null },
    eligibilityReminderSentAt: null
  });

  for (const donor of donors) {
    const eligibility = getDonorEligibility(donor);
    if (!eligibility.passesPreliminaryChecks || !eligibility.nextEligibleDate) continue;

    await Notification.create({
      user: donor._id,
      type: 'eligibility_reminder',
      title: 'You are eligible to donate again',
      message: 'Your three-month recovery period has passed. Update any missing eligibility details and complete medical screening with a qualified provider before donating.'
    });
    donor.eligibilityReminderSentAt = new Date();
    await donor.save();
  }
};

export const startEligibilityReminderJob = () => {
  let running = false;
  const check = async () => {
    if (running) return;
    running = true;
    try {
      await runEligibilityReminderCheck();
    } catch (error) {
      console.error('Failed to check donor eligibility reminders:', error);
    } finally {
      running = false;
    }
  };

  void check();
  const timer = setInterval(() => void check(), 60 * 60 * 1000);
  timer.unref?.();

  const expireRequests = async () => {
    const now = new Date();
    const overdue = await BloodRequest.find({
      status: { $in: ['pending', 'approved'] },
      $or: [
        { expiresAt: { $lte: now } },
        { expiresAt: { $exists: false }, createdAt: { $lte: new Date(now.getTime() - 24 * 60 * 60 * 1000) } }
      ]
    }).select('_id status createdAt expiresAt');
    if (!overdue.length) return;
    await BloodRequest.bulkWrite(overdue.map(request => ({
      updateOne: {
        filter: {
          _id: request._id,
          status: request.status,
          ...(request.expiresAt ? { expiresAt: request.expiresAt } : { expiresAt: { $exists: false } })
        },
        update: { $set: {
          expiredFromStatus: request.status,
          status: 'expired',
          expiresAt: request.expiresAt || new Date(request.createdAt.getTime() + 24 * 60 * 60 * 1000)
        } }
      }
    })));
  };
  const expireTimer = setInterval(() => {
    void expireRequests().catch(error => console.error('Failed to expire blood requests:', error));
  }, 60 * 1000);
  expireTimer.unref?.();
  void expireRequests().catch(error => console.error('Failed to expire blood requests:', error));

  const remindStockVerification = async () => {
    const settings = await readSettings();
    const cutoff = new Date(Date.now() - settings.stockFreshHours * 60 * 60 * 1000);
    const banks = await BloodBank.find({
      createdBy: { $ne: null },
      inventory: { $elemMatch: {
        verificationReminderSentAt: null,
        $or: [
          { lastVerifiedAt: { $lte: cutoff } },
          { lastVerifiedAt: { $exists: false }, lastUpdated: { $lte: cutoff } }
        ]
      } }
    });
    for (const bank of banks) {
      for (const item of bank.inventory) {
        const verifiedAt = item.lastVerifiedAt || item.lastUpdated;
        if (!verifiedAt || verifiedAt > cutoff || item.verificationReminderSentAt) continue;
        const timestampCondition = item.lastVerifiedAt
          ? { lastVerifiedAt: item.lastVerifiedAt }
          : { lastVerifiedAt: { $exists: false }, ...(item.lastUpdated ? { lastUpdated: item.lastUpdated } : { lastUpdated: { $exists: false } }) };
        const updated = await BloodBank.updateOne({
          _id: bank._id,
          inventory: { $elemMatch: { bloodType: item.bloodType, ...timestampCondition, verificationReminderSentAt: null } }
        }, { $set: { 'inventory.$.verificationReminderSentAt': new Date() } });
        if (!updated.modifiedCount || !bank.createdBy) continue;
        await Notification.create({
          user: bank.createdBy,
          type: 'stock_verification',
          title: 'Please verify current blood stock',
          message: `${bank.name}: confirm or update the ${item.bloodType} stock count. Public availability becomes unconfirmed if it is not verified within 24 hours.`,
          data: { bloodBankId: bank._id, bloodType: item.bloodType }
        });
      }
    }
  };
  const stockTimer = setInterval(() => {
    void remindStockVerification().catch(error => console.error('Failed to check stock verification reminders:', error));
  }, 15 * 60 * 1000);
  stockTimer.unref?.();
  void remindStockVerification().catch(error => console.error('Failed to check stock verification reminders:', error));
};
