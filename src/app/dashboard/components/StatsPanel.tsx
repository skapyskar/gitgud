"use client";

import { useCallback, useEffect, useState } from "react";
import { Flame, Coins, RefreshCw, Maximize2, Github, TrendingUp } from "lucide-react";
import MiniEfficiencyGraph from "./MiniEfficiencyGraph";
import FullPerformanceGraph from "./FullPerformanceGraph";
import ConnectGitHubButton from "./ConnectGitHubButton";
import Heatmap from "../../components/Heatmap";
import { DayLogLike } from "./efficiency";
import { levelProgress, rankForLevel, nextStreakMilestone, streakMultiplier } from "@/lib/gamification";
import { dayKey } from "@/lib/dates";

const AUTO_REFRESH_INTERVAL = 15 * 60 * 1000;

interface StatsPanelProps {
  user: {
    xp: number;
    streakDays: number;
    coins: number;
    name?: string | null;
  };
  dayLogs: DayLogLike[];
  isGitHubLinked: boolean;
}

export default function StatsPanel({ user, dayLogs, isGitHubLinked }: StatsPanelProps) {
  const [showFullGraph, setShowFullGraph] = useState(false);
  const [logs, setLogs] = useState<DayLogLike[]>(dayLogs);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => setLogs(dayLogs), [dayLogs]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/stats/daylogs");
      if (res.ok) {
        const data = await res.json();
        setLogs(data.dayLogs || []);
      }
    } catch (err) {
      console.error("Failed to refresh day logs:", err);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const id = setInterval(handleRefresh, AUTO_REFRESH_INTERVAL);
    return () => clearInterval(id);
  }, [handleRefresh]);

  const progress = levelProgress(user.xp);
  const rank = rankForLevel(progress.level);
  const milestone = nextStreakMilestone(user.streakDays);
  const multiplier = streakMultiplier(user.streakDays);

  const todayLog = logs.find((log) => dayKey(new Date(log.date)) === dayKey());
  const xpToday = todayLog?.totalXP ?? 0;

  const tileLabel = "text-[11px] font-semibold tracking-widest text-ink3 uppercase";
  // Phone: horizontal snap carousel; xl+: 4-column bento grid.
  const tileCls =
    "glass glass-hover r-xl p-5 snap-start shrink-0 min-w-[300px] w-[85%] sm:w-[46%] xl:w-auto xl:min-w-0 xl:shrink";

  return (
    <>
      <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-1 xl:grid xl:grid-cols-4 xl:overflow-visible xl:pb-0 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {/* ── OPERATOR: level, rank, XP bar ── */}
        <div className={tileCls}>
          <div className="flex items-center justify-between mb-3">
            <span className={tileLabel}>Operator</span>
            <span className="text-[11px] font-semibold text-acc bg-acc/10 ring-1 ring-inset ring-acc/30 rounded-full px-2.5 py-0.5">
              +{xpToday} XP today
            </span>
          </div>

          <div className="flex items-end gap-3 mb-1">
            <span className="font-display text-6xl font-extrabold grad-text leading-none">
              {progress.level}
            </span>
            <div className="pb-1">
              <p className="font-display text-sm font-bold grad-text-warm leading-tight">
                {rank.title}
              </p>
              {rank.next && (
                <p className="text-[11px] text-ink3">
                  next: {rank.next.title} @ lvl {rank.next.atLevel}
                </p>
              )}
            </div>
          </div>

          <div className="mt-4">
            <div className="flex justify-between text-[11px] text-ink3 mb-1.5">
              <span className="font-mono">
                {progress.currentLevelXP.toLocaleString()} / {progress.neededLevelXP.toLocaleString()}
              </span>
              <span>
                lvl {progress.level + 1} in{" "}
                <span className="text-ink2 font-semibold">{progress.remaining.toLocaleString()}</span>
              </span>
            </div>
            <div className="h-3 w-full chip border-0 rounded-full overflow-hidden">
              <div
                className="h-full grad-primary rounded-full xp-shimmer transition-all duration-700"
                style={{ width: `${Math.max(2, progress.percent)}%` }}
              />
            </div>
          </div>
        </div>

        {/* ── STREAK & LOOT ── */}
        <div className={`${tileCls} flex flex-col`}>
          <span className={`${tileLabel} mb-3`}>Streak &amp; loot</span>

          <div className="grid grid-cols-2 gap-3 flex-1">
            <div>
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-11 h-11 r-lg flex items-center justify-center ${
                    user.streakDays > 0
                      ? "bg-gradient-to-br from-amber-400 to-orange-600 shadow-lg shadow-orange-500/30"
                      : "chip"
                  }`}
                >
                  <Flame className={`w-6 h-6 ${user.streakDays > 0 ? "text-white" : "text-ink3"}`} />
                </div>
                <span className="font-display text-4xl font-extrabold text-ink leading-none">
                  {user.streakDays}
                </span>
              </div>
              <p className="text-[11px] text-ink3 mt-2">day streak</p>
            </div>
            <div className="text-right">
              <span className="font-display text-3xl font-extrabold grad-text">
                ×{multiplier.toFixed(1)}
              </span>
              <p className="text-[11px] text-ink3 mt-1.5">
                {milestone ? `×${milestone.multiplier} at ${milestone.days} days` : "max multiplier!"}
              </p>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-line/60 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span className="w-8 h-8 r-md bg-gradient-to-br from-amber-300 to-amber-500 shadow-lg shadow-amber-500/30 flex items-center justify-center">
                <Coins className="w-4 h-4 text-amber-900" />
              </span>
              <span className="font-display font-bold text-lg text-ink tabular-nums">
                {user.coins.toLocaleString()}
              </span>
              <span className="text-[11px] text-ink3">coins</span>
            </span>
            {isGitHubLinked ? (
              <span className="flex items-center gap-1.5 text-[11px] text-acc bg-acc/10 ring-1 ring-inset ring-acc/30 rounded-full px-2.5 py-1">
                <Github className="w-3.5 h-3.5" /> linked
              </span>
            ) : (
              <ConnectGitHubButton />
            )}
          </div>
        </div>

        {/* ── EFFICIENCY ── */}
        <div className={`${tileCls} flex flex-col`}>
          <div className="flex items-center justify-between mb-3">
            <span className={`${tileLabel} flex items-center gap-1.5`}>
              <TrendingUp className="w-3.5 h-3.5" /> Efficiency · 7d
            </span>
            <div className="flex gap-1">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-1.5 r-md text-ink3 hover:text-ink hover:bg-[var(--chip-hover)] transition-all disabled:opacity-50"
                title="Refresh"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
              </button>
              <button
                onClick={() => setShowFullGraph(true)}
                className="p-1.5 r-md text-ink3 hover:text-ink hover:bg-[var(--chip-hover)] transition-all"
                title="Expand"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <div className="flex-1 min-h-[64px]">
            <MiniEfficiencyGraph dayLogs={logs} />
          </div>
        </div>

        {/* ── ACTIVITY WALL ── */}
        <div className={tileCls}>
          <span className={`${tileLabel} block mb-3`}>Commit history</span>
          <Heatmap dayLogs={logs.map((l) => ({ date: l.date, totalXP: l.totalXP }))} weeks={16} />
        </div>
      </div>

      {showFullGraph && (
        <FullPerformanceGraph
          dayLogs={logs}
          onClose={() => setShowFullGraph(false)}
          onRefresh={handleRefresh}
          isRefreshing={refreshing}
        />
      )}
    </>
  );
}
