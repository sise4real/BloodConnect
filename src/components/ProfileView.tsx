import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/useAuth';
import { supabase, BloodGroup, DonationHistory } from '../lib/supabase';
import { bloodGroups, canDonateBlood, formatDate } from '../lib/utils';
import { User, Droplet, Calendar, Phone, MapPin, CheckCircle, AlertCircle } from 'lucide-react';

export default function ProfileView() {
  const { profile, refreshProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [donationHistory, setDonationHistory] = useState<DonationHistory[]>([]);

  const [formData, setFormData] = useState({
    full_name: profile?.full_name || '',
    blood_group: profile?.blood_group || 'A+' as BloodGroup,
    phone: profile?.phone || '',
    city: profile?.city || '',
    pincode: profile?.pincode || '',
    is_available: profile?.is_available ?? true,
  });

  const fetchDonationHistory = useCallback(async () => {
    if (!profile?.id) return;
    const { data, error } = await supabase
      .from('donation_history')
      .select('*')
      .eq('donor_id', profile.id)
      .order('donation_date', { ascending: false });

    if (!error && data) {
      setDonationHistory(data);
    }
  }, [profile?.id]);

  useEffect(() => {
    if (profile?.role === 'donor') {
      void fetchDonationHistory();
    }
  }, [fetchDonationHistory, profile?.role]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          blood_group: formData.blood_group,
          phone: formData.phone,
          city: formData.city,
          pincode: formData.pincode || null,
          is_available: formData.is_available,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile?.id);

      if (updateError) throw updateError;

      await refreshProfile();
      setSuccess(true);
      setEditing(false);
    } catch (err: unknown) {
      const message = (err as { message?: unknown } | null)?.message;
      setError(typeof message === 'string' && message ? message : 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const canDonate = profile?.role === 'donor' && canDonateBlood(profile?.last_donation_date || undefined);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-red-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{profile?.full_name}</h2>
              <p className="text-gray-600 capitalize">{profile?.role}</p>
            </div>
          </div>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
            >
              Edit Profile
            </button>
          )}
        </div>

        {editing ? (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {success && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-800 text-sm">
                <CheckCircle className="w-5 h-5" />
                <span>Profile updated successfully!</span>
              </div>
            )}

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-800 text-sm">
                <AlertCircle className="w-5 h-5" />
                <span>{error}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>

              {profile?.role !== 'hospital' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Blood Group</label>
                  <select
                    value={formData.blood_group}
                    onChange={(e) => setFormData({ ...formData, blood_group: e.target.value as BloodGroup })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  >
                    {bloodGroups.map((group) => (
                      <option key={group} value={group}>{group}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <input
                  type="text"
                  required
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pincode</label>
                <input
                  type="text"
                  value={formData.pincode}
                  onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>

              {profile?.role === 'donor' && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_available"
                    checked={formData.is_available}
                    onChange={(e) => setFormData({ ...formData, is_available: e.target.checked })}
                    className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                  />
                  <label htmlFor="is_available" className="text-sm font-medium text-gray-700">
                    Available for donation
                  </label>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                {profile?.role !== 'hospital' && (
                  <div className="flex items-center gap-3">
                    <Droplet className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600">Blood Group</p>
                      <p className="font-semibold text-gray-900">{profile?.blood_group}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">Phone</p>
                    <p className="font-semibold text-gray-900">{profile?.phone}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">Location</p>
                    <p className="font-semibold text-gray-900">
                      {profile?.city}{profile?.pincode && `, ${profile.pincode}`}
                    </p>
                  </div>
                </div>
              </div>

              {profile?.role === 'donor' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Droplet className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600">Total Donations</p>
                      <p className="font-semibold text-gray-900">{profile?.total_donations}</p>
                    </div>
                  </div>

                  {profile?.last_donation_date && (
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-600">Last Donation</p>
                        <p className="font-semibold text-gray-900">
                          {formatDate(profile.last_donation_date)}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    {canDonate ? (
                      <>
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <div>
                          <p className="text-sm text-gray-600">Donation Eligibility</p>
                          <p className="font-semibold text-green-600">Eligible to Donate</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-5 h-5 text-orange-600" />
                        <div>
                          <p className="text-sm text-gray-600">Donation Eligibility</p>
                          <p className="font-semibold text-orange-600">Wait 3 months from last donation</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {profile?.role === 'donor' && donationHistory.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Donation History</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {donationHistory.map((donation) => (
              <div key={donation.id} className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                      <Droplet className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        Donated {donation.units_donated} unit(s)
                      </p>
                      <p className="text-sm text-gray-600">
                        {formatDate(donation.donation_date)}
                      </p>
                      {donation.notes && (
                        <p className="text-sm text-gray-500 mt-1">{donation.notes}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
