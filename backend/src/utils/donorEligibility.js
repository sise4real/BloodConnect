export const getDonorEligibility = (donor, now = new Date()) => {
  const reasons = [];
  let nextEligibleDate = null;
  const age = donor.medicalInfo?.age;
  const weight = donor.medicalInfo?.weight;
  const missing = [];

  if (!Number.isFinite(age)) missing.push('age');
  if (!Number.isFinite(weight)) missing.push('weight');
  if (missing.length) reasons.push(`Add your ${missing.join(' and ')} information to complete the preliminary eligibility assessment`);

  if (donor.lastDonation) {
    nextEligibleDate = new Date(donor.lastDonation);
    nextEligibleDate.setMonth(nextEligibleDate.getMonth() + 3);
    if (nextEligibleDate > now) {
      reasons.push(`You must wait 3 months after your last donation. You’ll be eligible again on ${nextEligibleDate.toLocaleDateString()}`);
    }
  }

  if (Number.isFinite(age) && age < 18) reasons.push('You must be at least 18 years old to donate');
  if (Number.isFinite(age) && age > 65) reasons.push('Donors must be under 65 years old');

  if (Number.isFinite(weight) && weight < 50) reasons.push('You must weigh at least 50kg to donate');

  const passesPreliminaryChecks = reasons.length === 0;
  return {
    isEligible: false,
    passesPreliminaryChecks,
    assessmentStatus: missing.length ? 'pending_assessment' : passesPreliminaryChecks ? 'awaiting_medical_screening' : 'not_eligible',
    requiresMedicalScreening: true,
    reasons,
    nextEligibleDate
  };
};
