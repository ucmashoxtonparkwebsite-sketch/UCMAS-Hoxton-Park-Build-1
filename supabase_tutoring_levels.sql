-- Tutoring Levels SQL

-- Create Tutoring Levels Table
CREATE TABLE IF NOT EXISTS tutoring_levels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT
);

-- Add tutoring_level_id to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tutoring_level_id UUID REFERENCES tutoring_levels(id) ON DELETE SET NULL;

-- RLS Policies for tutoring_levels
ALTER TABLE tutoring_levels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read tutoring levels" ON tutoring_levels;
CREATE POLICY "Public read tutoring levels" ON tutoring_levels FOR SELECT USING (true);

DROP POLICY IF EXISTS "Teachers manage tutoring levels" ON tutoring_levels;
CREATE POLICY "Teachers manage tutoring levels" ON tutoring_levels FOR ALL USING (public.is_teacher());

-- Insert some default levels
INSERT INTO tutoring_levels (id, name, description) VALUES
('31000000-0000-0000-0000-000000000001', 'Foundation', 'Basic introduction to concepts.'),
('32000000-0000-0000-0000-000000000002', 'Intermediate', 'Building on foundation skills.'),
('33000000-0000-0000-0000-000000000003', 'Advanced', 'Complex problem solving and speed.')
ON CONFLICT DO NOTHING;
