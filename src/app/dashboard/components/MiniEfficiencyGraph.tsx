"use client";

import { Target } from "lucide-react";

interface DayLog {
  date: Date;
  totalXP: number;
  tasksDone: number;
  possibleXP?: number; // Add this field to track potential XP
}

interface MiniEfficiencyGraphProps {
  dayLogs: DayLog[];
  onExpand: () => void;
}

export default function MiniEfficiencyGraph({ dayLogs, onExpand }: MiniEfficiencyGraphProps) {
  // Get last 7 days of data
  const last7Days = dayLogs.slice(0, 7).reverse();

  if (last7Days.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-600 text-xs font-mono">
        NO_EFFICIENCY_DATA_AVAILABLE
      </div>
    );
  }

  return (
    <div className="flex items-end justify-between gap-2 h-full px-2">
      {last7Days.map((log, index) => {
        const date = new Date(log.date);
        const dayLabel = date.toLocaleDateString('en-US', { weekday: 'short' });
        
        // Calculate efficiency: (earned XP / possible XP) * 100
        // If possibleXP is not set, estimate based on tasks done (assume 30 XP per task average)
        const possibleXP = log.possibleXP || (log.tasksDone > 0 ? log.tasksDone * 30 : 100);
        const efficiency = possibleXP > 0 ? (log.totalXP / possibleXP) * 100 : 0;
        const cappedEfficiency = Math.min(efficiency, 100); // Cap at 100%
        
        const isToday = index === last7Days.length - 1;
        
        // Color based on efficiency
        let barColor = 'bg-red-500';
        if (efficiency >= 80) barColor = 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)]';
        else if (efficiency >= 50) barColor = 'bg-yellow-500';
        else if (efficiency >= 30) barColor = 'bg-orange-500';
        
        return (
          <div key={log.date.toString()} className="flex-1 flex flex-col items-center gap-1 group relative">
            {/* Bar */}
            <div className="w-full flex items-end justify-center" style={{ height: '80px' }}>
              <div
                className={`w-full transition-all duration-300 ${barColor} ${isToday ? 'ring-1 ring-white/50' : ''}`}
                style={{ height: `${cappedEfficiency}%` }}
              />
            </div>
            
            {/* Label */}
            <span className="text-[10px] text-gray-500 font-mono">{dayLabel}</span>
            
            {/* Tooltip */}
            <div className="absolute bottom-full mb-2 hidden group-hover:block bg-black border border-green-500/50 px-2 py-1 text-xs font-mono whitespace-nowrap z-10">
              <div className="text-green-400">{efficiency.toFixed(1)}%</div>
              <div className="text-gray-500 text-[10px]">{log.totalXP}/{possibleXP} XP</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
