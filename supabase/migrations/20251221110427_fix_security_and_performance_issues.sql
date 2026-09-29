/*
  # Fix Security and Performance Issues

  ## Changes Made

  1. **Add Missing Foreign Key Indexes**
     - Add indexes for all foreign key columns to improve query performance
     - blood_banks.hospital_id
     - blood_requests.requester_id
     - donation_camps.organizer_id
     - donation_history foreign keys (donor_id, recipient_id, blood_request_id, blood_bank_id)

  2. **Optimize RLS Policies**
     - Wrap all auth.uid() calls with (select auth.uid()) to prevent re-evaluation per row
     - This significantly improves query performance at scale

  3. **Fix Function Search Path**
     - Set explicit search_path for update_updated_at_column function
     - Prevents security issues with mutable search paths
*/

-- Add missing foreign key indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_blood_banks_hospital_id ON blood_banks(hospital_id);
CREATE INDEX IF NOT EXISTS idx_blood_requests_requester_id ON blood_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_donation_camps_organizer_id ON donation_camps(organizer_id);
CREATE INDEX IF NOT EXISTS idx_donation_history_donor_id ON donation_history(donor_id);
CREATE INDEX IF NOT EXISTS idx_donation_history_recipient_id ON donation_history(recipient_id);
CREATE INDEX IF NOT EXISTS idx_donation_history_blood_request_id ON donation_history(blood_request_id);
CREATE INDEX IF NOT EXISTS idx_donation_history_blood_bank_id ON donation_history(blood_bank_id);

-- Drop existing RLS policies to recreate them with optimizations
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can create blood requests" ON blood_requests;
DROP POLICY IF EXISTS "Users can update their own requests" ON blood_requests;
DROP POLICY IF EXISTS "Users can delete their own requests" ON blood_requests;
DROP POLICY IF EXISTS "Hospitals can create blood banks" ON blood_banks;
DROP POLICY IF EXISTS "Hospitals can update their blood banks" ON blood_banks;
DROP POLICY IF EXISTS "Hospitals can create camps" ON donation_camps;
DROP POLICY IF EXISTS "Organizers can update their camps" ON donation_camps;
DROP POLICY IF EXISTS "Users can view their donation history" ON donation_history;
DROP POLICY IF EXISTS "Donors can create donation records" ON donation_history;
DROP POLICY IF EXISTS "Users can view their notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their notifications" ON notifications;
DROP POLICY IF EXISTS "Users can delete their notifications" ON notifications;

-- Recreate optimized RLS policies for profiles
CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

-- Recreate optimized RLS policies for blood_requests
CREATE POLICY "Users can create blood requests"
  ON blood_requests FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = requester_id);

CREATE POLICY "Users can update their own requests"
  ON blood_requests FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = requester_id)
  WITH CHECK ((select auth.uid()) = requester_id);

CREATE POLICY "Users can delete their own requests"
  ON blood_requests FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = requester_id);

-- Recreate optimized RLS policies for blood_banks
CREATE POLICY "Hospitals can create blood banks"
  ON blood_banks FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role IN ('hospital', 'admin')
    )
  );

CREATE POLICY "Hospitals can update their blood banks"
  ON blood_banks FOR UPDATE
  TO authenticated
  USING (
    hospital_id = (select auth.uid()) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    hospital_id = (select auth.uid()) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'admin'
    )
  );

-- Recreate optimized RLS policies for donation_camps
CREATE POLICY "Hospitals can create camps"
  ON donation_camps FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role IN ('hospital', 'admin')
    )
  );

CREATE POLICY "Organizers can update their camps"
  ON donation_camps FOR UPDATE
  TO authenticated
  USING (
    organizer_id = (select auth.uid()) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    organizer_id = (select auth.uid()) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'admin'
    )
  );

-- Recreate optimized RLS policies for donation_history
CREATE POLICY "Users can view their donation history"
  ON donation_history FOR SELECT
  TO authenticated
  USING (
    donor_id = (select auth.uid()) OR
    recipient_id = (select auth.uid()) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role IN ('hospital', 'admin')
    )
  );

CREATE POLICY "Donors can create donation records"
  ON donation_history FOR INSERT
  TO authenticated
  WITH CHECK (
    donor_id = (select auth.uid()) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role IN ('hospital', 'admin')
    )
  );

-- Recreate optimized RLS policies for notifications
CREATE POLICY "Users can view their notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can update their notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete their notifications"
  ON notifications FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- Fix function search path to prevent security vulnerabilities
-- Drop triggers first
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
DROP TRIGGER IF EXISTS update_blood_banks_updated_at ON blood_banks;

-- Drop and recreate function with proper search_path
DROP FUNCTION IF EXISTS update_updated_at_column();

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Recreate triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_blood_banks_updated_at
  BEFORE UPDATE ON blood_banks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
