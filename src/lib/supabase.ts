import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type UserRole = 'donor' | 'recipient' | 'hospital' | 'admin';
export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'O+' | 'O-' | 'AB+' | 'AB-';
export type UrgencyLevel = 'critical' | 'urgent' | 'normal';
export type RequestStatus = 'open' | 'fulfilled' | 'cancelled';

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  blood_group?: BloodGroup;
  phone: string;
  city: string;
  pincode?: string;
  latitude?: number;
  longitude?: number;
  last_donation_date?: string;
  is_available: boolean;
  total_donations: number;
  created_at: string;
  updated_at: string;
}

export interface BloodRequest {
  id: string;
  requester_id: string;
  patient_name: string;
  blood_group: BloodGroup;
  units_needed: number;
  hospital_name: string;
  city: string;
  pincode?: string;
  latitude?: number;
  longitude?: number;
  urgency: UrgencyLevel;
  status: RequestStatus;
  description?: string;
  contact_number: string;
  created_at: string;
  fulfilled_at?: string;
}

export interface BloodBank {
  id: string;
  name: string;
  hospital_id?: string;
  address: string;
  city: string;
  pincode?: string;
  latitude?: number;
  longitude?: number;
  phone: string;
  email?: string;
  is_verified: boolean;
  operating_hours?: string;
  blood_stock: Record<BloodGroup, number>;
  created_at: string;
  updated_at: string;
}

export interface DonationCamp {
  id: string;
  organizer_id: string;
  name: string;
  description?: string;
  address: string;
  city: string;
  pincode?: string;
  latitude?: number;
  longitude?: number;
  camp_date: string;
  start_time: string;
  end_time: string;
  contact_number: string;
  is_active: boolean;
  created_at: string;
}

export interface DonationHistory {
  id: string;
  donor_id: string;
  recipient_id?: string;
  blood_request_id?: string;
  blood_bank_id?: string;
  donation_date: string;
  units_donated: number;
  notes?: string;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'request' | 'reminder' | 'camp' | 'system';
  related_id?: string;
  is_read: boolean;
  created_at: string;
}
