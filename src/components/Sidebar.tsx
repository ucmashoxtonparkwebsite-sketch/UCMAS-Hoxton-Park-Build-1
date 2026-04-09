import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  LayoutDashboard, 
  Users, 
  Settings, 
  LogOut, 
  Trophy, 
  UserCircle,
  Star,
  ChevronLeft,
  ChevronRight,
  Layers
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  role: string;
  fullName: string;
}

export default function Sidebar({ activeTab, setActiveTab, role, fullName }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const teacherTabs = [
    { id: 'points', label: 'Points', icon: Star },
    { id: 'accounts', label: 'Accounts', icon: Users },
    { id: 'levels', label: 'Levels', icon: Layers },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const studentTabs = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'practice', label: 'Practice', icon: Star },
    { id: 'badges', label: 'Badges', icon: Trophy },
    { id: 'leaderboard', label: 'Leaderboard', icon: Users },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const tabs = role === 'teacher' ? teacherTabs : studentTabs;

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <motion.div 
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1, width: isCollapsed ? 80 : 256 }}
      className="bg-white border-r border-slate-200 flex flex-col h-screen sticky top-0 z-20 relative"
    >
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-8 bg-white border border-slate-200 rounded-full p-1 shadow-sm hover:bg-slate-50 text-slate-500 z-30"
      >
        {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>

      <div className={cn("p-6 flex items-center gap-2", isCollapsed ? "justify-center px-0" : "")}>
        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0">HP</div>
        {!isCollapsed && (
          <h2 className="text-xl font-bold text-indigo-600 whitespace-nowrap">
            UCMAS
          </h2>
        )}
      </div>

      <div className="flex-1 px-4 space-y-1 overflow-y-auto overflow-x-hidden">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              title={isCollapsed ? tab.label : undefined}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                isCollapsed ? "justify-center px-0" : "",
                activeTab === tab.id 
                  ? "bg-indigo-50 text-indigo-600 shadow-sm" 
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
              )}
            >
              <Icon className={cn("w-5 h-5 shrink-0", activeTab === tab.id ? "text-indigo-600" : "text-slate-400")} />
              {!isCollapsed && <span className="whitespace-nowrap">{tab.label}</span>}
              {!isCollapsed && activeTab === tab.id && (
                <motion.div 
                  layoutId="activeTab"
                  className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-600"
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="p-4 border-t border-slate-100">
        <div className={cn("flex items-center gap-3 mb-2", isCollapsed ? "justify-center" : "px-4 py-3")}>
          <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold shrink-0">
            {fullName.charAt(0)}
          </div>
          {!isCollapsed && (
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-semibold text-slate-800 truncate">{fullName}</p>
              <p className="text-xs text-slate-500 capitalize">{role}</p>
            </div>
          )}
        </div>
        <button
          onClick={handleLogout}
          title={isCollapsed ? "Sign Out" : undefined}
          className={cn(
            "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-colors",
            isCollapsed ? "justify-center px-0" : ""
          )}
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {!isCollapsed && <span className="whitespace-nowrap">Sign Out</span>}
        </button>
      </div>
    </motion.div>
  );
}
