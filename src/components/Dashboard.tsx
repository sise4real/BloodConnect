import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, BloodRequest, DonationCamp, Notification } from '../lib/supabase';
import { Heart, Search, Calendar, Bell, User, LogOut, MapPin, Droplet, AlertCircle } from 'lucide-react';
import { formatDateTime, getUrgencyColor } from '../lib/utils';
import BloodRequestForm from './BloodRequestForm';
import DonorSearch from './DonorSearch';
import BloodBanksList from './BloodBanksList';
import DonationCampsList from './DonationCampsList';
import ProfileView from './ProfileView';
import AdminPanel from './AdminPanel';

type TabType = 'home' | 'search' | 'requests' | 'blood-banks' | 'camps' | 'profile' | 'admin';

export default function Dashboard() {
  const { profile, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [bloodRequests, setBloodRequests] = useState<BloodRequest[]>([]);
  const [upcomingCamps, setUpcomingCamps] = useState<DonationCamp[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    fetchBloodRequests();
    fetchUpcomingCamps();
    fetchNotifications();
  }, []);

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

  const fetchNotifications = async () => {
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
  };

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
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-red-500 to-pink-500 rounded-lg p-6 text-white">
        <h2 className="text-2xl font-bold mb-2">Welcome, {profile?.full_name}!</h2>
        <p className="text-red-50">
          {profile?.role === 'donor' && 'Thank you for being a lifesaver. Your donations make a difference.'}
          {profile?.role === 'recipient' && 'Find donors and blood banks near you to get the help you need.'}
          {profile?.role === 'hospital' && 'Manage blood banks, camps, and help connect donors with recipients.'}
          {profile?.role === 'admin' && 'Oversee and manage the entire blood donation network.'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Requests</p>
              <p className="text-2xl font-bold text-gray-900">{bloodRequests.length}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Upcoming Camps</p>
              <p className="text-2xl font-bold text-gray-900">{upcomingCamps.length}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        {profile?.role === 'donor' && (
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Donations</p>
                <p className="text-2xl font-bold text-gray-900">{profile.total_donations}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <Heart className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Recent Blood Requests</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {bloodRequests.length === 0 ? (
            <div className="p-6 text-center text-gray-500">No active blood requests</div>
          ) : (
            bloodRequests.map((request) => (
              <div key={request.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold text-gray-900">{request.patient_name}</span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getUrgencyColor(request.urgency)}`}>
                        {request.urgency}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                      <span className="flex items-center gap-1">
                        <Droplet className="w-4 h-4" />
                        {request.blood_group}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {request.city}
                      </span>
                      <span>{request.units_needed} unit(s)</span>
                    </div>
                    <p className="text-sm text-gray-600">{request.hospital_name}</p>
                  </div>
                  <div className="text-right text-xs text-gray-500">
                    {formatDateTime(request.created_at)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {upcomingCamps.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Upcoming Donation Camps</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {upcomingCamps.map((camp) => (
              <div key={camp.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">{camp.name}</h4>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(camp.camp_date).toLocaleDateString()}
                      </span>
                      <span>{camp.start_time} - {camp.end_time}</span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {camp.city}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{camp.address}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <Heart className="w-8 h-8 text-red-600 fill-red-600" />
              <span className="text-xl font-bold text-gray-900">Blood Donation Locator</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-2 text-gray-600 hover:text-gray-900 relative"
                >
                  <Bell className="w-6 h-6" />
                  {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 w-5 h-5 bg-red-600 text-white text-xs rounded-full flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </button>
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-96 overflow-y-auto">
                    <div className="p-4 border-b border-gray-200">
                      <h3 className="font-semibold text-gray-900">Notifications</h3>
                    </div>
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-gray-500">No notifications</div>
                    ) : (
                      <div className="divide-y divide-gray-200">
                        {notifications.map((notif) => (
                          <div
                            key={notif.id}
                            className={`p-4 cursor-pointer hover:bg-gray-50 ${!notif.is_read ? 'bg-blue-50' : ''}`}
                            onClick={() => markNotificationAsRead(notif.id)}
                          >
                            <h4 className="font-medium text-sm text-gray-900">{notif.title}</h4>
                            <p className="text-sm text-gray-600 mt-1">{notif.message}</p>
                            <p className="text-xs text-gray-400 mt-1">
                              {formatDateTime(notif.created_at)}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <button
                onClick={signOut}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-red-600 transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span className="text-sm font-medium">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-6">
          <aside className="w-64 flex-shrink-0">
            <div className="bg-white rounded-lg shadow sticky top-8">
              <nav className="p-4 space-y-1">
                <button
                  onClick={() => setActiveTab('home')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                    activeTab === 'home' ? 'bg-red-50 text-red-600' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Heart className="w-5 h-5" />
                  <span className="font-medium">Dashboard</span>
                </button>
                <button
                  onClick={() => setActiveTab('search')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                    activeTab === 'search' ? 'bg-red-50 text-red-600' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Search className="w-5 h-5" />
                  <span className="font-medium">Find Donors</span>
                </button>
                {(profile?.role === 'recipient' || profile?.role === 'hospital') && (
                  <button
                    onClick={() => setActiveTab('requests')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                      activeTab === 'requests' ? 'bg-red-50 text-red-600' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <AlertCircle className="w-5 h-5" />
                    <span className="font-medium">Blood Requests</span>
                  </button>
                )}
                <button
                  onClick={() => setActiveTab('blood-banks')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                    activeTab === 'blood-banks' ? 'bg-red-50 text-red-600' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <MapPin className="w-5 h-5" />
                  <span className="font-medium">Blood Banks</span>
                </button>
                <button
                  onClick={() => setActiveTab('camps')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                    activeTab === 'camps' ? 'bg-red-50 text-red-600' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Calendar className="w-5 h-5" />
                  <span className="font-medium">Donation Camps</span>
                </button>
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                    activeTab === 'profile' ? 'bg-red-50 text-red-600' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <User className="w-5 h-5" />
                  <span className="font-medium">Profile</span>
                </button>
                {profile?.role === 'admin' && (
                  <button
                    onClick={() => setActiveTab('admin')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                      activeTab === 'admin' ? 'bg-red-50 text-red-600' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <User className="w-5 h-5" />
                    <span className="font-medium">Admin Panel</span>
                  </button>
                )}
              </nav>
            </div>
          </aside>

          <main className="flex-1">
            {renderTabContent()}
          </main>
        </div>
      </div>
    </div>
  );
}
