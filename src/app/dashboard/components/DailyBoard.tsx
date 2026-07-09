"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Timer, ChevronDown, ChevronRight, Repeat, Clock, AlarmClock, X, Plus, Check } from "lucide-react";
import type { Task } from "../../../../prisma/generated/client";
import { Panel, HudButton, ConfirmModal, Modal, ModalTitle, TierBadge, TIER_STYLE } from "../../components/ui";
import { useRewards } from "../../components/RewardLayer";
import ScheduleTaskModal, { ScheduleValues } from "./ScheduleTaskModal";
import TaskTimer from "./TaskTimer";
import { completeTask, createTask, deleteTask, uncompleteTask, updateTask } from "./taskApi";
import { tierBaseXP } from "@/lib/gamification";
import { dayKey, dayStart, todayAt, todayDayIndex } from "@/lib/dates";

interface DailyBoardProps {
  dailyTasks: Task[];
  weeklyTemplates: Task[];
}

/** A row on today's board: a real task or a not-yet-instantiated habit. */
interface BoardItem {
  task: Task;
  isVirtualHabit: boolean; // WEEKLY template without an instance today
}

function deadlinePassedToday(deadlineTime: Date | string | null): boolean {
  if (!deadlineTime) return false;
  const d = new Date(deadlineTime);
  const cutoff = new Date();
  cutoff.setHours(d.getHours(), d.getMinutes(), 0, 0);
  return Date.now() > cutoff.getTime();
}

function formatTime(d: Date | string): string {
  return new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function DailyBoard({ dailyTasks, weeklyTemplates }: DailyBoardProps) {
  const router = useRouter();
  const { celebrate } = useRewards();

  const [tasks, setTasks] = useState<Task[]>(dailyTasks);
  const [creating, setCreating] = useState(false);
  const [rescheduling, setRescheduling] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState<BoardItem | null>(null);
  const [confirmDuration, setConfirmDuration] = useState<{ item: BoardItem; minutes: number } | null>(null);
  const [timerFor, setTimerFor] = useState<BoardItem | null>(null);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [showCompleted, setShowCompleted] = useState(false);
  const [showOverdue, setShowOverdue] = useState(true);
  const tempIdRef = useRef(0);

  // Reset optimistic state when fresh server data arrives (render-time reset).
  const [prevDaily, setPrevDaily] = useState(dailyTasks);
  if (prevDaily !== dailyTasks) {
    setPrevDaily(dailyTasks);
    setTasks(dailyTasks);
  }

  // Per-day "skip habit" list; old days' keys are cleaned up as we go.
  const todayStorageKey = `gg-dismissed-${dayKey()}`;
  useEffect(() => {
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key?.startsWith("gg-dismissed-") && key !== todayStorageKey) {
          localStorage.removeItem(key);
        }
      }
      // Loading persisted client state after hydration must happen in an
      // effect — a lazy initializer would mismatch the server-rendered HTML.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDismissed(JSON.parse(localStorage.getItem(todayStorageKey) ?? "[]"));
    } catch {
      setDismissed([]);
    }
  }, [todayStorageKey]);

  const todayK = dayKey();

  const { pending, completed, overdue } = useMemo(() => {
    const todays = tasks.filter((t) => t.scheduledDate && dayKey(new Date(t.scheduledDate)) === todayK);
    const instancedTemplates = new Set(todays.filter((t) => t.templateId).map((t) => t.templateId));

    const habitItems: BoardItem[] = weeklyTemplates
      .filter((t) => {
        const days = t.repeatDays?.split(",").map(Number) ?? [];
        return (
          days.includes(todayDayIndex()) &&
          !instancedTemplates.has(t.id) &&
          !dismissed.includes(t.id)
        );
      })
      .map((task) => ({ task, isVirtualHabit: true }));

    const pendingItems: BoardItem[] = [
      ...todays.filter((t) => !t.isCompleted).map((task) => ({ task, isVirtualHabit: false })),
      ...habitItems,
    ].sort((a, b) => {
      // Sort by deadline's time-of-day (stored dates may be from any calendar day).
      const minutesOf = (t: Task) => {
        if (!t.deadlineTime) return Infinity;
        const d = new Date(t.deadlineTime);
        return d.getHours() * 60 + d.getMinutes();
      };
      const at = minutesOf(a.task);
      const bt = minutesOf(b.task);
      if (at !== bt) return at - bt;
      return a.task.title.localeCompare(b.task.title);
    });

    return {
      pending: pendingItems,
      completed: todays.filter((t) => t.isCompleted),
      overdue: tasks.filter(
        (t) => t.scheduledDate && dayKey(new Date(t.scheduledDate)) < todayK && !t.isCompleted
      ),
    };
  }, [tasks, weeklyTemplates, dismissed, todayK]);

  /* ── Actions ── */

  const handleCreate = async (values: ScheduleValues) => {
    setCreating(false);
    const tempId = `temp-${++tempIdRef.current}`;
    const now = new Date();
    const optimistic: Task = {
      id: tempId,
      userId: "",
      title: values.title,
      description: null,
      type: "DAILY",
      tier: values.tier,
      category: values.category,
      plannedDate: dayStart(),
      plannedStartTime: null,
      plannedEndTime: null,
      deadline: null,
      scheduledDate: dayStart(),
      repeatDays: null,
      templateId: null,
      isCompleted: false,
      completedAt: null,
      basePoints: 10,
      xpWorth: 10,
      isBonus: false,
      timeBonus: 0,
      finalPoints: 0,
      deadlineTime: todayAt(values.deadlineTime),
      allocatedDuration: values.duration,
      durationMet: false,
      isExpired: false,
      frequency: values.frequency,
      completedFrequency: 0,
      createdAt: now,
      updatedAt: now,
    };
    setTasks((cur) => [optimistic, ...cur]);

    const res = await createTask({
      title: values.title,
      type: "DAILY",
      tier: values.tier,
      category: values.category,
      scheduledDate: dayStart().toISOString(),
      deadlineTime: todayAt(values.deadlineTime).toISOString(),
      allocatedDuration: values.duration,
      frequency: values.frequency,
    });

    if (res?.success) router.refresh();
    else setTasks((cur) => cur.filter((t) => t.id !== tempId));
  };

  const requestComplete = (item: BoardItem) => {
    if (item.task.allocatedDuration) {
      setConfirmDuration({ item, minutes: item.task.allocatedDuration });
    } else {
      void doComplete(item, false);
    }
  };

  const doComplete = async (item: BoardItem, durationMet: boolean, count = 1) => {
    setConfirmDuration(null);
    const prev = tasks;
    const { task, isVirtualHabit } = item;
    const frequency = task.frequency || 1;

    if (isVirtualHabit) {
      // Materialize an optimistic instance so the habit shows progress instantly.
      const instance: Task = {
        ...task,
        id: `temp-${++tempIdRef.current}`,
        type: "DAILY",
        templateId: task.id,
        scheduledDate: dayStart(),
        completedFrequency: count,
        isCompleted: count >= frequency,
        completedAt: count >= frequency ? new Date() : null,
      };
      setTasks((cur) => [instance, ...cur]);
    } else {
      setTasks((cur) =>
        cur.map((t) => {
          if (t.id !== task.id) return t;
          const done = (t.completedFrequency || 0) + count;
          return {
            ...t,
            completedFrequency: done,
            isCompleted: done >= frequency,
            completedAt: done >= frequency ? new Date() : null,
          };
        })
      );
    }

    const res = await completeTask({ taskId: task.id, durationMet, count });
    if (res?.success) {
      celebrate(res);
      router.refresh();
    } else {
      setTasks(prev);
    }
  };

  const handleUncomplete = async (task: Task) => {
    const prev = tasks;
    setTasks((cur) =>
      cur.map((t) =>
        t.id === task.id
          ? {
              ...t,
              completedFrequency: Math.max(0, (t.completedFrequency || 1) - 1),
              isCompleted: false,
              completedAt: null,
            }
          : t
      )
    );
    const res = await uncompleteTask(task.id);
    if (res?.success) router.refresh();
    else setTasks(prev);
  };

  const handleDelete = async () => {
    if (!deleting) return;
    const { task, isVirtualHabit } = deleting;
    setDeleting(null);

    if (isVirtualHabit) {
      const next = [...dismissed, task.id];
      setDismissed(next);
      localStorage.setItem(todayStorageKey, JSON.stringify(next));
      return;
    }

    const prev = tasks;
    setTasks((cur) => cur.filter((t) => t.id !== task.id));
    const res = await deleteTask(task.id);
    if (res?.success) router.refresh();
    else setTasks(prev);
  };

  const handleReschedule = async (values: ScheduleValues) => {
    if (!rescheduling) return;
    const id = rescheduling.id;
    setRescheduling(null);
    const prev = tasks;
    setTasks((cur) =>
      cur.map((t) => (t.id === id ? { ...t, scheduledDate: dayStart() } : t))
    );
    const res = await updateTask({
      taskId: id,
      scheduledDate: dayStart().toISOString(),
      tier: values.tier,
      category: values.category,
      deadlineTime: todayAt(values.deadlineTime).toISOString(),
      allocatedDuration: values.duration,
      frequency: values.frequency,
    });
    if (res?.success) router.refresh();
    else setTasks(prev);
  };

  const handleMoveToDump = async (task: Task) => {
    const prev = tasks;
    setTasks((cur) => cur.filter((t) => t.id !== task.id));
    const res = await updateTask({ taskId: task.id, type: "BACKLOG", scheduledDate: null });
    if (res?.success) router.refresh();
    else setTasks(prev);
  };

  /* ── Row renderer ── */

  const renderRow = (item: BoardItem) => {
    const { task, isVirtualHabit } = item;
    const isHabit = isVirtualHabit || !!task.templateId;
    const expired = !task.isCompleted && deadlinePassedToday(task.deadlineTime);
    const frequency = task.frequency || 1;
    const done = task.completedFrequency || 0;

    return (
      <div
        key={task.id}
        className={`group relative r-lg chip chip-hover border-l-[3px] ${TIER_STYLE[task.tier].border} transition-all px-4 py-3 ${expired ? "opacity-45" : ""}`}
      >
        <div className="flex items-start gap-3">
          {expired ? (
            <span className="mt-0.5 w-6 h-6 shrink-0 r-md chip flex items-center justify-center text-ink3">
              <X className="w-3.5 h-3.5" />
            </span>
          ) : frequency === 1 ? (
            <button
              onClick={() => requestComplete(item)}
              className={`mt-0.5 w-6 h-6 shrink-0 r-md border-2 transition-all hover:scale-110 hover:shadow-[0_0_12px_var(--glow)] ${
                isHabit ? "border-hab/70 hover:bg-hab/25" : "border-acc/70 hover:bg-acc/25"
              }`}
              title="Complete"
            />
          ) : (
            <span className="mt-0.5 w-6 h-6 shrink-0 flex items-center justify-center text-[10px] font-bold text-ink2 chip r-md font-mono">
              {done}/{frequency}
            </span>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-ink truncate">{task.title}</span>
              {isHabit && (
                <span className="flex items-center gap-1 text-[10px] font-semibold text-hab bg-hab/10 ring-1 ring-inset ring-hab/30 rounded-full px-2 py-0.5">
                  <Repeat className="w-3 h-3" /> habit
                </span>
              )}
            </div>

            <div className="flex items-center gap-2.5 mt-1.5 flex-wrap text-[11px]">
              <TierBadge tier={task.tier} />
              <span className="text-ink3">{task.category}</span>
              {expired ? (
                <span className="text-rosy font-bold">expired · 0 XP</span>
              ) : (
                <span className="text-acc font-semibold">+{tierBaseXP(task.tier)} XP</span>
              )}
              {task.deadlineTime && (
                <span className={`flex items-center gap-1 ${expired ? "text-rosy" : "text-gold"}`}>
                  <AlarmClock className="w-3 h-3" /> {formatTime(task.deadlineTime)}
                </span>
              )}
              {task.allocatedDuration && (
                <span className="flex items-center gap-1 text-hab">
                  <Clock className="w-3 h-3" /> {task.allocatedDuration}m
                </span>
              )}
            </div>

            {!expired && frequency > 1 && (
              <div className="flex items-center gap-1.5 mt-2.5">
                {Array.from({ length: frequency }).map((_, idx) => {
                  const filled = idx < done;
                  const clickable = idx === done || (filled && idx === done - 1);
                  return (
                    <button
                      key={idx}
                      disabled={!clickable}
                      onClick={() => {
                        if (idx === done) requestComplete(item);
                        else if (filled && idx === done - 1 && !isVirtualHabit) handleUncomplete(task);
                      }}
                      className={`w-4 h-4 rounded-md border transition-all hover:scale-110 ${
                        filled
                          ? isHabit
                            ? "bg-gradient-to-br from-hab to-acc3 border-transparent shadow-[0_0_8px_var(--glow)]"
                            : "grad-primary border-transparent shadow-[0_0_8px_var(--glow)]"
                          : `${isHabit ? "border-hab/50 hover:bg-hab/25" : "border-acc/50 hover:bg-acc/25"} ${clickable ? "" : "opacity-40"}`
                      }`}
                    />
                  );
                })}
                <button
                  onClick={() => doComplete(item, false, frequency - done)}
                  className="ml-1 text-[10px] font-semibold text-acc hover:text-acc2 transition-colors"
                >
                  all
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {!expired && (
              <button
                onClick={() => setTimerFor(item)}
                className="p-2 r-md text-hab hover:bg-hab/15 transition-all"
                title="Focus timer"
              >
                <Timer className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => setDeleting(item)}
              className="p-2 r-md text-rosy hover:bg-rosy/15 transition-all"
              title={isVirtualHabit ? "Skip today" : "Delete"}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  const dateLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  return (
    <Panel
      title="Today's quests"
      subtitle={dateLabel}
      accent="neon"
      className="h-full"
      right={
        <HudButton variant="primary" className="flex items-center gap-1.5" onClick={() => setCreating(true)}>
          <Plus className="w-3.5 h-3.5" /> New quest
        </HudButton>
      }
    >
      <div className="h-full overflow-y-auto pr-1 space-y-2">
        {pending.length === 0 && completed.length === 0 && overdue.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <div className="w-14 h-14 r-lg chip flex items-center justify-center mb-4">
              <Check className="w-6 h-6 text-ink3" />
            </div>
            <p className="font-display font-semibold text-ink2 mb-1">All clear</p>
            <p className="text-xs text-ink3">
              No quests queued. Deploy one or pull from the dump.
            </p>
          </div>
        ) : (
          <>
            {pending.map(renderRow)}

            {completed.length > 0 && (
              <div className="pt-2">
                <button
                  onClick={() => setShowCompleted(!showCompleted)}
                  className="w-full flex items-center justify-between text-[11px] font-semibold text-ink3 uppercase tracking-widest hover:text-ink2 transition-colors py-1"
                >
                  <span>✓ Cleared ({completed.length})</span>
                  {showCompleted ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                </button>
                {showCompleted &&
                  completed.map((task) => (
                    <div
                      key={task.id}
                      className="group flex items-center gap-3 r-lg chip px-4 py-2.5 mt-2 opacity-60 hover:opacity-90 transition-opacity"
                    >
                      <button
                        onClick={() => handleUncomplete(task)}
                        className={`w-6 h-6 shrink-0 r-md flex items-center justify-center transition-all hover:scale-110 ${
                          task.templateId ? "bg-gradient-to-br from-hab to-acc3" : "grad-primary"
                        }`}
                        title="Undo"
                      >
                        <Check className="w-3.5 h-3.5 text-white" />
                      </button>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm text-ink3 line-through truncate block">
                          {task.title}
                        </span>
                        {task.finalPoints > 0 && (
                          <span className="text-[11px] text-acc/80 font-medium">
                            +{task.finalPoints} XP banked
                          </span>
                        )}
                      </div>
                      <TierBadge tier={task.tier} />
                      <button
                        onClick={() => setDeleting({ task, isVirtualHabit: false })}
                        className="p-1.5 r-md text-rosy hover:bg-rosy/15 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
              </div>
            )}

            {overdue.length > 0 && (
              <div className="pt-2">
                <button
                  onClick={() => setShowOverdue(!showOverdue)}
                  className="w-full flex items-center justify-between text-[11px] font-semibold text-warm uppercase tracking-widest hover:text-ink2 transition-colors py-1"
                >
                  <span>⚠ Overdue ({overdue.length})</span>
                  {showOverdue ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                </button>
                {showOverdue &&
                  overdue.map((task) => (
                    <div
                      key={task.id}
                      className="group r-lg border border-warm/25 bg-warm/5 px-4 py-2.5 mt-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <span className="text-sm text-ink2 font-medium truncate block">
                            {task.title}
                          </span>
                          <span className="text-[10px] text-ink3">
                            slipped{" "}
                            {task.scheduledDate &&
                              new Date(task.scheduledDate).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              })}{" "}
                            · not counted until rescheduled
                          </span>
                        </div>
                        <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <HudButton variant="primary" onClick={() => setRescheduling(task)}>
                            Today
                          </HudButton>
                          <HudButton variant="gold" onClick={() => handleMoveToDump(task)}>
                            Dump
                          </HudButton>
                          <HudButton
                            variant="danger"
                            onClick={() => setDeleting({ task, isVirtualHabit: false })}
                          >
                            <X className="w-3.5 h-3.5" />
                          </HudButton>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Modals ── */}

      {creating && (
        <ScheduleTaskModal
          mode="create"
          heading="Deploy new quest"
          onSubmit={handleCreate}
          onClose={() => setCreating(false)}
        />
      )}

      {rescheduling && (
        <ScheduleTaskModal
          mode="schedule"
          heading="Reschedule for today"
          taskTitle={rescheduling.title}
          initial={{
            tier: rescheduling.tier,
            category: rescheduling.category,
            frequency: rescheduling.frequency || 1,
            duration: rescheduling.allocatedDuration,
          }}
          submitLabel="Move to today"
          onSubmit={handleReschedule}
          onClose={() => setRescheduling(null)}
        />
      )}

      {deleting && (
        <ConfirmModal
          title={deleting.isVirtualHabit ? "Skip habit today?" : "Delete quest?"}
          body={
            deleting.isVirtualHabit ? (
              <>
                <span className="text-ink font-medium">{deleting.task.title}</span> will be hidden
                from today&apos;s board. The weekly habit stays intact.
              </>
            ) : (
              <>
                <span className="text-ink font-medium">{deleting.task.title}</span> will be
                permanently deleted and its XP clawed back. This cannot be undone.
              </>
            )
          }
          confirmLabel={deleting.isVirtualHabit ? "Skip today" : "Delete"}
          onConfirm={handleDelete}
          onCancel={() => setDeleting(null)}
        />
      )}

      {confirmDuration && (
        <Modal onClose={() => setConfirmDuration(null)}>
          <ModalTitle>Beat the clock?</ModalTitle>
          <p className="text-sm text-ink2 mb-1">
            Did you finish within{" "}
            <span className="grad-text font-bold">{confirmDuration.minutes} minutes</span>?
          </p>
          <p className="text-xs text-gold mb-5">+25% XP for beating the time limit</p>
          <div className="flex gap-2.5">
            <HudButton
              variant="primary"
              className="flex-1 py-2.5"
              onClick={() => doComplete(confirmDuration.item, true)}
            >
              Yes (+25%)
            </HudButton>
            <HudButton
              variant="ghost"
              className="flex-1 py-2.5"
              onClick={() => doComplete(confirmDuration.item, false)}
            >
              No
            </HudButton>
          </div>
        </Modal>
      )}

      {timerFor && (
        <TaskTimer
          taskTitle={timerFor.task.title}
          initialMinutes={timerFor.task.allocatedDuration || 25}
          hasAllocatedDuration={!!timerFor.task.allocatedDuration}
          onClose={() => setTimerFor(null)}
          onTimerComplete={() => {
            const item = timerFor;
            setTimerFor(null);
            if (item) void doComplete(item, true);
          }}
        />
      )}
    </Panel>
  );
}
