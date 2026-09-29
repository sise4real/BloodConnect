const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface RequestOptions extends RequestInit {
  token?: string;
}

async function request(endpoint: string, options: RequestOptions = {}) {
  const { token, ...fetchOptions } = options;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...fetchOptions.headers,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
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

export const api = {
  auth: {
    register: (data: any) => request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    login: (credentials: any) => request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),
    getProfile: (token: string) => request('/auth/profile', { token }),
    updateProfile: (data: any, token: string) => request('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
      token,
    }),
  },

  bloodRequests: {
    getAll: (params: any, token: string) => {
      const query = new URLSearchParams(params).toString();
      return request(`/blood-requests?${query}`, { token });
    },
    getById: (id: string, token: string) => request(`/blood-requests/${id}`, { token }),
    create: (data: any, token: string) => request('/blood-requests', {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    }),
    respond: (id: string, data: any, token: string) => request(`/blood-requests/${id}/respond`, {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    }),
    moderate: (id: string, data: any, token: string) => request(`/blood-requests/${id}/moderate`, {
      method: 'PUT',
      body: JSON.stringify(data),
      token,
    }),
    updateResponseStatus: (id: string, data: any, token: string) =>
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
    search: (params: any, token: string) => {
      const query = new URLSearchParams(params).toString();
      return request(`/donors/search?${query}`, { token });
    },
    getById: (id: string, token: string) => request(`/donors/${id}`, { token }),
    getStats: (token: string) => request('/donors/stats', { token }),
    checkEligibility: (token: string) => request('/donors/eligibility', { token }),
    updateDonationHistory: (data: any, token: string) => request('/donors/donation-history', {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    }),
  },

  camps: {
    getAll: (params: any, token: string) => {
      const query = new URLSearchParams(params).toString();
      return request(`/camps?${query}`, { token });
    },
    getById: (id: string, token: string) => request(`/camps/${id}`, { token }),
    create: (data: any, token: string) => request('/camps', {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    }),
    register: (id: string, token: string) => request(`/camps/${id}/register`, {
      method: 'POST',
      token,
    }),
    moderate: (id: string, data: any, token: string) => request(`/camps/${id}/moderate`, {
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
    getAll: (params: any, token: string) => {
      const query = new URLSearchParams(params).toString();
      return request(`/blood-banks?${query}`, { token });
    },
    getById: (id: string, token: string) => request(`/blood-banks/${id}`, { token }),
    create: (data: any, token: string) => request('/blood-banks', {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    }),
    update: (id: string, data: any, token: string) => request(`/blood-banks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
      token,
    }),
    moderate: (id: string, data: any, token: string) => request(`/blood-banks/${id}/moderate`, {
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
    getUsers: (params: any, token: string) => {
      const query = new URLSearchParams(params).toString();
      return request(`/admin/users?${query}`, { token });
    },
    updateUser: (id: string, data: any, token: string) => request(`/admin/users/${id}`, {
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
    getAll: (params: any, token: string) => {
      const query = new URLSearchParams(params).toString();
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
