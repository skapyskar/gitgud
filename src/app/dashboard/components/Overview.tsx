"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Flame, Target, TrendingUp, ChevronDown, Plus, Sun, Moon, Upload, X, Droplets } from "lucide-react";
import type { Task, DayLog } from "../../../../prisma/generated/client";
import { GitGudLogo } from "../../components/GitGudLogo";
import LogoutButton from "../../components/LogoutButton";
import { MuteToggle, useRewards } from "../../components/RewardLayer";
import { useTheme, SKIN_INFO, type Skin } from "../../components/theme";
import { useFlashToast } from "./FlashToast";
import Reveal from "./Reveal";
import AudioDock from "./AudioDock";
import ScheduleTaskModal, { ScheduleValues } from "./ScheduleTaskModal";
import { completeTask, createTask } from "./taskApi";
import { levelProgress, rankForLevel, tierBaseXP } from "@/lib/gamification";
import { dayKey, todayAt, todayDayIndex } from "@/lib/dates";
import { buildDayMap, trailingDays, smoothPath } from "./momentum";
import FamSummaryCard, { type FamSummaryData } from "../../fam/components/FamSummaryCard";
import Link from "next/link";

interface OverviewProps {
  user: { name: string | null; username: string | null; email: string; xp: number; streakDays: number };
  dayLogs: DayLog[];
  dailyTasks: Task[];
  weeklyTemplates: Task[];
  backlogTasks: Task[];
  famSummary: FamSummaryData | null;
  onNavGrind: () => void;
  onNavDump: () => void;
}

const THEME_ORDER: Skin[] = ["aurora", "terminal", "zen", "custom"];

function greetingFor(hour: number): string {
  if (hour < 5) return "Late-night grind";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 21) return "Good evening";
  return "Night shift";
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  return (parts.map((w) => w[0]).join("").slice(0, 2) || "P1").toUpperCase();
}

interface Mission {
  id: string;
  name: string;
  xp: number;
  badgeLabel: string;
  badgeColor: string;
}

export default function Overview({
  user,
  dayLogs,
  dailyTasks,
  weeklyTemplates,
  backlogTasks,
  famSummary,
  onNavGrind,
  onNavDump,
}: OverviewProps) {
  const router = useRouter();
  const { celebrate } = useRewards();
  const { skin, mode, customBg, glassOpacity, update } = useTheme();
  const { flash } = useFlashToast();

  const [now, setNow] = useState<Date | null>(null);
  const [busyIds, setBusyIds] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const todayK = useMemo(() => dayKey(), []);
  const dayMap = useMemo(() => buildDayMap(dayLogs), [dayLogs]);
  const progress = levelProgress(user.xp);
  const rank = rankForLevel(progress.level);
  const xpToday = dayMap.get(todayK) ?? 0;

  const habitCount = weeklyTemplates.length;
  const clearedCount = useMemo(() => dayLogs.reduce((sum, l) => sum + l.tasksDone, 0), [dayLogs]);

  /* ── missions: today's pending daily tasks + due habits + open dump items ── */
  const missions = useMemo<Mission[]>(() => {
    const todays = dailyTasks.filter((t) => t.scheduledDate && dayKey(new Date(t.scheduledDate)) === todayK);
    const instanced = new Set(todays.filter((t) => t.templateId).map((t) => t.templateId));

    const habitMissions: Mission[] = weeklyTemplates
      .filter((t) => {
        const days = t.repeatDays?.split(",").map(Number) ?? [];
        return days.includes(todayDayIndex()) && !instanced.has(t.id);
      })
      .map((t) => ({ id: t.id, name: t.title, xp: tierBaseXP(t.tier), badgeLabel: "HABIT", badgeColor: "var(--hab)" }));

    const pendingTaskMissions: Mission[] = todays
      .filter((t) => !t.isCompleted)
      .map((t) => ({
        id: t.id,
        name: t.title,
        xp: tierBaseXP(t.tier),
        badgeLabel: t.templateId ? "HABIT" : `TIER ${t.tier}`,
        badgeColor: t.templateId ? "var(--hab)" : `var(--t${t.tier.toLowerCase()})`,
      }));

    const dumpMissions: Mission[] = backlogTasks
      .filter((t) => !t.isCompleted)
      .map((t) => ({
        id: t.id,
        name: t.title,
        xp: tierBaseXP(t.tier),
        badgeLabel: `TIER ${t.tier}`,
        badgeColor: `var(--t${t.tier.toLowerCase()})`,
      }));

    const tierRank: Record<string, number> = { S: 0, A: 1, B: 2, C: 3 };
    return [...habitMissions, ...pendingTaskMissions, ...dumpMissions]
      .sort((a, b) => (tierRank[a.badgeLabel.slice(-1)] ?? 4) - (tierRank[b.badgeLabel.slice(-1)] ?? 4))
      .slice(0, 6);
  }, [dailyTasks, weeklyTemplates, backlogTasks, todayK]);

  const openCount = missions.length;

  const handleCompleteMission = async (m: Mission) => {
    if (busyIds.includes(m.id)) return;
    setBusyIds((cur) => [...cur, m.id]);
    const res = await completeTask({ taskId: m.id });
    if (res?.success) {
      celebrate(res);
      router.refresh();
    }
    setBusyIds((cur) => cur.filter((id) => id !== m.id));
  };

  const handleCreateQuest = async (values: ScheduleValues) => {
    setCreating(false);
    await createTask({
      title: values.title,
      type: "DAILY",
      tier: values.tier,
      category: values.category,
      scheduledDate: new Date(new Date().setHours(0, 0, 0, 0)).toISOString(),
      deadlineTime: todayAt(values.deadlineTime).toISOString(),
      allocatedDuration: values.duration,
      frequency: values.frequency,
    });
    router.refresh();
  };

  /* ── momentum (14d) + week (7d) ── */
  const momentum = useMemo(() => {
    const vals = trailingDays(dayMap, 14);
    const { line, area, points, y } = smoothPath(vals, 600, 220, 12, 32);
    const bestVal = Math.max(1, ...vals.slice(0, -1));
    const todayVal = vals[vals.length - 1];
    const isRecord = todayVal >= bestVal && todayVal > 0;
    const avg = (a: number[]) => a.reduce((x, v) => x + v, 0) / a.length;
    const rising = avg(vals.slice(-3)) >= avg(vals.slice(-6, -3));
    const bestPct = Math.min(100, Math.round((todayVal / bestVal) * 100));
    const tag = isRecord ? "★ NEW RECORD" : rising ? "▲ RISING" : "◆ RELOADING";
    const tagColor = isRecord ? "var(--gold)" : rising ? "var(--acc)" : "var(--acc3)";
    const msg = isRecord
      ? "Today is your best day on record. Ride the wave — every extra check makes history."
      : `You're ${bestPct}% of the way to your best day (${bestVal} XP). ${rising ? "The curve is climbing — keep feeding it." : "One check restarts the climb."}`;
    return { line, area, bestY: y(bestVal), todayPoint: points[points.length - 1], bestVal, tag, tagColor, msg };
  }, [dayMap]);

  const weekBars = useMemo(() => {
    const vals = trailingDays(dayMap, 7);
    const maxV = Math.max(1, ...vals);
    const total = vals.reduce((s, v) => s + v, 0);
    const bars = vals.map((v, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const isToday = dayKey(d) === todayK;
      return {
        val: v,
        label: d.toLocaleDateString("en-US", { weekday: "short" }).slice(0, 2).toUpperCase(),
        pct: Math.max(6, Math.round((v / maxV) * 100)),
        isToday,
      };
    });
    return { bars, total };
  }, [dayMap, todayK]);

  /* ── custom background upload ── */
  const onPickFile = () => fileRef.current?.click();
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (f.type.startsWith("video")) {
      const url = URL.createObjectURL(f);
      update({ skin: "custom", customBg: { type: "video", url, persist: false } });
      flash("VIDEO BACKDROP SET · lives until reload");
    } else {
      const reader = new FileReader();
      reader.onload = () => {
        const url = reader.result as string;
        const persist = url.length < 3_500_000;
        update({ skin: "custom", customBg: { type: "image", url, persist } });
        flash(persist ? "BACKGROUND SAVED" : "BACKGROUND SET · too big to save, session only");
      };
      reader.readAsDataURL(f);
    }
  };
  const clearBg = () => update({ customBg: null });
  const setTheme = (t: Skin) => {
    if (t === "custom" && skin === "custom") {
      onPickFile();
      return;
    }
    update({ skin: t });
    if (t === "custom" && !customBg) flash("BLANK MODE — upload a background →");
  };

  const hh = now ? String(now.getHours()).padStart(2, "0") : "--";
  const mm = now ? String(now.getMinutes()).padStart(2, "0") : "--";
  const ss = now ? String(now.getSeconds()).padStart(2, "0") : "--";
  const dateLine = now
    ? now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })
    : "";
  const name = user.name || user.email;
  const hasCustomBg = skin === "custom" && !!customBg;

  return (
    <section className="min-h-screen relative z-10 flex flex-col" style={{ scrollSnapAlign: "start", scrollSnapStop: "always" }}>
      {/* Custom background layer */}
      {hasCustomBg && customBg && (
        <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
          {customBg.type === "video" ? (
            <video
              src={customBg.url}
              autoPlay
              muted
              loop
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url("${customBg.url}")`, animation: "bgdrift 45s ease-in-out infinite alternate" }}
            />
          )}
          <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(5,6,12,.45), rgba(5,6,12,.62))" }} />
        </div>
      )}

      <input ref={fileRef} type="file" accept="image/*,video/mp4,video/webm" className="hidden" onChange={onFileChange} />

      {/* Header */}
      <header className="flex items-center gap-3.5 flex-wrap px-4 sm:px-9 py-3 sm:py-[18px]">
        <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="flex items-center gap-2.5 group">
          <span className="transition-transform group-hover:-rotate-6 group-hover:scale-105 inline-block">
            <GitGudLogo className="w-[34px] h-[34px]" />
          </span>
          <span className="font-display text-lg font-extrabold tracking-tight">
            GIT <span className="grad-text">GUD</span>
          </span>
        </button>

        <nav className="hidden md:flex gap-1.5 chip r-lg p-1">
          <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="text-[12.5px] font-semibold text-ink2 hover:text-ink hover:bg-[var(--chip-hover)] px-3.5 py-2 rounded-[calc(var(--radius)*.7)] transition-colors">
            Overview
          </button>
          <button onClick={onNavGrind} className="text-[12.5px] font-semibold text-ink2 hover:text-ink hover:bg-[var(--chip-hover)] px-3.5 py-2 rounded-[calc(var(--radius)*.7)] transition-colors">
            Habits
          </button>
          <button onClick={onNavDump} className="text-[12.5px] font-semibold text-ink2 hover:text-ink hover:bg-[var(--chip-hover)] px-3.5 py-2 rounded-[calc(var(--radius)*.7)] transition-colors">
            Brain dump
          </button>
          <Link href="/fam" className="text-[12.5px] font-semibold text-ink2 hover:text-ink hover:bg-[var(--chip-hover)] px-3.5 py-2 rounded-[calc(var(--radius)*.7)] transition-colors">
            Fam
          </Link>
        </nav>

        <div className="flex-1" />

        <div className="chip r-lg flex items-center gap-2 py-1.5 px-2.5">
          <span className="text-[10px] tracking-widest text-ink3 font-bold">THEME</span>
          {THEME_ORDER.map((t) => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              title={SKIN_INFO[t].label}
              className="w-5 h-5 rounded-full border grid place-items-center transition-shadow"
              style={{
                borderColor: "var(--line)",
                background:
                  t === "aurora"
                    ? "linear-gradient(135deg,#a78bfa,#e879f9,#22d3ee)"
                    : t === "terminal"
                      ? "linear-gradient(135deg,#022c17,#00ff88)"
                      : t === "zen"
                        ? "linear-gradient(135deg,#62647a,#b3a6f7)"
                        : "transparent",
                borderStyle: t === "custom" ? "dashed" : "solid",
                boxShadow: skin === t ? "0 0 0 2px var(--base), 0 0 0 4px var(--acc)" : "none",
                color: skin === t && t === "custom" ? "var(--acc)" : "var(--ink3)",
              }}
            >
              {t === "custom" && <Plus className="w-3 h-3" />}
            </button>
          ))}
          {skin === "custom" && !customBg && (
            <button onClick={onPickFile} className="r-md flex items-center gap-1.5 border border-dashed border-acc text-acc text-[11px] font-bold px-2.5 py-1 hover:bg-[var(--chip-hover)] transition-colors">
              <Upload className="w-3 h-3" /> Upload bg
            </button>
          )}
          {hasCustomBg && (
            <button onClick={clearBg} title="Remove background" className="text-ink3 hover:text-rosy transition-colors px-0.5">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="chip r-lg hidden sm:flex items-center gap-2 py-1.5 px-2.5" title="Board transparency">
          <Droplets className="w-3.5 h-3.5 text-ink3 shrink-0" />
          <input
            type="range"
            min={0.15}
            max={1}
            step={0.01}
            value={glassOpacity}
            onChange={(e) => update({ glassOpacity: Number(e.target.value) })}
            className="w-20 accent-[var(--acc)]"
          />
        </div>

        <button
          onClick={() => update({ mode: mode === "dark" ? "light" : "dark" })}
          title="Dark / light"
          className="chip chip-hover r-lg w-9 h-9 grid place-items-center"
        >
          {mode === "dark" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
        </button>
        <MuteToggle />

        <div className="chip chip-hover r-lg flex items-center gap-2.5 py-1 pl-1 pr-3">
          <span className="grad-primary font-display w-7 h-7 rounded-full grid place-items-center text-[11px] font-extrabold text-white">
            {initialsOf(name)}
          </span>
          <span className="text-[12.5px] font-semibold hidden sm:inline">{name}</span>
          <span className="r-md text-[10px] font-extrabold text-acc bg-acc/12 px-1.5 py-0.5">LV {progress.level}</span>
        </div>
        <LogoutButton />
      </header>

      {/* Content */}
      <div className="flex-1 flex flex-wrap gap-5 px-4 sm:px-9 pt-3 pb-2.5 items-stretch">
        {/* LEFT: clock + stats + missions/momentum */}
        <div className="flex-[1.5] flex flex-col gap-5 min-w-[320px]" style={{ flexBasis: 460 }}>
          <Reveal>
            <div className="text-sm text-ink2">
              {now ? greetingFor(now.getHours()) : "Hello"}, <span className="text-acc font-bold">{name}</span> — the grind is waiting.
            </div>
            <div className="flex items-baseline gap-3.5 mt-0.5">
              <span className="font-display font-extrabold tracking-tight leading-none tabular-nums" style={{ fontSize: "clamp(56px,7vw,104px)" }}>
                {hh}:{mm}
              </span>
              <span className="font-display grad-text font-extrabold tabular-nums" style={{ fontSize: "clamp(22px,2.4vw,34px)" }}>
                :{ss}
              </span>
            </div>
            <div className="text-[12.5px] text-ink3 tracking-[0.22em] uppercase mt-2">{dateLine}</div>
          </Reveal>

          <Reveal delay={120} className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%,140px), 1fr))", maxWidth: 640 }}>
            <div className="glass glass-hover r-xl p-4 flex flex-col gap-1">
              <span className="text-[10.5px] tracking-widest text-ink3 font-bold">XP TODAY</span>
              <span className="font-display grad-text-warm text-[27px] font-extrabold">+{xpToday}</span>
            </div>
            <div className="glass glass-hover r-xl p-4 flex flex-col gap-1">
              <span className="text-[10.5px] tracking-widest text-ink3 font-bold">DAY STREAK</span>
              <span className="font-display text-[27px] font-extrabold text-warm flex items-center gap-1.5">
                <Flame className="w-[18px] h-[18px]" fill="currentColor" /> {user.streakDays}
              </span>
            </div>
            <div className="glass glass-hover r-xl p-4 flex flex-col gap-1">
              <span className="text-[10.5px] tracking-widest text-ink3 font-bold">OPEN QUESTS</span>
              <span className="font-display text-[27px] font-extrabold text-acc3">{openCount}</span>
            </div>
            {famSummary && (
              <>
                <div className="glass glass-hover r-xl p-4 flex flex-col gap-1">
                  <span className="text-[10.5px] tracking-widest text-ink3 font-bold">FAM XP</span>
                  <span className="font-display text-[27px] font-extrabold text-acc">{famSummary.xp.toLocaleString()}</span>
                </div>
                <div className="glass glass-hover r-xl p-4 flex flex-col gap-1">
                  <span className="text-[10.5px] tracking-widest text-ink3 font-bold">FAM SCORE</span>
                  <span className="font-display text-[27px] font-extrabold grad-text">{famSummary.score.toLocaleString()}</span>
                </div>
              </>
            )}
          </Reveal>

          {famSummary && (
            <Reveal delay={150}>
              <FamSummaryCard fam={famSummary} />
            </Reveal>
          )}

          <div className="flex flex-wrap gap-[18px] w-full flex-1 items-stretch">
            {/* Missions */}
            <Reveal delay={180} className="glass r-xl flex-[1.8] flex flex-col p-5" style={{ flexBasis: 440, minHeight: 360 }}>
              <div className="flex items-center gap-2.5 mb-4">
                <span className="chip r-md w-9 h-9 grid place-items-center text-gold">
                  <Target className="w-[18px] h-[18px]" />
                </span>
                <div className="flex-1">
                  <div className="font-display text-[17px] font-bold">Today&apos;s missions</div>
                  <div className="text-xs text-ink3">habits due + top quests</div>
                </div>
                <button onClick={() => setCreating(true)} className="text-acc hover:text-acc2 transition-colors p-1.5" title="New quest">
                  <Plus className="w-4 h-4" />
                </button>
                <button onClick={onNavGrind} className="text-[11.5px] font-bold tracking-wide text-acc hover:text-acc2 transition-colors">
                  VIEW ALL →
                </button>
              </div>
              {missions.length > 0 ? (
                <div className="flex flex-col gap-2.5 flex-1 min-h-0 overflow-y-auto">
                  {missions.map((m) => (
                    <div key={m.id} className="chip chip-hover r-lg flex items-center gap-3.5 px-[18px] py-3.5">
                      <button
                        onClick={() => handleCompleteMission(m)}
                        disabled={busyIds.includes(m.id)}
                        title="Complete"
                        className="w-[22px] h-[22px] shrink-0 rounded-[7px] border-2 transition-all disabled:opacity-40"
                        style={{ borderColor: "color-mix(in srgb, var(--acc) 60%, transparent)" }}
                      />
                      <span className="flex-1 min-w-0 text-[15.5px] font-semibold truncate">{m.name}</span>
                      <span
                        className="text-[10px] font-extrabold tracking-wide shrink-0 r-md px-1.5 py-1"
                        style={{ color: m.badgeColor, background: `color-mix(in srgb, ${m.badgeColor} 13%, transparent)`, boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${m.badgeColor} 32%, transparent)` }}
                      >
                        {m.badgeLabel}
                      </span>
                      <span className="text-[12.5px] font-bold text-acc shrink-0">+{m.xp} XP</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center p-3">
                  <span className="grad-text font-display font-extrabold text-lg">ALL CLEAR.</span>
                  <span className="text-[13px] text-ink2 max-w-[280px]">
                    Every mission done — dump something new and keep the XP flowing.
                  </span>
                </div>
              )}
            </Reveal>

            {/* Momentum */}
            <Reveal delay={240} className="glass r-xl flex-1 flex flex-col p-[18px]" style={{ flexBasis: 280, minHeight: 280 }}>
              <div className="flex items-baseline gap-2.5 mb-2.5">
                <span className="font-display text-[17px] font-bold flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-acc" /> Momentum
                </span>
                <span className="text-xs text-ink3">14-day XP flow</span>
                <div className="flex-1" />
                <span
                  className="text-[10px] font-extrabold tracking-wide r-md px-2.5 py-1"
                  style={{ color: momentum.tagColor, background: `color-mix(in srgb, ${momentum.tagColor} 12%, transparent)`, boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${momentum.tagColor} 30%, transparent)` }}
                >
                  {momentum.tag}
                </span>
              </div>
              <svg viewBox="0 0 600 220" className="w-full flex-1 block overflow-visible">
                <defs>
                  <linearGradient id="ovMomStroke" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0" style={{ stopColor: "var(--acc)" }} />
                    <stop offset="0.6" style={{ stopColor: "var(--acc2)" }} />
                    <stop offset="1" style={{ stopColor: "var(--acc3)" }} />
                  </linearGradient>
                  <linearGradient id="ovMomFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" style={{ stopColor: "var(--acc)", stopOpacity: 0.32 }} />
                    <stop offset="1" style={{ stopColor: "var(--acc)", stopOpacity: 0 }} />
                  </linearGradient>
                </defs>
                <line x1="0" x2="600" y1={momentum.bestY} y2={momentum.bestY} stroke="var(--gold)" strokeWidth="1" strokeDasharray="4 6" opacity="0.55" />
                <text x="600" y={momentum.bestY - 7} textAnchor="end" fill="var(--gold)" fontSize="10" fontWeight="800">
                  BEST · {momentum.bestVal} XP
                </text>
                <path d={momentum.area} fill="url(#ovMomFill)" style={{ animation: "fadeUp 1.4s ease .5s both" }} />
                <path
                  d={momentum.line}
                  fill="none"
                  stroke="url(#ovMomStroke)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  pathLength={1}
                  style={{ strokeDasharray: 1, strokeDashoffset: 1, animation: "dashIn 1.8s cubic-bezier(.4,0,.2,1) .25s forwards" }}
                />
                <circle cx={momentum.todayPoint[0]} cy={momentum.todayPoint[1]} r="11" fill="var(--acc2)" opacity="0.25" className="animate-pulse" />
                <circle cx={momentum.todayPoint[0]} cy={momentum.todayPoint[1]} r="4.5" fill="var(--acc2)" stroke="var(--base)" strokeWidth="2" />
              </svg>
              <div className="flex justify-between text-[10.5px] text-ink3 tracking-wide mt-1.5">
                <span>14 DAYS AGO</span>
                <span className="text-acc2 font-bold">TODAY</span>
              </div>
              <div className="flex items-center gap-2 mt-3.5 pt-3.5 border-t border-line text-[13px] text-ink2">
                <ChevronDown className="w-3.5 h-3.5 shrink-0 rotate-180 text-acc" />
                {momentum.msg}
              </div>
            </Reveal>
          </div>
        </div>

        {/* RIGHT: profile + week + audio */}
        <div className="flex-[0.7] flex flex-col gap-4 min-w-[280px]" style={{ flexBasis: 280, maxWidth: 400 }}>
          <Reveal delay={80} className="glass r-xl p-6 relative overflow-hidden">
            <div className="grad-primary absolute -top-[70px] left-[-15%] right-[-15%] h-[120px] blur-[46px] opacity-30 pointer-events-none" />
            <div className="flex items-center gap-4 relative">
              <span className="grad-primary glow-shadow font-display w-[66px] h-[66px] rounded-full grid place-items-center text-[22px] font-extrabold text-white">
                {initialsOf(name)}
              </span>
              <div className="flex-1 min-w-0">
                <div className="font-display text-xl font-extrabold truncate">{name}</div>
                {user.username && (
                  <div className="text-[12px] text-acc font-semibold truncate">@{user.username}</div>
                )}
                <div className="text-[13px] text-ink2">
                  {rank.title} · {user.xp.toLocaleString()} XP lifetime
                </div>
              </div>
            </div>
            <div className="flex justify-between items-baseline mt-[18px] mb-2 relative">
              <span className="text-[11.5px] tracking-widest font-extrabold text-ink3">LEVEL {progress.level}</span>
              <span className="text-[12.5px] text-ink2 tabular-nums">
                {progress.currentLevelXP.toLocaleString()} / {progress.neededLevelXP.toLocaleString()} XP
              </span>
            </div>
            <div className="chip r-md h-3 overflow-hidden relative">
              <div className="grad-primary xp-shimmer r-md h-full transition-all duration-700" style={{ width: `${Math.max(2, progress.percent)}%` }} />
            </div>
            <div className="flex gap-2.5 mt-4 relative">
              <span className="chip r-md flex-1 text-center py-2 text-[11.5px] text-ink2">
                <b className="text-ink text-sm">{habitCount}</b> habits live
              </span>
              <span className="chip r-md flex-1 text-center py-2 text-[11.5px] text-ink2">
                <b className="text-ink text-sm">{clearedCount}</b> quests cleared
              </span>
              <span className="chip r-md flex-1 text-center py-2 text-[11.5px] text-gold">
                <b className="text-sm">{progress.remaining.toLocaleString()}</b> XP to level
              </span>
            </div>
          </Reveal>

          <Reveal delay={200} className="glass r-xl p-4">
            <div className="flex items-baseline gap-2 mb-2.5">
              <span className="font-display text-sm font-bold">This week</span>
              <span className="text-[11px] text-ink3">XP / day</span>
              <div className="flex-1" />
              <span className="grad-text font-display text-[13px] font-extrabold">{weekBars.total} XP</span>
            </div>
            <div className="grid grid-cols-7 gap-2 items-end h-[84px]">
              {weekBars.bars.map((b, i) => (
                <div key={i} className="flex flex-col items-center gap-1 h-full justify-end">
                  <span className="text-[9.5px] text-ink3 tabular-nums">{b.val || "·"}</span>
                  <div
                    className="w-full max-w-[30px] rounded-[5px] transition-all duration-500"
                    style={{
                      height: `${b.pct}%`,
                      background: b.isToday ? "linear-gradient(180deg, var(--acc), var(--acc2))" : "color-mix(in srgb, var(--ink) 14%, transparent)",
                      boxShadow: b.isToday ? "0 0 14px var(--glow)" : "none",
                    }}
                  />
                  <span className={`text-[10px] font-bold tracking-wide ${b.isToday ? "text-acc" : "text-ink3"}`}>{b.label}</span>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal delay={280} className="mt-auto">
            <AudioDock />
          </Reveal>
        </div>
      </div>

      <button
        onClick={onNavGrind}
        className="relative z-10 text-ink3 hover:text-acc transition-colors flex flex-col items-center gap-1 py-2.5 mx-auto text-[11px] tracking-[0.24em]"
      >
        HABITS &amp; BRAIN DUMP
        <ChevronDown className="w-4 h-4" style={{ animation: "cue 1.8s ease-in-out infinite" }} />
      </button>

      {creating && (
        <ScheduleTaskModal
          mode="create"
          heading="Deploy new quest"
          onSubmit={handleCreateQuest}
          onClose={() => setCreating(false)}
        />
      )}
    </section>
  );
}
