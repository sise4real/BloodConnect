import { useState, useEffect } from 'react';
import { supabase, BloodBank, BloodGroup } from '../lib/supabase';
import { MapPin, Phone, Mail, Clock, Droplet } from 'lucide-react';
import { bloodGroups } from '../lib/utils';

export default function BloodBanksList() {
  const [bloodBanks, setBloodBanks] = useState<BloodBank[]>([]);
  const [loading, setLoading] = useState(true);
  const [cityFilter, setCityFilter] = useState('');

  useEffect(() => {
    fetchBloodBanks();
  }, [cityFilter]);

  const fetchBloodBanks = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('blood_banks')
        .select('*')
        .eq('is_verified', true)
        .order('name', { ascending: true });

      if (cityFilter) {
        query = query.ilike('city', `%${cityFilter}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setBloodBanks(data || []);
    } catch (err) {
      console.error('Error fetching blood banks:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStockColor = (units: number): string => {
    if (units === 0) return 'text-gray-400';
    if (units < 5) return 'text-orange-600';
    return 'text-green-600';
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Blood Banks</h2>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Filter by City</label>
          <input
            type="text"
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            placeholder="Enter city name"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
          Loading blood banks...
        </div>
      ) : bloodBanks.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
          <Droplet className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>No blood banks found.</p>
          {cityFilter && <p className="text-sm mt-2">Try adjusting your filter.</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {bloodBanks.map((bank) => (
            <div key={bank.id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow">
              <div className="p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">{bank.name}</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="space-y-3 text-sm text-gray-600">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>{bank.address}, {bank.city}{bank.pincode && `, ${bank.pincode}`}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 flex-shrink-0" />
                      <a href={`tel:${bank.phone}`} className="text-red-600 hover:underline">
                        {bank.phone}
                      </a>
                    </div>
                    {bank.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 flex-shrink-0" />
                        <a href={`mailto:${bank.email}`} className="text-red-600 hover:underline">
                          {bank.email}
                        </a>
                      </div>
                    )}
                    {bank.operating_hours && (
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 flex-shrink-0" />
                        <span>{bank.operating_hours}</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Blood Stock Availability</h4>
                    <div className="grid grid-cols-4 gap-2">
                      {bloodGroups.map((group) => {
                        const units = bank.blood_stock[group] || 0;
                        return (
                          <div
                            key={group}
                            className="bg-gray-50 rounded-lg p-2 text-center"
                          >
                            <div className="text-xs font-medium text-gray-600 mb-1">{group}</div>
                            <div className={`text-lg font-bold ${getStockColor(units)}`}>
                              {units}
                            </div>
                            <div className="text-xs text-gray-500">units</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <a
                    href={`tel:${bank.phone}`}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                  >
                    Call Now
                  </a>
                  {bank.latitude && bank.longitude && (
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${bank.latitude},${bank.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                    >
                      Get Directions
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
