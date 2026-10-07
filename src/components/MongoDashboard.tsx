import { useState, useEffect, useCallback } from 'react';
import { useMongoAuth } from '../contexts/useMongoAuth';
import { Logo } from './Logo';
import { MapView } from './MapView';
import { BloodRequestCard } from './BloodRequestCard';
import { AdminPanel } from './MongoAdminPanel';
import { api } from '../lib/api';
import {
  LogOut,
  Plus,
  Search,
  MapPin,
  Calendar,
  Building2,
  Droplet,
  X,
  Bell,
  CheckCircle,
  Clock
} from 'lucide-react';

interface GeoLocation {
  coordinates: [number, number];
  address?: string;
  city?: string;
  state?: string;
  venue?: string;
}
interface MongoBloodRequest {
  _id: string;
  patientName: string;
  bloodType: string;
  urgency: 'critical' | 'urgent' | 'normal';
  unitsNeeded: number;
  reason: string;
  status: string;
  requiredBy: string;
  requester: { _id: string; fullName: string; phone: string };
  location: GeoLocation;
  hospital: { name: string; phone: string; address: string };
}
interface MongoCamp { _id: string; name: string; date: string; description?: string; location: GeoLocation }
interface MongoBank { _id: string; name: string; location: GeoLocation; contact: { phone: string }; hours?: string }
interface MongoDonor {
  _id: string;
  fullName: string;
  bloodType?: string;
  donationsCount?: number;
  location?: GeoLocation;
}
interface MongoNotification { _id: string; title: string; message: string; isRead: boolean; createdAt: string }
interface Eligibility { isEligible: boolean; message: string; reasons?: string[] }

export function MongoDashboard() {
  const { user, token, signOut } = useMongoAuth();
  const [activeTab, setActiveTab] = useState('requests');
  const [bloodRequests, setBloodRequests] = useState<MongoBloodRequest[]>([]);
  const [donors, setDonors] = useState<MongoDonor[]>([]);
  const [camps, setCamps] = useState<MongoCamp[]>([]);
  const [bloodBanks, setBloodBanks] = useState<MongoBank[]>([]);
  const [notifications, setNotifications] = useState<MongoNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [eligibility, setEligibility] = useState<Eligibility | null>(null);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestForm, setRequestForm] = useState({
    patientName: '',
    bloodType: 'A+',
    unitsNeeded: 1,
    urgency: 'normal',
    reason: '',
    hospital: { name: '', address: '', phone: '' },
    requiredBy: ''
  });

  const loadData = useCallback(async () => {
    if (!token) return;
    try {
      const [requestsData, campsData, banksData, notificationsData, unreadData] = await Promise.all([
        api.bloodRequests.getAll({ status: 'approved' }, token),
        api.camps.getAll({ status: 'approved' }, token),
        api.bloodBanks.getAll({ status: 'approved' }, token),
        api.notifications.getAll({}, token),
        api.notifications.getUnreadCount(token)
      ]);
      setBloodRequests(requestsData);
      setCamps(campsData);
      setBloodBanks(banksData);
      setNotifications(notificationsData);
      setUnreadCount(unreadData.count);

      if (user?.role === 'donor') {
        const eligibilityData = await api.donors.checkEligibility(token);
        setEligibility(eligibilityData);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  }, [token, user?.role]);

  const searchDonors = async (bloodType?: string) => {
    if (!token) return;
    try {
      const data = await api.donors.search(
        {
          bloodType,
          latitude: user?.location?.coordinates[1],
          longitude: user?.location?.coordinates[0],
          radius: 50,
          availability: true
        },
        token
      );
      setDonors(data);
    } catch (error) {
      console.error('Failed to search donors:', error);
    }
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !user?.location) return;

    try {
      await api.bloodRequests.create(
        {
          ...requestForm,
          location: {
            type: 'Point',
            coordinates: user.location.coordinates
          }
        },
        token
      );
      setShowRequestForm(false);
      setRequestForm({
        patientName: '',
        bloodType: 'A+',
        unitsNeeded: 1,
        urgency: 'normal',
        reason: '',
        hospital: { name: '', address: '', phone: '' },
        requiredBy: ''
      });
      loadData();
    } catch (error) {
      console.error('Failed to create request:', error);
    }
  };

  if (user?.role === 'admin') {
    return <AdminPanel />;
  }

  const mapMarkers = [
    ...bloodRequests.map(req => ({
      id: req._id,
      position: [req.location.coordinates[1], req.location.coordinates[0]] as [number, number],
      type: 'request' as const,
      title: `${req.patientName} - ${req.bloodType}`,
      info: `${req.urgency} - ${req.hospital.name}`
    })),
    ...camps.map(camp => ({
      id: camp._id,
      position: [camp.location.coordinates[1], camp.location.coordinates[0]] as [number, number],
      type: 'camp' as const,
      title: camp.name,
      info: new Date(camp.date).toLocaleDateString()
    })),
    ...bloodBanks.map(bank => ({
      id: bank._id,
      position: [bank.location.coordinates[1], bank.location.coordinates[0]] as [number, number],
      type: 'bloodbank' as const,
      title: bank.name,
      info: bank.contact.phone
    }))
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Logo size="small" />

            <div className="flex items-center gap-4">
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
                >
                  <Bell size={20} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                      {unreadCount}
                    </span>
                  )}
                </button>
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-96 overflow-y-auto">
                    <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                      <h3 className="font-bold text-gray-900">Notifications</h3>
                      {unreadCount > 0 && (
                        <button
                          onClick={async () => {
                            await api.notifications.markAllAsRead(token!);
                            loadData();
                          }}
                          className="text-xs text-rose-600 hover:text-rose-700"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>
                    <div className="divide-y divide-gray-100">
                      {notifications.length === 0 ? (
                        <div className="p-4 text-center text-gray-500 text-sm">No notifications</div>
                      ) : (
                        notifications.map(notif => (
                          <div
                            key={notif._id}
                            className={`p-4 hover:bg-gray-50 cursor-pointer ${!notif.isRead ? 'bg-blue-50' : ''}`}
                            onClick={async () => {
                              if (!notif.isRead) {
                                await api.notifications.markAsRead(notif._id, token!);
                                loadData();
                              }
                            }}
                          >
                            <div className="flex items-start gap-2">
                              <div className="flex-1">
                                <div className="font-semibold text-sm text-gray-900">{notif.title}</div>
                                <div className="text-xs text-gray-600 mt-1">{notif.message}</div>
                                <div className="text-xs text-gray-400 mt-1">
                                  {new Date(notif.createdAt).toLocaleString()}
                                </div>
                              </div>
                              {!notif.isRead && (
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-gray-900">{user?.fullName}</div>
                <div className="text-xs text-gray-600 capitalize">{user?.role}</div>
              </div>
              <button
                onClick={signOut}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
              >
                <LogOut size={18} />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {user?.role === 'donor' && eligibility && (
          <div className={`mb-6 p-4 rounded-lg border-2 ${eligibility.isEligible ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
            <div className="flex items-start gap-3">
              {eligibility.isEligible ? (
                <CheckCircle className="text-green-600 flex-shrink-0 mt-1" size={24} />
              ) : (
                <Clock className="text-amber-600 flex-shrink-0 mt-1" size={24} />
              )}
              <div className="flex-1">
                <h3 className={`font-bold ${eligibility.isEligible ? 'text-green-900' : 'text-amber-900'}`}>
                  {eligibility.message}
                </h3>
                {eligibility.reasons && eligibility.reasons.length > 0 && (
                  <ul className="mt-2 text-sm text-gray-700 space-y-1">
                    {eligibility.reasons.map((reason: string, idx: number) => (
                      <li key={idx}>• {reason}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="mb-8">
          <MapView markers={mapMarkers} height="300px" zoom={6} />
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-8">
          <div className="border-b border-gray-200">
            <div className="flex gap-1 p-2 overflow-x-auto">
              {[
                { id: 'requests', label: 'Blood Requests', icon: Droplet },
                { id: 'donors', label: 'Find Donors', icon: Search },
                { id: 'camps', label: 'Donation Camps', icon: Calendar },
                { id: 'banks', label: 'Blood Banks', icon: Building2 }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-rose-100 text-rose-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <tab.icon size={18} />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="p-6">
            {activeTab === 'requests' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Blood Requests</h2>
                  <button
                    onClick={() => setShowRequestForm(!showRequestForm)}
                    className="flex items-center gap-2 bg-gradient-to-r from-rose-500 to-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:from-rose-600 hover:to-red-700 transition shadow-md"
                  >
                    {showRequestForm ? <X size={18} /> : <Plus size={18} />}
                    {showRequestForm ? 'Cancel' : 'New Request'}
                  </button>
                </div>

                {showRequestForm && (
                  <form onSubmit={handleCreateRequest} className="bg-gray-50 rounded-xl p-6 mb-6 border border-gray-200">
                    <div className="grid md:grid-cols-2 gap-4 mb-4">
                      <input
                        type="text"
                        placeholder="Patient Name"
                        required
                        value={requestForm.patientName}
                        onChange={(e) => setRequestForm({ ...requestForm, patientName: e.target.value })}
                        className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 outline-none"
                      />
                      <select
                        value={requestForm.bloodType}
                        onChange={(e) => setRequestForm({ ...requestForm, bloodType: e.target.value })}
                        className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 outline-none"
                      >
                        {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        placeholder="Units Needed"
                        required
                        min="1"
                        value={requestForm.unitsNeeded}
                        onChange={(e) => setRequestForm({ ...requestForm, unitsNeeded: parseInt(e.target.value) })}
                        className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 outline-none"
                      />
                      <select
                        value={requestForm.urgency}
                        onChange={(e) => setRequestForm({ ...requestForm, urgency: e.target.value })}
                        className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 outline-none"
                      >
                        <option value="normal">Normal</option>
                        <option value="urgent">Urgent</option>
                        <option value="critical">Critical</option>
                      </select>
                      <input
                        type="text"
                        placeholder="Hospital Name"
                        required
                        value={requestForm.hospital.name}
                        onChange={(e) => setRequestForm({
                          ...requestForm,
                          hospital: { ...requestForm.hospital, name: e.target.value }
                        })}
                        className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 outline-none"
                      />
                      <input
                        type="text"
                        placeholder="Hospital Address"
                        required
                        value={requestForm.hospital.address}
                        onChange={(e) => setRequestForm({
                          ...requestForm,
                          hospital: { ...requestForm.hospital, address: e.target.value }
                        })}
                        className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 outline-none"
                      />
                      <input
                        type="tel"
                        placeholder="Hospital Phone"
                        required
                        value={requestForm.hospital.phone}
                        onChange={(e) => setRequestForm({
                          ...requestForm,
                          hospital: { ...requestForm.hospital, phone: e.target.value }
                        })}
                        className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 outline-none"
                      />
                      <input
                        type="date"
                        required
                        value={requestForm.requiredBy}
                        onChange={(e) => setRequestForm({ ...requestForm, requiredBy: e.target.value })}
                        className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 outline-none"
                      />
                    </div>
                    <textarea
                      placeholder="Reason for blood requirement"
                      required
                      value={requestForm.reason}
                      onChange={(e) => setRequestForm({ ...requestForm, reason: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 outline-none mb-4"
                      rows={3}
                    />
                    <button
                      type="submit"
                      className="w-full bg-gradient-to-r from-rose-500 to-red-600 text-white py-3 rounded-lg font-semibold hover:from-rose-600 hover:to-red-700 transition shadow-md"
                    >
                      Submit Request
                    </button>
                  </form>
                )}

                <div className="grid gap-6">
                  {bloodRequests.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      No blood requests found
                    </div>
                  ) : (
                    bloodRequests.map(request => (
                      <BloodRequestCard
                        key={request._id}
                        request={request}
                        onUpdate={loadData}
                      />
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === 'donors' && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Find Donors</h2>
                <div className="flex gap-4 mb-6 flex-wrap">
                  <select
                    onChange={(e) => searchDonors(e.target.value || undefined)}
                    className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 outline-none"
                  >
                    <option value="">All Blood Types</option>
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => searchDonors()}
                    className="bg-gradient-to-r from-rose-500 to-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-rose-600 hover:to-red-700 transition flex items-center gap-2"
                  >
                    <Search size={18} />
                    Search
                  </button>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  {donors.length === 0 ? (
                    <div className="col-span-2 text-center py-12 text-gray-500">
                      Search for donors by blood type
                    </div>
                  ) : (
                    donors.map(donor => (
                      <div key={donor._id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-semibold text-gray-900">{donor.fullName}</div>
                            <div className="text-sm text-gray-600">{donor.location?.city}, {donor.location?.state}</div>
                            <div className="text-xs text-gray-500 mt-1">
                              Donations: {donor.donationsCount || 0}
                            </div>
                          </div>
                          <div className="text-2xl font-bold text-rose-600">{donor.bloodType}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === 'camps' && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Donation Camps</h2>
                <div className="grid gap-4">
                  {camps.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      No donation camps scheduled
                    </div>
                  ) : (
                    camps.map(camp => (
                      <div key={camp._id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition">
                        <h3 className="text-xl font-bold text-gray-900 mb-2">{camp.name}</h3>
                        <p className="text-gray-600 mb-4">{camp.description}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-700 flex-wrap">
                          <div className="flex items-center gap-2">
                            <Calendar size={16} className="text-gray-400" />
                            {new Date(camp.date).toLocaleDateString()}
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin size={16} className="text-gray-400" />
                            {camp.location.venue}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === 'banks' && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Blood Banks</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  {bloodBanks.length === 0 ? (
                    <div className="col-span-2 text-center py-12 text-gray-500">
                      No blood banks registered
                    </div>
                  ) : (
                    bloodBanks.map(bank => (
                      <div key={bank._id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition">
                        <h3 className="text-lg font-bold text-gray-900 mb-2">{bank.name}</h3>
                        <div className="space-y-2 text-sm text-gray-700">
                          <div className="flex items-center gap-2">
                            <MapPin size={16} className="text-gray-400 flex-shrink-0" />
                            <span>{bank.location.address}</span>
                          </div>
                          <div>{bank.contact.phone}</div>
                          <div className="text-xs text-gray-600">Hours: {bank.hours}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
