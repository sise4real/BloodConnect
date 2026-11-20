import BloodBank from '../models/BloodBank.js';
import BloodBankStockAudit from '../models/BloodBankStockAudit.js';
import { readSettings } from './settingsController.js';

const bloodTypes = new Set(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']);
const validateInventory = inventory => {
  if (!Array.isArray(inventory)) return 'Inventory must be an array';
  const seen = new Set();
  for (const item of inventory) {
    if (!bloodTypes.has(item?.bloodType) || !Number.isInteger(Number(item.units)) || Number(item.units) < 0) {
      return 'Each stock entry needs a valid blood group and a non-negative whole number of units';
    }
    if (seen.has(item.bloodType)) return 'Each blood group may appear only once in inventory';
    seen.add(item.bloodType);
  }
  return null;
};

const addStockFreshness = (bank, settings, now = Date.now()) => {
  bank.inventory = (bank.inventory || []).map(item => {
    const verifiedAt = item.lastVerifiedAt || item.lastUpdated;
    const ageHours = verifiedAt ? (now - new Date(verifiedAt).getTime()) / 3600000 : Infinity;
    let freshness = 'unverified';
    if (ageHours <= settings.stockFreshHours) freshness = 'fresh';
    else if (ageHours <= settings.stockAgingHours) freshness = 'aging';
    else if (ageHours <= settings.stockUnverifiedHours) freshness = 'stale';
    return { ...(item.toObject ? item.toObject() : item), lastVerifiedAt: verifiedAt, freshness, confirmed: ageHours <= settings.stockUnverifiedHours };
  });
  return bank;
};

const prepareInventoryAudits = async (bankId, actorId, previous, next) => {
  const previousByType = new Map((previous || []).map(item => [item.bloodType, item.units]));
  const nextByType = new Map((next || []).map(item => [item.bloodType, item.units]));
  const types = new Set([...previousByType.keys(), ...nextByType.keys()]);
  const changes = [...types].flatMap(bloodType => {
    const before = previousByType.get(bloodType);
    const after = nextByType.get(bloodType);
    if (before === after) return [];
    return [{ bloodBank: bankId, changedBy: actorId, bloodType, previousUnits: before, newUnits: after, changedAt: new Date(), status: 'pending' }];
  });
  return changes.length ? BloodBankStockAudit.insertMany(changes) : [];
};

export const createBloodBank = async (req, res) => {
  try {
    const inventoryError = validateInventory(req.body.inventory || []);
    if (inventoryError) return res.status(400).json({ message: inventoryError });
    if (req.body.inventory?.length && req.body.stockConfirmed !== true) return res.status(400).json({ message: 'Confirm that the submitted units reflect the current physical stock' });
    const verifiedAt = new Date();
    const initialInventory = (req.body.inventory || []).map(item => ({ ...item, lastUpdated: verifiedAt, lastVerifiedAt: verifiedAt, verificationReminderSentAt: null }));
    const bloodBank = new BloodBank({
      ...req.body,
      inventory: initialInventory,
      createdBy: req.user._id,
      status: 'pending',
      isVerified: false
    });
    const stockAudits = await prepareInventoryAudits(bloodBank._id, req.user._id, [], initialInventory);
    try {
      await bloodBank.save();
      if (stockAudits.length) await BloodBankStockAudit.updateMany({ _id: { $in: stockAudits.map(audit => audit._id) } }, { $set: { status: 'applied' } });
    } catch (error) {
      if (stockAudits.length) await BloodBankStockAudit.updateMany({ _id: { $in: stockAudits.map(audit => audit._id) } }, { $set: { status: 'failed' } });
      throw error;
    }
    res.status(201).json(bloodBank);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getBloodBanks = async (req, res) => {
  try {
    const { latitude, longitude, radius, status, bloodType } = req.query;
    if (bloodType && !bloodTypes.has(String(bloodType))) return res.status(400).json({ message: 'Invalid blood group' });

    if (status && status !== 'approved') {
      return res.status(403).json({ message: 'Only approved blood banks are publicly listed' });
    }

    const query = { status: 'approved' };

    if (latitude !== undefined && longitude !== undefined) {
      const lat = Number(latitude);
      const lon = Number(longitude);
      const distance = radius === undefined ? 100 : Number(radius);
      if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lon) || lon < -180 || lon > 180 || !Number.isFinite(distance) || distance <= 0) {
        return res.status(400).json({ message: 'Invalid location or search radius' });
      }
      query.location = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [lon, lat]
          },
          $maxDistance: distance * 1000
        }
      };
    }

    const [banks, settings] = await Promise.all([BloodBank.find(query), readSettings()]);
    const bloodBanks = banks.map(bank => addStockFreshness(bank, settings));
    if (bloodType) {
      for (const bank of bloodBanks) bank.inventory = bank.inventory.filter(item => item.bloodType === bloodType && item.confirmed);
    }
    if (req.query.confirmedStock === 'true') {
      for (const bank of bloodBanks) bank.inventory = bank.inventory.filter(item => item.confirmed);
    }
    if (bloodType || req.query.confirmedStock === 'true') {
      res.json(bloodBanks.filter(bank => bank.inventory.length > 0));
      return;
    }

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

    if (req.body.inventory !== undefined) {
      const inventoryError = validateInventory(req.body.inventory);
      if (inventoryError) return res.status(400).json({ message: inventoryError });
      if (req.body.inventory.length && req.body.stockConfirmed !== true) return res.status(400).json({ message: 'Confirm that the submitted units reflect the current physical stock' });
    }

    const previousInventory = bloodBank.inventory.map(item => ({ bloodType: item.bloodType, units: item.units }));
    for (const field of ['name', 'location', 'contact', 'hours']) {
      if (req.body[field] !== undefined) bloodBank[field] = req.body[field];
    }
    if (req.body.inventory !== undefined) {
      const updatedAt = new Date();
      bloodBank.inventory = (req.body.inventory || []).map(item => ({ ...item, lastUpdated: updatedAt, lastVerifiedAt: updatedAt, verificationReminderSentAt: null }));
    }
    const stockAudits = req.body.inventory !== undefined
      ? await prepareInventoryAudits(bloodBank._id, req.user._id, previousInventory, bloodBank.inventory)
      : [];
    try {
      await bloodBank.save();
      if (stockAudits.length) await BloodBankStockAudit.updateMany({ _id: { $in: stockAudits.map(audit => audit._id) } }, { $set: { status: 'applied' } });
    } catch (error) {
      if (stockAudits.length) await BloodBankStockAudit.updateMany({ _id: { $in: stockAudits.map(audit => audit._id) } }, { $set: { status: 'failed' } });
      throw error;
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
