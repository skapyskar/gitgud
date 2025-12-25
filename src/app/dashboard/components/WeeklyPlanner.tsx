"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Task, TaskTier, Category } from "../../../../prisma/generated/client";

type WeeklyTask = Task & { repeatDays?: string | null };

interface WeeklyPlannerProps {
  templates: WeeklyTask[];
  userId: string;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function WeeklyPlanner({ templates, userId }: WeeklyPlannerProps) {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [tier, setTier] = useState<TaskTier>("C");
  const [category, setCategory] = useState<Category>("LIFE");
  const [deadlineTime, setDeadlineTime] = useState("");
  const [duration, setDuration] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  // Optimistic UI: local state for templates
  const [optimisticTemplates, setOptimisticTemplates] = useState<WeeklyTask[]>([...templates]);

  const toggleDay = (dayIndex: number) => {
    setSelectedDays(prev =>
      prev.includes(dayIndex)
        ? prev.filter(d => d !== dayIndex)
        : [...prev, dayIndex]
    );
  };

  // Optimistic add
  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || selectedDays.length === 0) return;

    setIsSubmitting(true);
    // 1. Create a fake template for instant UI
    const tempId = Math.random().toString();
    const now = new Date();
    const tempTemplate: WeeklyTask = {
      id: tempId,
      title: newTaskTitle,
      description: null,
      isCompleted: false,
      type: "WEEKLY",
      tier,
      category,
      userId,
      repeatDays: selectedDays.sort().join(","),
      plannedDate: now,
      plannedStartTime: null,
      plannedEndTime: null,
      deadline: null,
      scheduledDate: null,
      completedAt: null,
      basePoints: 10,
      xpWorth: 10,
      isBonus: false,
      timeBonus: 0,
      finalPoints: 0,
      createdAt: now,
      updatedAt: now,
      // New fields
      deadlineTime: null,
      allocatedDuration: duration ? parseInt(duration) : null,
      durationMet: false,
      isExpired: false,
    };
    setOptimisticTemplates((current) => [tempTemplate, ...current]);

    try {
      const res = await fetch("/api/tasks/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTaskTitle,
          type: "WEEKLY",
          tier,
          category,
          repeatDays: selectedDays.sort().join(","),
          deadlineTime: deadlineTime ? `1970-01-01T${deadlineTime}:00.000Z` : null,
          allocatedDuration: duration ? parseInt(duration) : null,
        }),
      });
      if (res.ok) {
        setNewTaskTitle("");
        setSelectedDays([]);
        setTier("C");
        setCategory("LIFE");
        setDeadlineTime("");
        setDuration("");
        setIsCreating(false);
        router.refresh(); // Will replace fake with real
      } else {
        setOptimisticTemplates((current) => current.filter(t => t.id !== tempId));
      }
    } catch (error) {
      setOptimisticTemplates((current) => current.filter(t => t.id !== tempId));
      console.error("Failed to create weekly task:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Optimistic delete
  const handleDeleteTemplate = async (taskId: string) => {
    const prev = [...optimisticTemplates];
    setOptimisticTemplates((current) => current.filter((t) => t.id !== taskId));
    setIsLoading(true);
    try {
      const res = await fetch("/api/tasks/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId }),
      });
      if (res.ok) {
        router.refresh();
      } else {
        setOptimisticTemplates(prev);
      }
    } catch (error) {
      setOptimisticTemplates(prev);
      console.error("Failed to delete template:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="border border-green-900/30 p-[0.3vw] bg-black/50 flex flex-col h-[calc(100vh-52vh)] min-h-[12vh] max-h-[35vh] lg:h-[calc(100vh-40vh)] lg:max-h-[50vh] relative">
      {isLoading && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="text-green-400 font-mono text-sm animate-pulse">LOADING...</div>
        </div>
      )}
      <div className="flex items-center justify-between mb-[0.5vh]">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></span>
          <h3 className="text-[clamp(0.8rem,1.3vw,1.25rem)] font-bold text-green-500 uppercase tracking-wider">
            &gt;&gt; Weekly_Tasks
          </h3>
        </div>

        {!isCreating && (
          <button
            onClick={() => setIsCreating(true)}
            className="text-[clamp(0.5rem,0.7vw,0.75rem)] bg-purple-900/30 hover:bg-purple-900/50 border border-purple-700 px-3 py-1 text-purple-400 uppercase tracking-wider font-mono"
          >
            + New Template
          </button>
        )}
      </div>

      <p className="text-[clamp(0.5rem,0.7vw,0.75rem)] text-gray-500 mb-4 font-mono">
        Preplanned Tasks
      </p>

      {/* Create New Template Form */}
      {isCreating && (
        <form onSubmit={handleCreateTemplate} className="mb-[0.5vh] p-[0.5vw] bg-purple-900/10 border border-purple-700/30">
          <input
            type="text"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="Weekly task name..."
            className="w-full bg-black/70 border border-purple-900/50 px-[0.5vw] py-[0.3vh] text-[clamp(0.6rem,0.85vw,0.875rem)] text-green-400 placeholder-gray-600 focus:outline-none focus:border-purple-500 font-mono mb-[0.5vh]"
            autoFocus
          />

          <div className="grid grid-cols-2 gap-[0.5vw] mb-[0.5vh]">
            <div>
              <label className="text-[clamp(0.5rem,0.7vw,0.75rem)] text-gray-500 mb-[0.2vh] block font-mono">Tier</label>
              <select
                value={tier}
                onChange={(e) => setTier(e.target.value as TaskTier)}
                className="w-full bg-black/70 border border-purple-900/50 px-[0.5vw] py-[0.3vh] text-[clamp(0.6rem,0.85vw,0.875rem)] text-green-400 focus:outline-none focus:border-purple-500 font-mono"
              >
                <option value="S">S - Critical</option>
                <option value="A">A - Important</option>
                <option value="B">B - Maintenance</option>
                <option value="C">C - Chores</option>
              </select>
            </div>

            <div>
              <label className="text-[clamp(0.5rem,0.7vw,0.75rem)] text-gray-500 mb-[0.2vh] block font-mono">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
                className="w-full bg-black/70 border border-purple-900/50 px-[0.5vw] py-[0.3vh] text-[clamp(0.6rem,0.85vw,0.875rem)] text-green-400 focus:outline-none focus:border-purple-500 font-mono"
              >
                <option value="DEV">DEV</option>
                <option value="ACADEMICS">ACADEMICS</option>
                <option value="HEALTH">HEALTH</option>
                <option value="LIFE">LIFE</option>
              </select>
            </div>
          </div>

          <div className="mb-[0.5vh]">
            <p className="text-[clamp(0.5rem,0.7vw,0.75rem)] text-gray-500 mb-[0.3vh] font-mono">Select Days:</p>
            <div className="flex gap-[0.3vw] flex-wrap">
              {DAYS.map((day, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => toggleDay(index)}
                  className={`px-[0.5vw] py-[0.2vh] text-[clamp(0.5rem,0.7vw,0.75rem)] font-mono border transition-colors ${selectedDays.includes(index)
                    ? "bg-purple-600/50 border-purple-400 text-purple-200"
                    : "bg-black/50 border-purple-900/30 text-gray-500 hover:border-purple-700"
                    }`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-[0.5vw] mb-[0.5vh]">
            <div>
              <label className="text-[clamp(0.5rem,0.7vw,0.75rem)] text-gray-500 mb-[0.2vh] block font-mono">Deadline Time *</label>
              <input
                type="time"
                value={deadlineTime}
                onChange={(e) => setDeadlineTime(e.target.value)}
                className="w-full bg-black/70 border border-purple-900/50 px-[0.5vw] py-[0.3vh] text-[clamp(0.6rem,0.85vw,0.875rem)] text-green-400 focus:outline-none focus:border-purple-500 font-mono"
                required
              />
            </div>

            <div>
              <label className="text-[clamp(0.5rem,0.7vw,0.75rem)] text-gray-500 mb-[0.2vh] block font-mono">Duration (min)</label>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="e.g. 60"
                min="1"
                className="w-full bg-black/70 border border-purple-900/50 px-[0.5vw] py-[0.3vh] text-[clamp(0.6rem,0.85vw,0.875rem)] text-green-400 focus:outline-none focus:border-purple-500 font-mono placeholder-gray-600"
              />
            </div>
          </div>

          <div className="flex gap-[0.5vw]">
            <button
              type="submit"
              disabled={isSubmitting || !newTaskTitle.trim() || selectedDays.length === 0 || !deadlineTime}
              className="flex-1 bg-purple-900/30 hover:bg-purple-900/50 border border-purple-700 px-[0.5vw] py-[0.3vh] text-[clamp(0.5rem,0.7vw,0.75rem)] text-purple-400 uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed font-mono"
            >
              {isSubmitting ? "Creating..." : "Create Template"}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsCreating(false);
                setNewTaskTitle("");
                setSelectedDays([]);
                setTier("C");
                setCategory("LIFE");
                setDeadlineTime("");
                setDuration("");
              }}
              className="bg-red-900/30 hover:bg-red-900/50 border border-red-700 px-[0.5vw] py-[0.3vh] text-[clamp(0.5rem,0.7vw,0.75rem)] text-red-400 uppercase font-mono"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Existing Templates */}
      <div className="space-y-[0.3vh] flex-1 overflow-y-auto pr-2">
        {templates.length === 0 ? (
          <div className="text-center text-gray-600 text-xs py-8 font-mono">
            [NO_WEEKLY_TEMPLATES]
            <br />
            Create recurring tasks
          </div>
        ) : (
          templates.map((template) => {
            const days = template.repeatDays?.split(",").map(Number) || [];

            return (
              <div
                key={template.id}
                className="bg-black/70 border border-purple-700/30 p-3 hover:border-purple-500/50 transition-colors group"
              >
                <div className="flex justify-between items-start gap-2 mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-1.5 py-0.5 font-bold border font-mono ${template.tier === 'S' ? 'bg-red-900/30 border-red-500 text-red-400' :
                        template.tier === 'A' ? 'bg-orange-900/30 border-orange-500 text-orange-400' :
                          template.tier === 'B' ? 'bg-blue-900/30 border-blue-500 text-blue-400' :
                            'bg-gray-900/30 border-gray-500 text-gray-400'
                        }`}>{template.tier}</span>
                      <span className="text-[10px] text-gray-500 font-mono">[{template.category}]</span>
                    </div>
                    <h4 className="text-sm text-green-400 font-mono">{template.title}</h4>
                  </div>
                  <button
                    onClick={() => handleDeleteTemplate(template.id)}
                    className="text-xs text-red-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity font-mono"
                  >
                    Delete
                  </button>
                </div>

                <div className="flex gap-1 flex-wrap mt-2">
                  {DAYS.map((day, index) => (
                    <span
                      key={index}
                      className={`text-xs px-2 py-0.5 border font-mono ${days.includes(index)
                        ? "bg-purple-600/30 border-purple-500/50 text-purple-300"
                        : "bg-black/50 border-gray-800 text-gray-700"
                        }`}
                    >
                      {day}
                    </span>
                  ))}
                </div>

                {days.includes(new Date().getDay()) && (
                  <div className="mt-2 text-xs text-green-500 font-mono">
                    ✓ Active today (+10 bonus XP if completed)
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
