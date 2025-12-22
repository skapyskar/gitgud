"use client";

import { useState } from "react";
import MiniPerformanceGraph from "./MiniPerformanceGraph";
import FullPerformanceGraph from "./FullPerformanceGraph";
import { Sparkles, Zap, Trophy, TrendingUp, Coins } from "lucide-react";

interface DayLog {
  date: Date;
  totalXP: number;
  tasksDone: number;
}

interface StatsPanelProps {
  user: {
    xp: number;
    level: number;
    streakDays: number;
    multiplier: number;
    coins?: number;
    name?: string | null;
    dayLogs?: DayLog[];
  } | null;
}

export default function StatsPanel({ user }: StatsPanelProps) {
  const [showFullGraph, setShowFullGraph] = useState(false);

  if (!user) {
    return (
      <div className="bg-black/50 backdrop-blur-md border border-red-900/50 p-6 flex items-center justify-center">
        <span className="text-red-500 font-mono animate-pulse">ERROR: USER_SIGNAL_LOST</span>
      </div>
    );
  }

  // Calculate XP Progress (assuming level * 100 for next level, adjust formula as needed)
  const xpForNextLevel = 100; 
  const currentLevelProgress = user.xp % 100;
  const xpRemaining = 100 - currentLevelProgress;

  // Calculate XP earned today
  const today = new Date().toISOString().split('T')[0];
  const todayLog = user.dayLogs?.find(log => {
    const logDate = new Date(log.date).toISOString().split('T')[0];
    return logDate === today;
  });
  const xpEarnedToday = todayLog?.totalXP || 0;

  // Calculate highest XP day this week
  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); // Sunday
  startOfWeek.setHours(0, 0, 0, 0);
  
  const thisWeekLogs = user.dayLogs?.filter(log => {
    const logDate = new Date(log.date);
    return logDate >= startOfWeek;
  }) || [];
  
  const highestXPThisWeek = thisWeekLogs.length > 0 
    ? Math.max(...thisWeekLogs.map(log => log.totalXP))
    : 0;

  // Calculate highest XP day ever
  const highestXPEver = user.dayLogs && user.dayLogs.length > 0
    ? Math.max(...user.dayLogs.map(log => log.totalXP))
    : 0;

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* MODULE 1: OPERATOR STATUS (Level & XP) */}
        <div className="lg:col-span-1 bg-black/40 backdrop-blur-sm border border-green-500/30 p-5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-2 opacity-20">
            <Trophy className="w-16 h-16 text-green-500" />
          </div>
          
          <h3 className="text-xs font-mono text-green-600 mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-sm"></span>
            OPERATOR_LEVEL
          </h3>

          <div className="flex items-end gap-2 mb-2">
            <span className="text-5xl font-bold text-white font-mono tracking-tighter">
              {user.level}
            </span>
            <span className="text-sm text-green-500 font-mono mb-2">LVL</span>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs font-mono text-gray-500">
              <span>PROGRESS</span>
              <span>{Math.floor(currentLevelProgress)} / 100 XP</span>
            </div>
            {/* Cyberpunk Progress Bar */}
            <div className="h-2 w-full bg-gray-900 border border-green-900/50 relative">
              <div 
                className="h-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)] transition-all duration-500"
                style={{ width: `${currentLevelProgress}%` }}
              />
            </div>
            <p className="text-[10px] text-gray-600 font-mono mt-1 text-right">
              {xpRemaining} XP TO UPGRADE
            </p>
          </div>

          <div className="mt-3 pt-3 border-t border-green-900/30 flex items-center justify-between">
            <span className="text-[10px] text-green-600 font-mono">XP_EARNED_TODAY</span>
            <span className="text-sm font-bold text-green-400 font-mono">+{xpEarnedToday}</span>
          </div>
        </div>

        {/* MODULE 2: COMBAT METRICS (Streak, Multiplier, Records) */}
        <div className="lg:col-span-1 bg-black/40 backdrop-blur-sm border border-green-500/30 p-0 flex flex-col">
          
          <div className="p-5 flex-1">
            <h3 className="text-xs font-mono text-green-600 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-sm"></span>
              COMBAT_METRICS
            </h3>

            <div className="grid grid-cols-2 gap-4">
              {/* Streak */}
              <div>
                <span className="text-[10px] text-gray-500 font-mono block mb-1">STREAK</span>
                <div className="flex items-center gap-2 text-yellow-400">
                  <Zap className="w-4 h-4 fill-yellow-400" />
                  <span className="text-2xl font-bold font-mono">{user.streakDays}</span>
                </div>
              </div>

              {/* Multiplier */}
              <div className="text-right">
                <span className="text-[10px] text-gray-500 font-mono block mb-1">MULTIPLIER</span>
                <div className="text-2xl font-bold text-purple-400 font-mono">
                  x{user.multiplier.toFixed(2)}
                </div>
              </div>

              {/* Highest XP This Week */}
              <div>
                <span className="text-[10px] text-gray-500 font-mono block mb-1">WEEK_HIGH</span>
                <div className="text-xl font-bold text-cyan-400 font-mono">
                  {highestXPThisWeek}
                </div>
              </div>

              {/* Highest XP Ever */}
              <div className="text-right">
                <span className="text-[10px] text-gray-500 font-mono block mb-1">ALL_TIME_HIGH</span>
                <div className="text-xl font-bold text-orange-400 font-mono">
                  {highestXPEver}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom: Currency */}
          <div className="p-4 bg-green-900/5 border-t border-green-500/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4 text-yellow-600" />
              <span className="text-xs text-green-600 font-mono">CREDITS_BALANCE</span>
            </div>
            <span className="text-xl font-bold text-yellow-500 font-mono tabular-nums">
              {user.coins?.toLocaleString() || 0}
            </span>
          </div>
        </div>

        {/* MODULE 3: PERFORMANCE LOG (The Graph) */}
        {/* Spans 2 columns on large screens to give the graph breathing room */}
        <div className="md:col-span-2 bg-black/40 backdrop-blur-sm border border-green-500/30 flex flex-col relative">
           <div className="absolute top-2 right-2 flex gap-1">
             <div className="w-1 h-1 bg-green-500 rounded-full animate-ping"></div>
           </div>
           
           <div className="p-3 border-b border-green-500/30 flex justify-between items-center bg-green-500/5">
             <h3 className="text-xs font-mono text-green-500">
               // RECENT_ACTIVITY_LOG
             </h3>
             <button 
                onClick={() => setShowFullGraph(true)}
                className="text-[10px] hover:bg-green-500/20 text-green-400 px-2 py-0.5 border border-green-500/30 transition-colors"
             >
               [EXPAND_VIEW]
             </button>
           </div>
           
           <div className="flex-1 p-4 min-h-[120px] flex flex-col justify-end">
             {/* Pass a height/width to your graph component if needed, 
                 or ensure MiniPerformanceGraph fills the parent */}
             <div className="w-full h-full">
                <MiniPerformanceGraph 
                  dayLogs={user.dayLogs || []} 
                  onExpand={() => setShowFullGraph(true)}
                />
             </div>
           </div>
        </div>

      </div>

      {/* Full Performance Graph Modal */}
      {showFullGraph && (
        <FullPerformanceGraph 
          dayLogs={user.dayLogs || []} 
          onClose={() => setShowFullGraph(false)}
        />
      )}
    </>
  );
}