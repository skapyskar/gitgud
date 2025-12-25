"use client";

interface DayLog {
  date: Date;
  totalXP: number;
  tasksDone: number;
  possibleXP?: number;
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
      <div className="flex items-center justify-center h-full text-gray-600 text-xs font-mono" style={{ minHeight: '60px' }}>
        NO_EFFICIENCY_DATA_AVAILABLE
      </div>
    );
  }

  // Calculate efficiency values for each day
  const efficiencyData = last7Days.map((log) => {
    // Use possibleXP if available, otherwise use a reasonable fallback for legacy data
    // For new data, possibleXP is set when tasks are created
    const possibleXP = log.possibleXP ?? (log.tasksDone > 0 ? log.tasksDone * 30 : 0);
    // If no tasks created/possible, efficiency is 100% (nothing to do = perfect)
    // If tasks created but none completed, efficiency = 0%
    const efficiency = possibleXP > 0 ? (log.totalXP / possibleXP) * 100 : 100;
    return Math.min(efficiency, 100); // Cap at 100%
  });

  // Create SVG path for line graph
  const width = 100; // percentage based
  const height = 50; // pixels
  const padding = 5;

  const maxEfficiency = 100;
  const points = efficiencyData.map((eff, index) => {
    const x = padding + (index / (efficiencyData.length - 1 || 1)) * (width - 2 * padding);
    const y = height - padding - (eff / maxEfficiency) * (height - 2 * padding);
    return { x, y, efficiency: eff };
  });

  // Create path string
  const pathD = points.length > 0
    ? `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ')
    : '';

  // Create area path (for gradient fill under line)
  const areaD = points.length > 0
    ? `M ${points[0].x} ${height - padding} L ${points[0].x} ${points[0].y} ` +
    points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ') +
    ` L ${points[points.length - 1].x} ${height - padding} Z`
    : '';

  return (
    <div className="relative w-full h-full" style={{ minHeight: '60px' }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-full"
        preserveAspectRatio="none"
      >
        {/* Gradient definition */}
        <defs>
          <linearGradient id="efficiencyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(34, 197, 94, 0.4)" />
            <stop offset="100%" stopColor="rgba(34, 197, 94, 0)" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map((percent) => {
          const y = height - padding - (percent / 100) * (height - 2 * padding);
          return (
            <line
              key={percent}
              x1={padding}
              y1={y}
              x2={width - padding}
              y2={y}
              stroke="rgba(34, 197, 94, 0.1)"
              strokeWidth="0.3"
            />
          );
        })}

        {/* Area fill */}
        <path d={areaD} fill="url(#efficiencyGradient)" />

        {/* Line */}
        <path
          d={pathD}
          fill="none"
          stroke="rgb(34, 197, 94)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ filter: 'drop-shadow(0 0 3px rgba(34, 197, 94, 0.6))' }}
        />

        {/* Data points */}
        {points.map((point, index) => (
          <circle
            key={index}
            cx={point.x}
            cy={point.y}
            r="2"
            fill="rgb(34, 197, 94)"
            stroke="black"
            strokeWidth="0.5"
            style={{ filter: 'drop-shadow(0 0 2px rgba(34, 197, 94, 0.8))' }}
          />
        ))}
      </svg>

      {/* Day labels */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-between px-1">
        {last7Days.map((log, index) => {
          const date = new Date(log.date);
          const dayLabel = date.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2);
          const isToday = index === last7Days.length - 1;
          return (
            <span
              key={index}
              className={`text-[10px] font-mono ${isToday ? 'text-green-400' : 'text-gray-600'}`}
            >
              {dayLabel}
            </span>
          );
        })}
      </div>

      {/* Y-axis labels */}
      <div className="absolute top-0 bottom-0 left-0 flex flex-col justify-between text-[8px] text-gray-600 font-mono py-1">
        <span>100%</span>
        <span>0%</span>
      </div>
    </div>
  );
}
