"use client";

interface DayLog {
  date: Date;
  totalXP: number;
  tasksDone: number;
}

interface MiniPerformanceGraphProps {
  dayLogs: DayLog[];
  onExpand: () => void;
}

export default function MiniPerformanceGraph({ dayLogs, onExpand }: MiniPerformanceGraphProps) {
  // Reverse to show oldest to newest (left to right)
  const logs = [...dayLogs].reverse().slice(-4); // Last 4 days
  
  // Find max XP for scaling
  const maxXP = Math.max(...logs.map(log => log.totalXP), 1);
  
  // Get day labels
  const getDayLabel = (date: Date) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[new Date(date).getDay()];
  };

  return (
    <div className="border-l border-green-900/30 pl-6">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs text-gray-500 font-mono uppercase tracking-wider">
          Performance_Log
        </div>
        <button
          onClick={onExpand}
          className="text-xs text-green-500 hover:text-green-400 font-mono border border-green-900/50 px-2 py-1 hover:border-green-700 transition-colors"
          title="View full graph"
        >
          [EXPAND]
        </button>
      </div>
      
      <div className="flex items-end gap-3 h-24">
        {logs.length === 0 ? (
          <div className="text-xs text-gray-600 font-mono flex items-center justify-center w-full">
            [NO_DATA]
          </div>
        ) : (
          logs.map((log, index) => {
            const heightPercent = (log.totalXP / maxXP) * 100;
            const isToday = index === logs.length - 1;
            
            return (
              <div key={index} className="flex flex-col items-center gap-1 flex-1 group relative">
                {/* XP Tooltip */}
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black border border-green-700 px-2 py-1 text-xs text-green-400 font-mono opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                  {log.totalXP} XP
                  <br />
                  {log.tasksDone} tasks
                </div>
                
                {/* Bar */}
                <div className="w-full flex flex-col justify-end h-20 relative">
                  <div 
                    className={`w-full transition-all duration-300 ${
                      isToday 
                        ? 'bg-green-500 shadow-[0_0_10px_rgba(0,255,0,0.5)]' 
                        : 'bg-green-700/50 group-hover:bg-green-600'
                    }`}
                    style={{ height: `${Math.max(heightPercent, 5)}%` }}
                  />
                </div>
                
                {/* Day Label */}
                <div className={`text-xs font-mono ${
                  isToday ? 'text-green-400 font-bold' : 'text-gray-600'
                }`}>
                  {getDayLabel(log.date)}
                </div>
              </div>
            );
          })
        )}
      </div>
      
      {/* Legend */}
      <div className="mt-3 pt-3 border-t border-green-900/30">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-gray-600">XP Trend</span>
          {logs.length > 0 && (
            <span className="text-green-500">
              {logs[logs.length - 1]?.totalXP || 0} today
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
