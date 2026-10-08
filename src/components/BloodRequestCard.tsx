import { useState } from 'react';
import { MapPin, Clock, AlertCircle, Check, X, User, Phone } from 'lucide-react';
import { useMongoAuth } from '../contexts/useMongoAuth';
import { api } from '../lib/api';

interface BloodRequest {
  _id: string;
  patientName: string;
  bloodType: string;
  unitsNeeded: number;
  urgency: 'critical' | 'urgent' | 'normal';
  reason: string;
  hospital: {
    name: string;
    address: string;
    phone: string;
  };
  location: {
    coordinates: [number, number];
  };
  status: string;
  requiredBy: string;
  responses?: Array<{
    _id: string;
    donor: {
      _id: string;
      fullName: string;
      phone: string;
      bloodType: string;
    };
    status: string;
    notes?: string;
    respondedAt: string;
  }>;
  requester: {
    _id: string;
    fullName: string;
    phone: string;
  };
}

const urgencyColors = {
  critical: 'bg-red-100 text-red-800 border-red-300',
  urgent: 'bg-orange-100 text-orange-800 border-orange-300',
  normal: 'bg-blue-100 text-blue-800 border-blue-300'
};

export function BloodRequestCard({ request, onUpdate }: { request: BloodRequest; onUpdate: () => void }) {
  const { token, user } = useMongoAuth();
  const [responding, setResponding] = useState(false);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const isRequester = user?._id === request.requester._id;
  const hasResponded = request.responses?.some(r => r.donor._id === user?._id);
  const myResponse = request.responses?.find(r => r.donor._id === user?._id);

  const handleRespond = async (status: string) => {
    if (!token) return;
    setLoading(true);
    try {
      await api.bloodRequests.respond(request._id, { status, notes }, token);
      setResponding(false);
      setNotes('');
      onUpdate();
    } catch (error) {
      console.error('Failed to respond:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateResponseStatus = async (responseId: string, status: string) => {
    if (!token) return;
    setLoading(true);
    try {
      await api.bloodRequests.updateResponseStatus(request._id, { responseId, status }, token);
      onUpdate();
    } catch (error) {
      console.error('Failed to update status:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 hover:shadow-lg transition">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-xl font-bold text-gray-900">{request.patientName}</h3>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${urgencyColors[request.urgency]}`}>
              {request.urgency.toUpperCase()}
            </span>
          </div>
          <p className="text-gray-600 text-sm">{request.reason}</p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-rose-600">{request.bloodType}</div>
          <div className="text-sm text-gray-600">{request.unitsNeeded} units</div>
        </div>
      </div>

      <div className="space-y-3 mb-4">
        <div className="flex items-start gap-2 text-sm text-gray-700">
          <MapPin size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
          <div>
            <div className="font-medium">{request.hospital.name}</div>
            <div className="text-gray-600">{request.hospital.address}</div>
            <div className="text-gray-600">{request.hospital.phone}</div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-700">
          <Clock size={16} className="text-gray-400" />
          <span>Required by: {new Date(request.requiredBy).toLocaleDateString()}</span>
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-700">
          <User size={16} className="text-gray-400" />
          <span>Requested by: {request.requester.fullName}</span>
        </div>
      </div>

      {request.status === 'approved' && !isRequester && (
        <div className="border-t pt-4 mt-4">
          {!hasResponded && !responding && (
            <button
              onClick={() => setResponding(true)}
              className="w-full bg-gradient-to-r from-rose-500 to-red-600 text-white py-3 rounded-lg font-semibold hover:from-rose-600 hover:to-red-700 transition shadow-md"
            >
              I Can Help
            </button>
          )}

          {responding && (
            <div className="space-y-3">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes (optional)"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none"
                rows={3}
              />
              <div className="flex gap-3">
                <button
                  onClick={() => handleRespond('accepted')}
                  disabled={loading}
                  className="flex-1 bg-green-600 text-white py-2 rounded-lg font-semibold hover:bg-green-700 transition disabled:opacity-50"
                >
                  <Check size={18} className="inline mr-2" />
                  Accept
                </button>
                <button
                  onClick={() => setResponding(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-400 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {myResponse && (
            <div className={`p-4 rounded-lg border ${
              myResponse.status === 'accepted' ? 'bg-green-50 border-green-300' :
              myResponse.status === 'completed' ? 'bg-blue-50 border-blue-300' :
              'bg-gray-50 border-gray-300'
            }`}>
              <div className="font-medium text-sm mb-1">Your Response: {myResponse.status.toUpperCase()}</div>
              {myResponse.notes && <div className="text-sm text-gray-600">{myResponse.notes}</div>}
            </div>
          )}
        </div>
      )}

      {isRequester && request.responses && request.responses.length > 0 && (
        <div className="border-t pt-4 mt-4">
          <h4 className="font-semibold text-gray-900 mb-3">
            Donor Responses ({request.responses.length})
          </h4>
          <div className="space-y-3">
            {request.responses.map((response) => (
              <div key={response._id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-medium text-gray-900">{response.donor.fullName}</div>
                    <div className="text-sm text-gray-600">{response.donor.bloodType}</div>
                    <div className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                      <Phone size={14} />
                      {response.donor.phone}
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    response.status === 'accepted' ? 'bg-green-100 text-green-800' :
                    response.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {response.status}
                  </span>
                </div>
                {response.notes && (
                  <div className="text-sm text-gray-600 mb-3">{response.notes}</div>
                )}
                {response.status === 'accepted' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleUpdateResponseStatus(response._id, 'completed')}
                      disabled={loading}
                      className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-50"
                    >
                      <Check size={16} className="inline mr-1" />
                      Mark Completed
                    </button>
                    <button
                      onClick={() => handleUpdateResponseStatus(response._id, 'rejected')}
                      disabled={loading}
                      className="flex-1 bg-red-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-red-700 transition disabled:opacity-50"
                    >
                      <X size={16} className="inline mr-1" />
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {request.status === 'pending' && (
        <div className="flex items-center gap-2 text-sm text-orange-600 bg-orange-50 p-3 rounded-lg border border-orange-200">
          <AlertCircle size={16} />
          <span>Pending admin approval</span>
        </div>
      )}
    </div>
  );
}
