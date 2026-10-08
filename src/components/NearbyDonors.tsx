import { useState, useEffect } from 'react';
import { supabase, Profile, BloodGroup } from '../lib/supabase';
import { bloodGroups, canDonateBlood, calculateDistance } from '../lib/utils';
import { MapPin, Phone, Droplet, Navigation, Loader } from 'lucide-react';
import { getCurrentPosition } from '../lib/pwa';

interface DonorWithDistance extends Profile {
  distance?: number;
}

export default function NearbyDonors() {
  const [donors, setDonors] = useState<DonorWithDistance[]>([]);
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [bloodGroup, setBloodGroup] = useState<BloodGroup | ''>('');
  const [radius, setRadius] = useState(10);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getUserLocation();
  }, []);

  const getUserLocation = async () => {
    setLocationLoading(true);
    setError('');
    try {
      const position = await getCurrentPosition();
      setUserLocation({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      });
    } catch {
      setError('Please enable location services to find nearby donors');
    } finally {
      setLocationLoading(false);
    }
  };

  const searchNearbyDonors = async () => {
    if (!userLocation) {
      setError('Location not available');
      return;
    }

    setLoading(true);
    setError('');

    try {
      let query = supabase
        .from('profiles')
        .select('*')
        .eq('role', 'donor')
        .eq('is_available', true)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);

      if (bloodGroup) {
        query = query.eq('blood_group', bloodGroup);
      }

      const { data, error: queryError } = await query;

      if (queryError) throw queryError;

      const eligibleDonors = (data || []).filter(donor =>
        canDonateBlood(donor.last_donation_date || undefined)
      );

      const donorsWithDistance = eligibleDonors
        .map(donor => ({
          ...donor,
          distance: calculateDistance(
            userLocation.lat,
            userLocation.lng,
            donor.latitude!,
            donor.longitude!
          ),
        }))
        .filter(donor => donor.distance! <= radius)
        .sort((a, b) => (a.distance || 0) - (b.distance || 0));

      setDonors(donorsWithDistance);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to search donors');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 pb-20">
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Find Nearby Donors</h2>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Blood Group</label>
            <select
              value={bloodGroup}
              onChange={(e) => setBloodGroup(e.target.value as BloodGroup)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
            >
              <option value="">All Blood Groups</option>
              {bloodGroups.map((group) => (
                <option key={group} value={group}>{group}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search Radius: {radius} km
            </label>
            <input
              type="range"
              min="1"
              max="50"
              value={radius}
              onChange={(e) => setRadius(parseInt(e.target.value))}
              className="w-full"
            />
          </div>

          {!userLocation ? (
            <button
              onClick={getUserLocation}
              disabled={locationLoading}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
            >
              {locationLoading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Getting Location...
                </>
              ) : (
                <>
                  <Navigation className="w-4 h-4" />
                  Enable Location
                </>
              )}
            </button>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-green-600">
                <MapPin className="w-4 h-4" />
                <span>Location enabled</span>
              </div>
              <button
                onClick={searchNearbyDonors}
                disabled={loading}
                className="w-full bg-red-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
              >
                {loading ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Navigation className="w-4 h-4" />
                    Find Donors Within {radius}km
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {donors.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">
              {donors.length} {donors.length === 1 ? 'Donor' : 'Donors'} Found Nearby
            </h3>
          </div>
          <div className="divide-y divide-gray-200">
            {donors.map((donor) => (
              <div key={donor.id} className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Droplet className="w-5 h-5 text-red-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-semibold text-gray-900 text-sm truncate">{donor.full_name}</h4>
                      <span className="font-bold text-red-600 text-sm ml-2">{donor.blood_group}</span>
                    </div>
                    <div className="space-y-1 text-xs text-gray-600">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{donor.city}</span>
                        {donor.distance && (
                          <span className="font-medium text-blue-600 whitespace-nowrap">
                            {donor.distance.toFixed(1)} km away
                          </span>
                        )}
                      </div>
                      {donor.total_donations > 0 && (
                        <div className="flex items-center gap-2">
                          <Droplet className="w-3 h-3" />
                          <span>{donor.total_donations} donations</span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 mt-3">
                      <a
                        href={`tel:${donor.phone}`}
                        className="flex-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-xs font-medium text-center flex items-center justify-center gap-1"
                      >
                        <Phone className="w-3 h-3" />
                        Call
                      </a>
                      {donor.latitude && donor.longitude && (
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${donor.latitude},${donor.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-xs font-medium text-center flex items-center justify-center gap-1"
                        >
                          <Navigation className="w-3 h-3" />
                          Directions
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {donors.length === 0 && userLocation && !loading && (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500 text-sm">
          <Navigation className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>No donors found within {radius}km</p>
          <p className="text-xs mt-1">Try increasing the search radius</p>
        </div>
      )}
    </div>
  );
}
