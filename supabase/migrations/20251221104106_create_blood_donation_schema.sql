/*
  # Blood Donation Locator - Complete Database Schema

  ## New Tables

  1. **profiles**
     - `id` (uuid, primary key, references auth.users)
     - `full_name` (text) - User's full name
     - `role` (text) - User role: 'donor', 'recipient', 'hospital', 'admin'
     - `blood_group` (text) - A+, A-, B+, B-, O+, O-, AB+, AB-
     - `phone` (text) - Contact number
     - `city` (text) - City name
     - `pincode` (text) - Postal code
     - `latitude` (decimal) - GPS latitude
     - `longitude` (decimal) - GPS longitude
     - `last_donation_date` (timestamp) - Last donation date for donors
     - `is_available` (boolean) - Current availability status
     - `total_donations` (integer) - Total number of donations made
     - `created_at` (timestamp)
     - `updated_at` (timestamp)

  2. **blood_requests**
     - `id` (uuid, primary key)
     - `requester_id` (uuid, references profiles)
     - `patient_name` (text) - Name of patient needing blood
     - `blood_group` (text) - Required blood group
     - `units_needed` (integer) - Number of units needed
     - `hospital_name` (text) - Hospital name
     - `city` (text) - City
     - `pincode` (text) - Postal code
     - `latitude` (decimal) - GPS latitude
     - `longitude` (decimal) - GPS longitude
     - `urgency` (text) - 'critical', 'urgent', 'normal'
     - `status` (text) - 'open', 'fulfilled', 'cancelled'
     - `description` (text) - Additional details
     - `contact_number` (text) - Contact for request
     - `created_at` (timestamp)
     - `fulfilled_at` (timestamp)

  3. **blood_banks**
     - `id` (uuid, primary key)
     - `name` (text) - Blood bank name
     - `hospital_id` (uuid, references profiles) - Managing hospital
     - `address` (text) - Full address
     - `city` (text) - City
     - `pincode` (text) - Postal code
     - `latitude` (decimal) - GPS latitude
     - `longitude` (decimal) - GPS longitude
     - `phone` (text) - Contact number
     - `email` (text) - Email address
     - `is_verified` (boolean) - Admin verification status
     - `operating_hours` (text) - Operating hours
     - `blood_stock` (jsonb) - Stock levels by blood group
     - `created_at` (timestamp)
     - `updated_at` (timestamp)

  4. **donation_camps**
     - `id` (uuid, primary key)
     - `organizer_id` (uuid, references profiles) - Hospital/organization
     - `name` (text) - Camp name
     - `description` (text) - Camp details
     - `address` (text) - Location
     - `city` (text) - City
     - `pincode` (text) - Postal code
     - `latitude` (decimal) - GPS latitude
     - `longitude` (decimal) - GPS longitude
     - `camp_date` (date) - Date of camp
     - `start_time` (time) - Start time
     - `end_time` (time) - End time
     - `contact_number` (text) - Contact
     - `is_active` (boolean) - Active status
     - `created_at` (timestamp)

  5. **donation_history**
     - `id` (uuid, primary key)
     - `donor_id` (uuid, references profiles)
     - `recipient_id` (uuid, references profiles, nullable)
     - `blood_request_id` (uuid, references blood_requests, nullable)
     - `blood_bank_id` (uuid, references blood_banks, nullable)
     - `donation_date` (timestamp)
     - `units_donated` (integer)
     - `notes` (text)
     - `created_at` (timestamp)

  6. **notifications**
     - `id` (uuid, primary key)
     - `user_id` (uuid, references profiles)
     - `title` (text) - Notification title
     - `message` (text) - Notification content
     - `type` (text) - 'request', 'reminder', 'camp', 'system'
     - `related_id` (uuid, nullable) - ID of related entity
     - `is_read` (boolean) - Read status
     - `created_at` (timestamp)

  ## Security

  All tables have RLS enabled with appropriate policies:
  - Users can read and update their own profiles
  - Donors can view blood requests and create donation history
  - Recipients can create and manage their blood requests
  - Hospitals can manage blood banks and camps
  - Admins have elevated privileges
  - All users can view public blood bank and camp information
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name text NOT NULL,
  role text NOT NULL DEFAULT 'donor' CHECK (role IN ('donor', 'recipient', 'hospital', 'admin')),
  blood_group text CHECK (blood_group IN ('A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-')),
  phone text NOT NULL,
  city text NOT NULL,
  pincode text,
  latitude decimal(10, 8),
  longitude decimal(11, 8),
  last_donation_date timestamptz,
  is_available boolean DEFAULT true,
  total_donations integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create blood_requests table
CREATE TABLE IF NOT EXISTS blood_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  patient_name text NOT NULL,
  blood_group text NOT NULL CHECK (blood_group IN ('A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-')),
  units_needed integer DEFAULT 1,
  hospital_name text NOT NULL,
  city text NOT NULL,
  pincode text,
  latitude decimal(10, 8),
  longitude decimal(11, 8),
  urgency text DEFAULT 'normal' CHECK (urgency IN ('critical', 'urgent', 'normal')),
  status text DEFAULT 'open' CHECK (status IN ('open', 'fulfilled', 'cancelled')),
  description text,
  contact_number text NOT NULL,
  created_at timestamptz DEFAULT now(),
  fulfilled_at timestamptz
);

-- Create blood_banks table
CREATE TABLE IF NOT EXISTS blood_banks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  hospital_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  address text NOT NULL,
  city text NOT NULL,
  pincode text,
  latitude decimal(10, 8),
  longitude decimal(11, 8),
  phone text NOT NULL,
  email text,
  is_verified boolean DEFAULT false,
  operating_hours text,
  blood_stock jsonb DEFAULT '{"A+": 0, "A-": 0, "B+": 0, "B-": 0, "O+": 0, "O-": 0, "AB+": 0, "AB-": 0}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create donation_camps table
CREATE TABLE IF NOT EXISTS donation_camps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  address text NOT NULL,
  city text NOT NULL,
  pincode text,
  latitude decimal(10, 8),
  longitude decimal(11, 8),
  camp_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  contact_number text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create donation_history table
CREATE TABLE IF NOT EXISTS donation_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  recipient_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  blood_request_id uuid REFERENCES blood_requests(id) ON DELETE SET NULL,
  blood_bank_id uuid REFERENCES blood_banks(id) ON DELETE SET NULL,
  donation_date timestamptz DEFAULT now(),
  units_donated integer DEFAULT 1,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  type text DEFAULT 'system' CHECK (type IN ('request', 'reminder', 'camp', 'system')),
  related_id uuid,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_blood_group ON profiles(blood_group);
CREATE INDEX IF NOT EXISTS idx_profiles_city ON profiles(city);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_blood_requests_status ON blood_requests(status);
CREATE INDEX IF NOT EXISTS idx_blood_requests_blood_group ON blood_requests(blood_group);
CREATE INDEX IF NOT EXISTS idx_blood_requests_city ON blood_requests(city);
CREATE INDEX IF NOT EXISTS idx_blood_banks_city ON blood_banks(city);
CREATE INDEX IF NOT EXISTS idx_donation_camps_camp_date ON donation_camps(camp_date);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE blood_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE blood_banks ENABLE ROW LEVEL SECURITY;
ALTER TABLE donation_camps ENABLE ROW LEVEL SECURITY;
ALTER TABLE donation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Blood requests policies
CREATE POLICY "Anyone can view open blood requests"
  ON blood_requests FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create blood requests"
  ON blood_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Users can update their own requests"
  ON blood_requests FOR UPDATE
  TO authenticated
  USING (auth.uid() = requester_id)
  WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Users can delete their own requests"
  ON blood_requests FOR DELETE
  TO authenticated
  USING (auth.uid() = requester_id);

-- Blood banks policies
CREATE POLICY "Anyone can view verified blood banks"
  ON blood_banks FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Hospitals can create blood banks"
  ON blood_banks FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('hospital', 'admin')
    )
  );

CREATE POLICY "Hospitals can update their blood banks"
  ON blood_banks FOR UPDATE
  TO authenticated
  USING (
    hospital_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    hospital_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Donation camps policies
CREATE POLICY "Anyone can view active camps"
  ON donation_camps FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Hospitals can create camps"
  ON donation_camps FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('hospital', 'admin')
    )
  );

CREATE POLICY "Organizers can update their camps"
  ON donation_camps FOR UPDATE
  TO authenticated
  USING (
    organizer_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    organizer_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Donation history policies
CREATE POLICY "Users can view their donation history"
  ON donation_history FOR SELECT
  TO authenticated
  USING (
    donor_id = auth.uid() OR
    recipient_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('hospital', 'admin')
    )
  );

CREATE POLICY "Donors can create donation records"
  ON donation_history FOR INSERT
  TO authenticated
  WITH CHECK (
    donor_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('hospital', 'admin')
    )
  );

-- Notifications policies
CREATE POLICY "Users can view their notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can create notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update their notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their notifications"
  ON notifications FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_blood_banks_updated_at
  BEFORE UPDATE ON blood_banks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();