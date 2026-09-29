import { useState, useEffect } from 'react';
import { supabase, DonationCamp } from '../lib/supabase';
import { Calendar, MapPin, Phone, Clock } from 'lucide-react';

export default function DonationCampsList() {
  const [camps, setCamps] = useState<DonationCamp[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'upcoming' | 'all'>('upcoming');

  useEffect(() => {
    fetchCamps();
  }, [filter]);

  const fetchCamps = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      let query = supabase
        .from('donation_camps')
        .select('*')
        .eq('is_active', true)
        .order('camp_date', { ascending: true });

      if (filter === 'upcoming') {
        query = query.gte('camp_date', today);
      }

      const { data, error } = await query;

      if (error) throw error;
      setCamps(data || []);
    } catch (err) {
      console.error('Error fetching camps:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCampDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Blood Donation Camps</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('upcoming')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'upcoming'
                ? 'bg-red-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Upcoming
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'all'
                ? 'bg-red-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All Camps
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
          Loading donation camps...
        </div>
      ) : camps.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
          <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>No donation camps found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {camps.map((camp) => (
            <div key={camp.id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-1">{camp.name}</h3>
                    {camp.description && (
                      <p className="text-sm text-gray-600">{camp.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
                    <Calendar className="w-4 h-4" />
                    {formatCampDate(camp.camp_date)}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="space-y-3 text-sm text-gray-600">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>{camp.address}, {camp.city}{camp.pincode && `, ${camp.pincode}`}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 flex-shrink-0" />
                      <span>{camp.start_time} - {camp.end_time}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 flex-shrink-0" />
                      <a href={`tel:${camp.contact_number}`} className="text-red-600 hover:underline">
                        {camp.contact_number}
                      </a>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">Join This Camp</h4>
                    <p className="text-xs text-gray-600 mb-3">
                      Help save lives by donating blood at this camp. Every donation counts!
                    </p>
                    <div className="text-xs text-gray-500">
                      <span className="font-medium">Note:</span> Please bring a valid ID and ensure you've had a proper meal before donating.
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <a
                    href={`tel:${camp.contact_number}`}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                  >
                    Contact Organizer
                  </a>
                  {camp.latitude && camp.longitude && (
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${camp.latitude},${camp.longitude}`}
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
