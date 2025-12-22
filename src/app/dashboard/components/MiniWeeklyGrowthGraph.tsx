"use client";

import { TrendingUp } from "lucide-react";

interface DayLog {
  date: Date;
  totalXP: number;
  tasksDone: number;
}

interface MiniWeeklyGrowthGraphProps {
  dayLogs: DayLog[];
  onExpand: () => void;
}

export default function MiniWeeklyGrowthGraph({ dayLogs, onExpand }: MiniWeeklyGrowthGraphProps) {
  // Group logs by week (last 4 weeks)
  const getWeekNumber = (date: Date) => {
    const startOfYear = new Date(date.getFullYear(), 0, 1);
    const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
    return Math.ceil((days + startOfYear.getDay() + 1) / 7);
  };

  const weeklyData: { week: string; totalXP: number }[] = [];
  const weekMap = new Map<string, number>();

  // Group by week
  dayLogs.forEach(log => {
    const logDate = new Date(log.date);
    const weekNum = getWeekNumber(logDate);
    const year = logDate.getFullYear();
    const weekKey = `W${weekNum}`;
    
    if (!weekMap.has(weekKey)) {
      weekMap.set(weekKey, 0);
    }
    weekMap.set(weekKey, weekMap.get(weekKey)! + log.totalXP);
  });

  // Get last 4 weeks
  const sortedWeeks = Array.from(weekMap.entries())
    .sort((a, b) => parseInt(a[0].slice(1)) - parseInt(b[0].slice(1)))
    .slice(-4);

  sortedWeeks.forEach(([week, xp]) => {
    weeklyData.push({ week, totalXP: xp });
  });

  const maxXP = Math.max(...weeklyData.map(w => w.totalXP), 1);

  if (weeklyData.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-600 text-xs font-mono">
        NO_WEEKLY_DATA_AVAILABLE
      </div>
    );
  }

  return (
    <div className="flex items-end justify-between gap-2 h-full px-2">
      {weeklyData.map((week, index) => {
        const height = (week.totalXP / maxXP) * 100;
        const isLast = index === weeklyData.length - 1;
        
        return (
          <div key={week.week} className="flex-1 flex flex-col items-center gap-1 group relative">
            {/* Bar */}
            <div className="w-full flex items-end justify-center" style={{ height: '80px' }}>
              <div
                className={`w-full transition-all duration-300 ${
                  isLast 
                    ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)]' 
                    : 'bg-green-700/50'
                }`}
                style={{ height: `${height}%` }}
              />
            </div>
            
            {/* Label */}
            <span className="text-[10px] text-gray-500 font-mono">{week.week}</span>
            
            {/* Tooltip */}
            <div className="absolute bottom-full mb-2 hidden group-hover:block bg-black border border-green-500/50 px-2 py-1 text-xs font-mono whitespace-nowrap z-10">
              <div className="text-green-400">{week.totalXP} XP</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
