import { useState, useEffect } from 'react';
import { supabase, Profile, BloodRequest, BloodBank } from '../lib/supabase';
import { Users, AlertCircle, MapPin, TrendingUp, CheckCircle, XCircle } from 'lucide-react';

export default function AdminPanel() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalDonors: 0,
    totalRecipients: 0,
    totalHospitals: 0,
    activeRequests: 0,
    bloodBanks: 0,
  });
  const [pendingBloodBanks, setPendingBloodBanks] = useState<BloodBank[]>([]);
  const [recentRequests, setRecentRequests] = useState<BloodRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: profiles } = await supabase.from('profiles').select('*');
      const { data: requests } = await supabase
        .from('blood_requests')
        .select('*')
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(10);
      const { data: banks } = await supabase
        .from('blood_banks')
        .select('*')
        .eq('is_verified', false);

      if (profiles) {
        setStats({
          totalUsers: profiles.length,
          totalDonors: profiles.filter(p => p.role === 'donor').length,
          totalRecipients: profiles.filter(p => p.role === 'recipient').length,
          totalHospitals: profiles.filter(p => p.role === 'hospital').length,
          activeRequests: requests?.length || 0,
          bloodBanks: profiles.filter(p => p.role === 'hospital').length,
        });
      }

      setPendingBloodBanks(banks || []);
      setRecentRequests(requests || []);
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  const verifyBloodBank = async (bankId: string) => {
    try {
      const { error } = await supabase
        .from('blood_banks')
        .update({ is_verified: true })
        .eq('id', bankId);

      if (error) throw error;
      fetchData();
    } catch (err) {
      console.error('Error verifying blood bank:', err);
    }
  };

  const rejectBloodBank = async (bankId: string) => {
    try {
      const { error } = await supabase
        .from('blood_banks')
        .delete()
        .eq('id', bankId);

      if (error) throw error;
      fetchData();
    } catch (err) {
      console.error('Error rejecting blood bank:', err);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
        Loading admin panel...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Admin Dashboard</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium mb-1">Total Users</p>
                <p className="text-3xl font-bold text-blue-900">{stats.totalUsers}</p>
              </div>
              <div className="w-12 h-12 bg-blue-200 rounded-full flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-900" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600 font-medium mb-1">Blood Donors</p>
                <p className="text-3xl font-bold text-red-900">{stats.totalDonors}</p>
              </div>
              <div className="w-12 h-12 bg-red-200 rounded-full flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-red-900" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium mb-1">Active Requests</p>
                <p className="text-3xl font-bold text-green-900">{stats.activeRequests}</p>
              </div>
              <div className="w-12 h-12 bg-green-200 rounded-full flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-green-900" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600 font-medium mb-1">Recipients</p>
                <p className="text-3xl font-bold text-orange-900">{stats.totalRecipients}</p>
              </div>
              <div className="w-12 h-12 bg-orange-200 rounded-full flex items-center justify-center">
                <Users className="w-6 h-6 text-orange-900" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium mb-1">Hospitals</p>
                <p className="text-3xl font-bold text-purple-900">{stats.totalHospitals}</p>
              </div>
              <div className="w-12 h-12 bg-purple-200 rounded-full flex items-center justify-center">
                <MapPin className="w-6 h-6 text-purple-900" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-teal-600 font-medium mb-1">Blood Banks</p>
                <p className="text-3xl font-bold text-teal-900">{stats.bloodBanks}</p>
              </div>
              <div className="w-12 h-12 bg-teal-200 rounded-full flex items-center justify-center">
                <MapPin className="w-6 h-6 text-teal-900" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {pendingBloodBanks.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Pending Blood Bank Verifications</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {pendingBloodBanks.map((bank) => (
              <div key={bank.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 mb-2">{bank.name}</h4>
                    <div className="space-y-1 text-sm text-gray-600">
                      <p>{bank.address}, {bank.city}</p>
                      <p>Phone: {bank.phone}</p>
                      {bank.email && <p>Email: {bank.email}</p>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => verifyBloodBank(bank.id)}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Verify
                    </button>
                    <button
                      onClick={() => rejectBloodBank(bank.id)}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium flex items-center gap-2"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Recent Blood Requests</h3>
        </div>
        {recentRequests.length === 0 ? (
          <div className="p-12 text-center text-gray-500">No active blood requests</div>
        ) : (
          <div className="divide-y divide-gray-200">
            {recentRequests.map((request) => (
              <div key={request.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-gray-900">{request.patient_name}</h4>
                    <div className="flex items-center gap-3 text-sm text-gray-600 mt-1">
                      <span className="font-medium text-red-600">{request.blood_group}</span>
                      <span>{request.city}</span>
                      <span>{request.units_needed} unit(s)</span>
                      <span className="capitalize">{request.urgency}</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{request.hospital_name}</p>
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(request.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
