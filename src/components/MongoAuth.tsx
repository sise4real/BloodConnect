import { useEffect, useState } from 'react';
import { useMongoAuth } from '../contexts/useMongoAuth';
import { Logo } from './Logo';
import { MapPin, Mail, Lock, User, Phone, Droplet, AlertCircle } from 'lucide-react';
import { useGeolocation } from '../hooks/useGeolocation';
import { api } from '../lib/api';

interface PublicStats {
  registeredUsers: number;
  activeDonors: number;
  successfulDonations: number;
  livesSaved: number;
}

export function MongoAuth() {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    phone: '',
    role: 'donor' as 'donor' | 'recipient' | 'hospital',
    bloodType: 'A+',
    address: '',
    city: '',
    state: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState('');
  const [statsAttempt, setStatsAttempt] = useState(0);

  const { signIn, signUp } = useMongoAuth();
  const {
    coordinates,
    error: geoError,
    loading: geoLoading,
    requestLocation,
  } = useGeolocation();

  useEffect(() => {
    let active = true;
    setStatsLoading(true);
    setStatsError('');
    api.publicStats.get()
      .then((result: PublicStats) => {
        if (active) setStats(result);
      })
      .catch(() => {
        if (active) setStatsError('Statistics are temporarily unavailable.');
      })
      .finally(() => {
        if (active) setStatsLoading(false);
      });
    return () => { active = false; };
  }, [statsAttempt]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await signIn(formData.email, formData.password);
      } else {
        if (!coordinates) {
          setError('Get your location before creating an account.');
          return;
        }

        const userData = {
          ...formData,
          location: {
            type: 'Point' as const,
            coordinates: [coordinates.longitude, coordinates.latitude] as [number, number],
            address: formData.address,
            city: formData.city,
            state: formData.state
          }
        };

        await signUp(userData);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-red-50 flex items-center justify-center p-4">
      <div className="max-w-6xl w-full grid md:grid-cols-2 gap-8 items-center">
        <div className="hidden md:flex flex-col gap-8 p-8">
          <Logo size="large" />
          <div className="space-y-6">
            <h1 className="text-5xl font-bold text-gray-900 leading-tight">
              Save Lives,<br />
              <span className="text-rose-600">Give Blood</span>
            </h1>
            <p className="text-xl text-gray-600 leading-relaxed">
              Join our donor community. Connect with people in need and make a difference.
            </p>
            <div aria-live="polite" className="pt-4">
              {statsLoading && <p className="text-sm text-gray-600">Loading community statistics…</p>}
              {statsError && (
                <div className="flex flex-wrap items-center gap-2 text-sm text-red-700" role="alert">
                  <span>{statsError}</span>
                  <button type="button" className="font-semibold underline" onClick={() => setStatsAttempt(attempt => attempt + 1)}>
                    Retry
                  </button>
                </div>
              )}
              {stats && !statsLoading && !statsError && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <div className="text-3xl font-bold text-rose-600">{stats.registeredUsers.toLocaleString()}</div>
                    <div className="text-sm text-gray-600">Registered users</div>
                  </div>
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <div className="text-3xl font-bold text-rose-600">{stats.activeDonors.toLocaleString()}</div>
                    <div className="text-sm text-gray-600">Active donors</div>
                  </div>
                  {stats.successfulDonations > 0 && (
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                      <div className="text-3xl font-bold text-rose-600">{stats.successfulDonations.toLocaleString()}</div>
                      <div className="text-sm text-gray-600">Successful donations</div>
                    </div>
                  )}
                  {stats.livesSaved > 0 && (
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                      <div className="text-3xl font-bold text-rose-600">{stats.livesSaved.toLocaleString()}</div>
                      <div className="text-sm text-gray-600">Lives Saved</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <div className="md:hidden mb-6 flex justify-center">
            <Logo size="default" />
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </h2>
            <p className="text-gray-600">
              {isLogin ? 'Sign in to continue' : 'Join our community of heroes'}
            </p>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {!isLogin && geoError && (
            <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="text-amber-700 flex-shrink-0 mt-0.5" size={20} />
              <p className="text-sm text-amber-900">{geoError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type="text"
                      required
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none transition"
                      placeholder="John Doe"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Role
                    </label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value as 'donor' | 'recipient' | 'hospital' })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none transition"
                    >
                      <option value="donor">Donor</option>
                      <option value="recipient">Recipient</option>
                      <option value="hospital">Hospital</option>
                    </select>
                  </div>

                  {formData.role === 'donor' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Blood Type
                      </label>
                      <div className="relative">
                        <Droplet className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <select
                          value={formData.bloodType}
                          onChange={(e) => setFormData({ ...formData, bloodType: e.target.value })}
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none transition appearance-none"
                        >
                          {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(type => (
                            <option key={type} value={type}>{type}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none transition"
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none transition"
                    placeholder="123 Main St"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      City
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none transition"
                      placeholder="New York"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      State
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none transition"
                      placeholder="NY"
                    />
                  </div>
                </div>

                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <div className="mb-3 flex items-start gap-2 text-sm text-gray-600">
                    <MapPin className="mt-0.5 flex-shrink-0 text-rose-600" size={18} />
                    <span>
                      {coordinates
                        ? 'Location captured. We use it to find nearby donors and requests.'
                        : 'Share your location to find nearby donors and requests. Your browser will ask only after you click below.'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setError('');
                      requestLocation();
                    }}
                    disabled={geoLoading}
                    className="rounded-lg border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:cursor-wait disabled:opacity-60"
                  >
                    {geoLoading ? 'Getting location…' : coordinates ? 'Refresh my location' : 'Get my location'}
                  </button>
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none transition"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none transition"
                  placeholder="••••••••"
                  minLength={6}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || (!isLogin && geoLoading)}
              className="w-full bg-gradient-to-r from-rose-500 to-red-600 text-white py-3 rounded-lg font-semibold hover:from-rose-600 hover:to-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
            >
              {loading ? 'Please wait...' : isLogin ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
              }}
              className="text-rose-600 hover:text-rose-700 font-medium transition"
            >
              {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
