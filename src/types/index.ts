export type UserRole = 'teacher' | 'student' | 'parent';

export interface TutoringLevel {
  id: string;
  name: string;
  description: string;
}

export interface Profile {
  id: string;
  username: string;
  full_name: string;
  role: UserRole;
  parent_id?: string; // For students, link to parent
  tutoring_level_id?: string;
  tutoring_level?: TutoringLevel;
  created_at: string;
}

export interface PointEntry {
  id: string;
  student_id: string;
  teacher_id: string;
  lesson_date: string;
  arrival: number;
  homework: number;
  classwork: number;
  listening: number;
  number_activity: number;
  total: number;
  created_at: string;
}

export interface StudentWithPoints extends Profile {
  total_points: number;
  last_entry?: PointEntry;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  requirement_type: string;
  requirement_value: number;
}

export interface StudentBadge {
  id: string;
  student_id: string;
  badge_id: string;
  earned_at: string;
  badge?: Badge;
}

export interface PracticeModule {
  id: string;
  title: string;
  subject: string;
  description: string;
  level_required: number;
}

export interface PracticeQuestion {
  id: string;
  module_id: string;
  type: 'multiple-choice' | 'fill-in-blank';
  question: string;
  options?: string[];
  correct_answer: string;
  explanation: string;
}

export interface StudentModuleProgress {
  id: string;
  student_id: string;
  module_id: string;
  score: number;
  completed_at: string;
}
