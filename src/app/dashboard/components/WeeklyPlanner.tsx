"use client";

import React, { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Repeat, X, Clock, Plus } from "lucide-react";
import type { Task } from "../../../../prisma/generated/client";
import {
  Panel,
  HudButton,
  ConfirmModal,
  Modal,
  ModalTitle,
  TierBadge,
  inputCls,
  labelCls,
} from "../../components/ui";
import { createTask, deleteTask } from "./taskApi";
import { TaskTier, Category } from "../../../../prisma/generated/enums";
import { tierBaseXP, TIER_LABELS, WEEKLY_BONUS_XP } from "@/lib/gamification";
import { todayDayIndex } from "@/lib/dates";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface WeeklyPlannerProps {
  templates: Task[];
}

/** Recurring habit templates — they spawn a fresh instance every scheduled day. */
export default function WeeklyPlanner({ templates }: WeeklyPlannerProps) {
  const router = useRouter();
  const [items, setItems] = useState<Task[]>(templates);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Task | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [tier, setTier] = useState<TaskTier>("C");
  const [category, setCategory] = useState<Category>("LIFE");
  const [deadlineTime, setDeadlineTime] = useState("");
  const [duration, setDuration] = useState("");
  const [frequency, setFrequency] = useState("1");
  const [submitting, setSubmitting] = useState(false);
  const tempIdRef = useRef(0);

  // Reset optimistic state when fresh server data arrives (render-time reset).
  const [prevTemplates, setPrevTemplates] = useState(templates);
  if (prevTemplates !== templates) {
    setPrevTemplates(templates);
    setItems(templates);
  }

  const sorted = useMemo(
    () => [...items].sort((a, b) => a.title.localeCompare(b.title)),
    [items]
  );

  const resetForm = () => {
    setTitle("");
    setSelectedDays([]);
    setTier("C");
    setCategory("LIFE");
    setDeadlineTime("");
    setDuration("");
    setFrequency("1");
    setCreating(false);
  };

  const toggleDay = (idx: number) =>
    setSelectedDays((prev) =>
      prev.includes(idx) ? prev.filter((d) => d !== idx) : [...prev, idx]
    );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || selectedDays.length === 0 || !deadlineTime || submitting) return;
    setSubmitting(true);

    const tempId = `temp-${++tempIdRef.current}`;
    const now = new Date();
    const optimistic = {
      id: tempId,
      title: title.trim(),
      type: "WEEKLY",
      tier,
      category,
      repeatDays: [...selectedDays].sort().join(","),
      isCompleted: false,
      allocatedDuration: duration ? parseInt(duration) : null,
      frequency: parseInt(frequency) || 1,
      createdAt: now,
      updatedAt: now,
    } as Task;
    setItems((cur) => [optimistic, ...cur]);

    const todayKeyISO = new Date().toISOString().slice(0, 10);
    const res = await createTask({
      title: title.trim(),
      type: "WEEKLY",
      tier,
      category,
      repeatDays: [...selectedDays].sort().join(","),
      deadlineTime: deadlineTime ? new Date(`${todayKeyISO}T${deadlineTime}:00`).toISOString() : null,
      allocatedDuration: duration ? parseInt(duration) : null,
      frequency: parseInt(frequency) || 1,
    });

    if (res?.success) {
      resetForm();
      router.refresh();
    } else {
      setItems((cur) => cur.filter((t) => t.id !== tempId));
    }
    setSubmitting(false);
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

  return (
    <Panel
      title="Habits"
      subtitle={`repeat weekly · +${WEEKLY_BONUS_XP} bonus XP each`}
      accent="habit"
      className="h-full"
      right={
        <HudButton variant="habit" className="flex items-center gap-1.5" onClick={() => setCreating(true)}>
          <Plus className="w-3.5 h-3.5" /> Habit
        </HudButton>
      }
    >
      <div className="h-full overflow-y-auto pr-1 space-y-2">
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="w-12 h-12 r-lg chip flex items-center justify-center mb-3">
              <Repeat className="w-5 h-5 text-ink3" />
            </div>
            <p className="font-display font-semibold text-ink2 text-sm mb-0.5">No habits yet</p>
            <p className="text-xs text-ink3">Recurring quests spawn here every scheduled day.</p>
          </div>
        ) : (
          sorted.map((template) => {
            const days = template.repeatDays?.split(",").map(Number) ?? [];
            const activeToday = days.includes(todayDayIndex());
            return (
              <div
                key={template.id}
                className={`group r-lg chip chip-hover transition-all px-4 py-3 ${
                  activeToday ? "!border-hab/40" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-ink truncate">{template.title}</span>
                      {activeToday && (
                        <span className="flex items-center gap-1 text-[10px] font-semibold text-hab bg-hab/10 ring-1 ring-inset ring-hab/30 rounded-full px-2 py-0.5 animate-pulse">
                          <Repeat className="w-3 h-3" /> live today
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2.5 mt-1.5 text-[11px]">
                      <TierBadge tier={template.tier} />
                      <span className="text-ink3">{template.category}</span>
                      <span className="text-acc font-semibold">+{tierBaseXP(template.tier)} XP</span>
                      {template.allocatedDuration && (
                        <span className="flex items-center gap-1 text-hab">
                          <Clock className="w-3 h-3" /> {template.allocatedDuration}m
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setDeleting(template)}
                    className="p-2 r-md text-rosy hover:bg-rosy/15 opacity-0 group-hover:opacity-100 transition-all"
                    title="Delete habit"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex gap-1 mt-2.5">
                  {DAYS.map((day, idx) => (
                    <span
                      key={idx}
                      className={`flex-1 text-center text-[10px] font-semibold py-1 r-md ${
                        days.includes(idx)
                          ? `bg-hab/15 text-hab ring-1 ring-inset ring-hab/40 ${
                              idx === todayDayIndex() ? "shadow-[0_0_10px_var(--glow)]" : ""
                            }`
                          : "bg-[var(--chip)] text-ink3"
                      }`}
                    >
                      {day}
                    </span>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      {creating && (
        <Modal accent="habit" onClose={resetForm}>
          <ModalTitle>New habit</ModalTitle>
          <form onSubmit={handleCreate} className="space-y-4 mt-4">
            <div>
              <label className={labelCls}>Habit *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Gym, DSA practice…"
                className={inputCls}
                maxLength={200}
                autoFocus
              />
            </div>

            <div>
              <label className={labelCls}>Repeat on *</label>
              <div className="flex gap-1.5">
                {DAYS.map((day, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => toggleDay(idx)}
                    className={`flex-1 py-2 text-[11px] font-semibold r-md transition-all ${
                      selectedDays.includes(idx)
                        ? "bg-gradient-to-br from-cyan-400 to-sky-500 text-slate-950 shadow-lg shadow-cyan-500/25"
                        : "chip chip-hover text-ink2"
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Tier</label>
                <select value={tier} onChange={(e) => setTier(e.target.value as TaskTier)} className={inputCls}>
                  {Object.values(TaskTier).map((t) => (
                    <option key={t} value={t}>
                      {t} — {TIER_LABELS[t]} ({tierBaseXP(t)} XP)
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as Category)}
                  className={inputCls}
                >
                  {Object.values(Category).map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>Deadline *</label>
                <input
                  type="time"
                  value={deadlineTime}
                  onChange={(e) => setDeadlineTime(e.target.value)}
                  className={inputCls}
                  required
                />
              </div>
              <div>
                <label className={labelCls}>Limit (min)</label>
                <input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="—"
                  min={1}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Reps</label>
                <input
                  type="number"
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value)}
                  min={1}
                  max={50}
                  className={inputCls}
                />
              </div>
            </div>

            <div className="flex gap-2.5 pt-1">
              <HudButton
                type="submit"
                variant="habit"
                className="flex-1 py-2.5"
                disabled={submitting || !title.trim() || selectedDays.length === 0 || !deadlineTime}
              >
                {submitting ? "Creating…" : "Create habit"}
              </HudButton>
              <HudButton type="button" variant="ghost" className="py-2.5" onClick={resetForm}>
                Cancel
              </HudButton>
            </div>
          </form>
        </Modal>
      )}

      {deleting && (
        <ConfirmModal
          title="Delete habit?"
          body={
            <>
              <span className="text-ink font-medium">{deleting.title}</span> stops repeating. Past
              completions keep their XP.
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
