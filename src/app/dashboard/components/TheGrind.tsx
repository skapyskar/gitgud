"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Lightbulb, X, ChevronUp } from "lucide-react";
import type { Task } from "../../../../prisma/generated/client";
import type { TaskTier } from "../../../../prisma/generated/enums";
import { ConfirmModal, HudButton, inputCls } from "../../components/ui";
import { useRewards } from "../../components/RewardLayer";
import { completeTask, createTask, deleteTask, uncompleteTask, updateTask } from "./taskApi";
import { tierBaseXP } from "@/lib/gamification";
import { dayKey } from "@/lib/dates";

interface TheGrindProps {
  level: number;
  weeklyTemplates: Task[];
  backlogTasks: Task[];
  dailyTasks: Task[];
  onNavDash: () => void;
  dumpRef?: React.RefObject<HTMLDivElement | null>;
}

const TIER_ORDER: TaskTier[] = ["S", "A", "B", "C"];
const TIER_XP_COLOR: Record<string, string> = { S: "var(--ts)", A: "var(--ta)", B: "var(--tb)", C: "var(--tc)" };

function last7Days(): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d;
  });
}

export default function TheGrind({ level, weeklyTemplates, backlogTasks, dailyTasks, onNavDash, dumpRef }: TheGrindProps) {
  const router = useRouter();
  const { celebrate } = useRewards();

  const [habitText, setHabitText] = useState("");
  const [dumpText, setDumpText] = useState("");
  const [busyIds, setBusyIds] = useState<string[]>([]);
  const [deletingHabit, setDeletingHabit] = useState<Task | null>(null);
  const [deletingDump, setDeletingDump] = useState<Task | null>(null);
  const [confirmingClearDone, setConfirmingClearDone] = useState(false);

  const todayK = dayKey();
  const week = useMemo(() => last7Days(), []);

  // Completed-instance lookup: habitId -> Set of dayKeys with a completed instance.
  const completedDays = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const t of dailyTasks) {
      if (!t.templateId || !t.isCompleted || !t.scheduledDate) continue;
      const key = dayKey(new Date(t.scheduledDate));
      if (!map.has(t.templateId)) map.set(t.templateId, new Set());
      map.get(t.templateId)!.add(key);
    }
    return map;
  }, [dailyTasks]);

  const todayInstanceOf = (habitId: string) =>
    dailyTasks.find((t) => t.templateId === habitId && t.scheduledDate && dayKey(new Date(t.scheduledDate)) === todayK);

  const habitRows = useMemo(() => {
    return weeklyTemplates.map((habit) => {
      const repeatDays = habit.repeatDays?.split(",").map(Number) ?? [];
      const done = completedDays.get(habit.id) ?? new Set<string>();
      const doneToday = done.has(todayK);

      const dots = week.map((d) => {
        const key = dayKey(d);
        const isRepeatDay = repeatDays.includes(d.getDay());
        return { key, isRepeatDay, isDone: done.has(key), isToday: key === todayK };
      });

      let streak = 0;
      for (let i = 0; i < 60; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        if (!repeatDays.includes(d.getDay())) continue;
        if (done.has(dayKey(d))) streak++;
        else if (i === 0) continue; // today not done yet doesn't break the streak
        else break;
      }

      return { habit, dots, doneToday, streak };
    });
  }, [weeklyTemplates, completedDays, week, todayK]);

  const habitsDoneToday = habitRows.filter((h) => h.doneToday).length;

  const toggleHabit = async (habit: Task, doneToday: boolean) => {
    if (busyIds.includes(habit.id)) return;
    setBusyIds((cur) => [...cur, habit.id]);
    if (doneToday) {
      const instance = todayInstanceOf(habit.id);
      if (instance) {
        const res = await uncompleteTask(instance.id);
        if (res?.success) router.refresh();
      }
    } else {
      const res = await completeTask({ taskId: habit.id });
      if (res?.success) {
        celebrate(res);
        router.refresh();
      }
    }
    setBusyIds((cur) => cur.filter((id) => id !== habit.id));
  };

  const addHabit = async () => {
    const title = habitText.trim();
    if (!title) return;
    setHabitText("");
    const todayISO = new Date().toISOString().slice(0, 10);
    await createTask({
      title,
      type: "WEEKLY",
      tier: "C",
      category: "LIFE",
      repeatDays: "0,1,2,3,4,5,6",
      deadlineTime: new Date(`${todayISO}T23:59:00`).toISOString(),
      frequency: 1,
    });
    router.refresh();
  };

  const confirmDeleteHabit = async () => {
    if (!deletingHabit) return;
    const id = deletingHabit.id;
    setDeletingHabit(null);
    const res = await deleteTask(id);
    if (res?.success) router.refresh();
  };

  const pendingDumps = backlogTasks.filter((t) => !t.isCompleted);
  const doneDumps = backlogTasks.filter((t) => t.isCompleted);
  const sortedPendingDumps = [...pendingDumps].sort(
    (a, b) => TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier)
  );

  const toggleDump = async (t: Task) => {
    if (busyIds.includes(t.id)) return;
    setBusyIds((cur) => [...cur, t.id]);
    if (t.isCompleted) {
      const res = await uncompleteTask(t.id);
      if (res?.success) router.refresh();
    } else {
      const res = await completeTask({ taskId: t.id });
      if (res?.success) {
        celebrate(res);
        router.refresh();
      }
    }
    setBusyIds((cur) => cur.filter((id) => id !== t.id));
  };

  const cycleTier = async (t: Task) => {
    const next = TIER_ORDER[(TIER_ORDER.indexOf(t.tier) + 1) % 4];
    const res = await updateTask({ taskId: t.id, tier: next });
    if (res?.success) router.refresh();
  };

  const addDump = async () => {
    const title = dumpText.trim();
    if (!title) return;
    setDumpText("");
    await createTask({ title, type: "BACKLOG" });
    router.refresh();
  };

  const confirmDeleteDump = async () => {
    if (!deletingDump) return;
    const id = deletingDump.id;
    setDeletingDump(null);
    const res = await deleteTask(id);
    if (res?.success) router.refresh();
  };

  const confirmClearDone = async () => {
    setConfirmingClearDone(false);
    await Promise.all(doneDumps.map((t) => deleteTask(t.id)));
    router.refresh();
  };

  return (
    <section className="min-h-screen relative z-10 px-4 sm:px-9 pt-9 sm:pt-14 pb-24 lg:pb-11 flex flex-col gap-5" style={{ scrollSnapAlign: "start", scrollSnapStop: "always" }}>
      <div className="flex items-end gap-4 flex-wrap">
        <div>
          <div className="text-[11px] tracking-[0.26em] text-ink3 font-bold">PAGE 02</div>
          <h2 className="font-display font-extrabold tracking-tight mt-1" style={{ fontSize: "clamp(30px,3.6vw,44px)" }}>
            The <span className="grad-text">Grind</span>
          </h2>
        </div>
        <div className="flex-1" />
        <span className="chip r-lg px-3.5 py-2 text-xs text-ink2">
          Every check feeds <b className="grad-text-warm">Level {level}</b>
        </span>
        <HudButton variant="ghost" onClick={onNavDash} className="flex items-center gap-1.5 py-2">
          <ChevronUp className="w-3.5 h-3.5" /> Back to dashboard
        </HudButton>
      </div>

      <div className="flex flex-wrap gap-5 items-start">
        {/* HABITS */}
        <div className="glass r-xl p-5 flex-[1.35] min-w-0" style={{ flexBasis: 440 }}>
          <div className="flex items-center gap-2.5 mb-4">
            <span className="chip r-md w-[34px] h-[34px] grid place-items-center text-acc">
              <CheckCircle2 className="w-4 h-4" />
            </span>
            <div className="flex-1">
              <div className="font-display text-[17px] font-extrabold">Habits</div>
              <div className="text-[11.5px] text-ink3">daily reps · tap to log today</div>
            </div>
            <span className="r-md text-[11px] font-extrabold text-acc bg-acc/12 px-2.5 py-1">
              {habitsDoneToday} / {habitRows.length} today
            </span>
          </div>

          <div className="flex flex-col gap-2">
            {habitRows.length === 0 ? (
              <p className="text-sm text-ink3 py-4">No habits yet — forge one below.</p>
            ) : (
              habitRows.map(({ habit, dots, doneToday, streak }) => (
                <div key={habit.id} className="chip chip-hover r-lg flex items-center gap-3.5 px-3.5 py-3">
                  <button
                    onClick={() => toggleHabit(habit, doneToday)}
                    disabled={busyIds.includes(habit.id)}
                    title="Mark today"
                    className="w-[26px] h-[26px] rounded-lg grid place-items-center shrink-0 transition-all disabled:opacity-40"
                    style={{
                      border: doneToday ? "none" : "2px solid color-mix(in srgb, var(--acc) 65%, transparent)",
                      background: doneToday ? "linear-gradient(92deg, var(--acc), var(--acc2))" : "transparent",
                    }}
                  >
                    {doneToday && (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 12.5l5 5L20 6.5" />
                      </svg>
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-semibold truncate ${doneToday ? "text-ink3 line-through" : "text-ink"}`}>{habit.title}</div>
                    <div className="text-[11px] font-semibold mt-0.5">
                      <span className="text-acc">+{tierBaseXP(habit.tier)} XP</span>
                      <span className="text-ink3"> · {streak > 0 ? `${streak} day streak` : "streak broken — restart today"}</span>
                    </div>
                  </div>
                  <div className="flex gap-[5px] shrink-0">
                    {dots.map((d) => (
                      <span
                        key={d.key}
                        title={d.key}
                        className="block rounded-[3px]"
                        style={{
                          width: 9,
                          height: 9,
                          background: d.isDone ? "var(--acc)" : d.isRepeatDay ? "var(--chip-hover)" : "transparent",
                          boxShadow: d.isDone ? "0 0 7px var(--glow)" : "none",
                          border: d.isToday ? "1px solid var(--acc)" : d.isRepeatDay ? "1px solid var(--line)" : "1px dashed var(--line)",
                          boxSizing: "border-box",
                        }}
                      />
                    ))}
                  </div>
                  <button onClick={() => setDeletingHabit(habit)} className="text-ink3 hover:text-rosy transition-colors p-1 shrink-0" title="Delete habit">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="flex gap-2.5 mt-3.5">
            <input
              value={habitText}
              onChange={(e) => setHabitText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addHabit()}
              placeholder="Forge a new habit…"
              className={inputCls}
            />
            <HudButton variant="primary" onClick={addHabit} className="px-5 shrink-0">
              + ADD
            </HudButton>
          </div>
        </div>

        {/* BRAIN DUMP */}
        <div ref={dumpRef} className="glass r-xl p-5 flex-1 min-w-0" style={{ flexBasis: 320 }}>
          <div className="flex items-center gap-2.5 mb-4">
            <span className="chip r-md w-[34px] h-[34px] grid place-items-center text-acc2">
              <Lightbulb className="w-4 h-4" />
            </span>
            <div className="flex-1">
              <div className="font-display text-[17px] font-extrabold">Brain dump</div>
              <div className="text-[11.5px] text-ink3">get it out of your head — tier it later</div>
            </div>
            {doneDumps.length > 0 && (
              <button onClick={() => setConfirmingClearDone(true)} className="text-[11px] font-bold text-ink3 hover:text-rosy transition-colors">
                CLEAR DONE
              </button>
            )}
          </div>

          <input
            value={dumpText}
            onChange={(e) => setDumpText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addDump()}
            placeholder="Dump a task, hit Enter…"
            className={`${inputCls} border-dashed mb-3`}
          />

          <div className="flex flex-col gap-2">
            {sortedPendingDumps.map((t) => (
              <div key={t.id} className="chip chip-hover r-lg flex items-center gap-3 px-3.5 py-2.5">
                <button
                  onClick={() => toggleDump(t)}
                  disabled={busyIds.includes(t.id)}
                  className="w-[22px] h-[22px] rounded-lg grid place-items-center shrink-0 chip transition-all disabled:opacity-40"
                />
                <span className="flex-1 min-w-0 text-[13px] font-medium truncate">{t.title}</span>
                <span className="text-[10px] text-ink3 font-semibold shrink-0">+{tierBaseXP(t.tier)}</span>
                <button
                  onClick={() => cycleTier(t)}
                  title="Cycle tier"
                  className="w-6 h-6 grid place-items-center text-[11px] font-extrabold font-display shrink-0 r-md"
                  style={{
                    color: TIER_XP_COLOR[t.tier],
                    background: `color-mix(in srgb, ${TIER_XP_COLOR[t.tier]} 15%, transparent)`,
                    boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${TIER_XP_COLOR[t.tier]} 35%, transparent)`,
                  }}
                >
                  {t.tier}
                </button>
                <button onClick={() => setDeletingDump(t)} title="Delete" className="text-ink3 hover:text-rosy transition-colors p-0.5 shrink-0">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            {doneDumps.map((t) => (
              <div key={t.id} className="chip r-lg flex items-center gap-3 px-3.5 py-2.5 opacity-60">
                <button
                  onClick={() => toggleDump(t)}
                  disabled={busyIds.includes(t.id)}
                  className="w-[22px] h-[22px] rounded-lg grid place-items-center shrink-0 disabled:opacity-40"
                  style={{ background: "linear-gradient(92deg, var(--acc), var(--acc2))" }}
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 12.5l5 5L20 6.5" />
                  </svg>
                </button>
                <span className="flex-1 min-w-0 text-[13px] font-medium truncate line-through text-ink3">{t.title}</span>
                <button onClick={() => setDeletingDump(t)} title="Delete" className="text-ink3 hover:text-rosy transition-colors p-0.5 shrink-0">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 mt-3.5 text-[11px] text-ink3">
            <span className="w-1.5 h-1.5 rounded-full bg-acc animate-blink" />
            {pendingDumps.length} open · S=100 · A=60 · B=30 · C=10 XP — tap the tier badge to re-rank
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2.5 justify-center pt-2 text-ink3 text-[11px] tracking-[0.2em]">
        GIT GUD · KEEP GRINDING
      </div>

      {deletingHabit && (
        <ConfirmModal
          title="Delete habit?"
          body={
            <>
              <span className="text-ink font-medium">{deletingHabit.title}</span> stops repeating. Past completions
              keep their XP.
            </>
          }
          confirmLabel="Delete"
          onConfirm={confirmDeleteHabit}
          onCancel={() => setDeletingHabit(null)}
        />
      )}
      {deletingDump && (
        <ConfirmModal
          title="Delete task?"
          body={
            <>
              <span className="text-ink font-medium">{deletingDump.title}</span> will be permanently deleted.
            </>
          }
          confirmLabel="Delete"
          onConfirm={confirmDeleteDump}
          onCancel={() => setDeletingDump(null)}
        />
      )}
      {confirmingClearDone && (
        <ConfirmModal
          title="Clear completed?"
          body={<>{doneDumps.length} completed dump {doneDumps.length === 1 ? "item" : "items"} will be permanently deleted.</>}
          confirmLabel="Clear"
          onConfirm={confirmClearDone}
          onCancel={() => setConfirmingClearDone(false)}
        />
      )}
    </section>
  );
}
