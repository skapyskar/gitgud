"use client";

import React, { useMemo, useState } from "react";
import { Modal, ModalTitle, HudButton, inputCls, labelCls } from "../../components/ui";
import { TaskTier, Category } from "../../../../prisma/generated/enums";
import { tierBaseXP, possibleXPForTask, TIER_LABELS } from "@/lib/gamification";
import { todayAt, minutesUntil } from "@/lib/dates";

export interface ScheduleValues {
  title: string;
  tier: TaskTier;
  category: Category;
  deadlineTime: string; // "HH:MM"
  duration: number | null; // minutes
  frequency: number;
}

interface ScheduleTaskModalProps {
  mode: "create" | "schedule";
  heading: string;
  /** Shown (and locked) when scheduling an existing task. */
  taskTitle?: string;
  initial?: Partial<ScheduleValues>;
  submitLabel?: string;
  onSubmit: (values: ScheduleValues) => void | Promise<void>;
  onClose: () => void;
}

/**
 * The one form for putting a task on today's board — used by task creation,
 * backlog→today moves, and overdue reschedules, so the rules never drift.
 */
export default function ScheduleTaskModal({
  mode,
  heading,
  taskTitle,
  initial,
  submitLabel = "Deploy Task",
  onSubmit,
  onClose,
}: ScheduleTaskModalProps) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [tier, setTier] = useState<TaskTier>(initial?.tier ?? "C");
  const [category, setCategory] = useState<Category>(initial?.category ?? "LIFE");
  const [deadlineTime, setDeadlineTime] = useState(initial?.deadlineTime ?? "");
  const [duration, setDuration] = useState<string>(initial?.duration ? String(initial.duration) : "");
  const [frequency, setFrequency] = useState<string>(String(initial?.frequency ?? 1));
  const [submitting, setSubmitting] = useState(false);

  const minDeadline = useMemo(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 1);
    return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  }, []);

  const deadlineValid = !!deadlineTime && todayAt(deadlineTime).getTime() > Date.now();
  const maxDuration = deadlineValid ? Math.max(1, minutesUntil(todayAt(deadlineTime))) : 999;

  const parsedFrequency = Math.min(50, Math.max(1, parseInt(frequency) || 1));
  const parsedDuration = duration ? Math.min(parseInt(duration) || 0, maxDuration) : null;
  const needsTitle = mode === "create";
  const canSubmit = deadlineValid && (!needsTitle || title.trim().length > 0) && !submitting;

  const rewardPreview = possibleXPForTask(tier, !!parsedDuration);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        tier,
        category,
        deadlineTime,
        duration: parsedDuration && parsedDuration > 0 ? parsedDuration : null,
        frequency: parsedFrequency,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal onClose={onClose}>
      <ModalTitle>{heading}</ModalTitle>
      {taskTitle && (
        <p className="text-sm text-ink2 mb-3 border-l-2 border-acc/60 pl-3">
          {taskTitle}
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 mt-4">
        {needsTitle && (
          <div>
            <label className={labelCls}>Objective *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to get done?"
              className={inputCls}
              maxLength={200}
              autoFocus
            />
          </div>
        )}

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

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Deadline (today) *</label>
            <input
              type="time"
              value={deadlineTime}
              onChange={(e) => setDeadlineTime(e.target.value)}
              min={minDeadline}
              max="23:59"
              className={inputCls}
              required
            />
            <span className={`text-[10px] ${deadlineValid ? "text-ink3" : "text-rosy"}`}>
              {deadlineTime
                ? deadlineValid
                  ? `${maxDuration} min on the clock`
                  : "must be in the future"
                : "when does this expire?"}
            </span>
          </div>
          <div>
            <label className={labelCls}>Time limit (min)</label>
            <input
              type="number"
              value={duration}
              onChange={(e) => {
                const v = parseInt(e.target.value);
                setDuration(e.target.value === "" ? "" : String(Math.max(1, Math.min(v || 1, maxDuration))));
              }}
              placeholder={deadlineValid ? `max ${maxDuration}` : "optional"}
              min={1}
              max={maxDuration}
              className={inputCls}
            />
            <span className="text-[10px] text-ink3">+25% XP if beaten</span>
          </div>
        </div>

        <div>
          <label className={labelCls}>Reps (times to complete)</label>
          <input
            type="number"
            value={frequency}
            onChange={(e) => setFrequency(e.target.value)}
            min={1}
            max={50}
            className={inputCls}
          />
        </div>

        <div className="flex items-center justify-between r-md bg-gradient-to-r from-acc/10 to-acc2/10 ring-1 ring-inset ring-acc/25 px-4 py-2.5">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-ink2">
            Max reward
          </span>
          <span className="font-display font-bold grad-text">
            {rewardPreview} XP <span className="text-ink3 text-xs font-normal">(+ streak)</span>
          </span>
        </div>

        <div className="flex gap-2.5 pt-1">
          <HudButton type="submit" variant="primary" className="flex-1 py-2.5" disabled={!canSubmit}>
            {submitting ? "Deploying…" : submitLabel}
          </HudButton>
          <HudButton type="button" variant="ghost" className="py-2.5" onClick={onClose}>
            Cancel
          </HudButton>
        </div>
      </form>
    </Modal>
  );
}
