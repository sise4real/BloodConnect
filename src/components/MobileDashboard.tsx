import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/useAuth';
import { supabase, BloodRequest, DonationCamp, Notification } from '../lib/supabase';
import { Heart, Calendar, Bell, User, MapPin, Droplet, AlertCircle, Menu, X, Navigation } from 'lucide-react';
import { formatDateTime, getUrgencyColor } from '../lib/utils';
import BloodRequestForm from './BloodRequestForm';
import DonorSearch from './DonorSearch';
import BloodBanksList from './BloodBanksList';
import DonationCampsList from './DonationCampsList';
import ProfileView from './ProfileView';
import AdminPanel from './AdminPanel';
import NearbyDonors from './NearbyDonors';

type TabType = 'home' | 'search' | 'nearby' | 'requests' | 'blood-banks' | 'camps' | 'profile' | 'admin';

export default function MobileDashboard() {
  const { profile, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [bloodRequests, setBloodRequests] = useState<BloodRequest[]>([]);
  const [upcomingCamps, setUpcomingCamps] = useState<DonationCamp[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const fetchBloodRequests = async () => {
    const { data, error } = await supabase
      .from('blood_requests')
      .select('*')
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(5);

    if (!error && data) {
      setBloodRequests(data);
    }
  };

  const fetchUpcomingCamps = async () => {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('donation_camps')
      .select('*')
      .eq('is_active', true)
      .gte('camp_date', today)
      .order('camp_date', { ascending: true })
      .limit(5);

    if (!error && data) {
      setUpcomingCamps(data);
    }
  };

  const fetchNotifications = useCallback(async () => {
    if (!profile?.id) return;
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (!error && data) {
      setNotifications(data);
    }
  }, [profile?.id]);

  useEffect(() => {
    fetchBloodRequests();
    fetchUpcomingCamps();
    void fetchNotifications();
  }, [fetchNotifications]);

  const markNotificationAsRead = async (id: string) => {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);
    fetchNotifications();
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const renderTabContent = () => {
    switch (activeTab) {
      case 'search':
        return <DonorSearch />;
      case 'nearby':
        return <NearbyDonors />;
      case 'requests':
        return <BloodRequestForm onRequestCreated={fetchBloodRequests} />;
      case 'blood-banks':
        return <BloodBanksList />;
      case 'camps':
        return <DonationCampsList />;
      case 'profile':
        return <ProfileView />;
      case 'admin':
        return <AdminPanel />;
      default:
        return renderHome();
    }
  };

  const renderHome = () => (
    <div className="space-y-4 pb-20">
      <div className="bg-gradient-to-r from-red-500 to-pink-500 rounded-lg p-4 text-white">
        <h2 className="text-xl font-bold mb-1">Welcome, {profile?.full_name}!</h2>
        <p className="text-sm text-red-50">
          {profile?.role === 'donor' && 'Your donations save lives'}
          {profile?.role === 'recipient' && 'Find help when you need it'}
          {profile?.role === 'hospital' && 'Connect donors with recipients'}
          {profile?.role === 'admin' && 'Manage the donation network'}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
          <div className="flex flex-col">
            <p className="text-xs text-gray-600 mb-1">Active Requests</p>
            <p className="text-2xl font-bold text-gray-900">{bloodRequests.length}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
          <div className="flex flex-col">
            <p className="text-xs text-gray-600 mb-1">Upcoming Camps</p>
            <p className="text-2xl font-bold text-gray-900">{upcomingCamps.length}</p>
          </div>
        </div>

        {profile?.role === 'donor' && (
          <>
            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
              <div className="flex flex-col">
                <p className="text-xs text-gray-600 mb-1">Total Donations</p>
                <p className="text-2xl font-bold text-gray-900">{profile.total_donations}</p>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-orange-500">
              <div className="flex flex-col">
                <p className="text-xs text-gray-600 mb-1">Blood Group</p>
                <p className="text-2xl font-bold text-gray-900">{profile.blood_group}</p>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Recent Requests</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {bloodRequests.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-500">No active requests</div>
          ) : (
            bloodRequests.slice(0, 3).map((request) => (
              <div key={request.id} className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <span className="font-semibold text-gray-900 text-sm">{request.patient_name}</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${getUrgencyColor(request.urgency)}`}>
                    {request.urgency}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-600">
                  <span className="flex items-center gap-1">
                    <Droplet className="w-3 h-3" />
                    {request.blood_group}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {request.city}
                  </span>
                  <span>{request.units_needed} unit(s)</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {upcomingCamps.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Upcoming Camps</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {upcomingCamps.slice(0, 2).map((camp) => (
              <div key={camp.id} className="p-4">
                <h4 className="font-semibold text-gray-900 text-sm mb-1">{camp.name}</h4>
                <div className="flex items-center gap-3 text-xs text-gray-600">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(camp.camp_date).toLocaleDateString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {camp.city}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="flex items-center justify-between px-4 h-14">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 -ml-2 text-gray-700"
          >
            {showMenu ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>

          <div className="flex items-center gap-2">
            <Heart className="w-6 h-6 text-red-600 fill-red-600" />
            <span className="font-bold text-gray-900">BloodDonor</span>
          </div>

          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 -mr-2 text-gray-700 relative"
          >
            <Bell className="w-6 h-6" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-600 text-white text-xs rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>
        </div>

        {showMenu && (
          <div className="border-t border-gray-200 bg-white">
            <nav className="p-2">
              <button
                onClick={() => {
                  setActiveTab('home');
                  setShowMenu(false);
                }}
                className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-700"
              >
                Dashboard
              </button>
              {profile?.role === 'admin' && (
                <button
                  onClick={() => {
                    setActiveTab('admin');
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-700"
                >
                  Admin Panel
                </button>
              )}
              <button
                onClick={signOut}
                className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-50 text-sm font-medium text-red-600"
              >
                Sign Out
              </button>
            </nav>
          </div>
        )}

        {showNotifications && (
          <div className="absolute top-14 right-0 left-0 bg-white border-b border-gray-200 z-50 max-h-96 overflow-y-auto">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Notifications</h3>
            </div>
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm">No notifications</div>
            ) : (
              <div className="divide-y divide-gray-200">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`p-4 ${!notif.is_read ? 'bg-blue-50' : ''}`}
                    onClick={() => {
                      markNotificationAsRead(notif.id);
                      setShowNotifications(false);
                    }}
                  >
                    <h4 className="font-medium text-sm text-gray-900">{notif.title}</h4>
                    <p className="text-xs text-gray-600 mt-1">{notif.message}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {formatDateTime(notif.created_at)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </header>

      <main className="px-4 py-4">
        {renderTabContent()}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
        <div className="grid grid-cols-5 h-16">
          <button
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center justify-center ${
              activeTab === 'home' ? 'text-red-600' : 'text-gray-500'
            }`}
          >
            <Heart className="w-5 h-5" />
            <span className="text-xs mt-1">Home</span>
          </button>

          <button
            onClick={() => setActiveTab('nearby')}
            className={`flex flex-col items-center justify-center ${
              activeTab === 'nearby' ? 'text-red-600' : 'text-gray-500'
            }`}
          >
            <Navigation className="w-5 h-5" />
            <span className="text-xs mt-1">Nearby</span>
          </button>

          {(profile?.role === 'recipient' || profile?.role === 'hospital') ? (
            <button
              onClick={() => setActiveTab('requests')}
              className={`flex flex-col items-center justify-center ${
                activeTab === 'requests' ? 'text-red-600' : 'text-gray-500'
              }`}
            >
              <AlertCircle className="w-5 h-5" />
              <span className="text-xs mt-1">Request</span>
            </button>
          ) : (
            <button
              onClick={() => setActiveTab('blood-banks')}
              className={`flex flex-col items-center justify-center ${
                activeTab === 'blood-banks' ? 'text-red-600' : 'text-gray-500'
              }`}
            >
              <MapPin className="w-5 h-5" />
              <span className="text-xs mt-1">Banks</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('camps')}
            className={`flex flex-col items-center justify-center ${
              activeTab === 'camps' ? 'text-red-600' : 'text-gray-500'
            }`}
          >
            <Calendar className="w-5 h-5" />
            <span className="text-xs mt-1">Camps</span>
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`flex flex-col items-center justify-center ${
              activeTab === 'profile' ? 'text-red-600' : 'text-gray-500'
            }`}
          >
            <User className="w-5 h-5" />
            <span className="text-xs mt-1">Profile</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
