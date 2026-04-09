import React, { useState, useEffect } from 'react';
import { Profile, PointEntry } from '../types';
import Sidebar from './Sidebar';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  TrendingUp, 
  Star,
  History,
  Users
} from 'lucide-react';
import { cn } from '../lib/utils';

interface ParentDashboardProps {
  profile: Profile;
}

export default function ParentDashboard({ profile }: ParentDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [children, setChildren] = useState<Profile[]>([]);
  const [selectedChild, setSelectedChild] = useState<Profile | null>(null);
  const [points, setPoints] = useState<PointEntry[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchChildren();
    fetchLeaderboard();
  }, []);

  useEffect(() => {
    if (selectedChild) {
      fetchChildPoints(selectedChild.id);
    }
  }, [selectedChild]);

  const fetchChildren = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, tutoring_level:tutoring_levels(*)')
        .eq('parent_id', profile.id);

      if (error) throw error;
      setChildren(data || []);
      if (data && data.length > 0) setSelectedChild(data[0]);
    } catch (error) {
      console.error('Error fetching children:', error);
    }
  };

  const fetchChildPoints = async (childId: string) => {
    try {
      const { data, error } = await supabase
        .from('points')
        .select('*')
        .eq('student_id', childId)
        .order('lesson_date', { ascending: false });

      if (error) throw error;
      setPoints(data || []);
    } catch (error) {
      console.error('Error fetching child points:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const { data, error } = await supabase
        .from('leaderboard')
        .select('*');

      if (error) throw error;
      setLeaderboard(data || []);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    }
  };

  const totalPoints = points.reduce((sum, p) => sum + p.total, 0);
  const rank = selectedChild ? leaderboard.findIndex(l => l.id === selectedChild.id) + 1 : 0;
  
  // Level System Logic
  const level = selectedChild?.tutoring_level?.name || `Level ${Math.floor(totalPoints / 100) + 1}`;
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
        <header className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Parent Dashboard</h1>
            <p className="text-slate-500 mt-1">Monitor your children's UCMAS progress</p>
          </div>
          
          {children.length > 1 && (
            <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
              {children.map(child => (
                <button
                  key={child.id}
                  onClick={() => setSelectedChild(child)}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-semibold transition-all",
                    selectedChild?.id === child.id 
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-100" 
                      : "text-slate-500 hover:bg-slate-50"
                  )}
                >
                  {child.full_name.split(' ')[0]}
                </button>
              ))}
            </div>
          )}
        </header>

        {children.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[60vh] text-center">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <Users className="w-10 h-10 text-slate-400" />
            </div>
            <h2 className="text-xl font-bold text-slate-800">No children linked yet</h2>
            <p className="text-slate-500 mt-2 max-w-md">Please ask your teacher to link your account with your child's account to see their progress.</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                {/* Level Progress */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                      <Star className="w-8 h-8" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Current Level</p>
                      <h2 className="text-2xl font-bold text-slate-900">{level}</h2>
                    </div>
                  </div>
                  <div className="flex-1 w-full max-w-md">
                    <div className="flex justify-between text-sm font-semibold mb-2">
                      <span className="text-indigo-600">{pointsInCurrentLevel} pts</span>
                      <span className="text-slate-400">100 pts</span>
                    </div>
                    <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div 
                        className="h-full bg-indigo-600 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${progressPercentage}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-2 text-right">{100 - pointsInCurrentLevel} pts to next level</p>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
                      <Star className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500 font-medium">Total Points</p>
                      <p className="text-2xl font-bold text-slate-900">{totalPoints}</p>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
                    <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600">
                      <Trophy className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500 font-medium">Current Rank</p>
                      <p className="text-2xl font-bold text-slate-900">#{rank || '-'}</p>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
                      <TrendingUp className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500 font-medium">Last Session</p>
                      <p className="text-2xl font-bold text-slate-900">+{points[0]?.total || 0}</p>
                    </div>
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="p-6 border-b border-slate-100 flex items-center gap-2">
                    <History className="w-5 h-5 text-indigo-600" />
                    <h3 className="text-lg font-bold text-slate-800">{selectedChild?.full_name}'s Point History</h3>
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
                              {new Date(p.lesson_date).toLocaleDateString()}
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
                      </tbody>
                    </table>
                  </div>
                </div>
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
                    <h2 className="text-2xl font-bold">Leaderboard</h2>
                    <p className="text-indigo-100 mt-1">See how {selectedChild?.full_name} compares</p>
                  </div>
                  <div className="p-4">
                    {leaderboard.map((entry, index) => (
                      <div
                        key={entry.id}
                        className={cn(
                          "flex items-center gap-4 p-4 rounded-2xl mb-2 transition-all",
                          entry.id === selectedChild?.id ? "bg-indigo-50 border border-indigo-100" : "hover:bg-slate-50"
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
                          <p className="font-bold text-slate-800">{entry.full_name}</p>
                          {entry.id === selectedChild?.id && <span className="text-xs font-semibold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full">Your Child</span>}
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-black text-indigo-600">{entry.total_points}</p>
                          <p className="text-xs text-slate-500 font-medium">Points</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </main>
    </div>
  );
}
