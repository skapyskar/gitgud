"use client";

import { useState } from "react";
import MiniPerformanceGraph from "./MiniPerformanceGraph";
import FullPerformanceGraph from "./FullPerformanceGraph";

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
      <div className="bg-black border border-red-600 p-4 shadow-[0_0_10px_rgba(255,0,0,0.2)] h-full flex items-center justify-center">
        <span className="text-red-500 text-xs uppercase">ERROR: USER_DATA_NOT_FOUND</span>
      </div>
    );
  }

  return (
    <>
      <div className="bg-black border border-green-600 p-6 shadow-[0_0_10px_rgba(0,255,0,0.2)]">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Stats Grid - Left Side */}
        <div className="lg:col-span-6 grid grid-cols-2 gap-6">
          
          {/* Level Display */}
          <div>
            <span className="text-xs text-gray-500 block mb-1 font-mono">LEVEL_STATUS</span>
            <div className="text-3xl font-bold text-white tabular-nums font-mono">
              LVL_{user.level}
            </div>
          </div>

          {/* XP Display */}
          <div>
            <span className="text-xs text-gray-500 block mb-1 font-mono">CURRENT_XP</span>
            <div className="text-3xl font-bold text-white tabular-nums font-mono">
              {user.xp.toLocaleString()} <span className="text-sm text-green-500">XP</span>
            </div>
            {/* XP Progress Bar */}
            <div className="w-full bg-green-900/30 h-1 mt-2">
              <div 
                className="bg-green-500 h-full shadow-[0_0_10px_rgba(0,255,0,0.5)] transition-all duration-300"
                style={{ width: `${(user.xp % 100)}%` }}
              ></div>
            </div>
          </div>

          {/* Streak Display */}
          <div>
            <span className="text-xs text-gray-500 block mb-1 font-mono">STREAK_STATUS</span>
            <div className="text-3xl text-yellow-400 font-bold tabular-nums flex items-center gap-2 font-mono">
              {user.streakDays > 0 && <span className="animate-pulse">🔥</span>}
              {user.streakDays} <span className="text-sm text-gray-400">DAYS</span>
            </div>
          </div>

          {/* Multiplier Display */}
          <div>
            <span className="text-xs text-gray-500 block mb-1 font-mono">MULTIPLIER</span>
            <div className="text-3xl text-purple-400 font-bold tabular-nums font-mono">
              x{user.multiplier?.toFixed(2) || "1.00"}
            </div>
          </div>
        </div>

        {/* Mini Performance Graph - Right Side */}
        <div className="lg:col-span-6">
          <MiniPerformanceGraph 
            dayLogs={user.dayLogs || []} 
            onExpand={() => setShowFullGraph(true)}
          />
        </div>
      </div>

      {/* Coins Display (if available) - Full Width Below */}
      {user.coins !== undefined && (
        <div className="mt-6 pt-6 border-t border-gray-800">
          <span className="text-xs text-gray-500 block mb-1 font-mono">CURRENCY_BALANCE</span>
          <div className="text-2xl font-bold text-yellow-400 tabular-nums font-mono">
            {user.coins.toLocaleString()} <span className="text-xs text-gray-400">COINS</span>
          </div>
        </div>
      )}
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