"use client";

interface StatsPanelProps {
  user: {
    xp: number;
    level: number;
    streakDays: number;
    multiplier: number;
    coins?: number;
    name?: string | null;
  } | null;
}

export default function StatsPanel({ user }: StatsPanelProps) {
  if (!user) {
    return (
      <div className="bg-black border border-red-600 p-4 shadow-[0_0_10px_rgba(255,0,0,0.2)] h-full flex items-center justify-center">
        <span className="text-red-500 text-xs uppercase">ERROR: USER_DATA_NOT_FOUND</span>
      </div>
    );
  }

  return (
    <div className="bg-black border border-green-600 p-4 shadow-[0_0_10px_rgba(0,255,0,0.2)] h-full flex flex-col justify-center space-y-4">
      
      {/* Level Display */}
      <div>
        <span className="text-xs text-gray-500 block mb-1">LEVEL_STATUS</span>
        <div className="text-3xl font-bold text-white tabular-nums">
          LVL_{user.level}
        </div>
      </div>

      {/* XP Display */}
      <div className="border-t border-gray-800 pt-4">
        <span className="text-xs text-gray-500 block mb-1">CURRENT_XP</span>
        <div className="text-3xl font-bold text-white tabular-nums">
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

      {/* Coins Display (if available) */}
      {user.coins !== undefined && (
        <div className="border-t border-gray-800 pt-4">
          <span className="text-xs text-gray-500 block mb-1">CURRENCY_BALANCE</span>
          <div className="text-2xl font-bold text-yellow-400 tabular-nums">
            {user.coins.toLocaleString()} <span className="text-xs text-gray-400">COINS</span>
          </div>
        </div>
      )}

      {/* Streak & Multiplier Display */}
      <div className="flex justify-between items-end border-t border-gray-800 pt-4">
        <div>
          <span className="text-xs text-gray-500 block mb-1">STREAK_STATUS</span>
          <div className="text-xl text-yellow-400 font-bold tabular-nums flex items-center gap-2">
            {user.streakDays > 0 && <span className="animate-pulse">🔥</span>}
            {user.streakDays} <span className="text-xs text-gray-400">DAYS</span>
          </div>
        </div>
        <div className="text-right">
           <span className="text-xs text-gray-500 block mb-1">MULTIPLIER</span>
           <div className="text-xl text-purple-400 font-bold tabular-nums">
             x{user.multiplier?.toFixed(2) || "1.00"}
           </div>
        </div>
      </div>
    </div>
  );
}