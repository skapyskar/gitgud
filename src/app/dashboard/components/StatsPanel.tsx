"use client";

import { useState, useEffect, useCallback } from "react";
import MiniEfficiencyGraph from "./MiniEfficiencyGraph";
import FullPerformanceGraph from "./FullPerformanceGraph";
import ConnectGitHubButton from "./ConnectGitHubButton";
import { Zap, Trophy, Coins, Target, RefreshCw } from "lucide-react";

interface DayLog {
  date: Date;
  totalXP: number;
  tasksDone: number;
  possibleXP: number;
}

const AUTO_REFRESH_INTERVAL = 15 * 60 * 1000; // 15 minutes in milliseconds

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
  isGitHubLinked: boolean;
}

export default function StatsPanel({ user, isGitHubLinked }: StatsPanelProps) {
  const [showFullGraph, setShowFullGraph] = useState(false);
  const [currentDayLogs, setCurrentDayLogs] = useState<DayLog[]>(user?.dayLogs || []);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Sync with props when they change
  useEffect(() => {
    setCurrentDayLogs(user?.dayLogs || []);
  }, [user?.dayLogs]);

  // Refresh function to fetch fresh dayLogs
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/stats/daylogs");
      if (res.ok) {
        const data = await res.json();
        setCurrentDayLogs(data.dayLogs || []);
      }
    } catch (error) {
      console.error("Failed to refresh dayLogs:", error);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Auto-refresh interval
  useEffect(() => {
    const intervalId = setInterval(() => {
      handleRefresh();
    }, AUTO_REFRESH_INTERVAL);

    return () => clearInterval(intervalId);
  }, [handleRefresh]);

  if (!user) {
    return (
      <div className="bg-black/50 backdrop-blur-md border border-red-900/50 p-6 flex items-center justify-center">
        <span className="text-red-500 font-mono animate-pulse">ERROR: USER_SIGNAL_LOST</span>
      </div>
    );
  }

  // Calculate XP Progress (assuming level * 500 for next level, adjust formula as needed)
  const xpForNextLevel = 500;
  const currentLevelProgress = user.xp % 500;
  const xpRemaining = 500 - currentLevelProgress;

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
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-[0.5vw] mb-[1vh]">

        {/* MODULE 1: OPERATOR STATUS (Level & XP) */}
        <div className="lg:col-span-1 bg-black/40 backdrop-blur-sm border border-green-500/30 p-[0.2vw] relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-2 opacity-20">
            <Trophy className="w-16 h-16 text-green-500" />
          </div>

          <h3 className="text-xs font-mono text-green-600 mb-2 flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-sm"></span>
            OPERATOR_LEVEL
          </h3>

          <div className="flex items-end gap-[0.3vw] mb-[0.3vh]">
            <span className="text-[clamp(1.5rem,3.5vw,3rem)] font-bold text-white font-mono tracking-tighter">
              {user.level}
            </span>
            <span className="text-[clamp(0.625rem,0.9vw,0.875rem)] text-green-500 font-mono mb-[0.3vh]">LVL</span>
          </div>

          <div className="space-y-[0.2vh]">
            <div className="flex justify-between text-[clamp(0.5rem,0.7vw,0.75rem)] font-mono text-gray-500">
              <span>PROGRESS</span>
              <span>{Math.floor(currentLevelProgress)} / 500 XP</span>
            </div>
            {/* Cyberpunk Progress Bar */}
            <div className="h-[0.5vh] min-h-[0.3vh] w-full bg-gray-900 border border-green-900/50 relative">
              <div
                className="h-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)] transition-all duration-500"
                style={{ width: `${(currentLevelProgress / 500) * 100}%` }}
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

          <div className="p-3 flex-1">
            <h3 className="text-xs font-mono text-green-600 mb-2 flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-sm"></span>
              COMBAT_METRICS
            </h3>

            <div className="grid grid-cols-2 gap-[0.8vw]">
              {/* Streak */}
              <div>
                <span className="text-[clamp(0.5rem,0.7vw,0.625rem)] text-gray-500 font-mono block mb-1">STREAK</span>
                <div className="flex items-center gap-2 text-yellow-400">
                  <Zap className="w-[1.2vw] h-[1.2vh] min-w-[12px] min-h-[12px] fill-yellow-400" />
                  <span className="text-[clamp(0.875rem,1.8vw,1.5rem)] font-bold font-mono">{user.streakDays}</span>
                </div>
              </div>

              {/* Multiplier */}
              <div className="text-right">
                <span className="text-[clamp(0.5rem,0.7vw,0.625rem)] text-gray-500 font-mono block mb-[0.5vh]">MULTIPLIER</span>
                <div className="text-[clamp(0.875rem,1.8vw,1.5rem)] font-bold text-purple-400 font-mono">
                  x{user.multiplier.toFixed(2)}
                </div>
              </div>

              {/* Highest XP This Week */}
              <div>
                <span className="text-[clamp(0.5rem,0.7vw,0.625rem)] text-gray-500 font-mono block mb-[0.5vh]">WEEK_HIGH</span>
                <div className="text-[clamp(0.75rem,1.3vw,1.25rem)] font-bold text-cyan-400 font-mono">
                  {highestXPThisWeek}
                </div>
              </div>

              {/* Highest XP Ever */}
              <div className="text-right">
                <span className="text-[clamp(0.5rem,0.7vw,0.625rem)] text-gray-500 font-mono block mb-[0.5vh]">ALL_TIME_HIGH</span>
                <div className="text-[clamp(0.75rem,1.3vw,1.25rem)] font-bold text-orange-400 font-mono">
                  {highestXPEver}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom: Currency */}
          <div className="p-[1vw] bg-green-900/5 border-t border-green-500/30 flex items-center justify-between">
            <div className="flex items-center gap-[0.5vw]">
              <Coins className="w-[1.5vw] h-[1.5vh] min-w-[12px] min-h-[12px] text-yellow-500" />
              <span className="text-[clamp(0.625rem,0.8vw,0.75rem)] text-green-600 font-mono">CREDITS_BALANCE</span>
            </div>
            <span className="text-[clamp(0.875rem,1.5vw,1.25rem)] font-bold text-yellow-500 font-mono tabular-nums">
              {user.coins?.toLocaleString() || 0}
            </span>
          </div>
        </div>

        {/* MODULE 3: EFFICIENCY LOG (Single Graph) */}
        <div className="md:col-span-2 lg:col-span-2 bg-black/40 backdrop-blur-sm border border-green-500/30 flex flex-col relative">
          <div className="absolute top-2 right-2 flex gap-1">
            <div className="w-1 h-1 bg-green-500 rounded-full animate-ping"></div>
          </div>

          <div className="p-2 border-b border-green-500/30 flex justify-between items-center bg-green-500/5">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-mono text-green-500">
                EFFICIENCY_RATE
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="text-[10px] hover:bg-green-500/20 text-green-400 px-2 py-0.5 border border-green-500/30 transition-colors flex items-center gap-1 disabled:opacity-50"
                title="Refresh graph data (auto-refreshes every 15 min)"
              >
                <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'SYNCING...' : '[REFRESH]'}
              </button>
              <button
                onClick={() => setShowFullGraph(true)}
                className="text-[10px] hover:bg-green-500/20 text-green-400 px-2 py-0.5 border border-green-500/30 transition-colors"
              >
                [EXPAND_VIEW]
              </button>
            </div>
          </div>

          <div className="flex-1 p-2 min-h-[60px] flex flex-col justify-end">
            <div className="w-full h-full">
              <MiniEfficiencyGraph
                key={`graph-${currentDayLogs?.map(d => `${d.totalXP}-${d.possibleXP}`).join('-') ?? 'empty'}`}
                dayLogs={currentDayLogs}
                onExpand={() => setShowFullGraph(true)}
              />
            </div>
          </div>
        </div>

        {/* MODULE 4: SYSTEM LOGS */}
        <div className="lg:col-span-1 bg-black/40 backdrop-blur-sm border border-green-500/30 p-[0.5vw]">
          <h3 className="text-xs font-mono text-green-600 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-sm"></span>
            SYSTEM_STATUS
          </h3>

          <div className="space-y-3 text-xs font-mono">
            {/* System Status - Always show */}
            <div className="flex flex-col items-center justify-center py-6">
              <div className="flex items-center gap-2 mb-3">
                <span className={`w-3 h-3 rounded-full animate-pulse ${!isGitHubLinked ? 'bg-yellow-500' : 'bg-green-500'}`}></span>
              </div>
              <span className={`text-sm font-semibold text-center ${!isGitHubLinked ? 'text-yellow-500' : 'text-green-500'}`}>
                {!isGitHubLinked ? 'System Issues Detected' : 'All Systems Operational'}
              </span>
            </div>

            {/* If issues exist, show them */}
            {!isGitHubLinked && (
              <div className="pt-2 border-t border-green-900/30">
                <div className="text-yellow-600 text-[10px] mb-2">[ISSUES]</div>
                <div className="space-y-2">
                  <div className="flex items-center gap-1 text-yellow-500 text-[10px]">
                    <span>⚠️</span>
                    <span>GitHub not connected</span>
                  </div>
                  <div className="mt-1">
                    <ConnectGitHubButton />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Full Performance Graph Modal */}
      {showFullGraph && (
        <FullPerformanceGraph
          dayLogs={currentDayLogs}
          onClose={() => setShowFullGraph(false)}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
        />
      )}
    </>
  );
}