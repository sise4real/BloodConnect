import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { MongoAuthContext } from './mongoAuthContextValue';
import type { MongoUser, RegistrationData } from './mongoAuthContextValue';

export function MongoAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<MongoUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const signIn = async (email: string, password: string) => {
    const data = await api.auth.login({ email, password });
    setToken(data.token);
    setUser(data);
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data));
  };

  const signUp = async (userData: RegistrationData) => {
    const data = await api.auth.register(userData);
    setToken(data.token);
    setUser(data);
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data));
  };

  const signOut = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const updateUser = async (userData: Partial<MongoUser>) => {
    if (!token) return;
    const data = await api.auth.updateProfile(userData, token);
    setUser({ ...user, ...data });
    localStorage.setItem('user', JSON.stringify({ ...user, ...data }));
  };

  return (
    <MongoAuthContext.Provider value={{ user, token, loading, signIn, signUp, signOut, updateUser }}>
      {children}
    </MongoAuthContext.Provider>
  );
}
