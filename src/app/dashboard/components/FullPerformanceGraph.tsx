"use client";

import { Target, RefreshCw } from "lucide-react";

interface DayLog {
  date: Date;
  totalXP: number;
  tasksDone: number;
  possibleXP?: number;
}

interface FullPerformanceGraphProps {
  dayLogs: DayLog[];
  onClose: () => void;
  initialGraph?: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export default function FullPerformanceGraph({ dayLogs, onClose, onRefresh, isRefreshing }: FullPerformanceGraphProps) {
  // Prepare data - last 30 days
  const logs = [...dayLogs].reverse().slice(-30);

  // Helper function
  const formatDate = (date: Date) => {
    const d = new Date(date);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  // Calculate stats
  const totalXP = logs.reduce((sum, log) => sum + log.totalXP, 0);
  const totalTasks = logs.reduce((sum, log) => sum + log.tasksDone, 0);

  // Calculate efficiency data
  const efficiencyData = logs.map((log) => {
    // Use possibleXP if available, otherwise use a reasonable fallback for legacy data
    const possibleXP = log.possibleXP ?? (log.tasksDone > 0 ? log.tasksDone * 30 : 0);
    // If no tasks created/possible, efficiency is 100% (nothing to do = perfect)
    const efficiency = possibleXP > 0 ? (log.totalXP / possibleXP) * 100 : 100;
    return {
      date: log.date,
      efficiency: Math.min(efficiency, 100),
      earnedXP: log.totalXP,
      possibleXP
    };
  });

  const avgEfficiency = efficiencyData.length > 0
    ? Math.round(efficiencyData.reduce((sum, d) => sum + d.efficiency, 0) / efficiencyData.length)
    : 0;

  // SVG dimensions
  const width = 800;
  const height = 300;
  const padding = { top: 20, right: 30, bottom: 40, left: 50 };
  const graphWidth = width - padding.left - padding.right;
  const graphHeight = height - padding.top - padding.bottom;

  // Create points for the line graph
  const points = efficiencyData.map((data, index) => {
    const x = padding.left + (index / (efficiencyData.length - 1 || 1)) * graphWidth;
    const y = padding.top + (1 - data.efficiency / 100) * graphHeight;
    return { x, y, ...data };
  });

  // Create SVG path
  const pathD = points.length > 0
    ? `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ')
    : '';

  // Create area path
  const areaD = points.length > 0
    ? `M ${points[0].x} ${height - padding.bottom} L ${points[0].x} ${points[0].y} ` +
    points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ') +
    ` L ${points[points.length - 1].x} ${height - padding.bottom} Z`
    : '';

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-black border border-green-600 shadow-[0_0_20px_rgba(0,255,0,0.3)] w-full max-w-4xl max-h-[80vh] overflow-auto">
        {/* Header */}
        <div className="border-b border-green-800 p-6 sticky top-0 bg-black z-10">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Target className="w-6 h-6 text-green-400" />
              <div>
                <h2 className="text-2xl font-bold text-green-400 font-mono uppercase tracking-wider">
                  &gt;&gt; Efficiency_Analytics
                </h2>
                <p className="text-xs text-gray-500 mt-1 font-mono">
                  Last {logs.length} days • Points earned / Possible points
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {onRefresh && (
                <button
                  onClick={onRefresh}
                  disabled={isRefreshing}
                  className="text-green-500 hover:text-green-400 font-bold font-mono px-4 py-2 border border-green-900 hover:border-green-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                  title="Refresh graph data (auto-refreshes every 15 min)"
                >
                  <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  {isRefreshing ? 'SYNCING...' : '[REFRESH]'}
                </button>
              )}
              <button
                onClick={onClose}
                className="text-red-500 hover:text-red-400 text-2xl font-bold font-mono px-4 py-2 border border-red-900 hover:border-red-700 transition-colors"
              >
                [X]
              </button>
            </div>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="p-6 border-b border-green-900/30">
          <div className="grid grid-cols-3 gap-6">
            <div className="border border-green-900/30 p-4 bg-green-900/10">
              <div className="text-xs text-gray-500 font-mono mb-1">AVG_EFFICIENCY</div>
              <div className="text-3xl font-bold text-green-400 font-mono">{avgEfficiency}%</div>
            </div>
            <div className="border border-blue-900/30 p-4 bg-blue-900/10">
              <div className="text-xs text-gray-500 font-mono mb-1">TOTAL_XP_EARNED</div>
              <div className="text-3xl font-bold text-blue-400 font-mono">{totalXP.toLocaleString()}</div>
            </div>
            <div className="border border-purple-900/30 p-4 bg-purple-900/10">
              <div className="text-xs text-gray-500 font-mono mb-1">TASKS_COMPLETED</div>
              <div className="text-3xl font-bold text-purple-400 font-mono">{totalTasks}</div>
            </div>
          </div>
        </div>

        {/* Main Graph */}
        <div className="p-6">
          <div className="text-xs text-gray-500 mb-4 font-mono uppercase tracking-wider">
            Efficiency Rate (Points Earned / Possible Points)
          </div>

          <div className="relative bg-black/50 border border-green-900/30 p-4">
            {logs.length === 0 ? (
              <div className="h-80 flex items-center justify-center text-gray-600 text-sm font-mono">
                [NO_EFFICIENCY_DATA_AVAILABLE]
              </div>
            ) : (
              <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
                {/* Gradient definition */}
                <defs>
                  <linearGradient id="efficiencyGradientFull" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="rgba(34, 197, 94, 0.3)" />
                    <stop offset="100%" stopColor="rgba(34, 197, 94, 0)" />
                  </linearGradient>
                </defs>

                {/* Grid lines */}
                {[0, 25, 50, 75, 100].map((percent) => {
                  const y = padding.top + (1 - percent / 100) * graphHeight;
                  return (
                    <g key={percent}>
                      <line
                        x1={padding.left}
                        y1={y}
                        x2={width - padding.right}
                        y2={y}
                        stroke="rgba(34, 197, 94, 0.1)"
                        strokeWidth="1"
                      />
                      <text
                        x={padding.left - 10}
                        y={y + 4}
                        fill="rgba(107, 114, 128, 1)"
                        fontSize="10"
                        textAnchor="end"
                        fontFamily="monospace"
                      >
                        {percent}%
                      </text>
                    </g>
                  );
                })}

                {/* Area fill */}
                <path d={areaD} fill="url(#efficiencyGradientFull)" />

                {/* Line */}
                <path
                  d={pathD}
                  fill="none"
                  stroke="rgb(34, 197, 94)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ filter: 'drop-shadow(0 0 4px rgba(34, 197, 94, 0.6))' }}
                />

                {/* Data points with tooltips */}
                {points.map((point, index) => (
                  <g key={index} className="group">
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r="4"
                      fill="rgb(34, 197, 94)"
                      stroke="black"
                      strokeWidth="1"
                      className="cursor-pointer hover:r-6"
                      style={{ filter: 'drop-shadow(0 0 3px rgba(34, 197, 94, 0.8))' }}
                    />
                    {/* Tooltip - show on hover via CSS */}
                    <g className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      <rect
                        x={point.x - 50}
                        y={point.y - 55}
                        width="100"
                        height="45"
                        fill="black"
                        stroke="rgb(34, 197, 94)"
                        strokeWidth="1"
                        rx="2"
                      />
                      <text x={point.x} y={point.y - 40} fill="rgb(34, 197, 94)" fontSize="10" textAnchor="middle" fontFamily="monospace">
                        {formatDate(point.date)}
                      </text>
                      <text x={point.x} y={point.y - 27} fill="white" fontSize="11" textAnchor="middle" fontFamily="monospace" fontWeight="bold">
                        {point.efficiency.toFixed(1)}%
                      </text>
                      <text x={point.x} y={point.y - 15} fill="gray" fontSize="9" textAnchor="middle" fontFamily="monospace">
                        {point.earnedXP}/{point.possibleXP} XP
                      </text>
                    </g>

                    {/* X-axis labels (every 5th day) */}
                    {(index % 5 === 0 || index === points.length - 1) && (
                      <text
                        x={point.x}
                        y={height - padding.bottom + 20}
                        fill={index === points.length - 1 ? "rgb(34, 197, 94)" : "rgba(107, 114, 128, 1)"}
                        fontSize="10"
                        textAnchor="middle"
                        fontFamily="monospace"
                        fontWeight={index === points.length - 1 ? "bold" : "normal"}
                      >
                        {formatDate(point.date)}
                      </text>
                    )}
                  </g>
                ))}
              </svg>
            )}
          </div>

          {/* Legend */}
          <div className="mt-6 pt-6 border-t border-green-900/30 flex items-center justify-between">
            <div className="flex items-center gap-6 text-xs font-mono">
              <div className="flex items-center gap-2">
                <div className="w-4 h-1 bg-green-500 shadow-[0_0_10px_rgba(0,255,0,0.5)]"></div>
                <span className="text-gray-500">Efficiency Rate</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500/30"></div>
                <span className="text-gray-500">Area Fill</span>
              </div>
            </div>
            <div className="text-xs text-gray-500 font-mono">
              Hover over points for details
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
