import React, { useState, useEffect } from 'react';
import { Profile, PointEntry, PracticeModule, Badge, StudentBadge, StudentModuleProgress } from '../types';
import Sidebar from './Sidebar';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  TrendingUp, 
  Star,
  History,
  Users,
  Brain,
  Award,
  PlayCircle,
  CheckCircle2,
  Lock
} from 'lucide-react';
import { cn } from '../lib/utils';
import PracticePlayer from './PracticePlayer';

interface StudentDashboardProps {
  profile: Profile;
}

// Helper to map icon string to Lucide component
const getIcon = (iconName: string) => {
  switch (iconName) {
    case 'Star': return Star;
    case 'Award': return Award;
    case 'Brain': return Brain;
    case 'Trophy': return Trophy;
    default: return Award;
  }
};

export default function StudentDashboard({ profile }: StudentDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [points, setPoints] = useState<PointEntry[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [modules, setModules] = useState<PracticeModule[]>([]);
  const [progress, setProgress] = useState<StudentModuleProgress[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [studentBadges, setStudentBadges] = useState<StudentBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeModule, setActiveModule] = useState<PracticeModule | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch user's points
      const { data: pointsData } = await supabase
        .from('points')
        .select('*')
        .eq('student_id', profile.id)
        .order('created_at', { ascending: false });
      setPoints(pointsData || []);

      // Fetch leaderboard
      const { data: leaderboardData } = await supabase.from('leaderboard').select('*');
      setLeaderboard(leaderboardData || []);

      // Fetch modules
      const { data: modulesData } = await supabase.from('practice_modules').select('*');
      setModules(modulesData || []);

      // Fetch progress
      const { data: progressData } = await supabase.from('student_module_progress').select('*').eq('student_id', profile.id);
      setProgress(progressData || []);

      // Fetch badges
      const { data: badgesData } = await supabase.from('badges').select('*');
      setBadges(badgesData || []);

      // Fetch student badges
      const { data: studentBadgesData } = await supabase.from('student_badges').select('*, badge:badges(*)').eq('student_id', profile.id);
      setStudentBadges(studentBadgesData || []);

    } catch (error) {
      console.error('Error fetching student data:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkAndAwardBadges = async (currentPoints: number, completedModulesCount: number) => {
    const earnedBadgeIds = new Set(studentBadges.map(sb => sb.badge_id));
    const newBadgesToInsert: any[] = [];

    badges.forEach(badge => {
      if (!earnedBadgeIds.has(badge.id)) {
        let earned = false;
        if (badge.requirement_type === 'points' && currentPoints >= badge.requirement_value) {
          earned = true;
        } else if (badge.requirement_type === 'modules' && completedModulesCount >= badge.requirement_value) {
          earned = true;
        }

        if (earned) {
          newBadgesToInsert.push({ student_id: profile.id, badge_id: badge.id });
        }
      }
    });

    if (newBadgesToInsert.length > 0) {
      try {
        await supabase.from('student_badges').insert(newBadgesToInsert);
        // Refetch badges to update UI
        const { data } = await supabase.from('student_badges').select('*, badge:badges(*)').eq('student_id', profile.id);
        setStudentBadges(data || []);
        alert(`Congratulations! You earned ${newBadgesToInsert.length} new badge(s)!`);
      } catch (error) {
        console.error('Error awarding badges:', error);
      }
    }
  };

  const handleModuleComplete = async (score: number) => {
    // Refresh progress
    const { data: progressData } = await supabase.from('student_module_progress').select('*').eq('student_id', profile.id);
    setProgress(progressData || []);
    
    // Check for badges
    const totalPoints = points.reduce((sum, p) => sum + p.total, 0);
    const completedModulesCount = new Set((progressData || []).map(p => p.module_id)).size;
    await checkAndAwardBadges(totalPoints, completedModulesCount);
  };

  const totalPoints = points.reduce((sum, p) => sum + p.total, 0);
  const rank = leaderboard.findIndex(l => l.id === profile.id) + 1;
  
  // Level System Logic
  const level = profile.tutoring_level?.name || `Level ${Math.floor(totalPoints / 100) + 1}`;
  const pointsInCurrentLevel = totalPoints % 100;
  const progressPercentage = (pointsInCurrentLevel / 100) * 100;

  return (
    <div className="flex w-full">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        role={profile.role} 
        fullName={profile.full_name} 
      />
      
      <main className="flex-1 p-8 overflow-y-auto h-screen bg-slate-50">
        {activeModule ? (
          <PracticePlayer 
            module={activeModule} 
            studentId={profile.id} 
            onClose={() => setActiveModule(null)} 
            onComplete={handleModuleComplete}
          />
        ) : (
          <>
            <header className="mb-8 flex justify-between items-end">
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Welcome back, {profile.full_name.split(' ')[0]}!</h1>
                <p className="text-slate-500 mt-1">Track your progress and climb the leaderboard</p>
              </div>
              <div className="text-right">
                <div className="inline-flex items-center gap-2 bg-indigo-100 text-indigo-700 px-4 py-2 rounded-full font-bold text-sm mb-2">
                  <Star className="w-4 h-4" /> {level}
                </div>
                <div className="w-48 h-2 bg-slate-200 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-indigo-600"
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercentage}%` }}
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1 font-medium">{100 - pointsInCurrentLevel} pts to next level</p>
              </div>
            </header>

            <AnimatePresence mode="wait">
              {activeTab === 'overview' && (
                <motion.div
                  key="overview"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-8"
                >
                  {/* Stats Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <motion.div 
                      whileHover={{ y: -5 }}
                      className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4"
                    >
                      <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
                        <Star className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-sm text-slate-500 font-medium">Total Points</p>
                        <p className="text-2xl font-bold text-slate-900">{totalPoints}</p>
                      </div>
                    </motion.div>

                    <motion.div 
                      whileHover={{ y: -5 }}
                      className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4"
                    >
                      <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600">
                        <Trophy className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-sm text-slate-500 font-medium">Current Rank</p>
                        <p className="text-2xl font-bold text-slate-900">#{rank || '-'}</p>
                      </div>
                    </motion.div>

                    <motion.div 
                      whileHover={{ y: -5 }}
                      className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4"
                    >
                      <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
                        <Award className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-sm text-slate-500 font-medium">Badges Earned</p>
                        <p className="text-2xl font-bold text-slate-900">{studentBadges.length}</p>
                      </div>
                    </motion.div>
                  </div>

                  {/* Recent Activity */}
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex items-center gap-2">
                      <History className="w-5 h-5 text-indigo-600" />
                      <h3 className="text-lg font-bold text-slate-800">Recent Point History</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="bg-slate-50">
                            <th className="px-6 py-4 text-sm font-semibold text-slate-600">Date</th>
                            <th className="px-6 py-4 text-sm font-semibold text-slate-600">Arrival</th>
                            <th className="px-6 py-4 text-sm font-semibold text-slate-600">Homework</th>
                            <th className="px-6 py-4 text-sm font-semibold text-slate-600">Classwork</th>
                            <th className="px-6 py-4 text-sm font-semibold text-slate-600">Listening</th>
                            <th className="px-6 py-4 text-sm font-semibold text-slate-600">Numbers</th>
                            <th className="px-6 py-4 text-sm font-semibold text-slate-600">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {points.map((p) => (
                            <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-6 py-4 text-sm text-slate-600">
                                {new Date(p.created_at).toLocaleDateString()}
                              </td>
                              <td className="px-6 py-4 text-sm text-slate-800">{p.arrival}</td>
                              <td className="px-6 py-4 text-sm text-slate-800">{p.homework}</td>
                              <td className="px-6 py-4 text-sm text-slate-800">{p.classwork}</td>
                              <td className="px-6 py-4 text-sm text-slate-800">{p.listening}</td>
                              <td className="px-6 py-4 text-sm text-slate-800">{p.number_activity}</td>
                              <td className="px-6 py-4">
                                <span className="font-bold text-indigo-600">+{p.total}</span>
                              </td>
                            </tr>
                          ))}
                          {points.length === 0 && (
                            <tr>
                              <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                                No point entries found yet. Keep working hard!
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'practice' && (
                <motion.div
                  key="practice"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                >
                  {modules.map((mod) => {
                    const isLocked = level < mod.level_required;
                    const modProgress = progress.filter(p => p.module_id === mod.id);
                    const bestScore = modProgress.length > 0 ? Math.max(...modProgress.map(p => p.score)) : null;

                    return (
                      <motion.div
                        key={mod.id}
                        whileHover={!isLocked ? { y: -5 } : {}}
                        className={cn(
                          "bg-white rounded-2xl p-6 border transition-all relative overflow-hidden",
                          isLocked ? "border-slate-200 opacity-75" : "border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-300 cursor-pointer"
                        )}
                        onClick={() => !isLocked && setActiveModule(mod)}
                      >
                        {isLocked && (
                          <div className="absolute inset-0 bg-slate-50/50 backdrop-blur-[1px] flex flex-col items-center justify-center z-10">
                            <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center mb-2">
                              <Lock className="w-5 h-5 text-slate-400" />
                            </div>
                            <p className="text-sm font-bold text-slate-600">Unlocks at Level {mod.level_required}</p>
                          </div>
                        )}
                        
                        <div className="flex justify-between items-start mb-4">
                          <div className={cn(
                            "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
                            mod.subject === 'arithmetic' ? "bg-blue-100 text-blue-700" :
                            mod.subject === 'algebra' ? "bg-purple-100 text-purple-700" :
                            "bg-emerald-100 text-emerald-700"
                          )}>
                            {mod.subject}
                          </div>
                          {bestScore !== null && (
                            <div className="flex items-center gap-1 text-emerald-600 text-sm font-bold">
                              <CheckCircle2 className="w-4 h-4" /> {bestScore}%
                            </div>
                          )}
                        </div>
                        
                        <h3 className="text-lg font-bold text-slate-800 mb-2">{mod.title}</h3>
                        <p className="text-sm text-slate-500 mb-6 line-clamp-2">{mod.description}</p>
                        
                        <div className="flex items-center text-indigo-600 font-semibold text-sm gap-2">
                          <PlayCircle className="w-5 h-5" /> Start Practice
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>
              )}

              {activeTab === 'badges' && (
                <motion.div
                  key="badges"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6"
                >
                  {badges.map((badge) => {
                    const earned = studentBadges.find(sb => sb.badge_id === badge.id);
                    const Icon = getIcon(badge.icon);
                    
                    return (
                      <div 
                        key={badge.id}
                        className={cn(
                          "bg-white p-6 rounded-2xl border text-center relative overflow-hidden transition-all",
                          earned ? "border-amber-200 shadow-md shadow-amber-100/50" : "border-slate-200 opacity-60 grayscale"
                        )}
                      >
                        {earned && (
                          <div className="absolute -right-6 -top-6 w-24 h-24 bg-amber-100 rounded-full blur-2xl opacity-50" />
                        )}
                        <div className={cn(
                          "w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 shadow-inner",
                          earned ? "bg-gradient-to-br from-amber-300 to-orange-500 text-white" : "bg-slate-100 text-slate-400"
                        )}>
                          <Icon className="w-8 h-8" />
                        </div>
                        <h3 className={cn("font-bold mb-1", earned ? "text-slate-900" : "text-slate-600")}>
                          {badge.name}
                        </h3>
                        <p className="text-xs text-slate-500">{badge.description}</p>
                        {earned && (
                          <p className="text-[10px] font-semibold text-amber-600 mt-4 uppercase tracking-wider">
                            Earned {new Date(earned.earned_at).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </motion.div>
              )}

              {activeTab === 'leaderboard' && (
                <motion.div
                  key="leaderboard"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="max-w-3xl mx-auto"
                >
                  <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
                    <div className="bg-indigo-600 p-8 text-white text-center">
                      <Trophy className="w-12 h-12 mx-auto mb-4 text-amber-300" />
                      <h2 className="text-2xl font-bold">Top Students</h2>
                      <p className="text-indigo-100 mt-1">UCMAS Hoxton Park Champions</p>
                    </div>
                    <div className="p-4">
                      {leaderboard.map((entry, index) => {
                        const entryLevel = Math.floor(entry.total_points / 100) + 1;
                        return (
                          <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            key={entry.id}
                            className={cn(
                              "flex items-center gap-4 p-4 rounded-2xl mb-2 transition-all",
                              entry.id === profile.id ? "bg-indigo-50 border border-indigo-100" : "hover:bg-slate-50"
                            )}
                          >
                            <div className={cn(
                              "w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg",
                              index === 0 ? "bg-amber-100 text-amber-600" :
                              index === 1 ? "bg-slate-200 text-slate-600" :
                              index === 2 ? "bg-orange-100 text-orange-600" :
                              "text-slate-400"
                            )}>
                              {index + 1}
                            </div>
                            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold">
                              {entry.full_name.charAt(0)}
                            </div>
                            <div className="flex-1">
                              <p className="font-bold text-slate-800 flex items-center gap-2">
                                {entry.full_name}
                                <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                  Lvl {entryLevel}
                                </span>
                              </p>
                              {entry.id === profile.id && <span className="text-xs font-semibold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full mt-1 inline-block">You</span>}
                            </div>
                            <div className="text-right">
                              <p className="text-xl font-black text-indigo-600">{entry.total_points}</p>
                              <p className="text-xs text-slate-500 font-medium">Points</p>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'settings' && (
                <motion.div
                  key="settings"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="max-w-2xl bg-white p-8 rounded-2xl shadow-sm border border-slate-200"
                >
                  <h3 className="text-xl font-bold text-slate-800 mb-6">Account Settings</h3>
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                      <input type="text" defaultValue={profile.full_name} className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
                      <input type="text" defaultValue={profile.username} disabled className="w-full px-4 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-500" />
                    </div>
                    <button className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-colors">
                      Update Profile
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </main>
    </div>
  );
}
