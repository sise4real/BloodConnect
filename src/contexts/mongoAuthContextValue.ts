import { createContext } from 'react';

export interface MongoUser {
  _id: string;
  email: string;
  fullName: string;
  role: string;
  bloodType?: string;
  location?: {
    type?: 'Point';
    coordinates: [number, number];
    address?: string;
    city?: string;
    state?: string;
  };
  phone?: string;
  availability?: boolean;
}

export interface RegistrationData {
  email: string;
  password: string;
  fullName: string;
  role: 'donor' | 'recipient' | 'hospital';
  bloodType?: string;
  phone: string;
  location: NonNullable<MongoUser['location']>;
}

interface MongoAuthContextType {
  user: MongoUser | null;
  token: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (data: RegistrationData) => Promise<void>;
  signOut: () => void;
  updateUser: (data: Partial<MongoUser>) => Promise<void>;
}

export const MongoAuthContext = createContext<MongoAuthContextType | undefined>(undefined);
