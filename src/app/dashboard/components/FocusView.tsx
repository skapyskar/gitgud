"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Flame, Coins, Zap, Circle, CheckCircle2, Repeat } from "lucide-react";
import type { Task } from "../../../../prisma/generated/client";
import { useRewards } from "../../components/RewardLayer";
import { useTheme } from "../../components/theme";
import { completeTask } from "./taskApi";
import { levelProgress, rankForLevel, tierBaseXP } from "@/lib/gamification";
import { dayKey, todayDayIndex } from "@/lib/dates";
import { TIER_STYLE } from "../../components/ui";

interface FocusViewProps {
  userName: string;
  xp: number;
  streakDays: number;
  coins: number;
  xpToday: number;
  dailyTasks: Task[];
  weeklyTemplates: Task[];
}

function greeting(hour: number): string {
  if (hour < 5) return "Burning the midnight oil";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 21) return "Good evening";
  return "Late-night grind";
}

/**
 * Wallpaper mode: a huge live clock with today's top quests underneath.
 * Meant to sit fullscreen on a spare desktop workspace.
 */
export default function FocusView({
  userName,
  xp,
  streakDays,
  coins,
  xpToday,
  dailyTasks,
  weeklyTemplates,
}: FocusViewProps) {
  const router = useRouter();
  const { celebrate } = useRewards();
  const { showSeconds } = useTheme();

  const [now, setNow] = useState<Date | null>(null);
  const [completingIds, setCompletingIds] = useState<string[]>([]);

  useEffect(() => {
    // Clock starts after mount (server time ≠ client time, so no SSR value).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const progress = levelProgress(xp);
  const rank = rankForLevel(progress.level);

  // Today's pending quests: real tasks + habits without an instance yet.
  const upNext = useMemo(() => {
    const todayK = dayKey();
    const todays = dailyTasks.filter(
      (t) => t.scheduledDate && dayKey(new Date(t.scheduledDate)) === todayK
    );
    const instanced = new Set(todays.filter((t) => t.templateId).map((t) => t.templateId));

    const habits = weeklyTemplates.filter((t) => {
      const days = t.repeatDays?.split(",").map(Number) ?? [];
      return days.includes(todayDayIndex()) && !instanced.has(t.id);
    });

    return [...todays.filter((t) => !t.isCompleted), ...habits]
      .sort((a, b) => {
        const mins = (t: Task) => {
          if (!t.deadlineTime) return Infinity;
          const d = new Date(t.deadlineTime);
          return d.getHours() * 60 + d.getMinutes();
        };
        return mins(a) - mins(b);
      })
      .slice(0, 4);
  }, [dailyTasks, weeklyTemplates]);

  const handleComplete = async (task: Task) => {
    if (completingIds.includes(task.id)) return;
    setCompletingIds((cur) => [...cur, task.id]);
    const res = await completeTask({ taskId: task.id });
    if (res?.success) {
      celebrate(res);
      router.refresh();
    }
    setCompletingIds((cur) => cur.filter((id) => id !== task.id));
  };

  const hh = now ? String(now.getHours()).padStart(2, "0") : "--";
  const mm = now ? String(now.getMinutes()).padStart(2, "0") : "--";
  const ss = now ? String(now.getSeconds()).padStart(2, "0") : "--";
  const dateLine = now
    ? now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
    : "";

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100dvh-140px)] text-center px-4 animate-rise">
      {/* Greeting */}
      <p className="text-ink3 text-sm md:text-base font-medium mb-2">
        {now ? `${greeting(now.getHours())}, ` : "Hello, "}
        <span className="text-ink2">{userName}</span>
      </p>

      {/* Clock */}
      <div className="font-display font-extrabold clock-time grad-text select-none">
        {hh}:{mm}
        {showSeconds && (
          <span className="text-[0.35em] align-top font-bold text-ink3 ml-2">{ss}</span>
        )}
      </div>
      <p className="text-ink2 text-lg md:text-2xl font-display font-semibold mt-2">{dateLine}</p>

      {/* Stat chips */}
      <div className="flex flex-wrap items-center justify-center gap-2.5 mt-7">
        <span className="chip r-lg px-4 py-2 flex items-center gap-2 text-sm">
          <span className="font-display font-bold grad-text">lvl {progress.level}</span>
          <span className="text-ink3 text-xs">{rank.title}</span>
        </span>
        <span className="chip r-lg px-4 py-2 flex items-center gap-2 text-sm text-ink2">
          <Flame className={`w-4 h-4 ${streakDays > 0 ? "text-warm" : "text-ink3"}`} />
          <span className="font-semibold text-ink">{streakDays}</span> day streak
        </span>
        <span className="chip r-lg px-4 py-2 flex items-center gap-2 text-sm text-ink2">
          <Zap className="w-4 h-4 text-acc" />
          <span className="font-semibold text-ink">+{xpToday}</span> XP today
        </span>
        <span className="chip r-lg px-4 py-2 flex items-center gap-2 text-sm text-ink2">
          <Coins className="w-4 h-4 text-gold" />
          <span className="font-semibold text-ink">{coins.toLocaleString()}</span>
        </span>
      </div>

      {/* XP bar */}
      <div className="w-full max-w-md mt-6">
        <div className="h-2 w-full chip rounded-full overflow-hidden border-0">
          <div
            className="h-full grad-primary rounded-full xp-shimmer transition-all duration-700"
            style={{ width: `${Math.max(2, progress.percent)}%` }}
          />
        </div>
        <p className="text-[11px] text-ink3 mt-1.5">
          {progress.remaining.toLocaleString()} XP to level {progress.level + 1}
        </p>
      </div>

      {/* Up next */}
      <div className="w-full max-w-md mt-8">
        {upNext.length === 0 ? (
          <p className="text-ink3 text-sm flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-acc" /> all clear for today
          </p>
        ) : (
          <>
            <p className="text-[11px] font-semibold tracking-[0.25em] uppercase text-ink3 mb-3">
              up next
            </p>
            <div className="space-y-2">
              {upNext.map((task) => {
                const isHabit = task.type === "WEEKLY" || !!task.templateId;
                const busy = completingIds.includes(task.id);
                return (
                  <div
                    key={task.id}
                    className="group chip chip-hover r-lg px-4 py-2.5 flex items-center gap-3 text-left transition-all"
                  >
                    <button
                      onClick={() => handleComplete(task)}
                      disabled={busy}
                      className="shrink-0 text-ink3 hover:text-acc transition-colors disabled:opacity-40"
                      title="Complete"
                    >
                      <Circle className="w-5 h-5" />
                    </button>
                    <span className="flex-1 min-w-0 text-sm text-ink truncate">{task.title}</span>
                    {isHabit && <Repeat className="w-3.5 h-3.5 text-hab shrink-0" />}
                    <span className={`text-[11px] font-semibold shrink-0 ${TIER_STYLE[task.tier].text}`}>
                      +{tierBaseXP(task.tier)}
                    </span>
                    {task.deadlineTime && (
                      <span className="text-[11px] text-ink3 shrink-0 tabular-nums">
                        {new Date(task.deadlineTime).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
