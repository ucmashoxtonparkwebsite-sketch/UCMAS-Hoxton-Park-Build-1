-- Gamification & Practice Modules SQL

-- Badges Table
CREATE TABLE IF NOT EXISTS badges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL, -- lucide icon name
  requirement_type TEXT NOT NULL, -- e.g., 'points', 'modules'
  requirement_value INTEGER NOT NULL
);

-- Student Badges Table
CREATE TABLE IF NOT EXISTS student_badges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  badge_id UUID REFERENCES badges(id) ON DELETE CASCADE NOT NULL,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, badge_id)
);

-- Practice Modules Table
CREATE TABLE IF NOT EXISTS practice_modules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  subject TEXT NOT NULL, -- 'arithmetic', 'algebra', 'problem-solving'
  description TEXT NOT NULL,
  level_required INTEGER DEFAULT 1
);

-- Practice Questions Table
CREATE TABLE IF NOT EXISTS practice_questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id UUID REFERENCES practice_modules(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL, -- 'multiple-choice', 'fill-in-blank'
  question TEXT NOT NULL,
  options JSONB, -- Array of strings for multiple choice
  correct_answer TEXT NOT NULL,
  explanation TEXT NOT NULL
);

-- Student Module Progress
CREATE TABLE IF NOT EXISTS student_module_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  module_id UUID REFERENCES practice_modules(id) ON DELETE CASCADE NOT NULL,
  score INTEGER NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE practice_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE practice_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_module_progress ENABLE ROW LEVEL SECURITY;

-- Public read access for badges, modules, questions
DROP POLICY IF EXISTS "Public read badges" ON badges;
CREATE POLICY "Public read badges" ON badges FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read modules" ON practice_modules;
CREATE POLICY "Public read modules" ON practice_modules FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read questions" ON practice_questions;
CREATE POLICY "Public read questions" ON practice_questions FOR SELECT USING (true);

-- Student read own badges and progress
DROP POLICY IF EXISTS "Students read own badges" ON student_badges;
CREATE POLICY "Students read own badges" ON student_badges FOR SELECT USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Students read own progress" ON student_module_progress;
CREATE POLICY "Students read own progress" ON student_module_progress FOR SELECT USING (auth.uid() = student_id);

-- Students can insert their own progress and badges
DROP POLICY IF EXISTS "Students insert own progress" ON student_module_progress;
CREATE POLICY "Students insert own progress" ON student_module_progress FOR INSERT WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "Students insert own badges" ON student_badges;
CREATE POLICY "Students insert own badges" ON student_badges FOR INSERT WITH CHECK (auth.uid() = student_id);

-- Teachers manage all
DROP POLICY IF EXISTS "Teachers manage badges" ON badges;
CREATE POLICY "Teachers manage badges" ON badges FOR ALL USING (public.is_teacher());

DROP POLICY IF EXISTS "Teachers manage student_badges" ON student_badges;
CREATE POLICY "Teachers manage student_badges" ON student_badges FOR ALL USING (public.is_teacher());

DROP POLICY IF EXISTS "Teachers manage modules" ON practice_modules;
CREATE POLICY "Teachers manage modules" ON practice_modules FOR ALL USING (public.is_teacher());

DROP POLICY IF EXISTS "Teachers manage questions" ON practice_questions;
CREATE POLICY "Teachers manage questions" ON practice_questions FOR ALL USING (public.is_teacher());

DROP POLICY IF EXISTS "Teachers manage progress" ON student_module_progress;
CREATE POLICY "Teachers manage progress" ON student_module_progress FOR ALL USING (public.is_teacher());

-- Insert some default badges
INSERT INTO badges (id, name, description, icon, requirement_type, requirement_value) VALUES
('21000000-0000-0000-0000-000000000001', 'Beginner Scholar', 'Earned 50 points', 'Star', 'points', 50),
('22000000-0000-0000-0000-000000000002', 'Math Whiz', 'Earned 200 points', 'Award', 'points', 200),
('23000000-0000-0000-0000-000000000003', 'Problem Solver', 'Completed 3 practice modules', 'Brain', 'modules', 3)
ON CONFLICT (id) DO NOTHING;

-- Insert some default practice modules
INSERT INTO practice_modules (id, title, subject, description, level_required) VALUES
('11000000-0000-0000-0000-000000000001', 'Basic Addition & Subtraction', 'arithmetic', 'Master the fundamentals of adding and subtracting numbers.', 1),
('12000000-0000-0000-0000-000000000002', 'Introduction to Algebra', 'algebra', 'Learn about variables and basic equations.', 2),
('13000000-0000-0000-0000-000000000003', 'Word Problems 101', 'problem-solving', 'Apply your math skills to real-world scenarios.', 1)
ON CONFLICT (id) DO NOTHING;

-- Insert some default questions
INSERT INTO practice_questions (module_id, type, question, options, correct_answer, explanation) VALUES
('11000000-0000-0000-0000-000000000001', 'multiple-choice', 'What is 15 + 27?', '["32", "42", "52", "40"]', '42', '15 + 20 = 35, and 35 + 7 = 42.'),
('11000000-0000-0000-0000-000000000001', 'fill-in-blank', 'What is 50 - 18?', null, '32', '50 - 10 = 40, and 40 - 8 = 32.'),
('12000000-0000-0000-0000-000000000002', 'multiple-choice', 'Solve for x: 2x = 10', '["3", "4", "5", "6"]', '5', 'Divide both sides by 2 to get x = 5.'),
('12000000-0000-0000-0000-000000000002', 'fill-in-blank', 'If y + 7 = 15, what is y?', null, '8', 'Subtract 7 from both sides: 15 - 7 = 8.'),
('13000000-0000-0000-0000-000000000003', 'multiple-choice', 'If Sarah has 5 apples and buys 3 more, how many does she have?', '["7", "8", "9", "10"]', '8', '5 apples + 3 apples = 8 apples.')
ON CONFLICT DO NOTHING;
