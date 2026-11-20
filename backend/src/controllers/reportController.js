import mongoose from 'mongoose';
import PDFDocument from 'pdfkit';
import * as XLSX from 'xlsx';
import User from '../models/User.js';
import BloodRequest from '../models/BloodRequest.js';
import BloodBank from '../models/BloodBank.js';
import BloodBankStockAudit from '../models/BloodBankStockAudit.js';
import DonationCamp from '../models/DonationCamp.js';
import { getDonorEligibility } from '../utils/donorEligibility.js';
import { readSettings } from './settingsController.js';

const csvCell = value => {
  const raw = value == null ? '' : value instanceof Date ? value.toISOString() : String(value);
  const safe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replace(/"/g, '""')}"`;
};

const toCsv = rows => {
  const columns = [...new Set(rows.flatMap(row => Object.keys(row)))];
  return [columns.map(csvCell).join(','), ...rows.map(row => columns.map(column => csvCell(row[column])).join(','))].join('\r\n');
};

const toPdf = (title, rows) => new Promise((resolve, reject) => {
  const pdf = new PDFDocument({ margin: 36, size: 'A4', layout: 'landscape' });
  const chunks = [];
  pdf.on('data', chunk => chunks.push(chunk));
  pdf.on('end', () => resolve(Buffer.concat(chunks)));
  pdf.on('error', reject);
  pdf.fontSize(18).text(title, { continued: false });
  pdf.moveDown();
  if (!rows.length) pdf.fontSize(10).text('No records match these filters.');
  for (const row of rows) {
    pdf.fontSize(9).text(Object.entries(row).map(([key, value]) => `${key}: ${value ?? ''}`).join(' | '), { paragraphGap: 3 });
    pdf.moveDown(0.3);
    if (pdf.y > 500) pdf.addPage();
  }
  pdf.end();
});

const dateRange = req => {
  const createdAt = {};
  if (req.query.from) {
    const from = new Date(String(req.query.from));
    if (Number.isNaN(from.getTime())) throw new Error('Invalid from date');
    createdAt.$gte = from;
  }
  if (req.query.to) {
    const to = new Date(String(req.query.to));
    if (Number.isNaN(to.getTime())) throw new Error('Invalid to date');
    to.setHours(23, 59, 59, 999);
    createdAt.$lte = to;
  }
  return createdAt;
};

const idFilter = value => value ? new mongoose.Types.ObjectId(String(value)) : undefined;
const regexFilter = value => new RegExp(String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

const requestFilters = (req, base = {}, { includeStatus = true, includeDates = true } = {}) => {
  const query = { ...base };
  const createdAt = includeDates ? dateRange(req) : {};
  if (Object.keys(createdAt).length) query.createdAt = createdAt;
  if (req.query.bloodType) query.bloodType = String(req.query.bloodType);
  if (includeStatus && req.query.status) query.status = String(req.query.status);
  if (req.query.city) query['hospital.address'] = new RegExp(String(req.query.city).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  return query;
};

const flattenRequest = request => ({
  requestId: request._id,
  createdAt: request.createdAt,
  patientName: request.patientName,
  bloodType: request.bloodType,
  unitsNeeded: request.unitsNeeded,
  status: request.status,
  urgency: request.urgency,
  hospital: request.hospital?.name,
  address: request.hospital?.address,
  requiredBy: request.requiredBy,
  expiresAt: request.expiresAt,
  renewalCount: request.renewalCount || 0
});

export const downloadReport = async (req, res) => {
  try {
    const report = String(req.params.report);
    const format = String(req.query.format || 'csv').toLowerCase();
    if (!['csv', 'xlsx', 'pdf'].includes(format)) return res.status(400).json({ message: 'Format must be csv, xlsx, or pdf' });
    const user = req.user;
    const admin = user.role === 'admin';
    const verifiedHospital = ['hospital', 'blood_bank'].includes(user.role) && (user.institutionVerificationStatus === 'approved' || (!user.institutionVerificationStatus && user.isVerified));
    const rows = [];

    if (report === 'requests') {
      if (!admin && !['hospital', 'recipient'].includes(user.role)) return res.status(403).json({ message: 'Request reports are not available for this role' });
      const base = admin ? {} : { requester: user._id };
      if (admin && req.query.institution) base.requester = idFilter(req.query.institution);
      const documents = await BloodRequest.find(requestFilters(req, base)).sort({ createdAt: -1 }).limit(5000).lean();
      rows.push(...documents.map(flattenRequest));
    } else if (report === 'donations') {
      if (!admin && !verifiedHospital && !['donor', 'recipient'].includes(user.role)) return res.status(403).json({ message: 'Donation reports are not available for this role' });
      const base = admin ? {} : user.role === 'donor' ? { 'responses.donor': user._id } : { requester: user._id };
      if (admin && req.query.institution) base.requester = idFilter(req.query.institution);
      const documents = await BloodRequest.find(requestFilters(req, base, { includeStatus: false, includeDates: false })).select('patientName bloodType hospital requester createdAt responses').populate('responses.donor', 'fullName').sort({ createdAt: -1 }).limit(5000).lean();
      const donationDates = dateRange(req);
      for (const request of documents) for (const response of request.responses || []) {
        if (user.role === 'donor' && String(response.donor?._id || response.donor) !== String(user._id)) continue;
        if (!admin && verifiedHospital && String(request.requester) !== String(user._id)) continue;
        if (response.status !== 'completed' || !response.verifiedAt || !response.verifiedBy) continue;
        if (req.query.status && response.status !== req.query.status) continue;
        if (donationDates.$gte && (!response.verifiedAt || response.verifiedAt < donationDates.$gte)) continue;
        if (donationDates.$lte && (!response.verifiedAt || response.verifiedAt > donationDates.$lte)) continue;
        rows.push({ requestId: request._id, patient: request.patientName, hospital: request.hospital?.name, bloodType: request.bloodType, donor: response.donor?.fullName || (user.role === 'donor' ? user.fullName : 'Donor'), status: response.status, donatedAt: response.verifiedAt, recordedBy: response.verifiedBy });
      }
    } else if (report === 'blood-stock') {
      if (!admin && !verifiedHospital) return res.status(403).json({ message: 'Only administrators and verified hospitals can export blood stock reports' });
      const bankQuery = admin ? {} : { createdBy: user._id };
      if (req.query.institution && admin) bankQuery.createdBy = idFilter(req.query.institution);
      if (req.query.city) bankQuery['location.city'] = regexFilter(req.query.city);
      const banks = await BloodBank.find(bankQuery).sort({ name: 1 }).limit(5000).lean();
      const stockSettings = await readSettings();
      const now = Date.now();
      const range = dateRange(req);
      for (const bank of banks) for (const item of bank.inventory || []) {
        const verified = item.lastVerifiedAt || item.lastUpdated;
        const ageHours = verified ? (now - new Date(verified).getTime()) / 3600000 : Infinity;
        const freshness = ageHours <= stockSettings.stockFreshHours ? 'fresh'
          : ageHours <= stockSettings.stockAgingHours ? 'aging'
            : ageHours <= stockSettings.stockUnverifiedHours ? 'stale' : 'unverified';
        if (req.query.bloodType && item.bloodType !== req.query.bloodType) continue;
        if (req.query.status && bank.status !== req.query.status) continue;
        if (range.$gte && (!verified || new Date(verified) < range.$gte)) continue;
        if (range.$lte && (!verified || new Date(verified) > range.$lte)) continue;
        rows.push({ bloodBank: bank.name, city: bank.location?.city, bloodType: item.bloodType, units: item.units, lastUpdated: item.lastUpdated, lastVerifiedAt: verified, freshness, confirmed: ageHours <= stockSettings.stockUnverifiedHours, status: bank.status });
      }
    } else if (report === 'blood-banks') {
      if (!admin && !verifiedHospital) return res.status(403).json({ message: 'Only administrators and verified hospitals can export institution reports' });
      const query = admin ? {} : { createdBy: user._id };
      if (admin && req.query.institution) query.createdBy = idFilter(req.query.institution);
      if (req.query.city) query['location.city'] = regexFilter(req.query.city);
      if (req.query.status) query.status = String(req.query.status);
      if (Object.keys(dateRange(req)).length) query.updatedAt = dateRange(req);
      const banks = await BloodBank.find(query).sort({ name: 1 }).limit(5000).lean();
      rows.push(...banks.map(bank => ({ id: bank._id, name: bank.name, city: bank.location?.city, address: bank.location?.address, status: bank.status, isVerified: bank.isVerified, updatedAt: bank.updatedAt })));
    } else if (report === 'institution-summary') {
      if (!admin && !verifiedHospital) return res.status(403).json({ message: 'Only administrators and verified institutions can export institution summaries' });
      const institutionQuery = admin ? { role: { $in: ['hospital', 'blood_bank'] } } : { _id: user._id };
      if (admin && req.query.institution) institutionQuery._id = idFilter(req.query.institution);
      const institutions = await User.find(institutionQuery).select('fullName institutionName role').limit(5000).lean();
      for (const institution of institutions) {
        const [banks, camps] = await Promise.all([
          BloodBank.find({ createdBy: institution._id }).select('status inventory').lean(),
          DonationCamp.find({ organizer: institution._id }).select('status date').lean()
        ]);
        rows.push({
          institution: institution.institutionName || institution.fullName,
          role: institution.role,
          bloodBanks: banks.length,
          approvedBloodBanks: banks.filter(bank => bank.status === 'approved').length,
          reportedStockUnits: banks.reduce((sum, bank) => sum + (bank.inventory || []).reduce((total, item) => total + (Number(item.units) || 0), 0), 0),
          camps: camps.length,
          upcomingCamps: camps.filter(camp => ['approved', 'active'].includes(camp.status) && camp.date >= new Date()).length
        });
      }
    } else if (report === 'camps') {
      if (!admin && !verifiedHospital) return res.status(403).json({ message: 'Only administrators and verified hospitals can export institution reports' });
      const query = admin ? {} : { organizer: user._id };
      if (admin && req.query.institution) query.organizer = idFilter(req.query.institution);
      if (req.query.city) query['location.address'] = regexFilter(req.query.city);
      if (req.query.status) query.status = String(req.query.status);
      if (Object.keys(dateRange(req)).length) query.date = dateRange(req);
      const camps = await DonationCamp.find(query).sort({ date: 1 }).limit(5000).lean();
      rows.push(...camps.map(camp => ({ id: camp._id, name: camp.name, date: camp.date, city: camp.location?.address, status: camp.status, capacity: camp.capacity, registeredDonors: camp.registeredDonors?.length || 0 })));
    } else if (report === 'users') {
      if (!admin) return res.status(403).json({ message: 'Only administrators can export user reports' });
      const query = {};
      if (req.query.role) query.role = String(req.query.role);
      if (Object.keys(dateRange(req)).length) query.createdAt = dateRange(req);
      const users = await User.find(query).select('fullName email role bloodType isActive isVerified institutionVerificationStatus createdAt').sort({ createdAt: -1 }).limit(5000).lean();
      rows.push(...users.map(({ _id, ...rest }) => ({ id: _id, ...rest })));
    } else if (report === 'eligibility') {
      if (!admin) return res.status(403).json({ message: 'Only administrators can export eligibility summaries' });
      const donorQuery = { role: 'donor' };
      if (req.query.bloodType) donorQuery.bloodType = String(req.query.bloodType);
      const donors = await User.find(donorQuery).select('fullName email bloodType availability isActive medicalInfo lastDonation').limit(5000).lean();
      rows.push(...donors.map(donor => {
        const eligibility = getDonorEligibility(donor);
        return { donor: donor.fullName, email: donor.email, bloodType: donor.bloodType, available: donor.availability, assessment: eligibility.assessmentStatus, nextEligibleDate: eligibility.nextEligibleDate, missingOrFailedChecks: eligibility.reasons.join('; ') };
      }));
    } else if (report === 'activity') {
      if (!admin && !verifiedHospital) return res.status(403).json({ message: 'Only administrators and verified hospitals can export audit reports' });
      const bankQuery = admin ? {} : { createdBy: user._id };
      if (admin && req.query.institution) bankQuery.createdBy = idFilter(req.query.institution);
      if (req.query.city) bankQuery['location.city'] = regexFilter(req.query.city);
      const bankIds = await BloodBank.find(bankQuery).distinct('_id');
      const query = { bloodBank: { $in: bankIds } };
      if (req.query.bloodType) query.bloodType = String(req.query.bloodType);
      if (Object.keys(dateRange(req)).length) query.changedAt = dateRange(req);
      const audits = await BloodBankStockAudit.find(query).populate('bloodBank', 'name').populate('changedBy', 'fullName email').sort({ changedAt: -1 }).limit(10000).lean();
      rows.push(...audits.map(audit => ({ action: 'stock_adjustment', bloodBank: audit.bloodBank?.name, bloodType: audit.bloodType, previousUnits: audit.previousUnits, newUnits: audit.newUnits, changedAt: audit.changedAt, changedBy: audit.changedBy?.fullName, actorEmail: audit.changedBy?.email })));

      const requestScope = admin ? {} : { requester: user._id };
      if (admin && req.query.institution) requestScope.requester = idFilter(req.query.institution);
      if (req.query.bloodType) requestScope.bloodType = String(req.query.bloodType);
      if (req.query.city) requestScope['hospital.address'] = regexFilter(req.query.city);
      const dateFilter = dateRange(req);
      const requests = await BloodRequest.find({ ...requestScope, renewalHistory: { $exists: true, $ne: [] } }).select('patientName bloodType renewalHistory').limit(5000).lean();
      for (const request of requests) for (const renewal of request.renewalHistory || []) {
        if (dateFilter.$gte && renewal.renewedAt < dateFilter.$gte) continue;
        if (dateFilter.$lte && renewal.renewedAt > dateFilter.$lte) continue;
        rows.push({ action: 'request_renewal', requestId: request._id, patientName: request.patientName, bloodType: request.bloodType, renewedAt: renewal.renewedAt, renewedBy: renewal.renewedBy, reason: renewal.reason, previousExpiresAt: renewal.previousExpiresAt, newExpiresAt: renewal.newExpiresAt });
      }

      const institutionQuery = admin
        ? { role: { $in: ['hospital', 'blood_bank'] } }
        : { _id: user._id, role: { $in: ['hospital', 'blood_bank'] } };
      const institutions = await User.find(institutionQuery).select('institutionName institutionVerificationHistory').limit(5000).lean();
      for (const institution of institutions) for (const entry of institution.institutionVerificationHistory || []) {
        if (dateFilter.$gte && entry.changedAt < dateFilter.$gte) continue;
        if (dateFilter.$lte && entry.changedAt > dateFilter.$lte) continue;
        rows.push({ action: 'institution_verification', institution: institution.institutionName, status: entry.status, changedAt: entry.changedAt, changedBy: entry.changedBy, note: entry.note });
      }

      const donationRequests = await BloodRequest.find({ ...requestScope, responses: { $elemMatch: { status: 'completed' } } }).select('patientName bloodType responses').limit(5000).lean();
      for (const request of donationRequests) for (const response of request.responses || []) {
        if (response.status !== 'completed' || (req.query.bloodType && request.bloodType !== req.query.bloodType)) continue;
        if (dateFilter.$gte && response.verifiedAt < dateFilter.$gte) continue;
        if (dateFilter.$lte && response.verifiedAt > dateFilter.$lte) continue;
        rows.push({ action: 'donation_completed', requestId: request._id, patientName: request.patientName, bloodType: request.bloodType, changedAt: response.verifiedAt, changedBy: response.verifiedBy });
      }
    } else if (report === 'monthly-trends') {
      if (!admin) return res.status(403).json({ message: 'Only administrators can export platform trends' });
      const range = dateRange(req);
      if (!range.$gte) {
        range.$gte = new Date();
        range.$gte.setMonth(range.$gte.getMonth() - 12);
      }
      const trends = await BloodRequest.aggregate([
        { $unwind: '$responses' },
        { $match: {
          'responses.status': 'completed',
          'responses.verifiedAt': { $type: 'date', ...range },
          'responses.verifiedBy': { $type: 'objectId' },
          ...(req.query.bloodType ? { bloodType: String(req.query.bloodType) } : {})
        } },
        { $group: { _id: { year: { $year: '$responses.verifiedAt' }, month: { $month: '$responses.verifiedAt' }, bloodType: '$bloodType' }, donations: { $sum: 1 } } },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ]);
      rows.push(...trends.map(item => ({ year: item._id.year, month: item._id.month, bloodType: item._id.bloodType, completedDonations: item.donations })));
    } else {
      return res.status(404).json({ message: 'Unknown report type' });
    }

    const filename = `bloodconnect-${report}-${new Date().toISOString().slice(0, 10)}`;
    if (format === 'csv') {
      res.type('text/csv; charset=utf-8').attachment(`${filename}.csv`).send(`\uFEFF${toCsv(rows)}`);
    } else if (format === 'xlsx') {
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), 'Report');
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      res.type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet').attachment(`${filename}.xlsx`).send(buffer);
    } else {
      const buffer = await toPdf(`BloodConnect ${report} report`, rows);
      res.type('application/pdf').attachment(`${filename}.pdf`).send(buffer);
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
