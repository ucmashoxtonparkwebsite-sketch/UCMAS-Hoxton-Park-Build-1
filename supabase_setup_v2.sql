-- UCMAS Hoxton Park Supabase Setup SQL (v2 - Username Auth)

-- Enable pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Create Profiles Table (Using username instead of email)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT CHECK (role IN ('teacher', 'student', 'parent')) NOT NULL DEFAULT 'student',
  parent_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Points Table
CREATE TABLE IF NOT EXISTS points (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  teacher_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  arrival INTEGER DEFAULT 0,
  homework INTEGER DEFAULT 0,
  classwork INTEGER DEFAULT 0,
  listening INTEGER DEFAULT 0,
  number_activity INTEGER DEFAULT 0,
  total INTEGER GENERATED ALWAYS AS (arrival + homework + classwork + listening + number_activity) STORED,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE points ENABLE ROW LEVEL SECURITY;

-- 4. Policies for Profiles
-- Everyone can read profiles (for leaderboard and linking)
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON profiles
  FOR SELECT USING (true);

-- Create a SECURITY DEFINER function to check role without triggering RLS (prevents infinite recursion)
CREATE OR REPLACE FUNCTION public.is_teacher()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'teacher'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Only teachers can insert/update profiles
DROP POLICY IF EXISTS "Teachers can manage profiles" ON profiles;
CREATE POLICY "Teachers can manage profiles" ON profiles
  FOR ALL USING (public.is_teacher());

-- Users can update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- 5. Policies for Points
-- Teachers can manage all points
DROP POLICY IF EXISTS "Teachers can manage points" ON points;
CREATE POLICY "Teachers can manage points" ON points
  FOR ALL USING (public.is_teacher());

-- Students can read their own points
DROP POLICY IF EXISTS "Students can view own points" ON points;
CREATE POLICY "Students can view own points" ON points
  FOR SELECT USING (auth.uid() = student_id);

-- Parents can read their children's points
DROP POLICY IF EXISTS "Parents can view children's points" ON points;
CREATE POLICY "Parents can view children's points" ON points
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = student_id AND parent_id = auth.uid()
    )
  );

-- Everyone can read points for leaderboard
DROP POLICY IF EXISTS "Points are viewable for leaderboard" ON points;
CREATE POLICY "Points are viewable for leaderboard" ON points
  FOR SELECT USING (true);

-- 6. Helper Function for Leaderboard
CREATE OR REPLACE VIEW leaderboard AS
  SELECT 
    p.id,
    p.full_name,
    COALESCE(SUM(pt.total), 0) as total_points
  FROM profiles p
  LEFT JOIN points pt ON p.id = pt.student_id
  WHERE p.role = 'student'
  GROUP BY p.id, p.full_name
  ORDER BY total_points DESC;

-- 7. Create Default Admin User (Rohind)
DO $$
DECLARE
  uid UUID := gen_random_uuid();
BEGIN
  -- Insert into auth.users if not exists
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'rohind@ucmas.local') THEN
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, 
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at, 
      confirmation_token, recovery_token, email_change_token_new, email_change
    )
    VALUES (
      uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 
      'rohind@ucmas.local', crypt('Admin', gen_salt('bf')), now(), 
      '{"provider":"email","providers":["email"]}', '{}', now(), now(), 
      '', '', '', ''
    );
    
    -- Insert into public.profiles
    INSERT INTO public.profiles (id, username, full_name, role)
    VALUES (uid, 'Rohind', 'Rohind Admin', 'teacher');
  END IF;
END $$;
