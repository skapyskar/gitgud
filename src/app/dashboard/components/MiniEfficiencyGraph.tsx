"use client";

import { efficiencyOf, DayLogLike } from "./efficiency";

interface MiniEfficiencyGraphProps {
  dayLogs: DayLogLike[];
}

/** Sparkline of the last 7 days' efficiency (earned / possible XP). */
export default function MiniEfficiencyGraph({ dayLogs }: MiniEfficiencyGraphProps) {
  const last7 = dayLogs.slice(0, 7).reverse();

  if (last7.length === 0) {
    return (
      <div className="flex items-center justify-center h-full min-h-[64px] text-ink3 text-xs">
        no data yet — complete something
      </div>
    );
  }

  const width = 100;
  const height = 44;
  const pad = 4;

  const points = last7.map((log, i) => ({
    x: pad + (i / Math.max(1, last7.length - 1)) * (width - 2 * pad),
    y: height - pad - (efficiencyOf(log) / 100) * (height - 2 * pad),
  }));

  const line = `M ${points.map((p) => `${p.x} ${p.y}`).join(" L ")}`;
  const area = `M ${points[0].x} ${height - pad} L ${points
    .map((p) => `${p.x} ${p.y}`)
    .join(" L ")} L ${points[points.length - 1].x} ${height - pad} Z`;

  return (
    <div className="relative w-full h-full min-h-[64px]">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-[calc(100%-16px)]" preserveAspectRatio="none">
        <defs>
          <linearGradient id="effFill" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="var(--acc)" stopOpacity="0.4" />
            <stop offset="100%" stopColor="var(--acc)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="effStroke" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--acc)" />
            <stop offset="60%" stopColor="var(--acc2)" />
            <stop offset="100%" stopColor="var(--acc3)" />
          </linearGradient>
        </defs>
        {[25, 50, 75].map((pct) => {
          const y = height - pad - (pct / 100) * (height - 2 * pad);
          return (
            <line key={pct} x1={pad} y1={y} x2={width - pad} y2={y} stroke="var(--line)" strokeWidth="0.4" />
          );
        })}
        <path d={area} fill="url(#effFill)" />
        <path
          d={line}
          fill="none"
          stroke="url(#effStroke)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          style={{ filter: "drop-shadow(0 0 4px var(--glow))" }}
        />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="1.4" fill="var(--acc2)" stroke="var(--base)" strokeWidth="0.5" />
        ))}
      </svg>
      <div className="absolute bottom-0 left-0 right-0 flex justify-between px-1">
        {last7.map((log, i) => (
          <span
            key={i}
            className={`text-[9px] font-medium ${i === last7.length - 1 ? "text-acc2" : "text-ink3"}`}
          >
            {new Date(log.date).toLocaleDateString("en-US", { weekday: "short" }).slice(0, 2)}
          </span>
        ))}
      </div>
    </div>
  );
}
