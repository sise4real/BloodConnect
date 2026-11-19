import Notification from '../models/Notification.js';
import User from '../models/User.js';
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
    if (!eligibility.isEligible || !eligibility.nextEligibleDate) continue;

    await Notification.create({
      user: donor._id,
      type: 'eligibility_reminder',
      title: 'You are eligible to donate again',
      message: 'Your three-month recovery period has passed. You can now accept eligible blood requests.'
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
};
