"use client";

import { Target, RefreshCw, X } from "lucide-react";
import { efficiencyOf, possibleOf, DayLogLike } from "./efficiency";

interface FullPerformanceGraphProps {
  dayLogs: DayLogLike[];
  onClose: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

/** Expanded analytics view: 30-day efficiency line + headline stats. */
export default function FullPerformanceGraph({
  dayLogs,
  onClose,
  onRefresh,
  isRefreshing,
}: FullPerformanceGraphProps) {
  const logs = [...dayLogs].reverse().slice(-30);

  const totalXP = logs.reduce((sum, log) => sum + log.totalXP, 0);
  const totalTasks = logs.reduce((sum, log) => sum + log.tasksDone, 0);
  const data = logs.map((log) => ({
    date: log.date,
    efficiency: efficiencyOf(log),
    earnedXP: log.totalXP,
    possibleXP: possibleOf(log),
  }));
  const avgEfficiency =
    data.length > 0 ? Math.round(data.reduce((s, d) => s + d.efficiency, 0) / data.length) : 0;

  const width = 800;
  const height = 300;
  const pad = { top: 20, right: 24, bottom: 36, left: 44 };
  const gw = width - pad.left - pad.right;
  const gh = height - pad.top - pad.bottom;

  const points = data.map((d, i) => ({
    x: pad.left + (i / Math.max(1, data.length - 1)) * gw,
    y: pad.top + (1 - d.efficiency / 100) * gh,
    ...d,
  }));

  const line = points.length ? `M ${points.map((p) => `${p.x} ${p.y}`).join(" L ")}` : "";
  const area = points.length
    ? `M ${points[0].x} ${height - pad.bottom} L ${points.map((p) => `${p.x} ${p.y}`).join(" L ")} L ${points[points.length - 1].x} ${height - pad.bottom} Z`
    : "";

  const fmt = (date: Date | string) => {
    const d = new Date(date);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  const stats = [
    { label: "avg efficiency", value: `${avgEfficiency}%`, cls: "grad-text" },
    { label: "xp earned", value: totalXP.toLocaleString(), cls: "text-acc3" },
    { label: "tasks cleared", value: totalTasks, cls: "text-acc2" },
  ];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="animate-rise glass r-xl shadow-[0_0_80px_var(--glow)] w-full max-w-4xl max-h-[85vh] overflow-y-auto">
        <div
          className="border-b border-line p-5 sticky top-0 backdrop-blur-xl z-10 flex justify-between items-center"
          style={{ background: "color-mix(in srgb, var(--base) 85%, transparent)" }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 r-lg grad-primary glow-shadow flex items-center justify-center">
              <Target className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-ink">Performance log</h2>
              <p className="text-[11px] text-ink3">
                last {logs.length} days · earned / possible XP
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={isRefreshing}
                className="p-2 r-md text-ink3 hover:text-ink hover:bg-[var(--chip-hover)] transition-all disabled:opacity-50"
                title="Refresh"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 r-md text-ink3 hover:text-rosy hover:bg-rosy/10 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 p-5 border-b border-line">
          {stats.map((stat) => (
            <div key={stat.label} className="chip r-lg p-4">
              <div className="text-[10px] text-ink3 uppercase tracking-widest font-semibold mb-1">
                {stat.label}
              </div>
              <div className={`font-display text-2xl font-extrabold ${stat.cls}`}>{stat.value}</div>
            </div>
          ))}
        </div>

        <div className="p-5">
          {logs.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-ink3 text-sm">
              no data yet — clear some tasks first
            </div>
          ) : (
            <svg width="100%" viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
              <defs>
                <linearGradient id="effFillFull" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="var(--acc)" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="var(--acc)" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="effStrokeFull" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="var(--acc)" />
                  <stop offset="60%" stopColor="var(--acc2)" />
                  <stop offset="100%" stopColor="var(--acc3)" />
                </linearGradient>
              </defs>
              {[0, 25, 50, 75, 100].map((pct) => {
                const y = pad.top + (1 - pct / 100) * gh;
                return (
                  <g key={pct}>
                    <line x1={pad.left} y1={y} x2={width - pad.right} y2={y} stroke="var(--line)" />
                    <text x={pad.left - 8} y={y + 4} fill="var(--ink3)" fontSize="10" textAnchor="end">
                      {pct}%
                    </text>
                  </g>
                );
              })}

              <path d={area} fill="url(#effFillFull)" />
              <path
                d={line}
                fill="none"
                stroke="url(#effStrokeFull)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ filter: "drop-shadow(0 0 6px var(--glow))" }}
              />

              {points.map((p, i) => (
                <g key={i} className="group">
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r="4"
                    fill="var(--acc2)"
                    stroke="var(--base)"
                    strokeWidth="1.5"
                    className="cursor-pointer"
                  />
                  <g className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <rect
                      x={p.x - 52}
                      y={p.y - 58}
                      width="104"
                      height="46"
                      fill="var(--base)"
                      stroke="var(--acc)"
                      strokeOpacity="0.5"
                      rx="10"
                    />
                    <text x={p.x} y={p.y - 43} fill="var(--acc)" fontSize="10" textAnchor="middle">
                      {fmt(p.date)}
                    </text>
                    <text x={p.x} y={p.y - 30} fill="var(--ink)" fontSize="12" textAnchor="middle" fontWeight="bold">
                      {p.efficiency.toFixed(1)}%
                    </text>
                    <text x={p.x} y={p.y - 18} fill="var(--ink3)" fontSize="9" textAnchor="middle">
                      {p.earnedXP}/{p.possibleXP} XP
                    </text>
                  </g>
                  {(i % 5 === 0 || i === points.length - 1) && (
                    <text
                      x={p.x}
                      y={height - pad.bottom + 18}
                      fill={i === points.length - 1 ? "var(--acc2)" : "var(--ink3)"}
                      fontSize="10"
                      textAnchor="middle"
                    >
                      {fmt(p.date)}
                    </text>
                  )}
                </g>
              ))}
            </svg>
          )}
        </div>
      </div>
    </div>
  );
}
