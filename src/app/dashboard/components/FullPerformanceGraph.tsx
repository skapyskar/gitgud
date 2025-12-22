"use client";

import { useState } from "react";
import { Activity, BarChart3, Target } from "lucide-react";

interface DayLog {
  date: Date;
  totalXP: number;
  tasksDone: number;
  possibleXP?: number;
}

type GraphType = 'daily' | 'weekly' | 'efficiency';

interface FullPerformanceGraphProps {
  dayLogs: DayLog[];
  onClose: () => void;
  initialGraph?: GraphType;
}

export default function FullPerformanceGraph({ dayLogs, onClose, initialGraph = 'daily' }: FullPerformanceGraphProps) {
  const [activeGraph, setActiveGraph] = useState<GraphType>(initialGraph);
  
  // Prepare data based on active graph type
  const logs = [...dayLogs].reverse().slice(-30); // Last 30 days
  
  // Helper functions
  const formatDate = (date: Date) => {
    const d = new Date(date);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  const getWeekNumber = (date: Date) => {
    const startOfYear = new Date(date.getFullYear(), 0, 1);
    const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
    return Math.ceil((days + startOfYear.getDay() + 1) / 7);
  };

  // Calculate stats
  const totalXP = logs.reduce((sum, log) => sum + log.totalXP, 0);
  const totalTasks = logs.reduce((sum, log) => sum + log.tasksDone, 0);
  const avgXP = logs.length > 0 ? Math.round(totalXP / logs.length) : 0;

  // Prepare weekly data
  const weeklyData: { week: string; totalXP: number }[] = [];
  if (activeGraph === 'weekly') {
    const weekMap = new Map<string, number>();
    dayLogs.forEach(log => {
      const logDate = new Date(log.date);
      const weekNum = getWeekNumber(logDate);
      const weekKey = `W${weekNum}`;
      if (!weekMap.has(weekKey)) {
        weekMap.set(weekKey, 0);
      }
      weekMap.set(weekKey, weekMap.get(weekKey)! + log.totalXP);
    });
    const sortedWeeks = Array.from(weekMap.entries())
      .sort((a, b) => parseInt(a[0].slice(1)) - parseInt(b[0].slice(1)))
      .slice(-12);
    sortedWeeks.forEach(([week, xp]) => {
      weeklyData.push({ week, totalXP: xp });
    });
  }

  // Calculate max values for scaling
  const maxXP = activeGraph === 'weekly' 
    ? Math.max(...weeklyData.map(w => w.totalXP), 1)
    : Math.max(...logs.map(log => log.totalXP), 1);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-black border border-green-600 shadow-[0_0_20px_rgba(0,255,0,0.3)] w-full max-w-6xl max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="border-b border-green-800 p-6 sticky top-0 bg-black z-10">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-2xl font-bold text-green-400 font-mono uppercase tracking-wider">
                &gt;&gt; Performance_Analytics
              </h2>
              <p className="text-xs text-gray-500 mt-1 font-mono">
                Last {logs.length} days of activity
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-red-500 hover:text-red-400 text-2xl font-bold font-mono px-4 py-2 border border-red-900 hover:border-red-700 transition-colors"
            >
              [X]
            </button>
          </div>
          
          {/* Graph Type Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveGraph('daily')}
              className={`flex items-center gap-2 px-4 py-2 font-mono text-sm border transition-colors ${
                activeGraph === 'daily'
                  ? 'bg-green-500/20 border-green-500 text-green-400'
                  : 'bg-black/50 border-green-900/30 text-gray-500 hover:text-green-400'
              }`}
            >
              <Activity className="w-4 h-4" />
              DAILY_XP
            </button>
            <button
              onClick={() => setActiveGraph('weekly')}
              className={`flex items-center gap-2 px-4 py-2 font-mono text-sm border transition-colors ${
                activeGraph === 'weekly'
                  ? 'bg-green-500/20 border-green-500 text-green-400'
                  : 'bg-black/50 border-green-900/30 text-gray-500 hover:text-green-400'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              WEEKLY_GROWTH
            </button>
            <button
              onClick={() => setActiveGraph('efficiency')}
              className={`flex items-center gap-2 px-4 py-2 font-mono text-sm border transition-colors ${
                activeGraph === 'efficiency'
                  ? 'bg-green-500/20 border-green-500 text-green-400'
                  : 'bg-black/50 border-green-900/30 text-gray-500 hover:text-green-400'
              }`}
            >
              <Target className="w-4 h-4" />
              EFFICIENCY_RATE
            </button>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="p-6 border-b border-green-900/30">
          <div className="grid grid-cols-3 gap-6">
            <div className="border border-green-900/30 p-4 bg-green-900/10">
              <div className="text-xs text-gray-500 font-mono mb-1">TOTAL_XP_EARNED</div>
              <div className="text-3xl font-bold text-green-400 font-mono">{totalXP.toLocaleString()}</div>
            </div>
            <div className="border border-blue-900/30 p-4 bg-blue-900/10">
              <div className="text-xs text-gray-500 font-mono mb-1">TOTAL_TASKS_COMPLETED</div>
              <div className="text-3xl font-bold text-blue-400 font-mono">{totalTasks}</div>
            </div>
            <div className="border border-purple-900/30 p-4 bg-purple-900/10">
              <div className="text-xs text-gray-500 font-mono mb-1">AVERAGE_XP/DAY</div>
              <div className="text-3xl font-bold text-purple-400 font-mono">{avgXP}</div>
            </div>
          </div>
        </div>

        {/* Main Graph */}
        <div className="p-6">
          <div className="text-xs text-gray-500 mb-4 font-mono uppercase tracking-wider">
            {activeGraph === 'daily' && 'Daily XP Progress'}
            {activeGraph === 'weekly' && 'Weekly XP Growth'}
            {activeGraph === 'efficiency' && 'Efficiency Rate (XP Earned / Possible XP)'}
          </div>
          
          <div className="relative">
            {/* Y-axis labels */}
            <div className="absolute -left-12 top-0 bottom-12 flex flex-col justify-between text-xs text-gray-600 font-mono">
              {activeGraph === 'efficiency' ? (
                <>
                  <span>100%</span>
                  <span>75%</span>
                  <span>50%</span>
                  <span>25%</span>
                  <span>0%</span>
                </>
              ) : (
                <>
                  <span>{maxXP}</span>
                  <span>{Math.round(maxXP * 0.75)}</span>
                  <span>{Math.round(maxXP * 0.5)}</span>
                  <span>{Math.round(maxXP * 0.25)}</span>
                  <span>0</span>
                </>
              )}
            </div>

            {/* Graph area */}
            <div className="flex items-end gap-1 h-96 border-l border-b border-green-900/30 pl-2 pb-2">
              {activeGraph === 'daily' && (
                logs.length === 0 ? (
                  <div className="text-center text-gray-600 text-sm font-mono flex items-center justify-center w-full">
                    [NO_DATA_AVAILABLE]
                  </div>
                ) : (
                  logs.map((log, index) => {
                    const heightPercent = (log.totalXP / maxXP) * 100;
                    const isToday = index === logs.length - 1;
                    
                    return (
                      <div key={index} className="flex-1 min-w-[20px] flex flex-col items-center group relative">
                        <div className="absolute -top-20 left-1/2 -translate-x-1/2 bg-black border border-green-700 px-3 py-2 text-xs text-green-400 font-mono opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20">
                          <div className="font-bold">{formatDate(log.date)}</div>
                          <div className="mt-1">XP: {log.totalXP}</div>
                          <div>Tasks: {log.tasksDone}</div>
                        </div>
                        
                        <div className="w-full flex flex-col justify-end h-full">
                          <div 
                            className={`w-full transition-all duration-300 ${
                              isToday 
                                ? 'bg-green-500 shadow-[0_0_10px_rgba(0,255,0,0.5)]' 
                                : log.totalXP > avgXP
                                ? 'bg-green-600/80'
                                : 'bg-green-700/50'
                            }`}
                            style={{ height: `${Math.max(heightPercent, 2)}%` }}
                          />
                        </div>
                        
                        {(index % 5 === 0 || isToday) && (
                          <div className={`text-xs font-mono mt-2 ${
                            isToday ? 'text-green-400 font-bold' : 'text-gray-600'
                          }`}>
                            {formatDate(log.date)}
                          </div>
                        )}
                      </div>
                    );
                  })
                )
              )}

              {activeGraph === 'weekly' && (
                weeklyData.length === 0 ? (
                  <div className="text-center text-gray-600 text-sm font-mono flex items-center justify-center w-full">
                    [NO_WEEKLY_DATA_AVAILABLE]
                  </div>
                ) : (
                  weeklyData.map((week, index) => {
                    const heightPercent = (week.totalXP / maxXP) * 100;
                    const isLast = index === weeklyData.length - 1;
                    
                    return (
                      <div key={week.week} className="flex-1 min-w-[40px] flex flex-col items-center group relative">
                        <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-black border border-green-700 px-3 py-2 text-xs text-green-400 font-mono opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20">
                          <div className="font-bold">{week.week}</div>
                          <div className="mt-1">{week.totalXP} XP</div>
                        </div>
                        
                        <div className="w-full flex flex-col justify-end h-full">
                          <div 
                            className={`w-full transition-all duration-300 ${
                              isLast 
                                ? 'bg-green-500 shadow-[0_0_10px_rgba(0,255,0,0.5)]' 
                                : 'bg-green-600/80'
                            }`}
                            style={{ height: `${Math.max(heightPercent, 2)}%` }}
                          />
                        </div>
                        
                        <div className={`text-xs font-mono mt-2 ${isLast ? 'text-green-400 font-bold' : 'text-gray-600'}`}>
                          {week.week}
                        </div>
                      </div>
                    );
                  })
                )
              )}

              {activeGraph === 'efficiency' && (
                logs.length === 0 ? (
                  <div className="text-center text-gray-600 text-sm font-mono flex items-center justify-center w-full">
                    [NO_EFFICIENCY_DATA_AVAILABLE]
                  </div>
                ) : (
                  logs.map((log, index) => {
                    const possibleXP = log.possibleXP || (log.tasksDone > 0 ? log.tasksDone * 30 : 100);
                    const efficiency = possibleXP > 0 ? (log.totalXP / possibleXP) * 100 : 0;
                    const cappedEfficiency = Math.min(efficiency, 100);
                    const isToday = index === logs.length - 1;
                    
                    let barColor = 'bg-red-500';
                    if (efficiency >= 80) barColor = 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)]';
                    else if (efficiency >= 50) barColor = 'bg-yellow-500';
                    else if (efficiency >= 30) barColor = 'bg-orange-500';
                    
                    return (
                      <div key={index} className="flex-1 min-w-[20px] flex flex-col items-center group relative">
                        <div className="absolute -top-20 left-1/2 -translate-x-1/2 bg-black border border-green-700 px-3 py-2 text-xs text-green-400 font-mono opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20">
                          <div className="font-bold">{formatDate(log.date)}</div>
                          <div className="mt-1">{efficiency.toFixed(1)}%</div>
                          <div className="text-gray-500">{log.totalXP}/{possibleXP} XP</div>
                        </div>
                        
                        <div className="w-full flex flex-col justify-end h-full">
                          <div 
                            className={`w-full transition-all duration-300 ${barColor} ${isToday ? 'ring-1 ring-white/50' : ''}`}
                            style={{ height: `${cappedEfficiency}%` }}
                          />
                        </div>
                        
                        {(index % 5 === 0 || isToday) && (
                          <div className={`text-xs font-mono mt-2 ${
                            isToday ? 'text-green-400 font-bold' : 'text-gray-600'
                          }`}>
                            {formatDate(log.date)}
                          </div>
                        )}
                      </div>
                    );
                  })
                )
              )}
            </div>
          </div>

          {/* Legend */}
          <div className="mt-6 pt-6 border-t border-green-900/30 flex items-center justify-between">
            <div className="flex items-center gap-6 text-xs font-mono">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 shadow-[0_0_10px_rgba(0,255,0,0.5)]"></div>
                <span className="text-gray-500">Today</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-600/80"></div>
                <span className="text-gray-500">Above Average</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-700/50"></div>
                <span className="text-gray-500">Below Average</span>
              </div>
            </div>
            <div className="text-xs text-gray-500 font-mono">
              Hover over bars for details
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
