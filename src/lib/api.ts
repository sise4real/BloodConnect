const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface RequestOptions extends RequestInit {
  token?: string;
}

async function request(endpoint: string, options: RequestOptions = {}) {
  const { token, ...fetchOptions } = options;

  const headers = new Headers(fetchOptions.headers);
  headers.set('Content-Type', 'application/json');

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...fetchOptions,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Something went wrong');
  }

  return data;
}

type QueryParams = Record<string, string | number | boolean | undefined>;
const encodeQuery = (params: QueryParams) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) query.set(key, String(value));
  });
  return query.toString();
};

export const api = {
  auth: {
    register: (data: unknown) => request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    login: (credentials: unknown) => request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),
    getProfile: (token: string) => request('/auth/profile', { token }),
    updateProfile: (data: unknown, token: string) => request('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
      token,
    }),
  },

  bloodRequests: {
    getAll: (params: QueryParams, token: string) => {
      const query = encodeQuery(params);
      return request(`/blood-requests?${query}`, { token });
    },
    getById: (id: string, token: string) => request(`/blood-requests/${id}`, { token }),
    create: (data: unknown, token: string) => request('/blood-requests', {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    }),
    respond: (id: string, data: unknown, token: string) => request(`/blood-requests/${id}/respond`, {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    }),
    moderate: (id: string, data: unknown, token: string) => request(`/blood-requests/${id}/moderate`, {
      method: 'PUT',
      body: JSON.stringify(data),
      token,
    }),
    updateResponseStatus: (id: string, data: unknown, token: string) =>
      request(`/blood-requests/${id}/response-status`, {
        method: 'PUT',
        body: JSON.stringify(data),
        token,
      }),
    delete: (id: string, token: string) => request(`/blood-requests/${id}`, {
      method: 'DELETE',
      token,
    }),
  },

  donors: {
    search: (params: QueryParams, token: string) => {
      const query = encodeQuery(params);
      return request(`/donors/search?${query}`, { token });
    },
    getById: (id: string, token: string) => request(`/donors/${id}`, { token }),
    getStats: (token: string) => request('/donors/stats', { token }),
    checkEligibility: (token: string) => request('/donors/eligibility', { token }),
    updateDonationHistory: (data: unknown, token: string) => request('/donors/donation-history', {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    }),
  },

  camps: {
    getAll: (params: QueryParams, token: string) => {
      const query = encodeQuery(params);
      return request(`/camps?${query}`, { token });
    },
    getById: (id: string, token: string) => request(`/camps/${id}`, { token }),
    create: (data: unknown, token: string) => request('/camps', {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    }),
    register: (id: string, token: string) => request(`/camps/${id}/register`, {
      method: 'POST',
      token,
    }),
    moderate: (id: string, data: unknown, token: string) => request(`/camps/${id}/moderate`, {
      method: 'PUT',
      body: JSON.stringify(data),
      token,
    }),
    delete: (id: string, token: string) => request(`/camps/${id}`, {
      method: 'DELETE',
      token,
    }),
  },

  bloodBanks: {
    getAll: (params: QueryParams, token: string) => {
      const query = encodeQuery(params);
      return request(`/blood-banks?${query}`, { token });
    },
    getById: (id: string, token: string) => request(`/blood-banks/${id}`, { token }),
    create: (data: unknown, token: string) => request('/blood-banks', {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    }),
    update: (id: string, data: unknown, token: string) => request(`/blood-banks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
      token,
    }),
    moderate: (id: string, data: unknown, token: string) => request(`/blood-banks/${id}/moderate`, {
      method: 'PUT',
      body: JSON.stringify(data),
      token,
    }),
    delete: (id: string, token: string) => request(`/blood-banks/${id}`, {
      method: 'DELETE',
      token,
    }),
  },

  admin: {
    getDashboard: (token: string) => request('/admin/dashboard', { token }),
    getPending: (token: string) => request('/admin/pending', { token }),
    getUsers: (params: QueryParams, token: string) => {
      const query = encodeQuery(params);
      return request(`/admin/users?${query}`, { token });
    },
    updateUser: (id: string, data: unknown, token: string) => request(`/admin/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
      token,
    }),
    deleteUser: (id: string, token: string) => request(`/admin/users/${id}`, {
      method: 'DELETE',
      token,
    }),
  },

  notifications: {
    getAll: (params: QueryParams, token: string) => {
      const query = encodeQuery(params);
      return request(`/notifications?${query}`, { token });
    },
    getUnreadCount: (token: string) => request('/notifications/unread-count', { token }),
    markAsRead: (id: string, token: string) => request(`/notifications/${id}/read`, {
      method: 'PUT',
      token,
    }),
    markAllAsRead: (token: string) => request('/notifications/read-all', {
      method: 'PUT',
      token,
    }),
    delete: (id: string, token: string) => request(`/notifications/${id}`, {
      method: 'DELETE',
      token,
    }),
  },
};
