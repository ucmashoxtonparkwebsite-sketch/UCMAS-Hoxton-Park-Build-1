-- UCMAS Hoxton Park Supabase Setup SQL

-- 1. Create Profiles Table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT CHECK (role IN ('teacher', 'student', 'parent')) NOT NULL DEFAULT 'student',
  parent_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Points Table
CREATE TABLE points (
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
CREATE POLICY "Public profiles are viewable by everyone" ON profiles
  FOR SELECT USING (true);

-- Only teachers can insert/update profiles
CREATE POLICY "Teachers can manage profiles" ON profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'teacher'
    )
  );

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- 5. Policies for Points
-- Teachers can manage all points
CREATE POLICY "Teachers can manage points" ON points
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'teacher'
    )
  );

-- Students can read their own points
CREATE POLICY "Students can view own points" ON points
  FOR SELECT USING (auth.uid() = student_id);

-- Parents can read their children's points
CREATE POLICY "Parents can view children's points" ON points
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = student_id AND parent_id = auth.uid()
    )
  );

-- Everyone can read points for leaderboard (maybe aggregate later, but for now allow select)
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
