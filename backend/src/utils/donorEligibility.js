export const getDonorEligibility = (donor, now = new Date()) => {
  const reasons = [];
  let nextEligibleDate = null;

  if (donor.lastDonation) {
    nextEligibleDate = new Date(donor.lastDonation);
    nextEligibleDate.setMonth(nextEligibleDate.getMonth() + 3);
    if (nextEligibleDate > now) {
      reasons.push(`You must wait 3 months after your last donation. You’ll be eligible again on ${nextEligibleDate.toLocaleDateString()}`);
    }
  }

  const age = donor.medicalInfo?.age;
  if (Number.isFinite(age) && age < 18) reasons.push('You must be at least 18 years old to donate');
  if (Number.isFinite(age) && age > 65) reasons.push('Donors must be under 65 years old');

  const weight = donor.medicalInfo?.weight;
  if (Number.isFinite(weight) && weight < 50) reasons.push('You must weigh at least 50kg to donate');

  return { isEligible: reasons.length === 0, reasons, nextEligibleDate };
};
