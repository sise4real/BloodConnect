import { useState } from 'react';
import { supabase, Profile, BloodGroup } from '../lib/supabase';
import { bloodGroups, canDonateBlood, formatDate } from '../lib/utils';
import { Search, MapPin, Phone, Droplet, Calendar, CheckCircle } from 'lucide-react';

export default function DonorSearch() {
  const [searchParams, setSearchParams] = useState({
    blood_group: '' as BloodGroup | '',
    city: '',
  });
  const [donors, setDonors] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSearched(true);

    try {
      let query = supabase
        .from('profiles')
        .select('*')
        .eq('role', 'donor')
        .eq('is_available', true);

      if (searchParams.blood_group) {
        query = query.eq('blood_group', searchParams.blood_group);
      }

      if (searchParams.city) {
        query = query.ilike('city', `%${searchParams.city}%`);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      const eligibleDonors = (data || []).filter(donor =>
        canDonateBlood(donor.last_donation_date || undefined)
      );

      setDonors(eligibleDonors);
    } catch (err) {
      console.error('Error searching donors:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Search for Blood Donors</h2>

        <form onSubmit={handleSearch} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Blood Group</label>
              <select
                value={searchParams.blood_group}
                onChange={(e) => setSearchParams({ ...searchParams, blood_group: e.target.value as BloodGroup })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              >
                <option value="">All Blood Groups</option>
                {bloodGroups.map((group) => (
                  <option key={group} value={group}>{group}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input
                type="text"
                value={searchParams.city}
                onChange={(e) => setSearchParams({ ...searchParams, city: e.target.value })}
                placeholder="Enter city name"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            <Search className="w-5 h-5" />
            {loading ? 'Searching...' : 'Search Donors'}
          </button>
        </form>
      </div>

      {searched && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              {donors.length} {donors.length === 1 ? 'Donor' : 'Donors'} Found
            </h3>
          </div>

          {donors.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <Droplet className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No donors found matching your criteria.</p>
              <p className="text-sm mt-2">Try adjusting your search filters.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {donors.map((donor) => (
                <div key={donor.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                          <Droplet className="w-6 h-6 text-red-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">{donor.full_name}</h4>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <span className="font-medium text-red-600">{donor.blood_group}</span>
                            {donor.is_available && (
                              <span className="flex items-center gap-1 text-green-600">
                                <CheckCircle className="w-4 h-4" />
                                Available
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          <span>{donor.city}{donor.pincode && `, ${donor.pincode}`}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4" />
                          <a href={`tel:${donor.phone}`} className="text-red-600 hover:underline">
                            {donor.phone}
                          </a>
                        </div>
                        {donor.last_donation_date && (
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span>Last donated: {formatDate(donor.last_donation_date)}</span>
                          </div>
                        )}
                        {donor.total_donations > 0 && (
                          <div className="flex items-center gap-2">
                            <Droplet className="w-4 h-4" />
                            <span>Total donations: {donor.total_donations}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <a
                        href={`tel:${donor.phone}`}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium text-center"
                      >
                        Call Now
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
