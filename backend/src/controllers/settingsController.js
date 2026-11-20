import PlatformSettings from '../models/PlatformSettings.js';

const defaults = {
  key: 'global',
  maxRequestRenewals: 3,
  stockDashboardRefreshSeconds: 30,
  stockFreshHours: 6,
  stockAgingHours: 12,
  stockUnverifiedHours: 24
};

export const getSettings = async (req, res) => {
  try {
    const settings = await PlatformSettings.findOneAndUpdate({ key: 'global' }, { $setOnInsert: defaults }, { upsert: true, new: true });
    res.json(settings);
  } catch (error) { res.status(400).json({ message: error.message }); }
};

export const getPublicSettings = async (req, res) => {
  try {
    const settings = await readSettings();
    res.json({
      stockDashboardRefreshSeconds: settings.stockDashboardRefreshSeconds,
      stockFreshHours: settings.stockFreshHours,
      stockAgingHours: settings.stockAgingHours,
      stockUnverifiedHours: settings.stockUnverifiedHours
    });
  } catch (error) { res.status(400).json({ message: error.message }); }
};

export const updateSettings = async (req, res) => {
  try {
    const current = await PlatformSettings.findOneAndUpdate({ key: 'global' }, { $setOnInsert: defaults }, { upsert: true, new: true });
    const values = ['maxRequestRenewals', 'stockDashboardRefreshSeconds', 'stockFreshHours', 'stockAgingHours', 'stockUnverifiedHours'];
    for (const field of values) {
      if (req.body[field] !== undefined) {
        const value = Number(req.body[field]);
        const path = current.schema.path(field);
        if (!Number.isInteger(value) || value < path.options.min || value > path.options.max) {
          return res.status(400).json({ message: `${field} must be between ${path.options.min} and ${path.options.max}` });
        }
        current[field] = value;
      }
    }
    if (current.stockAgingHours <= current.stockFreshHours || current.stockUnverifiedHours <= current.stockAgingHours) {
      return res.status(400).json({ message: 'Stock freshness intervals must increase: fresh, aging, then unverified.' });
    }
    await current.save();
    res.json(current);
  } catch (error) { res.status(400).json({ message: error.message }); }
};

export const readSettings = async () => {
  const settings = await PlatformSettings.findOne({ key: 'global' }).lean();
  return { ...defaults, ...(settings || {}) };
};
