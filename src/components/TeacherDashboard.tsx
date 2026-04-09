import React, { useState, useEffect } from 'react';
import { Profile, PointEntry, TutoringLevel } from '../types';
import Sidebar from './Sidebar';
import { supabase, secondaryAuthClient } from '../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Plus, 
  Trash2, 
  Save, 
  CheckCircle2, 
  XCircle,
  UserPlus,
  Link as LinkIcon,
  ChevronRight,
  Star,
  Calendar,
  Layers,
  Minus
} from 'lucide-react';
import { cn } from '../lib/utils';

interface TeacherDashboardProps {
  profile: Profile;
}

const PointInput = ({ value, onChange, label }: { value: number, onChange: (val: number) => void, label: string }) => (
  <div className="flex flex-col items-center">
    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">{label}</span>
    <div className="flex items-center bg-slate-50 rounded-lg border border-slate-200 p-1 shadow-inner">
      <button 
        onClick={() => onChange(Math.max(0, value - 1))} 
        className="p-1 hover:bg-white hover:shadow-sm rounded text-slate-500 hover:text-indigo-600 transition-all"
      >
        <Minus className="w-3 h-3" />
      </button>
      <input 
        type="number"
        value={value} 
        onChange={e => onChange(Math.max(0, parseInt(e.target.value) || 0))} 
        className="w-8 text-center bg-transparent outline-none font-bold text-slate-700 text-sm" 
      />
      <button 
        onClick={() => onChange(value + 1)} 
        className="p-1 hover:bg-white hover:shadow-sm rounded text-slate-500 hover:text-indigo-600 transition-all"
      >
        <Plus className="w-3 h-3" />
      </button>
    </div>
  </div>
);

export default function TeacherDashboard({ profile }: TeacherDashboardProps) {
  const [activeTab, setActiveTab] = useState('points');
  const [students, setStudents] = useState<Profile[]>([]);
  const [parents, setParents] = useState<Profile[]>([]);
  const [levels, setLevels] = useState<TutoringLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Points State
  const [pointEntries, setPointEntries] = useState<Record<string, Partial<PointEntry>>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0]);

  // Accounts State
  const [newAccount, setNewAccount] = useState({ username: '', fullName: '', role: 'student' as const, password: 'password123', levelId: '' });
  const [linking, setLinking] = useState({ studentId: '', parentId: '' });
  
  // Levels State
  const [newLevel, setNewLevel] = useState({ name: '', description: '' });
  const [assigningLevel, setAssigningLevel] = useState({ studentId: '', levelId: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*, tutoring_level:tutoring_levels(*)')
        .order('full_name');

      if (profilesError) throw profilesError;
      setStudents(profiles.filter(p => p.role === 'student'));
      setParents(profiles.filter(p => p.role === 'parent'));

      const { data: levelsData, error: levelsError } = await supabase
        .from('tutoring_levels')
        .select('*')
        .order('name');
      
      if (levelsError) throw levelsError;
      setLevels(levelsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePointChange = (studentId: string, field: keyof PointEntry, value: number) => {
    setPointEntries(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value,
        student_id: studentId,
        teacher_id: profile.id
      }
    }));
  };

  const savePoints = async (studentId: string) => {
    setSaving(studentId);
    const entry = pointEntries[studentId];
    if (!entry) return;

    try {
      // Use selected date, set time to noon to avoid timezone date shifting
      const dateObj = new Date(sessionDate);
      dateObj.setHours(12, 0, 0, 0);

      const { error } = await supabase.from('points').insert([{
        ...entry,
        created_at: dateObj.toISOString()
      }]);
      if (error) throw error;
      
      // Clear entry after save
      setPointEntries(prev => {
        const next = { ...prev };
        delete next[studentId];
        return next;
      });
      alert('Points saved successfully!');
    } catch (error: any) {
      alert('Error saving points: ' + error.message);
    } finally {
      setSaving(null);
    }
  };

  const createAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const dummyEmail = `${newAccount.username.toLowerCase().replace(/\s+/g, '')}@ucmas.local`;
      const { data, error } = await secondaryAuthClient.auth.signUp({
        email: dummyEmail,
        password: newAccount.password,
      });
      if (error) throw error;

      if (data.user?.identities?.length === 0) {
        throw new Error('An account with this username already exists.');
      }

      if (data.user) {
        const { error: profileError } = await supabase.from('profiles').insert([
          {
            id: data.user.id,
            username: newAccount.username,
            full_name: newAccount.fullName,
            role: newAccount.role,
            tutoring_level_id: newAccount.levelId || null
          },
        ]);
        if (profileError) throw profileError;
        alert('Account created successfully!');
        setNewAccount({ username: '', fullName: '', role: 'student', password: 'password123', levelId: '' });
        fetchData();
      }
    } catch (error: any) {
      alert('Error creating account: ' + error.message);
    }
  };

  const linkAccounts = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ parent_id: linking.parentId })
        .eq('id', linking.studentId);

      if (error) throw error;
      alert('Accounts linked successfully!');
      setLinking({ studentId: '', parentId: '' });
      fetchData();
    } catch (error: any) {
      alert('Error linking accounts: ' + error.message);
    }
  };

  const deleteAccount = async (id: string) => {
    if (!confirm('Are you sure you want to delete this account?')) return;
    try {
      const { error } = await supabase.from('profiles').delete().eq('id', id);
      if (error) throw error;
      fetchData();
    } catch (error: any) {
      alert('Error deleting account: ' + error.message);
    }
  };

  const createLevel = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from('tutoring_levels').insert([newLevel]);
      if (error) throw error;
      alert('Level created successfully!');
      setNewLevel({ name: '', description: '' });
      fetchData();
    } catch (error: any) {
      alert('Error creating level: ' + error.message);
    }
  };

  const assignLevel = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ tutoring_level_id: assigningLevel.levelId || null })
        .eq('id', assigningLevel.studentId);
      
      if (error) throw error;
      alert('Student assigned to level successfully!');
      setAssigningLevel({ studentId: '', levelId: '' });
      fetchData();
    } catch (error: any) {
      alert('Error assigning level: ' + error.message);
    }
  };

  const filteredStudents = students.filter(s => 
    s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
            <h1 className="text-3xl font-bold text-slate-900 capitalize">{activeTab}</h1>
            <p className="text-slate-500 mt-1">Manage your students and tutoring activities</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input 
                type="text" 
                placeholder="Search students..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all w-64 shadow-sm"
              />
            </div>
          </div>
        </header>

        <AnimatePresence mode="wait">
          {activeTab === 'points' && (
            <motion.div
              key="points"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Summary Cards & Date Picker */}
              <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-6">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Students</p>
                    <p className="text-2xl font-bold text-slate-900">{students.length}</p>
                  </div>
                  <div className="w-px h-10 bg-slate-200" />
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Points Pending</p>
                    <p className="text-2xl font-bold text-indigo-600">{Object.keys(pointEntries).length}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200">
                  <Calendar className="w-5 h-5 text-indigo-600" />
                  <div className="flex flex-col">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Session Date</label>
                    <input 
                      type="date" 
                      value={sessionDate}
                      onChange={(e) => setSessionDate(e.target.value)}
                      className="bg-transparent border-none outline-none text-sm font-semibold text-slate-800 p-0 focus:ring-0"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-6 py-5 text-sm font-bold text-slate-700">Student</th>
                        <th className="px-6 py-5 text-center">Points Breakdown</th>
                        <th className="px-6 py-5 text-center text-sm font-bold text-slate-700">Total</th>
                        <th className="px-6 py-5 text-right text-sm font-bold text-slate-700">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredStudents.map((student) => {
                        const entry = pointEntries[student.id] || {};
                        const total = (entry.arrival || 0) + (entry.homework || 0) + (entry.classwork || 0) + (entry.listening || 0) + (entry.number_activity || 0);
                        
                        return (
                          <tr key={student.id} className="hover:bg-slate-50/50 transition-colors group">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-indigo-700 text-sm font-bold shadow-inner">
                                  {student.full_name.charAt(0)}
                                </div>
                                <div>
                                  <span className="font-bold text-slate-800 block">{student.full_name}</span>
                                  {student.tutoring_level && (
                                    <span className="text-[10px] font-semibold bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                      {student.tutoring_level.name}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-center gap-4">
                                <PointInput label="Arrival" value={entry.arrival || 0} onChange={(v) => handlePointChange(student.id, 'arrival', v)} />
                                <PointInput label="Homework" value={entry.homework || 0} onChange={(v) => handlePointChange(student.id, 'homework', v)} />
                                <PointInput label="Classwork" value={entry.classwork || 0} onChange={(v) => handlePointChange(student.id, 'classwork', v)} />
                                <PointInput label="Listening" value={entry.listening || 0} onChange={(v) => handlePointChange(student.id, 'listening', v)} />
                                <PointInput label="Numbers" value={entry.number_activity || 0} onChange={(v) => handlePointChange(student.id, 'number_activity', v)} />
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100">
                                <span className="font-black text-xl text-indigo-600">{total}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button 
                                onClick={() => savePoints(student.id)}
                                disabled={saving === student.id || total === 0}
                                className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-all shadow-sm shadow-indigo-200"
                              >
                                {saving === student.id ? (
                                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <>
                                    <Save className="w-4 h-4" /> Save
                                  </>
                                )}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'levels' && (
            <motion.div
              key="levels"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-8"
            >
              {/* Create Level */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Layers className="text-indigo-600 w-5 h-5" />
                  Create Tutoring Level
                </h3>
                <form onSubmit={createLevel} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Level Name</label>
                    <input 
                      type="text" 
                      required
                      value={newLevel.name}
                      onChange={(e) => setNewLevel({...newLevel, name: e.target.value})}
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="e.g., Foundation, Intermediate"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                    <textarea 
                      value={newLevel.description}
                      onChange={(e) => setNewLevel({...newLevel, description: e.target.value})}
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none h-24"
                      placeholder="Brief description of this level..."
                    />
                  </div>
                  <button type="submit" className="w-full bg-indigo-600 text-white py-2 rounded-xl hover:bg-indigo-700 transition-colors font-semibold">
                    Create Level
                  </button>
                </form>
              </div>

              {/* Assign Level */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <UserPlus className="text-indigo-600 w-5 h-5" />
                  Assign Student to Level
                </h3>
                <form onSubmit={assignLevel} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Select Student</label>
                    <select 
                      required
                      value={assigningLevel.studentId}
                      onChange={(e) => setAssigningLevel({...assigningLevel, studentId: e.target.value})}
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      <option value="">Choose a student...</option>
                      {students.map(s => (
                        <option key={s.id} value={s.id}>{s.full_name} ({s.username})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Select Level</label>
                    <select 
                      value={assigningLevel.levelId}
                      onChange={(e) => setAssigningLevel({...assigningLevel, levelId: e.target.value})}
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      <option value="">None (Remove Level)</option>
                      {levels.map(l => (
                        <option key={l.id} value={l.id}>{l.name}</option>
                      ))}
                    </select>
                  </div>
                  <button type="submit" className="w-full bg-indigo-600 text-white py-2 rounded-xl hover:bg-indigo-700 transition-colors font-semibold">
                    Assign Level
                  </button>
                </form>
              </div>

              {/* Levels List */}
              <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100">
                  <h3 className="text-lg font-bold text-slate-800">All Tutoring Levels</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className="px-6 py-4 text-sm font-semibold text-slate-600">Name</th>
                        <th className="px-6 py-4 text-sm font-semibold text-slate-600">Description</th>
                        <th className="px-6 py-4 text-sm font-semibold text-slate-600">Students Enrolled</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {levels.map((level) => {
                        const enrolledCount = students.filter(s => s.tutoring_level_id === level.id).length;
                        return (
                          <tr key={level.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4 font-bold text-slate-800">{level.name}</td>
                            <td className="px-6 py-4 text-slate-500 text-sm">{level.description}</td>
                            <td className="px-6 py-4">
                              <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 font-bold text-sm">
                                {enrolledCount}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                      {levels.length === 0 && (
                        <tr>
                          <td colSpan={3} className="px-6 py-8 text-center text-slate-500">
                            No levels created yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'accounts' && (
            <motion.div
              key="accounts"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-8"
            >
              {/* Create Account */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <UserPlus className="text-indigo-600 w-5 h-5" />
                  Create New Account
                </h3>
                <form onSubmit={createAccount} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                    <input 
                      type="text" 
                      required
                      value={newAccount.fullName}
                      onChange={(e) => setNewAccount({...newAccount, fullName: e.target.value})}
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="Student Name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
                    <input 
                      type="text" 
                      required
                      value={newAccount.username}
                      onChange={(e) => setNewAccount({...newAccount, username: e.target.value})}
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="student123"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                    <input 
                      type="text" 
                      required
                      value={newAccount.password}
                      onChange={(e) => setNewAccount({...newAccount, password: e.target.value})}
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="password123"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                      <select 
                        value={newAccount.role}
                        onChange={(e) => setNewAccount({...newAccount, role: e.target.value as any})}
                        className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                      >
                        <option value="student">Student</option>
                        <option value="parent">Parent</option>
                        <option value="teacher">Teacher</option>
                      </select>
                    </div>
                    {newAccount.role === 'student' && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Level (Optional)</label>
                        <select 
                          value={newAccount.levelId}
                          onChange={(e) => setNewAccount({...newAccount, levelId: e.target.value})}
                          className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                        >
                          <option value="">None</option>
                          {levels.map(l => (
                            <option key={l.id} value={l.id}>{l.name}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                  <button type="submit" className="w-full bg-indigo-600 text-white py-2 rounded-xl hover:bg-indigo-700 transition-colors font-semibold">
                    Create Account
                  </button>
                </form>
              </div>

              {/* Link Accounts */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <LinkIcon className="text-indigo-600 w-5 h-5" />
                  Link Student to Parent
                </h3>
                <form onSubmit={linkAccounts} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Select Student</label>
                    <select 
                      required
                      value={linking.studentId}
                      onChange={(e) => setLinking({...linking, studentId: e.target.value})}
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      <option value="">Choose a student...</option>
                      {students.map(s => (
                        <option key={s.id} value={s.id}>{s.full_name} ({s.username})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Select Parent</label>
                    <select 
                      required
                      value={linking.parentId}
                      onChange={(e) => setLinking({...linking, parentId: e.target.value})}
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      <option value="">Choose a parent...</option>
                      {parents.map(p => (
                        <option key={p.id} value={p.id}>{p.full_name} ({p.username})</option>
                      ))}
                    </select>
                  </div>
                  <button type="submit" className="w-full bg-indigo-600 text-white py-2 rounded-xl hover:bg-indigo-700 transition-colors font-semibold">
                    Link Accounts
                  </button>
                </form>
              </div>

              {/* Account List */}
              <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                  <h3 className="text-lg font-bold text-slate-800">All Accounts</h3>
                  <span className="text-sm text-slate-500">{students.length + parents.length + 1} Total Accounts</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className="px-6 py-4 text-sm font-semibold text-slate-600">Name</th>
                        <th className="px-6 py-4 text-sm font-semibold text-slate-600">Username</th>
                        <th className="px-6 py-4 text-sm font-semibold text-slate-600">Role & Level</th>
                        <th className="px-6 py-4 text-sm font-semibold text-slate-600">Parent/Child</th>
                        <th className="px-6 py-4 text-sm font-semibold text-slate-600">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {[...students, ...parents].map((acc) => (
                        <tr key={acc.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 font-bold text-slate-800">{acc.full_name}</td>
                          <td className="px-6 py-4 text-slate-500">{acc.username}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <span className={cn(
                                "px-2 py-1 rounded-full text-xs font-semibold capitalize",
                                acc.role === 'student' ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
                              )}>
                                {acc.role}
                              </span>
                              {acc.tutoring_level && (
                                <span className="text-xs font-bold text-slate-500 border border-slate-200 px-2 py-1 rounded-full">
                                  {acc.tutoring_level.name}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-500">
                            {acc.role === 'student' && acc.parent_id ? (
                              <div className="flex items-center gap-1 font-medium">
                                <ChevronRight className="w-4 h-4 text-slate-300" />
                                {parents.find(p => p.id === acc.parent_id)?.full_name}
                              </div>
                            ) : '-'}
                          </td>
                          <td className="px-6 py-4">
                            <button 
                              onClick={() => deleteAccount(acc.id)}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
              <h3 className="text-xl font-bold text-slate-800 mb-6">General Settings</h3>
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                  <div>
                    <p className="font-semibold text-slate-800">Default Points</p>
                    <p className="text-sm text-slate-500">Set the default points for each activity</p>
                  </div>
                  <input type="number" defaultValue={5} className="w-16 px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                  <div>
                    <p className="font-semibold text-slate-800">Email Notifications</p>
                    <p className="text-sm text-slate-500">Notify parents when points are added</p>
                  </div>
                  <div className="w-12 h-6 bg-indigo-600 rounded-full relative cursor-pointer">
                    <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
                  </div>
                </div>
                <button className="w-full bg-slate-800 text-white py-3 rounded-xl font-semibold hover:bg-slate-900 transition-colors">
                  Save Settings
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
