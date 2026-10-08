import { useState, useEffect, useCallback } from 'react';
import { useMongoAuth } from '../contexts/useMongoAuth';
import { api } from '../lib/api';
import {
  LogOut,
  Check,
  X,
  AlertTriangle,
  Users,
  Droplet,
  Calendar,
  Building2,
  TrendingUp,
  Shield
} from 'lucide-react';

interface AdminUser { _id: string; fullName: string; email: string; role: string; bloodType?: string; isActive: boolean }
interface AdminItem {
  _id: string;
  name?: string;
  patientName?: string;
  bloodType?: string;
  status?: string;
  urgency?: string;
  unitsNeeded?: number;
  reason?: string;
  requiredBy?: string;
  hospital?: { name?: string; address?: string };
  requester?: { fullName?: string; email?: string };
  organizer?: { fullName?: string; email?: string };
  date?: string;
  startTime?: string;
  endTime?: string;
  description?: string;
  location?: { address?: string; city?: string; venue?: string };
  contact?: { phone?: string };
  hours?: string;
}
interface DashboardStats {
  users: { total: number; activeDonors: number };
  requests: { total: number; pending: number };
  camps: { active: number; pending: number };
  bloodBanks: { approved: number; pending: number };
  recent: { requests: AdminItem[]; users: AdminUser[] };
}
interface PendingItems { requests: AdminItem[]; camps: AdminItem[]; bloodBanks: AdminItem[] }

export function AdminPanel() {
  const { user, token, signOut } = useMongoAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [pending, setPending] = useState<PendingItems>({ requests: [], camps: [], bloodBanks: [] });
  const [users, setUsers] = useState<AdminUser[]>([]);

  const loadDashboard = useCallback(async () => {
    if (!token) return;
    try {
      const data = await api.admin.getDashboard(token);
      setStats(data);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    }
  }, [token]);

  const loadPending = useCallback(async () => {
    if (!token) return;
    try {
      const data = await api.admin.getPending(token);
      setPending(data);
    } catch (error) {
      console.error('Failed to load pending items:', error);
    }
  }, [token]);

  const loadUsers = async () => {
    if (!token) return;
    try {
      const data = await api.admin.getUsers({}, token);
      setUsers(data.users);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  useEffect(() => {
    void loadDashboard();
    void loadPending();
  }, [loadDashboard, loadPending]);

  const handleModerateRequest = async (id: string, status: string, notes: string = '') => {
    if (!token) return;
    try {
      await api.bloodRequests.moderate(id, { status, moderationNotes: notes }, token);
      loadPending();
      loadDashboard();
    } catch (error) {
      console.error('Failed to moderate request:', error);
    }
  };

  const handleModerateCamp = async (id: string, status: string, notes: string = '') => {
    if (!token) return;
    try {
      await api.camps.moderate(id, { status, moderationNotes: notes }, token);
      loadPending();
      loadDashboard();
    } catch (error) {
      console.error('Failed to moderate camp:', error);
    }
  };

  const handleModerateBloodBank = async (id: string, status: string) => {
    if (!token) return;
    try {
      await api.bloodBanks.moderate(id, { status }, token);
      loadPending();
      loadDashboard();
    } catch (error) {
      console.error('Failed to moderate blood bank:', error);
    }
  };

  const handleUpdateUserStatus = async (userId: string, isActive: boolean) => {
    if (!token) return;
    try {
      await api.admin.updateUser(userId, { isActive }, token);
      loadUsers();
    } catch (error) {
      console.error('Failed to update user:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <Shield size={28} />
              <div>
                <div className="font-bold text-lg">Admin Panel</div>
                <div className="text-xs text-rose-100">LifeLink Management</div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-sm font-medium">{user?.fullName}</div>
                <div className="text-xs text-rose-100">Administrator</div>
              </div>
              <button
                onClick={signOut}
                className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-8">
          <div className="border-b border-gray-200">
            <div className="flex gap-1 p-2">
              {[
                { id: 'dashboard', label: 'Dashboard', icon: TrendingUp },
                { id: 'pending', label: 'Pending Approvals', icon: AlertTriangle },
                { id: 'users', label: 'Users', icon: Users }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    if (tab.id === 'users') loadUsers();
                  }}
                  className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition ${
                    activeTab === tab.id
                      ? 'bg-rose-100 text-rose-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <tab.icon size={18} />
                  {tab.label}
                  {tab.id === 'pending' && (
                    <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                      {(pending.requests?.length || 0) + (pending.camps?.length || 0) + (pending.bloodBanks?.length || 0)}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="p-6">
            {activeTab === 'dashboard' && stats && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">System Overview</h2>

                <div className="grid md:grid-cols-4 gap-6 mb-8">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
                    <Users className="text-blue-600 mb-3" size={32} />
                    <div className="text-3xl font-bold text-blue-900 mb-1">{stats.users.total}</div>
                    <div className="text-sm text-blue-700">Total Users</div>
                    <div className="text-xs text-blue-600 mt-2">{stats.users.activeDonors} active donors</div>
                  </div>

                  <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-6 border border-red-200">
                    <Droplet className="text-red-600 mb-3" size={32} />
                    <div className="text-3xl font-bold text-red-900 mb-1">{stats.requests.total}</div>
                    <div className="text-sm text-red-700">Blood Requests</div>
                    <div className="text-xs text-red-600 mt-2">{stats.requests.pending} pending</div>
                  </div>

                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border border-orange-200">
                    <Calendar className="text-orange-600 mb-3" size={32} />
                    <div className="text-3xl font-bold text-orange-900 mb-1">{stats.camps.active}</div>
                    <div className="text-sm text-orange-700">Active Camps</div>
                    <div className="text-xs text-orange-600 mt-2">{stats.camps.pending} pending</div>
                  </div>

                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
                    <Building2 className="text-green-600 mb-3" size={32} />
                    <div className="text-3xl font-bold text-green-900 mb-1">{stats.bloodBanks.approved}</div>
                    <div className="text-sm text-green-700">Blood Banks</div>
                    <div className="text-xs text-green-600 mt-2">{stats.bloodBanks.pending} pending</div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <Droplet size={20} className="text-red-600" />
                      Recent Requests
                    </h3>
                    <div className="space-y-3">
                      {stats.recent.requests.slice(0, 5).map((req) => (
                        <div key={req._id} className="flex justify-between items-center text-sm">
                          <div>
                            <div className="font-medium text-gray-900">{req.patientName}</div>
                            <div className="text-gray-600">{req.bloodType} - {req.hospital?.name}</div>
                          </div>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            req.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            req.status === 'approved' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {req.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <Users size={20} className="text-blue-600" />
                      Recent Users
                    </h3>
                    <div className="space-y-3">
                      {stats.recent.users.slice(0, 5).map((u) => (
                        <div key={u._id} className="flex justify-between items-center text-sm">
                          <div>
                            <div className="font-medium text-gray-900">{u.fullName}</div>
                            <div className="text-gray-600">{u.email}</div>
                          </div>
                          <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                            {u.role}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'pending' && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Pending Approvals</h2>

                {pending.requests.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Droplet size={20} className="text-red-600" />
                      Blood Requests ({pending.requests.length})
                    </h3>
                    <div className="space-y-4">
                      {pending.requests.map((req) => (
                        <div key={req._id} className="bg-white border border-gray-200 rounded-lg p-6">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h4 className="font-bold text-gray-900 text-lg">{req.patientName}</h4>
                              <div className="text-sm text-gray-600 mt-1">
                                Requested by: {req.requester?.fullName} ({req.requester?.email})
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-bold text-rose-600">{req.bloodType}</div>
                              <div className="text-sm text-gray-600">{req.unitsNeeded} units</div>
                            </div>
                          </div>

                          <div className="bg-gray-50 rounded-lg p-4 mb-4">
                            <div className="text-sm text-gray-700 mb-2"><strong>Reason:</strong> {req.reason}</div>
                            <div className="text-sm text-gray-700 mb-2">
                              <strong>Hospital:</strong> {req.hospital?.name}, {req.hospital?.address}
                            </div>
                            <div className="text-sm text-gray-700 mb-2">
                              <strong>Urgency:</strong> <span className="capitalize font-medium">{req.urgency}</span>
                            </div>
                            <div className="text-sm text-gray-700">
                              <strong>Required by:</strong> {new Date(req.requiredBy || '').toLocaleDateString()}
                            </div>
                          </div>

                          <div className="flex gap-3">
                            <button
                              onClick={() => handleModerateRequest(req._id, 'approved')}
                              className="flex-1 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition flex items-center justify-center gap-2"
                            >
                              <Check size={18} />
                              Approve
                            </button>
                            <button
                              onClick={() => {
                                const notes = prompt('Reason for rejection:');
                                if (notes) handleModerateRequest(req._id, 'rejected', notes);
                              }}
                              className="flex-1 bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition flex items-center justify-center gap-2"
                            >
                              <X size={18} />
                              Reject
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {pending.camps.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Calendar size={20} className="text-orange-600" />
                      Donation Camps ({pending.camps.length})
                    </h3>
                    <div className="space-y-4">
                      {pending.camps.map((camp) => (
                        <div key={camp._id} className="bg-white border border-gray-200 rounded-lg p-6">
                          <h4 className="font-bold text-gray-900 text-lg mb-2">{camp.name}</h4>
                          <div className="text-sm text-gray-600 mb-4">
                            Organized by: {camp.organizer?.fullName} ({camp.organizer?.email})
                          </div>
                          <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-2 text-sm text-gray-700">
                            <div><strong>Date:</strong> {new Date(camp.date || '').toLocaleDateString()}</div>
                            <div><strong>Time:</strong> {camp.startTime} - {camp.endTime}</div>
                            <div><strong>Venue:</strong> {camp.location?.venue}</div>
                            <div><strong>Description:</strong> {camp.description}</div>
                          </div>
                          <div className="flex gap-3">
                            <button
                              onClick={() => handleModerateCamp(camp._id, 'approved')}
                              className="flex-1 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition flex items-center justify-center gap-2"
                            >
                              <Check size={18} />
                              Approve
                            </button>
                            <button
                              onClick={() => {
                                const notes = prompt('Reason for rejection:');
                                if (notes) handleModerateCamp(camp._id, 'rejected', notes);
                              }}
                              className="flex-1 bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition flex items-center justify-center gap-2"
                            >
                              <X size={18} />
                              Reject
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {pending.bloodBanks.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Building2 size={20} className="text-blue-600" />
                      Blood Banks ({pending.bloodBanks.length})
                    </h3>
                    <div className="space-y-4">
                      {pending.bloodBanks.map((bank) => (
                        <div key={bank._id} className="bg-white border border-gray-200 rounded-lg p-6">
                          <h4 className="font-bold text-gray-900 text-lg mb-4">{bank.name}</h4>
                          <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-2 text-sm text-gray-700">
                            <div><strong>Address:</strong> {bank.location?.address}, {bank.location?.city}</div>
                            <div><strong>Phone:</strong> {bank.contact?.phone}</div>
                            <div><strong>Hours:</strong> {bank.hours}</div>
                          </div>
                          <div className="flex gap-3">
                            <button
                              onClick={() => handleModerateBloodBank(bank._id, 'approved')}
                              className="flex-1 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition flex items-center justify-center gap-2"
                            >
                              <Check size={18} />
                              Approve
                            </button>
                            <button
                              onClick={() => handleModerateBloodBank(bank._id, 'rejected')}
                              className="flex-1 bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition flex items-center justify-center gap-2"
                            >
                              <X size={18} />
                              Reject
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {pending.requests.length === 0 && pending.camps.length === 0 && pending.bloodBanks.length === 0 && (
                  <div className="text-center py-12">
                    <Check size={48} className="text-green-500 mx-auto mb-4" />
                    <div className="text-xl font-semibold text-gray-900">All caught up!</div>
                    <div className="text-gray-600">No pending approvals at this time.</div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'users' && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">User Management</h2>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Blood Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {users.map((u) => (
                        <tr key={u._id}>
                          <td className="px-6 py-4">
                            <div className="font-medium text-gray-900">{u.fullName}</div>
                            <div className="text-sm text-gray-600">{u.email}</div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-800 capitalize">
                              {u.role}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">{u.bloodType || '-'}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 text-xs font-medium rounded ${
                              u.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {u.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {u.role !== 'admin' && (
                              <button
                                onClick={() => handleUpdateUserStatus(u._id, !u.isActive)}
                                className={`px-3 py-1 text-sm rounded font-medium ${
                                  u.isActive
                                    ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                                }`}
                              >
                                {u.isActive ? 'Deactivate' : 'Activate'}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
