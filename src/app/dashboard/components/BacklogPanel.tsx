"use client";

import React, { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronRight, CalendarClock, X, ArrowRight, Inbox } from "lucide-react";
import type { Task } from "../../../../prisma/generated/client";
import { Panel, HudButton, ConfirmModal, inputCls } from "../../components/ui";
import ScheduleTaskModal, { ScheduleValues } from "./ScheduleTaskModal";
import { createTask, deleteTask, uncompleteTask, updateTask } from "./taskApi";
import { dayKey, dayStart, todayAt } from "@/lib/dates";

interface BacklogPanelProps {
  tasks: Task[];
}

/** The Dump: zero-friction capture. Schedule things when you're ready. */
export default function BacklogPanel({ tasks }: BacklogPanelProps) {
  const router = useRouter();
  const [items, setItems] = useState<Task[]>(tasks);
  const [newTitle, setNewTitle] = useState("");
  const [deadline, setDeadline] = useState("");
  const [adding, setAdding] = useState(false);
  const [scheduling, setScheduling] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState<Task | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const tempIdRef = useRef(0);

  // Reset optimistic state when fresh server data arrives (render-time reset).
  const [prevTasks, setPrevTasks] = useState(tasks);
  if (prevTasks !== tasks) {
    setPrevTasks(tasks);
    setItems(tasks);
  }

  const { pendingTasks, completedTasks } = useMemo(() => {
    const pendingList = items
      .filter((t) => !t.isCompleted)
      .sort((a, b) => {
        if (!a.deadline && !b.deadline) return 0;
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      });
    return { pendingTasks: pendingList, completedTasks: items.filter((t) => t.isCompleted) };
  }, [items]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || adding) return;
    setAdding(true);

    const tempId = `temp-${++tempIdRef.current}`;
    const now = new Date();
    const optimistic = {
      id: tempId,
      title: newTitle.trim(),
      type: "BACKLOG",
      isCompleted: false,
      deadline: deadline ? new Date(deadline) : null,
      tier: "C",
      category: "LIFE",
      createdAt: now,
      updatedAt: now,
    } as Task;
    setItems((cur) => [optimistic, ...cur]);

    const res = await createTask({
      title: newTitle.trim(),
      type: "BACKLOG",
      deadline: deadline || null,
    });

    if (res?.success) {
      setNewTitle("");
      setDeadline("");
      router.refresh();
    } else {
      setItems((cur) => cur.filter((t) => t.id !== tempId));
    }
    setAdding(false);
  };

  const handleSchedule = async (values: ScheduleValues) => {
    if (!scheduling) return;
    const id = scheduling.id;
    setScheduling(null);

    const prev = items;
    setItems((cur) => cur.filter((t) => t.id !== id));

    const res = await updateTask({
      taskId: id,
      type: "DAILY",
      plannedDate: dayStart().toISOString(),
      tier: values.tier,
      category: values.category,
      deadlineTime: todayAt(values.deadlineTime).toISOString(),
      allocatedDuration: values.duration,
      frequency: values.frequency,
    });

    if (res?.success) router.refresh();
    else setItems(prev);
  };

  const handleDelete = async () => {
    if (!deleting) return;
    const id = deleting.id;
    setDeleting(null);
    const prev = items;
    setItems((cur) => cur.filter((t) => t.id !== id));
    const res = await deleteTask(id);
    if (res?.success) router.refresh();
    else setItems(prev);
  };

  const handleUncomplete = async (task: Task) => {
    const prev = items;
    setItems((cur) =>
      cur.map((t) => (t.id === task.id ? { ...t, isCompleted: false, completedAt: null } : t))
    );
    const res = await uncompleteTask(task.id);
    if (res?.success) router.refresh();
    else setItems(prev);
  };

  const deadlineTone = (d: Date | string) => {
    const key = dayKey(new Date(d));
    const today = dayKey();
    if (key < today) return "text-rosy";
    const twoDays = new Date();
    twoDays.setDate(twoDays.getDate() + 2);
    if (key <= dayKey(twoDays)) return "text-gold";
    return "text-ink3";
  };

  return (
    <Panel title="The Dump" subtitle="capture now, schedule later" accent="gold" className="h-full">
      <div className="flex flex-col h-full">
        <form onSubmit={handleAdd} className="space-y-2 mb-3">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Brain-dump a task…"
            className={inputCls}
            maxLength={200}
            disabled={adding}
          />
          <div className="flex gap-2">
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              min={dayKey()}
              title="Optional deadline"
              className={`${inputCls} flex-1`}
              disabled={adding}
            />
            <HudButton type="submit" variant="gold" className="py-2.5 px-4" disabled={adding || !newTitle.trim()}>
              {adding ? "…" : "+ Dump"}
            </HudButton>
          </div>
        </form>

        <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-2">
          {pendingTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="w-12 h-12 r-lg chip flex items-center justify-center mb-3">
                <Inbox className="w-5 h-5 text-ink3" />
              </div>
              <p className="font-display font-semibold text-ink2 text-sm mb-0.5">Dump empty</p>
              <p className="text-xs text-ink3">Nothing waiting. Nice.</p>
            </div>
          ) : (
            pendingTasks.map((task) => (
              <div
                key={task.id}
                className="group r-lg chip chip-hover transition-all px-4 py-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-ink truncate block">{task.title}</span>
                    {task.deadline && (
                      <span className={`inline-flex items-center gap-1 text-[11px] mt-0.5 ${deadlineTone(task.deadline)}`}>
                        <CalendarClock className="w-3 h-3" />
                        due {new Date(task.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <HudButton variant="primary" onClick={() => setScheduling(task)} title="Schedule for today">
                      <ArrowRight className="w-3.5 h-3.5" />
                    </HudButton>
                    <HudButton variant="danger" onClick={() => setDeleting(task)} title="Delete">
                      <X className="w-3.5 h-3.5" />
                    </HudButton>
                  </div>
                </div>
              </div>
            ))
          )}

          {completedTasks.length > 0 && (
            <div className="pt-2">
              <button
                onClick={() => setShowCompleted(!showCompleted)}
                className="w-full flex items-center justify-between text-[11px] font-semibold text-ink3 uppercase tracking-widest hover:text-ink2 transition-colors py-1"
              >
                <span>✓ Done ({completedTasks.length})</span>
                {showCompleted ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </button>
              {showCompleted &&
                completedTasks.map((task) => (
                  <div
                    key={task.id}
                    className="group flex items-center justify-between gap-2 r-lg chip px-4 py-2.5 mt-2 opacity-60 hover:opacity-90 transition-opacity"
                  >
                    <span className="text-sm text-ink3 line-through truncate">{task.title}</span>
                    <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <HudButton variant="ghost" onClick={() => handleUncomplete(task)}>
                        undo
                      </HudButton>
                      <HudButton variant="danger" onClick={() => setDeleting(task)}>
                        <X className="w-3.5 h-3.5" />
                      </HudButton>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {scheduling && (
        <ScheduleTaskModal
          mode="schedule"
          heading="Schedule for today"
          taskTitle={scheduling.title}
          initial={{ tier: scheduling.tier, category: scheduling.category }}
          submitLabel="Move to today"
          onSubmit={handleSchedule}
          onClose={() => setScheduling(null)}
        />
      )}

      {deleting && (
        <ConfirmModal
          title="Delete task?"
          body={
            <>
              <span className="text-ink font-medium">{deleting.title}</span> will be permanently
              deleted.
            </>
          }
          confirmLabel="Delete"
          onConfirm={handleDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
    </Panel>
  );
}
